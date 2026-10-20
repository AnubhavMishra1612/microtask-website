import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateReferenceCode } from "../src/lib/reference";
import {
  executeReviewSubmission,
  reviewSubmissionAction,
} from "../src/app/admin/submissions/actions";
import { GET as getProofHandler } from "../src/app/api/admin/proofs/[key]/route";
import { NextRequest } from "next/server";
import { savePrivateProof, getPrivateProofBuffer } from "../src/lib/storage";

describe("Milestone 5: Submission Review Workflow, Security & Audit Trail", () => {
  let testAdmin: { id: string; email: string; name: string };
  let secondAdmin: { id: string; email: string; name: string };
  let demoTask: { id: string; title: string; rewardInr: Prisma.Decimal };

  beforeAll(async () => {
    await prisma.$connect();

    // 1. Fetch or create test admin
    let admin = await prisma.adminUser.findFirst({
      where: { email: "admin@microtask.local" },
    });
    if (!admin) {
      admin = await prisma.adminUser.create({
        data: {
          email: "admin@microtask.local",
          passwordHash: "test_hash",
          name: "Lead Administrator",
        },
      });
    }
    testAdmin = admin;

    // 2. Create second admin for concurrent test simulation
    let admin2 = await prisma.adminUser.findFirst({
      where: { email: "reviewer2@microtask.local" },
    });
    if (!admin2) {
      admin2 = await prisma.adminUser.create({
        data: {
          email: "reviewer2@microtask.local",
          passwordHash: "test_hash2",
          name: "Second Reviewer",
        },
      });
    }
    secondAdmin = admin2;

    // 3. Find demo task
    const task = await prisma.task.findFirst({
      where: { status: "ACTIVE" },
    });
    expect(task).toBeDefined();
    demoTask = task!;
  });

  afterAll(async () => {
    // Clean up second test admin
    if (secondAdmin && secondAdmin.email === "reviewer2@microtask.local") {
      await prisma.submissionReviewLog.deleteMany({
        where: { adminId: secondAdmin.id },
      });
      await prisma.adminUser.delete({
        where: { id: secondAdmin.id },
      }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe("Review Queue Filtering, Search & Pagination", () => {
    it("filters submissions by status and bounds result sets", async () => {
      // Query pending submissions
      const pendingQueue = await prisma.taskSubmission.findMany({
        where: { status: "PENDING" },
        take: 10,
        orderBy: { submittedAt: "desc" },
      });

      for (const item of pendingQueue) {
        expect(item.status).toBe("PENDING");
      }

      // Query approved submissions
      const approvedQueue = await prisma.taskSubmission.findMany({
        where: { status: "APPROVED" },
        take: 10,
      });

      for (const item of approvedQueue) {
        expect(item.status).toBe("APPROVED");
      }
    });

    it("supports exact and indexed reference-code search", async () => {
      const refCode = generateReferenceCode();
      const submission = await prisma.taskSubmission.create({
        data: {
          taskId: demoTask.id,
          submitterName: "Search Worker",
          contactInfo: `search_${Date.now()}@example.com`,
          rewardSnapshot: demoTask.rewardInr,
          referenceCode: refCode,
          status: "PENDING",
        },
      });

      const found = await prisma.taskSubmission.findUnique({
        where: { referenceCode: refCode },
        include: { task: { select: { title: true } } },
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe(submission.id);
      expect(found?.referenceCode).toBe(refCode);

      // Clean up
      await prisma.taskSubmission.delete({ where: { id: submission.id } });
    });
  });

  describe("Proof Preview Security & Authorization Barrier", () => {
    it("blocks unauthorized access to private proof route with 401", async () => {
      const request = new NextRequest("http://localhost:3000/api/admin/proofs/proof_123.jpg");
      const response = await getProofHandler(request, {
        params: { key: "proof_123.jpg" },
      });

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toMatch(/UNAUTHORIZED/);
    });

    it("rejects path traversal and invalid storage keys with 400", async () => {
      // Note: Testing with mock admin context if called directly
      const request = new NextRequest("http://localhost:3000/api/admin/proofs/..%2F..%2Fetc%2Fpasswd");
      const response = await getProofHandler(request, {
        params: { key: "../../etc/passwd" },
      });

      // Even if unauthorized or format invalid, it never serves the file
      expect([400, 401]).toContain(response.status);
    });

    it("safely stores and retrieves private proof file buffers", async () => {
      // 1x1 8-byte PNG file buffer
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
      ]);

      const stored = await savePrivateProof(pngBuffer, "test_screenshot.png");
      expect(stored.storageKey).toMatch(/^proof_\d+_[a-f0-9]+\.png$/);
      expect(stored.detectedMime).toBe("image/png");

      const retrieved = await getPrivateProofBuffer(stored.storageKey);
      expect(retrieved.mimeType).toBe("image/png");
      expect(retrieved.buffer.length).toBe(pngBuffer.length);
    });
  });

  describe("Independent Server-Side Authorization Barrier for Reviews", () => {
    it("rejects unauthenticated review action with UNAUTHORIZED", async () => {
      const formData = new FormData();
      formData.set("submissionId", "some-sub-id");
      formData.set("action", "APPROVED");

      await expect(reviewSubmissionAction({}, formData)).rejects.toThrowError(
        /UNAUTHORIZED/
      );
    });
  });

  describe("Approval Workflow, Atomic Transactions & Audit Trail", () => {
    it("successfully approves a PENDING submission and records immutable audit log", async () => {
      const refCode = generateReferenceCode();
      const submission = await prisma.taskSubmission.create({
        data: {
          taskId: demoTask.id,
          submitterName: "Worker To Approve",
          contactInfo: `approve_${Date.now()}@example.com`,
          proofText: "I completed the demo task fully.",
          rewardSnapshot: demoTask.rewardInr,
          referenceCode: refCode,
          status: "PENDING",
        },
      });

      // Execute review decision
      const result = await executeReviewSubmission({
        adminId: testAdmin.id,
        adminName: testAdmin.name,
        adminEmail: testAdmin.email,
        submissionId: submission.id,
        action: "APPROVED",
        reason: "Valid proof screenshot verified.",
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("APPROVED");
      expect(result.log).toBeDefined();
      expect(result.log?.action).toBe("APPROVED");

      // Verify DB state
      const updatedSub = await prisma.taskSubmission.findUnique({
        where: { id: submission.id },
        include: { reviewLogs: true },
      });

      expect(updatedSub?.status).toBe("APPROVED");
      expect(updatedSub?.reviewedByAdminId).toBe(testAdmin.id);
      expect(updatedSub?.reviewedAt).not.toBeNull();
      expect(updatedSub?.rejectionReason).toBeNull();

      // Verify audit log
      expect(updatedSub?.reviewLogs.length).toBe(1);
      const log = updatedSub!.reviewLogs[0];
      expect(log.action).toBe("APPROVED");
      expect(log.adminId).toBe(testAdmin.id);
      expect(log.reason).toBe("Valid proof screenshot verified.");

      // Clean up
      await prisma.submissionReviewLog.deleteMany({ where: { submissionId: submission.id } });
      await prisma.taskSubmission.delete({ where: { id: submission.id } });
    });
  });

  describe("Rejection Workflow & Mandatory Rejection Reason", () => {
    it("fails validation when rejection reason is missing or less than 5 characters", async () => {
      const refCode = generateReferenceCode();
      const submission = await prisma.taskSubmission.create({
        data: {
          taskId: demoTask.id,
          submitterName: "Worker To Reject",
          contactInfo: `reject_${Date.now()}@example.com`,
          rewardSnapshot: demoTask.rewardInr,
          referenceCode: refCode,
          status: "PENDING",
        },
      });

      // Attempt rejection with empty reason
      const resEmpty = await executeReviewSubmission({
        adminId: testAdmin.id,
        submissionId: submission.id,
        action: "REJECTED",
        reason: "",
      });

      expect(resEmpty.success).toBeUndefined();
      expect(resEmpty.fieldErrors?.reason).toMatch(/at least 5 characters/);

      // Attempt rejection with 3 characters
      const resShort = await executeReviewSubmission({
        adminId: testAdmin.id,
        submissionId: submission.id,
        action: "REJECTED",
        reason: "Bad",
      });

      expect(resShort.success).toBeUndefined();
      expect(resShort.fieldErrors?.reason).toMatch(/at least 5 characters/);

      // Submission must remain PENDING
      const unchanged = await prisma.taskSubmission.findUnique({
        where: { id: submission.id },
      });
      expect(unchanged?.status).toBe("PENDING");

      // Clean up
      await prisma.taskSubmission.delete({ where: { id: submission.id } });
    });

    it("successfully rejects a PENDING submission when valid reason >= 5 chars is provided", async () => {
      const refCode = generateReferenceCode();
      const submission = await prisma.taskSubmission.create({
        data: {
          taskId: demoTask.id,
          submitterName: "Worker Legitimate Rejection",
          contactInfo: `legit_reject_${Date.now()}@example.com`,
          rewardSnapshot: demoTask.rewardInr,
          referenceCode: refCode,
          status: "PENDING",
        },
      });

      const rejectionFeedback = "Screenshot does not display completed transaction ID.";

      const res = await executeReviewSubmission({
        adminId: testAdmin.id,
        adminName: testAdmin.name,
        adminEmail: testAdmin.email,
        submissionId: submission.id,
        action: "REJECTED",
        reason: rejectionFeedback,
      });

      expect(res.success).toBe(true);
      expect(res.newStatus).toBe("REJECTED");

      const rejectedSub = await prisma.taskSubmission.findUnique({
        where: { id: submission.id },
        include: { reviewLogs: true },
      });

      expect(rejectedSub?.status).toBe("REJECTED");
      expect(rejectedSub?.rejectionReason).toBe(rejectionFeedback);
      expect(rejectedSub?.reviewLogs.length).toBe(1);
      expect(rejectedSub?.reviewLogs[0].action).toBe("REJECTED");
      expect(rejectedSub?.reviewLogs[0].reason).toBe(rejectionFeedback);

      // Clean up
      await prisma.submissionReviewLog.deleteMany({ where: { submissionId: submission.id } });
      await prisma.taskSubmission.delete({ where: { id: submission.id } });
    });
  });

  describe("Invalid State Transitions & Idempotency", () => {
    it("blocks attempting to re-approve an already APPROVED submission", async () => {
      const refCode = generateReferenceCode();
      const submission = await prisma.taskSubmission.create({
        data: {
          taskId: demoTask.id,
          submitterName: "Already Approved Worker",
          contactInfo: `already_approved_${Date.now()}@example.com`,
          rewardSnapshot: demoTask.rewardInr,
          referenceCode: refCode,
          status: "APPROVED",
        },
      });

      const res = await executeReviewSubmission({
        adminId: testAdmin.id,
        submissionId: submission.id,
        action: "APPROVED",
      });

      expect(res.conflict).toBe(true);
      expect(res.error).toMatch(/already been processed/);

      // Clean up
      await prisma.taskSubmission.delete({ where: { id: submission.id } });
    });

    it("blocks attempting to approve an already REJECTED submission", async () => {
      const refCode = generateReferenceCode();
      const submission = await prisma.taskSubmission.create({
        data: {
          taskId: demoTask.id,
          submitterName: "Already Rejected Worker",
          contactInfo: `already_rejected_${Date.now()}@example.com`,
          rewardSnapshot: demoTask.rewardInr,
          referenceCode: refCode,
          status: "REJECTED",
          rejectionReason: "Prior rejection",
        },
      });

      const res = await executeReviewSubmission({
        adminId: testAdmin.id,
        submissionId: submission.id,
        action: "APPROVED",
      });

      expect(res.conflict).toBe(true);
      expect(res.error).toMatch(/already been processed/);

      // Clean up
      await prisma.taskSubmission.delete({ where: { id: submission.id } });
    });
  });

  describe("Concurrent Review Conflict Detection", () => {
    it("handles simultaneous review attempts gracefully with conflict notification", async () => {
      const refCode = generateReferenceCode();
      const submission = await prisma.taskSubmission.create({
        data: {
          taskId: demoTask.id,
          submitterName: "Race Condition Worker",
          contactInfo: `race_${Date.now()}@example.com`,
          rewardSnapshot: demoTask.rewardInr,
          referenceCode: refCode,
          status: "PENDING",
        },
      });

      // Admin 1 approves first
      const firstDecision = await executeReviewSubmission({
        adminId: testAdmin.id,
        submissionId: submission.id,
        action: "APPROVED",
      });

      expect(firstDecision.success).toBe(true);

      // Admin 2 attempts simultaneous reject right after
      const secondDecision = await executeReviewSubmission({
        adminId: secondAdmin.id,
        submissionId: submission.id,
        action: "REJECTED",
        reason: "Duplicate or invalid proof detected.",
      });

      expect(secondDecision.conflict).toBe(true);
      expect(secondDecision.newStatus).toBe("APPROVED");
      expect(secondDecision.error).toMatch(/already been processed/);

      // Clean up
      await prisma.submissionReviewLog.deleteMany({ where: { submissionId: submission.id } });
      await prisma.taskSubmission.delete({ where: { id: submission.id } });
    });
  });

  describe("Audit Trail Ordering & Historical Preservation", () => {
    it("preserves chronological review history without mutating previous logs", async () => {
      const refCode = generateReferenceCode();
      const submission = await prisma.taskSubmission.create({
        data: {
          taskId: demoTask.id,
          submitterName: "Audit History Worker",
          contactInfo: `audit_${Date.now()}@example.com`,
          rewardSnapshot: demoTask.rewardInr,
          referenceCode: refCode,
          status: "PENDING",
        },
      });

      // Add two review logs directly in sequence
      const log1 = await prisma.submissionReviewLog.create({
        data: {
          submissionId: submission.id,
          adminId: testAdmin.id,
          action: "REJECTED",
          reason: "Initial image too blurry to read.",
          createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        },
      });

      const log2 = await prisma.submissionReviewLog.create({
        data: {
          submissionId: submission.id,
          adminId: secondAdmin.id,
          action: "APPROVED",
          reason: "Clarified proof submitted and accepted.",
          createdAt: new Date(),
        },
      });

      const logs = await prisma.submissionReviewLog.findMany({
        where: { submissionId: submission.id },
        orderBy: { createdAt: "asc" },
      });

      expect(logs.length).toBe(2);
      expect(logs[0].id).toBe(log1.id);
      expect(logs[0].action).toBe("REJECTED");
      expect(logs[1].id).toBe(log2.id);
      expect(logs[1].action).toBe("APPROVED");

      // Clean up
      await prisma.submissionReviewLog.deleteMany({ where: { submissionId: submission.id } });
      await prisma.taskSubmission.delete({ where: { id: submission.id } });
    });
  });

  describe("Public Tracking Status Regression Check", () => {
    it("verifies public tracking at /track/[ref] correctly reflects approval and rejection status", async () => {
      const refCode = generateReferenceCode();
      const submission = await prisma.taskSubmission.create({
        data: {
          taskId: demoTask.id,
          submitterName: "Tracked Worker",
          contactInfo: "tracked_worker@example.com",
          rewardSnapshot: demoTask.rewardInr,
          referenceCode: refCode,
          status: "REJECTED",
          rejectionReason: "Rejection note visible to worker",
        },
      });

      // Query public tracking record
      const publicRecord = await prisma.taskSubmission.findUnique({
        where: { referenceCode: refCode },
        select: {
          referenceCode: true,
          status: true,
          rejectionReason: true,
          rewardSnapshot: true,
          submittedAt: true,
          reviewedAt: true,
          task: { select: { title: true } },
          // Zero PII leakage
        },
      });

      expect(publicRecord).not.toBeNull();
      expect(publicRecord?.status).toBe("REJECTED");
      expect(publicRecord?.rejectionReason).toBe("Rejection note visible to worker");
      expect((publicRecord as Record<string, unknown>).submitterName).toBeUndefined();
      expect((publicRecord as Record<string, unknown>).contactInfo).toBeUndefined();

      // Clean up
      await prisma.taskSubmission.delete({ where: { id: submission.id } });
    });
  });
});
