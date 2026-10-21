"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { reviewSubmissionSchema } from "@/lib/validations";
import { creditApprovedSubmissionAtomic } from "@/lib/wallet";

export interface ReviewActionResponse {
  error?: string;
  fieldErrors?: {
    reason?: string;
  };
  conflict?: boolean;
  success?: boolean;
  newStatus?: "APPROVED" | "REJECTED";
  log?: {
    id: string;
    adminName: string;
    adminEmail: string;
    action: "APPROVED" | "REJECTED";
    reason: string | null;
    createdAt: string;
  };
}

/**
 * Core atomic transactional logic for reviewing a task submission.
 * Enforces:
 * 1. Zod validation including mandatory >= 5 char rejection reason.
 * 2. Concurrency-safe atomic transaction preventing duplicate / conflicting reviews.
 * 3. Immutable audit log creation in the exact same transaction.
 */
export async function executeReviewSubmission({
  adminId,
  adminName,
  adminEmail,
  submissionId,
  action,
  reason = "",
}: {
  adminId: string;
  adminName?: string;
  adminEmail?: string;
  submissionId: string;
  action: "APPROVED" | "REJECTED";
  reason?: string;
}): Promise<ReviewActionResponse> {
  if (!submissionId) {
    return { error: "Submission ID is missing." };
  }

  // 1. Validate review inputs
  const validation = reviewSubmissionSchema.safeParse({ action, reason });
  if (!validation.success) {
    const fieldErrors: ReviewActionResponse["fieldErrors"] = {};
    for (const issue of validation.error.issues) {
      if (issue.path[0] === "reason") {
        fieldErrors.reason = issue.message;
      }
    }
    return {
      error: fieldErrors.reason || "Invalid review parameters.",
      fieldErrors,
    };
  }

  // 2. Concurrency-Safe Atomic Review Transaction
  try {
    const existing = await prisma.taskSubmission.findUnique({
      where: { id: submissionId },
      select: { status: true, referenceCode: true },
    });

    if (!existing) {
      return { error: "Submission not found." };
    }

    if (existing.status !== "PENDING") {
      return {
        conflict: true,
        error: `Submission has already been processed by another reviewer and is currently marked as ${existing.status}.`,
        newStatus: existing.status as "APPROVED" | "REJECTED",
      };
    }

    const finalReason = action === "REJECTED" ? reason : reason || "Proof compliance verified.";

    const createdLog = await prisma.$transaction(async (tx) => {
      // Concurrency guard: Only update if still PENDING
      const updateResult = await tx.taskSubmission.updateMany({
        where: {
          id: submissionId,
          status: "PENDING",
        },
        data: {
          status: action,
          rejectionReason: action === "REJECTED" ? reason : null,
          reviewedAt: new Date(),
          reviewedByAdminId: adminId,
        },
      });

      if (updateResult.count === 0) {
        throw new Error("CONFLICT_CONCURRENT_UPDATE");
      }

      // Record immutable review audit log in the same transaction
      const log = await tx.submissionReviewLog.create({
        data: {
          submissionId,
          adminId,
          action,
          reason: finalReason,
        },
        include: {
          admin: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      // Atomically and idempotently credit worker wallet if approved
      if (action === "APPROVED") {
        await creditApprovedSubmissionAtomic({
          submissionId,
          adminId,
          tx,
        });
      }

      return log;
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    try {
      revalidatePath("/admin/submissions");
      revalidatePath("/admin");
      revalidatePath("/admin/withdrawals");
      revalidatePath("/wallet");
      revalidatePath(`/track/${existing.referenceCode}`);
    } catch {
      // Revalidation might be skipped outside Next request context (e.g., in unit tests)
    }

    return {
      success: true,
      newStatus: action,
      log: {
        id: createdLog.id,
        adminName: createdLog.admin.name || adminName || "Administrator",
        adminEmail: createdLog.admin.email || adminEmail || "",
        action: createdLog.action,
        reason: createdLog.reason,
        createdAt: createdLog.createdAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "CONFLICT_CONCURRENT_UPDATE") {
      const current = await prisma.taskSubmission.findUnique({
        where: { id: submissionId },
        select: { status: true },
      });
      return {
        conflict: true,
        error: `Conflict detected: This submission was already processed by another administrator and is now marked as ${current?.status || "UPDATED"}.`,
        newStatus: current?.status as "APPROVED" | "REJECTED" | undefined,
      };
    }

    console.error("Review action error:", error);
    return {
      error: "An unexpected error occurred while recording the review decision.",
    };
  }
}

/**
 * Protected Server Action for reviewing a submission via direct parameter call
 */
export async function submitReviewAction(
  submissionId: string,
  action: "APPROVED" | "REJECTED",
  reason?: string
): Promise<ReviewActionResponse> {
  const admin = await requireAdmin();

  return await executeReviewSubmission({
    adminId: admin.id,
    adminName: admin.name,
    adminEmail: admin.email,
    submissionId,
    action,
    reason,
  });
}

/**
 * Protected Server Action for reviewing a submission via FormData / useFormState
 */
export async function reviewSubmissionAction(
  prevState: ReviewActionResponse,
  formData: FormData
): Promise<ReviewActionResponse> {
  const admin = await requireAdmin();

  const submissionId = (formData.get("submissionId") as string)?.trim();
  const rawAction = (formData.get("action") as string)?.trim();
  const reason = (formData.get("reason") as string)?.trim() || "";

  if (rawAction !== "APPROVED" && rawAction !== "REJECTED") {
    return { error: "Invalid review action specified." };
  }

  const action = rawAction as "APPROVED" | "REJECTED";

  return await executeReviewSubmission({
    adminId: admin.id,
    adminName: admin.name,
    adminEmail: admin.email,
    submissionId,
    action,
    reason,
  });
}
