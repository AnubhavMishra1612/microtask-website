import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

export const MIN_WITHDRAWAL_INR = 25;
export const MIN_WITHDRAWAL_PAISE = 2500;

export const UPI_ID_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

/**
 * Converts INR (Decimal/number/string) to integer paise (1 INR = 100 paise)
 */
export function inrToPaise(amount: number | string | Prisma.Decimal): number {
  const num = typeof amount === "number" ? amount : parseFloat(amount.toString());
  if (!Number.isFinite(num) || isNaN(num) || num < 0) {
    throw new Error("Invalid INR amount");
  }
  return Math.round(num * 100);
}

/**
 * Converts integer paise to INR string with 2 decimal places
 */
export function paiseToInrString(paise: number): string {
  return (paise / 100).toFixed(2);
}

/**
 * Validates UPI ID syntax.
 * Note: Syntax validation does not guarantee the UPI ID exists or belongs to the specified person.
 */
export function isValidUpiSyntax(upiId: string): boolean {
  if (!upiId || typeof upiId !== "string") return false;
  const trimmed = upiId.trim();
  return trimmed.length >= 5 && trimmed.length <= 128 && UPI_ID_REGEX.test(trimmed);
}

/**
 * Finds or creates a wallet for a user
 */
export async function getOrCreateUserWallet(
  userId: string,
  txClient?: Prisma.TransactionClient
) {
  const client = txClient || prisma;
  let wallet = await client.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    wallet = await client.wallet.create({
      data: {
        userId,
        availablePaise: 0,
        reservedPaise: 0,
        totalPaidPaise: 0,
      },
    });
  }

  return wallet;
}

export interface UserWalletSummary {
  user: {
    id: string;
    name: string;
    contactInfo: string;
  };
  availableInr: string;
  availablePaise: number;
  reservedInr: string;
  reservedPaise: number;
  totalPaidInr: string;
  totalPaidPaise: number;
  totalApprovedEarningsInr: string;
  pendingEarningsInr: string;
  pendingSubmissionsCount: number;
  transactions: Array<{
    id: string;
    type: string;
    amountInr: string;
    amountPaise: number;
    description: string;
    status: string;
    createdAt: string;
  }>;
  withdrawalRequests: Array<{
    id: string;
    realFullName: string;
    upiId: string;
    amountInr: string;
    amountPaise: number;
    status: string;
    rejectionReason: string | null;
    paymentRef: string | null;
    createdAt: string;
    reviewedAt: string | null;
    paidAt: string | null;
  }>;
}

/**
 * Fetches complete wallet summary, pending earnings, and transaction history for a user
 */
export async function getUserWalletSummary(userId: string): Promise<UserWalletSummary | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, contactInfo: true },
  });

  if (!user) return null;

  const wallet = await getOrCreateUserWallet(userId);

  // Compute pending earnings from pending submissions
  const pendingSubmissions = await prisma.taskSubmission.findMany({
    where: {
      userId,
      status: "PENDING",
    },
    select: {
      rewardSnapshot: true,
    },
  });

  const pendingPaise = pendingSubmissions.reduce((acc, sub) => {
    return acc + inrToPaise(sub.rewardSnapshot);
  }, 0);

  // Compute total approved earnings from transactions
  const approvedEarningsAgg = await prisma.walletTransaction.aggregate({
    where: {
      userId,
      type: "EARNING",
      status: "COMPLETED",
    },
    _sum: {
      amountPaise: true,
    },
  });
  const approvedEarningsPaise = approvedEarningsAgg._sum.amountPaise || 0;

  // Fetch recent transactions (ordered descending)
  const transactions = await prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Fetch withdrawal requests
  const withdrawalRequests = await prisma.withdrawalRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return {
    user,
    availableInr: paiseToInrString(wallet.availablePaise),
    availablePaise: wallet.availablePaise,
    reservedInr: paiseToInrString(wallet.reservedPaise),
    reservedPaise: wallet.reservedPaise,
    totalPaidInr: paiseToInrString(wallet.totalPaidPaise),
    totalPaidPaise: wallet.totalPaidPaise,
    totalApprovedEarningsInr: paiseToInrString(approvedEarningsPaise),
    pendingEarningsInr: paiseToInrString(pendingPaise),
    pendingSubmissionsCount: pendingSubmissions.length,
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amountInr: paiseToInrString(t.amountPaise),
      amountPaise: t.amountPaise,
      description: t.description,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    })),
    withdrawalRequests: withdrawalRequests.map((w) => ({
      id: w.id,
      realFullName: w.realFullName,
      upiId: w.upiId,
      amountInr: paiseToInrString(w.amountPaise),
      amountPaise: w.amountPaise,
      status: w.status,
      rejectionReason: w.rejectionReason,
      paymentRef: w.paymentRef,
      createdAt: w.createdAt.toISOString(),
      reviewedAt: w.reviewedAt ? w.reviewedAt.toISOString() : null,
      paidAt: w.paidAt ? w.paidAt.toISOString() : null,
    })),
  };
}

