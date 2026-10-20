"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateReferenceCode } from "@/lib/reference";
import { savePrivateProof, StorageError } from "@/lib/storage";
import { MAX_FILE_SIZE_BYTES, validateImageMagicBytes } from "@/lib/validations";
import fs from "fs";
import path from "path";

export interface SubmitActionState {
  error?: string;
  fieldErrors?: {
    submitterName?: string;
    contactInfo?: string;
    proofText?: string;
    proofFile?: string;
  };
  success?: boolean;
  referenceCode?: string;
}

export async function submitTaskAction(
  prevState: SubmitActionState,
  formData: FormData
): Promise<SubmitActionState> {
  const taskId = formData.get("taskId") as string;
  const submitterName = (formData.get("submitterName") as string)?.trim() || "";
  const contactInfo = (formData.get("contactInfo") as string)?.trim() || "";
  const proofText = (formData.get("proofText") as string)?.trim() || "";
  const proofFile = formData.get("proofFile") as File | null;

  if (!taskId) {
    return { error: "Task identifier is missing." };
  }

  // 1. Persistent Rate Limiting (per IP / identifier)
  const headersList = headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
  const rateLimitKey = `rate_submit_${ip}`;

  const rateCheck = await checkRateLimit({
    key: rateLimitKey,
    maxAttempts: 10,
    windowSeconds: 600, // 10 submissions per 10 minutes max
  });

  if (!rateCheck.allowed) {
    return {
      error: "Too many submission attempts. Please wait a few minutes before submitting again.",
    };
  }

  // 2. Fetch and verify task eligibility server-side
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    return { error: "The requested task does not exist." };
  }

  const now = new Date();
  const isExpired = task.deadline ? task.deadline.getTime() < now.getTime() : false;

  if (task.status !== "ACTIVE" || isExpired) {
    return {
      error: "This task is no longer accepting submissions. It may be paused, closed, or expired.",
    };
  }

  // 3. Prevent duplicate submissions for the same contact info on this task
  const existingSubmission = await prisma.taskSubmission.findFirst({
    where: {
      taskId,
      contactInfo,
      status: { in: ["PENDING", "APPROVED"] },
    },
  });

  if (existingSubmission) {
    return {
      error: "A submission with this contact information is already pending or approved for this task.",
    };
  }

  // 4. Validate Submitter Name and Contact Details
  const fieldErrors: SubmitActionState["fieldErrors"] = {};

  if (!submitterName || submitterName.length < 2 || submitterName.length > 80) {
    fieldErrors.submitterName = "Please enter your name (between 2 and 80 characters).";
  }

  if (!contactInfo || contactInfo.length < 3 || contactInfo.length > 120) {
    fieldErrors.contactInfo = "Please enter valid contact details (e.g. Telegram handle, Phone, or Email).";
  }

  // 5. Validate Proof based on task.proofType
  const requiresText = task.proofType === "TEXT" || task.proofType === "BOTH";
  const requiresImage = task.proofType === "IMAGE" || task.proofType === "BOTH";

  if (requiresText && (!proofText || proofText.length < 5)) {
    fieldErrors.proofText = "Please provide detailed proof text (at least 5 characters).";
  }

  const hasFile = proofFile && proofFile.size > 0;

  if (requiresImage && !hasFile) {
    fieldErrors.proofFile = "Please upload a screenshot proof (JPEG, PNG, or WebP).";
  }

  let fileBuffer: Buffer | null = null;
  if (hasFile) {
    if (proofFile.size > MAX_FILE_SIZE_BYTES) {
      fieldErrors.proofFile = "Screenshot file size exceeds the 5 MB limit.";
    } else {
      const arrayBuffer = await proofFile.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);

      const magicCheck = validateImageMagicBytes(fileBuffer);
      if (!magicCheck.valid) {
        fieldErrors.proofFile = "Invalid image file format. Only authentic JPEG, PNG, or WebP files are accepted.";
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  // 6. Save proof file privately (if provided)
  let savedStorageKey: string | null = null;
  let savedMime: string | null = null;
  let savedSize: number | null = null;

  if (fileBuffer && hasFile) {
    try {
      const storageResult = await savePrivateProof(fileBuffer, proofFile.name);
      savedStorageKey = storageResult.storageKey;
      savedMime = storageResult.detectedMime;
      savedSize = storageResult.sizeBytes;
    } catch (err: unknown) {
      console.error("Storage upload failed:", err);
      const msg = err instanceof StorageError ? err.message : "Failed to store proof file securely.";
      return { error: msg };
    }
  }

  // 7. Save submission to database with cryptographic reference token & reward snapshot
  const referenceCode = generateReferenceCode();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.taskSubmission.create({
        data: {
          taskId: task.id,
          submitterName,
          contactInfo,
          proofText: proofText || null,
          proofFileKey: savedStorageKey,
          proofFileName: hasFile ? path.basename(proofFile.name).slice(0, 100) : null,
          proofFileSize: savedSize,
          proofMimeType: savedMime,
          rewardSnapshot: task.rewardInr, // Capture precise snapshot at submission time
          referenceCode,
          status: "PENDING",
        },
      });

      // Increment submission counter on task
      await tx.task.update({
        where: { id: task.id },
        data: { currentSubmissions: { increment: 1 } },
      });
    }, {
      maxWait: 10000,
      timeout: 20000,
    });
  } catch (dbError) {
    console.error("Database submission transaction failed:", dbError);

    // Clean up orphaned stored file if database write failed
    if (savedStorageKey && process.env.STORAGE_PROVIDER !== "supabase") {
      try {
        const localPath = path.resolve(
          process.cwd(),
          process.env.LOCAL_STORAGE_DIR || "./storage/private_proofs",
          savedStorageKey
        );
        if (fs.existsSync(localPath)) {
          await fs.promises.unlink(localPath);
        }
      } catch (cleanupErr) {
        console.error("Failed to clean up orphaned file:", cleanupErr);
      }
    }

    return { error: "Failed to record your submission. Please try again." };
  }

  // 8. Redirect to the confirmation page
  redirect(`/submissions/${referenceCode}/confirmed`);
}
