"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { updateWithdrawalStatusAtomic } from "@/lib/wallet";
import { updateWithdrawalStatusSchema } from "@/lib/validations";

export interface WithdrawalStatusActionResponse {
  error?: string;
  fieldErrors?: {
    reason?: string;
  };
  success?: boolean;
}

/**
 * Protected Server Action for updating a withdrawal request status.
 * Enforces admin authentication and atomic database balance transitions.
 */
export async function updateWithdrawalStatusAction({
  withdrawalId,
  targetStatus,
  reason,
  paymentRef,
}: {
  withdrawalId: string;
  targetStatus: "APPROVED" | "PROCESSING" | "PAID" | "REJECTED";
  reason?: string;
  paymentRef?: string;
}): Promise<WithdrawalStatusActionResponse> {
  const admin = await requireAdmin();

  const validation = updateWithdrawalStatusSchema.safeParse({
    withdrawalId,
    targetStatus,
    reason,
    paymentRef,
  });

  if (!validation.success) {
    const fieldErrors: WithdrawalStatusActionResponse["fieldErrors"] = {};
    for (const issue of validation.error.issues) {
      if (issue.path[0] === "reason") {
        fieldErrors.reason = issue.message;
      }
    }
    return {
      error: fieldErrors.reason || "Invalid status transition parameters.",
      fieldErrors,
    };
  }

  const result = await updateWithdrawalStatusAtomic({
    withdrawalId,
    adminId: admin.id,
    targetStatus,
    reason,
    paymentRef,
  });

  if (!result.success) {
    return { error: result.error || "Failed to update withdrawal status." };
  }

  try {
    revalidatePath("/admin/withdrawals");
    revalidatePath("/admin");
    revalidatePath("/wallet");
  } catch {}

  return { success: true };
}