/**
 * Credits task reward to user wallet atomically and idempotently upon admin approval.
 * Enforces database-level idempotency via unique submissionId on WalletTransaction.
 */
export async function creditApprovedSubmissionAtomic({
  submissionId,
  adminId,
  tx,
}: {
  submissionId: string;
  adminId: string;
  tx: Prisma.TransactionClient;
}): Promise<{ credited: boolean; amountPaise: number; alreadyCredited?: boolean }> {
  // Check if this submission has already been credited
  const existingCredit = await tx.walletTransaction.findUnique({
    where: { submissionId },
  });

  if (existingCredit) {
    return {
      credited: false,
      alreadyCredited: true,
      amountPaise: existingCredit.amountPaise,
    };
  }

  // Fetch submission details
  const submission = await tx.taskSubmission.findUnique({
    where: { id: submissionId },
    include: { task: true },
  });

  if (!submission) {
    throw new Error("Submission not found for wallet crediting");
  }

  // Find or create User based on submission contactInfo
  let targetUserId = submission.userId;
  if (!targetUserId) {
    let user = await tx.user.findUnique({
      where: { contactInfo: submission.contactInfo },
    });

    if (!user) {
      user = await tx.user.create({
        data: {
          name: submission.submitterName,
          contactInfo: submission.contactInfo,
        },
      });
    }

    targetUserId = user.id;

    // Link submission to user
    await tx.taskSubmission.update({
      where: { id: submission.id },
      data: { userId: targetUserId },
    });
  }

  // Ensure user wallet exists
  const wallet = await getOrCreateUserWallet(targetUserId, tx);

  const rewardPaise = inrToPaise(submission.rewardSnapshot);
  if (rewardPaise <= 0) {
    return { credited: false, amountPaise: 0 };
  }

  // Create WalletTransaction with unique submissionId (hard DB idempotency guard)
  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      userId: targetUserId,
      type: "EARNING",
      amountPaise: rewardPaise,
      amountInr: submission.rewardSnapshot,
      submissionId: submission.id,
      taskId: submission.taskId,
      status: "COMPLETED",
      description: `Task reward credited for "${submission.task.title}" (Ref: ${submission.referenceCode})`,
    },
  });

  // Increment wallet available balance
  await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      availablePaise: { increment: rewardPaise },
    },
  });

  return { credited: true, amountPaise: rewardPaise };
}

/**
 * Creates a withdrawal request atomically.
 * Deducts and reserves the amount from available balance in a single atomic transaction.
 * Concurrency safe: prevents double spending.
 */
