import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  creditApprovedSubmissionAtomic,
  createWithdrawalRequestAtomic,
  updateWithdrawalStatusAtomic,
  getOrCreateUserWallet,
  getUserWalletSummary,
  inrToPaise,
  paiseToInrString,
  isValidUpiSyntax,
} from "../src/lib/wallet";
import { generateReferenceCode } from "../src/lib/reference";
import { executeReviewSubmission } from "../src/app/admin/submissions/actions";
import { updateWithdrawalStatusAction } from "../src/app/admin/withdrawals/actions";

describe("Milestone 7: Wallet, Earnings, Transactions & Withdrawals", () => {
  let testAdmin: { id: string; email: string; name: string };
  let testUser1: { id: string; name: string; contactInfo: string };
  let testUser2: { id: string; name: string; contactInfo: string };
  let testTask: { id: string; title: string; rewardInr: Prisma.Decimal };

  beforeAll(async () => {
    await prisma.$connect();

    // 1. Ensure test admin exists
    let admin = await prisma.adminUser.findFirst({
      where: { email: "admin@microtask.local" },
    });
    if (!admin) {
      admin = await prisma.adminUser.create({
        data: {
          email: "admin@microtask.local",
          passwordHash: "test_hash",
          name: "Test Administrator",
        },
      });
    }
    testAdmin = admin;

    // 2. Ensure test users exist
    testUser1 = await prisma.user.upsert({
      where: { contactInfo: "+919876543210" },
      update: { name: "Aarav Patel" },
      create: {
        name: "Aarav Patel",
        contactInfo: "+919876543210",
        passwordHash: "$2a$12$dummyhashforuser1testingonly",
      },
    });

    testUser2 = await prisma.user.upsert({
      where: { contactInfo: "+919123456789" },
      update: { name: "Diya Sharma" },
      create: {
        name: "Diya Sharma",
        contactInfo: "+919123456789",
        passwordHash: "$2a$12$dummyhashforuser2testingonly",
      },
    });

    // 3. Create or find active test task
    let task = await prisma.task.findFirst({
      where: { title: "Wallet Test Task" },
    });
    if (!task) {
      task = await prisma.task.create({
        data: {
          title: "Wallet Test Task",
          description: "Task designed to test wallet crediting logic.",
          instructions: "Perform testing instructions.",
          rewardInr: new Prisma.Decimal("35.50"),
          proofRequirements: "Screenshot or text proof.",
          proofType: "TEXT",
          status: "ACTIVE",
        },
      });
    }
    testTask = task;
  });

  afterAll(async () => {
    // Clean up test data if needed
  });

  describe("Unit & Syntax Validations", () => {
    it("converts INR to integer paise precisely with zero floating point drift", () => {
      expect(inrToPaise(25)).toBe(2500);
      expect(inrToPaise(35.5)).toBe(3550);
      expect(inrToPaise("27.25")).toBe(2725);
      expect(inrToPaise(new Prisma.Decimal("100.00"))).toBe(10000);
    });

    it("converts paise back to standard 2-decimal INR string", () => {
      expect(paiseToInrString(2500)).toBe("25.00");
      expect(paiseToInrString(3550)).toBe("35.50");
      expect(paiseToInrString(2725)).toBe("27.25");
    });

    it("validates UPI ID format syntax strictly", () => {
      expect(isValidUpiSyntax("user@okhdfcbank")).toBe(true);
      expect(isValidUpiSyntax("9876543210@paytm")).toBe(true);
      expect(isValidUpiSyntax("john.doe@ibl")).toBe(true);
      expect(isValidUpiSyntax("invalid-upi")).toBe(false);
      expect(isValidUpiSyntax("@bank")).toBe(false);
      expect(isValidUpiSyntax("user@")).toBe(false);
      expect(isValidUpiSyntax("")).toBe(false);
    });
  });

  describe("Task Approval & Wallet Crediting", () => {
    it("approving a submission credits the correct reward to the user's wallet", async () => {
      // 1. Create a submission
      const ref = generateReferenceCode();
      const submission = await prisma.taskSubmission.create({
        data: {
          taskId: testTask.id,
          userId: testUser1.id,
          submitterName: testUser1.name,
          contactInfo: testUser1.contactInfo,
          rewardSnapshot: new Prisma.Decimal("50.00"),
          referenceCode: ref,
          status: "PENDING",
        },
      });

      // Get initial wallet balance
      const initialWallet = await getOrCreateUserWallet(testUser1.id);
      const initialBalance = initialWallet.availablePaise;

      // 2. Approve submission via executeReviewSubmission
      const reviewResult = await executeReviewSubmission({
        adminId: testAdmin.id,
        submissionId: submission.id,
        action: "APPROVED",
        reason: "Valid proof verified",
      });

      expect(reviewResult.success).toBe(true);
      expect(reviewResult.newStatus).toBe("APPROVED");

      // Verify transaction created
      const tx = await prisma.walletTransaction.findUnique({
        where: { submissionId: submission.id },
      });
      expect(tx).not.toBeNull();
      expect(tx?.type).toBe("EARNING");
      expect(tx?.amountPaise).toBe(5000); // ₹50.00 = 5000 paise
      expect(tx?.userId).toBe(testUser1.id);

      // Verify wallet balance incremented
      const updatedWallet = await prisma.wallet.findUnique({
        where: { userId: testUser1.id },
      });
      expect(updatedWallet?.availablePaise).toBe(initialBalance + 5000);
    });

    it("repeated approval does not duplicate earnings (idempotency guard)", async () => {
      // Create a submission
      const ref = generateReferenceCode();
      const submission = await prisma.taskSubmission.create({
        data: {
          taskId: testTask.id,
          userId: testUser1.id,
          submitterName: testUser1.name,
          contactInfo: testUser1.contactInfo,
          rewardSnapshot: new Prisma.Decimal("30.00"),
          referenceCode: ref,
          status: "PENDING",
        },
      });

      // Approve once
      const firstReview = await executeReviewSubmission({
        adminId: testAdmin.id,
        submissionId: submission.id,
        action: "APPROVED",
      });
      expect(firstReview.success).toBe(true);

      const walletAfterFirst = await prisma.wallet.findUnique({
        where: { userId: testUser1.id },
      });

      // Attempt second approval directly on atomic crediting function
      const secondCredit = await prisma.$transaction(async (tx) => {
        return await creditApprovedSubmissionAtomic({
          submissionId: submission.id,
          adminId: testAdmin.id,
          tx,
        });
      });

      // Idempotency: credited is false, alreadyCredited is true
      expect(secondCredit.credited).toBe(false);
      expect(secondCredit.alreadyCredited).toBe(true);

      // Wallet balance must NOT have increased
      const walletAfterSecond = await prisma.wallet.findUnique({
        where: { userId: testUser1.id },
      });
      expect(walletAfterSecond?.availablePaise).toBe(walletAfterFirst?.availablePaise);
    });

    it("unapproved or rejected submissions cannot generate earnings", async () => {
      const ref = generateReferenceCode();
      const submission = await prisma.taskSubmission.create({
        data: {
          taskId: testTask.id,
          userId: testUser2.id,
          submitterName: testUser2.name,
          contactInfo: testUser2.contactInfo,
          rewardSnapshot: new Prisma.Decimal("40.00"),
          referenceCode: ref,
          status: "PENDING",
        },
      });

      const initialWallet = await getOrCreateUserWallet(testUser2.id);
      const initialBalance = initialWallet.availablePaise;

      // Reject submission
      const reviewResult = await executeReviewSubmission({
        adminId: testAdmin.id,
        submissionId: submission.id,
        action: "REJECTED",
        reason: "Proof screenshot is blurry and incomplete.",
      });

      expect(reviewResult.success).toBe(true);
      expect(reviewResult.newStatus).toBe("REJECTED");

      // Verify no wallet transaction was created
      const tx = await prisma.walletTransaction.findUnique({
        where: { submissionId: submission.id },
      });
      expect(tx).toBeNull();

      // Wallet balance unchanged
      const wallet = await prisma.wallet.findUnique({
        where: { userId: testUser2.id },
      });
      expect(wallet?.availablePaise).toBe(initialBalance);
    });
  });

  describe("Withdrawal Rules & Atomic Balance Reservation", () => {
    it("withdrawal below ₹25 is rejected with validation error", async () => {
      const result = await createWithdrawalRequestAtomic({
        userId: testUser1.id,
        realFullName: "Aarav Patel",
        upiId: "aarav@okhdfcbank",
        amountInr: 20, // below ₹25
      });

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.amount).toContain("Minimum withdrawal amount is ₹25");
    });

    it("withdrawal above available balance is rejected", async () => {
      const wallet = await getOrCreateUserWallet(testUser2.id);
      const currentAvailable = wallet.availablePaise / 100;

      const result = await createWithdrawalRequestAtomic({
        userId: testUser2.id,
        realFullName: "Diya Sharma",
        upiId: "diya@paytm",
        amountInr: currentAvailable + 500, // exceeds available
      });

      expect(result.success).toBe(false);
      expect(result.fieldErrors?.amount).toContain("Insufficient available balance");
    });

    it("concurrent withdrawals cannot overspend the wallet", async () => {
      // Set testUser2 balance to exactly ₹30 (3000 paise)
      await prisma.wallet.update({
        where: { userId: testUser2.id },
        data: { availablePaise: 3000, reservedPaise: 0 },
      });

      // Fire two concurrent withdrawal requests for ₹25 each (total ₹50, which exceeds ₹30)
      const results = await Promise.all([
        createWithdrawalRequestAtomic({
          userId: testUser2.id,
          realFullName: "Diya Sharma",
          upiId: "diya@paytm",
          amountInr: 25,
        }),
        createWithdrawalRequestAtomic({
          userId: testUser2.id,
          realFullName: "Diya Sharma",
          upiId: "diya@paytm",
          amountInr: 25,
        }),
      ]);

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      // Exactly ONE must succeed and the other MUST fail with insufficient balance!
      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(1);
      expect(failed[0].fieldErrors?.amount).toContain("Insufficient available balance");

      // Verify wallet has ₹5 available and ₹25 reserved (no negative balance!)
      const wallet = await prisma.wallet.findUnique({
        where: { userId: testUser2.id },
      });
      expect(wallet?.availablePaise).toBe(500); // ₹5.00
      expect(wallet?.reservedPaise).toBe(2500); // ₹25.00
    });
  });

  describe("Withdrawal Status Workflow & Fund Settlement", () => {
    it("approved withdrawals remain reserved", async () => {
      // Find the pending withdrawal from previous test
      const pendingWithdrawal = await prisma.withdrawalRequest.findFirst({
        where: { userId: testUser2.id, status: "PENDING" },
      });
      expect(pendingWithdrawal).toBeDefined();

      const walletBefore = await prisma.wallet.findUnique({
        where: { userId: testUser2.id },
      });

      // Admin approves the request
      const updateRes = await updateWithdrawalStatusAtomic({
        withdrawalId: pendingWithdrawal!.id,
        adminId: testAdmin.id,
        targetStatus: "APPROVED",
      });
      expect(updateRes.success).toBe(true);

      // Status updated to APPROVED
      const updatedReq = await prisma.withdrawalRequest.findUnique({
        where: { id: pendingWithdrawal!.id },
      });
      expect(updatedReq?.status).toBe("APPROVED");

      // Funds remain reserved (balance unchanged)
      const walletAfter = await prisma.wallet.findUnique({
        where: { userId: testUser2.id },
      });
      expect(walletAfter?.availablePaise).toBe(walletBefore?.availablePaise);
      expect(walletAfter?.reservedPaise).toBe(walletBefore?.reservedPaise);
    });

    it("paid withdrawals finalize reservation and increment totalPaid exactly once", async () => {
      const approvedWithdrawal = await prisma.withdrawalRequest.findFirst({
        where: { userId: testUser2.id, status: "APPROVED" },
      });
      expect(approvedWithdrawal).toBeDefined();

      const walletBefore = await prisma.wallet.findUnique({
        where: { userId: testUser2.id },
      });

      // Mark PAID
      const paidRes = await updateWithdrawalStatusAtomic({
        withdrawalId: approvedWithdrawal!.id,
        adminId: testAdmin.id,
        targetStatus: "PAID",
        paymentRef: "UPI/998877665544",
      });
      expect(paidRes.success).toBe(true);

      const walletAfter = await prisma.wallet.findUnique({
        where: { userId: testUser2.id },
      });

      // Reserved paise decremented by withdrawal amount
      expect(walletAfter?.reservedPaise).toBe(walletBefore!.reservedPaise - approvedWithdrawal!.amountPaise);
      // Total paid paise incremented
      expect(walletAfter?.totalPaidPaise).toBe(walletBefore!.totalPaidPaise + approvedWithdrawal!.amountPaise);

      // Attempting to mark PAID again must fail
      const repeatPaid = await updateWithdrawalStatusAtomic({
        withdrawalId: approvedWithdrawal!.id,
        adminId: testAdmin.id,
        targetStatus: "PAID",
      });
      expect(repeatPaid.success).toBe(false);
      expect(repeatPaid.error).toContain("already been finalized");
    });

    it("rejected withdrawals release reserved funds back to available balance exactly once", async () => {
      // 1. Give user1 ₹40 available and create a withdrawal for ₹30
      await prisma.wallet.update({
        where: { userId: testUser1.id },
        data: { availablePaise: 4000, reservedPaise: 0 },
      });

      const reqResult = await createWithdrawalRequestAtomic({
        userId: testUser1.id,
        realFullName: "Aarav Patel",
        upiId: "aarav@okhdfcbank",
        amountInr: 30,
      });
      expect(reqResult.success).toBe(true);

      const walletAfterRequest = await prisma.wallet.findUnique({
        where: { userId: testUser1.id },
      });
      expect(walletAfterRequest?.availablePaise).toBe(1000); // ₹10 remaining
      expect(walletAfterRequest?.reservedPaise).toBe(3000); // ₹30 reserved

      // 2. Reject the withdrawal with reason
      const rejectRes = await updateWithdrawalStatusAtomic({
        withdrawalId: reqResult.withdrawalId!,
        adminId: testAdmin.id,
        targetStatus: "REJECTED",
        reason: "Name on bank account does not match user account.",
      });
      expect(rejectRes.success).toBe(true);

      // 3. Funds released back: available is 4000 (₹40), reserved is 0
      const walletAfterReject = await prisma.wallet.findUnique({
        where: { userId: testUser1.id },
      });
      expect(walletAfterReject?.availablePaise).toBe(4000);
      expect(walletAfterReject?.reservedPaise).toBe(0);

      // Check transaction ledger record for release
      const releaseTx = await prisma.walletTransaction.findFirst({
        where: {
          withdrawalId: reqResult.withdrawalId,
          type: "WITHDRAWAL_RELEASE",
        },
      });
      expect(releaseTx).toBeDefined();
      expect(releaseTx?.amountPaise).toBe(3000);

      // 4. Repeated rejection must NOT release funds twice
      const repeatReject = await updateWithdrawalStatusAtomic({
        withdrawalId: reqResult.withdrawalId!,
        adminId: testAdmin.id,
        targetStatus: "REJECTED",
        reason: "Repeated rejection attempt",
      });
      expect(repeatReject.success).toBe(false);
      expect(repeatReject.error).toContain("already been REJECTED");

      const walletAfterRepeat = await prisma.wallet.findUnique({
        where: { userId: testUser1.id },
      });
      expect(walletAfterRepeat?.availablePaise).toBe(4000);
    });
  });

  describe("Ledger Integrity & Task Deletion Resilience", () => {
    it("historical financial transactions survive task deletion", async () => {
      // Create a temporary task
      const tempTask = await prisma.task.create({
        data: {
          title: "Temporary Deletion Task",
          description: "Task to verify foreign key resilience.",
          instructions: "Test instructions.",
          rewardInr: new Prisma.Decimal("25.00"),
          proofRequirements: "Requirements",
          status: "ACTIVE",
        },
      });

      // Create and approve submission
      const sub = await prisma.taskSubmission.create({
        data: {
          taskId: tempTask.id,
          userId: testUser1.id,
          submitterName: testUser1.name,
          contactInfo: testUser1.contactInfo,
          rewardSnapshot: new Prisma.Decimal("25.00"),
          referenceCode: generateReferenceCode(),
          status: "PENDING",
        },
      });

      await executeReviewSubmission({
        adminId: testAdmin.id,
        submissionId: sub.id,
        action: "APPROVED",
      });

      // Verify transaction exists with taskId
      const txBefore = await prisma.walletTransaction.findUnique({
        where: { submissionId: sub.id },
      });
      expect(txBefore?.taskId).toBe(tempTask.id);

      // Delete the submission and task (or simulate task cleanup)
      // Since submission has foreign key Restrict on Task, delete submission review log first
      await prisma.submissionReviewLog.deleteMany({ where: { submissionId: sub.id } });
      await prisma.taskSubmission.delete({ where: { id: sub.id } });
      await prisma.task.delete({ where: { id: tempTask.id } });

      // Transaction record MUST survive with taskId set to null via SetNull
      const txAfter = await prisma.walletTransaction.findUnique({
        where: { id: txBefore!.id },
      });
      expect(txAfter).toBeDefined();
      expect(txAfter?.amountPaise).toBe(2500);
      expect(txAfter?.type).toBe("EARNING");
    });

    it("wallet summary returns correct persistent balances and history", async () => {
      const summary = await getUserWalletSummary(testUser1.id);
      expect(summary).not.toBeNull();
      expect(summary?.user.id).toBe(testUser1.id);
      expect(typeof summary?.availableInr).toBe("string");
      expect(Array.isArray(summary?.transactions)).toBe(true);
      expect(summary?.transactions.length).toBeGreaterThan(0);
    });
  });
});