export async function createWithdrawalRequestAtomic({
  userId,
  realFullName,
  upiId,
  amountInr,
}: {
  userId: string;
  realFullName: string;
  upiId: string;
  amountInr: number;
}): Promise<{
  success: boolean;
  withdrawalId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}> {
  const trimmedName = realFullName?.trim();
  const trimmedUpi = upiId?.trim();

  const fieldErrors: Record<string, string> = {};

  if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100) {
    fieldErrors.realFullName = "Full name must be between 2 and 100 characters.";
  }

  if (!isValidUpiSyntax(trimmedUpi)) {
    fieldErrors.upiId = "Please enter a valid UPI ID (e.g. yourname@okhdfcbank or 9876543210@paytm).";
  }

  if (typeof amountInr !== "number" || !Number.isFinite(amountInr) || isNaN(amountInr)) {
    fieldErrors.amount = "Withdrawal amount must be a valid number.";
  } else if (amountInr < MIN_WITHDRAWAL_INR) {
    fieldErrors.amount = `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL_INR}.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  const amountPaise = inrToPaise(amountInr);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch wallet
      const wallet = await getOrCreateUserWallet(userId, tx);

      if (wallet.availablePaise < amountPaise) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // 2. Concurrency-Safe Atomic Balance Update
      // Decrement availablePaise ONLY if availablePaise >= amountPaise
      const updateResult = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          availablePaise: { gte: amountPaise },
        },
        data: {
          availablePaise: { decrement: amountPaise },
          reservedPaise: { increment: amountPaise },
        },
      });

      if (updateResult.count === 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // 3. Create Withdrawal Request
      const withdrawal = await tx.withdrawalRequest.create({
        data: {
          userId,
          realFullName: trimmedName,
          upiId: trimmedUpi,
          amountPaise,
          amountInr: new Prisma.Decimal(paiseToInrString(amountPaise)),
          status: "PENDING",
        },
      });

      // 4. Create Ledger Transaction for the reservation
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: "WITHDRAWAL_RESERVE",
          amountPaise,
          amountInr: new Prisma.Decimal(paiseToInrString(amountPaise)),
          withdrawalId: withdrawal.id,
          status: "COMPLETED",
          description: `Withdrawal request #${withdrawal.id.slice(-6).toUpperCase()} reserved for UPI: ${trimmedUpi}`,
        },
      });

      return withdrawal;
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    return { success: true, withdrawalId: result.id };
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      return {
        success: false,
        fieldErrors: {
          amount: "Insufficient available balance for this withdrawal amount.",
        },
      };
    }
    console.error("Failed to create withdrawal request:", error);
    return { success: false, error: "Failed to process withdrawal request. Please try again." };
  }
}

/**
 * Valid transitions for withdrawal statuses:
 * PENDING -> APPROVED, PROCESSING, REJECTED
 * APPROVED -> PROCESSING, PAID, REJECTED
 * PROCESSING -> PAID, REJECTED
 * PAID -> (Terminal)
 * REJECTED -> (Terminal)
 */
export async function updateWithdrawalStatusAtomic({
  withdrawalId,
  adminId,
  targetStatus,
  reason,
  paymentRef,
}: {
  withdrawalId: string;
  adminId: string;
  targetStatus: "APPROVED" | "PROCESSING" | "PAID" | "REJECTED";
  reason?: string;
  paymentRef?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    return await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawalRequest.findUnique({
        where: { id: withdrawalId },
        include: { user: true },
      });

      if (!withdrawal) {
        return { success: false, error: "Withdrawal request not found." };
      }

      const currentStatus = withdrawal.status;

      // Terminal states cannot be transitioned
      if (currentStatus === "PAID") {
        return { success: false, error: "This withdrawal has already been finalized as PAID." };
      }
      if (currentStatus === "REJECTED") {
        return { success: false, error: "This withdrawal has already been REJECTED and funds released." };
      }

      // Validate allowed transitions
      const validTransitions: Record<string, string[]> = {
        PENDING: ["APPROVED", "PROCESSING", "REJECTED"],
        APPROVED: ["PROCESSING", "PAID", "REJECTED"],
        PROCESSING: ["PAID", "REJECTED"],
      };

      if (!validTransitions[currentStatus]?.includes(targetStatus)) {
        return {
          success: false,
          error: `Cannot transition withdrawal from ${currentStatus} to ${targetStatus}.`,
        };
      }

      const wallet = await getOrCreateUserWallet(withdrawal.userId, tx);

      // Handle REJECTED: Release reserved funds back to available balance exactly once
      if (targetStatus === "REJECTED") {
        if (!reason || reason.trim().length < 5) {
          return { success: false, error: "A rejection reason of at least 5 characters is required." };
        }

        // Concurrency guard: update only if still in non-terminal state
        const updateCount = await tx.withdrawalRequest.updateMany({
          where: {
            id: withdrawalId,
            status: { in: ["PENDING", "APPROVED", "PROCESSING"] },
          },
          data: {
            status: "REJECTED",
            rejectionReason: reason.trim(),
            reviewedByAdminId: adminId,
            reviewedAt: new Date(),
          },
        });

        if (updateCount.count === 0) {
          throw new Error("CONFLICT_CONCURRENT_STATUS_CHANGE");
        }

        // Decrement reservedPaise and increment availablePaise atomically
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            reservedPaise: { decrement: withdrawal.amountPaise },
            availablePaise: { increment: withdrawal.amountPaise },
          },
        });

        // Record release transaction
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: withdrawal.userId,
            type: "WITHDRAWAL_RELEASE",
            amountPaise: withdrawal.amountPaise,
            amountInr: withdrawal.amountInr,
            withdrawalId: withdrawal.id,
            status: "COMPLETED",
            description: `Withdrawal request #${withdrawal.id.slice(-6).toUpperCase()} rejected. Funds released back to wallet. Reason: ${reason.trim()}`,
          },
        });

        // Record audit log
        await tx.withdrawalReviewLog.create({
          data: {
            withdrawalId: withdrawal.id,
            adminId,
            action: "REJECTED",
            reason: reason.trim(),
          },
        });

        return { success: true };
      }

      // Handle PAID: Finalize reservation and mark paid exactly once
      if (targetStatus === "PAID") {
        const updateCount = await tx.withdrawalRequest.updateMany({
          where: {
            id: withdrawalId,
            status: { in: ["PENDING", "APPROVED", "PROCESSING"] },
          },
          data: {
            status: "PAID",
            paymentRef: paymentRef?.trim() || null,
            reviewedByAdminId: adminId,
            reviewedAt: new Date(),
            paidAt: new Date(),
          },
        });

        if (updateCount.count === 0) {
          throw new Error("CONFLICT_CONCURRENT_STATUS_CHANGE");
        }

        // Decrement reservedPaise and increment totalPaidPaise atomically
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            reservedPaise: { decrement: withdrawal.amountPaise },
            totalPaidPaise: { increment: withdrawal.amountPaise },
          },
        });

        // Record paid transaction
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: withdrawal.userId,
            type: "WITHDRAWAL_PAID",
            amountPaise: withdrawal.amountPaise,
            amountInr: withdrawal.amountInr,
            withdrawalId: withdrawal.id,
            status: "COMPLETED",
            description: `Withdrawal request #${withdrawal.id.slice(-6).toUpperCase()} completed and disbursed to ${withdrawal.upiId}${paymentRef ? ` (Ref: ${paymentRef.trim()})` : ""}`,
          },
        });

        // Record audit log
        await tx.withdrawalReviewLog.create({
          data: {
            withdrawalId: withdrawal.id,
            adminId,
            action: "PAID",
            paymentRef: paymentRef?.trim() || null,
            reason: reason?.trim() || "Payment processed and confirmed.",
          },
        });

        return { success: true };
      }

      // Handle APPROVED or PROCESSING: Funds remain reserved
      const updateCount = await tx.withdrawalRequest.updateMany({
        where: {
          id: withdrawalId,
          status: currentStatus,
        },
        data: {
          status: targetStatus,
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
          adminNotes: reason?.trim() || null,
        },
      });

      if (updateCount.count === 0) {
        throw new Error("CONFLICT_CONCURRENT_STATUS_CHANGE");
      }

      await tx.withdrawalReviewLog.create({
        data: {
          withdrawalId: withdrawal.id,
          adminId,
          action: targetStatus,
          reason: reason?.trim() || `Marked as ${targetStatus}.`,
          paymentRef: paymentRef?.trim() || null,
        },
      });

      return { success: true };
    }, {
      maxWait: 10000,
      timeout: 20000,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "CONFLICT_CONCURRENT_STATUS_CHANGE") {
      return { success: false, error: "Conflict detected: This withdrawal status was modified by another operation." };
    }
    console.error("Error updating withdrawal status:", error);
    return { success: false, error: "An unexpected error occurred while updating the withdrawal status." };
  }
}
