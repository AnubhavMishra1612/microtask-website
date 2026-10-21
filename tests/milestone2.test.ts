import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { Prisma } from "@prisma/client";
import { verifyPassword } from "../src/lib/auth";
import { generateReferenceCode } from "../src/lib/reference";
import { checkRateLimit } from "../src/lib/rate-limit";
import {
  savePrivateProof,
  getPrivateProofBuffer,
  getPrivateProofSignedUrl,
  deletePrivateProof,
  StorageError,
} from "../src/lib/storage";

describe("Milestone 2: Database Persistence, Seed Verification & Storage Driver", () => {
  beforeAll(async () => {
    // Ensure DB connection is active
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Database Persistence & Seed Verification", () => {
    it("persists the seeded admin user with valid bcrypt password hash", async () => {
      const admin = await prisma.adminUser.findUnique({
        where: { email: "admin@microtask.local" },
      });

      expect(admin).not.toBeNull();
      expect(admin?.email).toBe("admin@microtask.local");
      expect(admin?.name).toBe("Platform Administrator");

      // Verify that stored hash matches the seeded default password
      const isMatch = await verifyPassword("AdminPassword123!", admin!.passwordHash);
      expect(isMatch).toBe(true);
    });

    it("persists all 4 demo tasks with correct PostgreSQL Decimal reward precision", async () => {
      const tasks = await prisma.task.findMany({
        where: { title: { startsWith: "[DEMO]" } },
        orderBy: { createdAt: "asc" },
      });

      expect(tasks.length).toBe(4);

      // Verify Decimal representation
      const surveyTask = tasks.find((t) => t.title.includes("Usability Survey"));
      expect(surveyTask).toBeDefined();
      expect(surveyTask!.rewardInr).toBeInstanceOf(Prisma.Decimal);
      expect(surveyTask!.rewardInr.toString()).toBe("25");
      expect(surveyTask!.status).toBe("ACTIVE");

      const pausedTask = tasks.find((t) => t.title.includes("Paused Task"));
      expect(pausedTask).toBeDefined();
      expect(pausedTask!.status).toBe("PAUSED");
      expect(pausedTask!.rewardInr.toString()).toBe("50");
    });

    it("creates a submission snapshot with Decimal reward and cryptographically unique reference code", async () => {
      const activeTask = await prisma.task.findFirst({
        where: { status: "ACTIVE" },
      });
      expect(activeTask).not.toBeNull();

      const refCode = generateReferenceCode();
      const submission = await prisma.taskSubmission.create({
        data: {
          taskId: activeTask!.id,
          submitterName: "Test Submitter",
          contactInfo: "@test_telegram",
          proofText: "Test proof text for verification",
          rewardSnapshot: activeTask!.rewardInr,
          referenceCode: refCode,
          status: "PENDING",
        },
      });

      expect(submission.id).toBeDefined();
      expect(submission.referenceCode).toBe(refCode);
      expect(submission.rewardSnapshot.toString()).toBe(activeTask!.rewardInr.toString());
      expect(submission.status).toBe("PENDING");

      // Clean up test submission
      await prisma.taskSubmission.delete({ where: { id: submission.id } });
    });

    it("persists rate limit buckets across queries in PostgreSQL", async () => {
      const testKey = `test-ip-${Date.now()}`;

      // First attempt
      const attempt1 = await checkRateLimit({ key: testKey, maxAttempts: 2, windowSeconds: 60 });
      expect(attempt1.allowed).toBe(true);
      expect(attempt1.remaining).toBe(1);

      // Second attempt
      const attempt2 = await checkRateLimit({ key: testKey, maxAttempts: 2, windowSeconds: 60 });
      expect(attempt2.allowed).toBe(true);
      expect(attempt2.remaining).toBe(0);

      // Third attempt (should be blocked)
      const attempt3 = await checkRateLimit({ key: testKey, maxAttempts: 2, windowSeconds: 60 });
      expect(attempt3.allowed).toBe(false);
      expect(attempt3.remaining).toBe(0);

      // Clean up bucket
      await prisma.rateLimitBucket.delete({ where: { key: testKey } }).catch(() => {});
    });

    it("executes an audit trail logging transaction on submission review", async () => {
      const activeTask = await prisma.task.findFirst({ where: { status: "ACTIVE" } });
      const admin = await prisma.adminUser.findFirst();
      expect(admin).not.toBeNull();

      // Create dummy submission
      const sub = await prisma.taskSubmission.create({
        data: {
          taskId: activeTask!.id,
          submitterName: "Audit Test User",
          contactInfo: "audit@test.com",
          rewardSnapshot: new Prisma.Decimal("10.00"),
          referenceCode: generateReferenceCode(),
          status: "PENDING",
        },
      });

      // Execute review transaction (reject with mandatory reason)
      const rejectionReason = "Incomplete submission proof text";
      await prisma.$transaction(async (tx) => {
        await tx.taskSubmission.update({
          where: { id: sub.id },
          data: {
            status: "REJECTED",
            rejectionReason,
            reviewedAt: new Date(),
            reviewedByAdminId: admin!.id,
          },
        });

        await tx.submissionReviewLog.create({
          data: {
            submissionId: sub.id,
            adminId: admin!.id,
            action: "REJECTED",
            reason: rejectionReason,
          },
        });
      });

      // Verify state and audit log
      const updatedSub = await prisma.taskSubmission.findUnique({
        where: { id: sub.id },
        include: { reviewLogs: true },
      });

      expect(updatedSub?.status).toBe("REJECTED");
      expect(updatedSub?.rejectionReason).toBe(rejectionReason);
      expect(updatedSub?.reviewLogs.length).toBe(1);
      expect(updatedSub?.reviewLogs[0].action).toBe("REJECTED");
      expect(updatedSub?.reviewLogs[0].reason).toBe(rejectionReason);

      // Cleanup
      await prisma.taskSubmission.delete({ where: { id: sub.id } });
    });
  });

  describe("Storage Abstraction & Failure Safeguards", () => {
    it("saves a valid PNG proof privately in local storage during development", async () => {
      // 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );

      const result = await savePrivateProof(pngBuffer, "test_screenshot.png");
      expect(result.storageKey).toMatch(/^proof_\d+_[a-f0-9]+\.png$/);
      expect(result.detectedMime).toBe("image/png");
      expect(result.sizeBytes).toBe(pngBuffer.length);

      // Verify retrieval
      const retrieved = await getPrivateProofBuffer(result.storageKey);
      expect(retrieved.mimeType).toBe("image/png");
      expect(retrieved.buffer.equals(pngBuffer)).toBe(true);
    });

    it("rejects path traversal attempts in storage keys", async () => {
      await expect(getPrivateProofBuffer("../../../etc/passwd")).rejects.toThrowError(StorageError);
      await expect(getPrivateProofSignedUrl("..\\malicious\\path.jpg")).rejects.toThrowError(StorageError);
    });

    it("strictly refuses local storage in production mode", async () => {
      const origEnv = process.env.NODE_ENV;
      const origProvider = process.env.STORAGE_PROVIDER;
      const envObj = process.env as Record<string, string | undefined>;

      try {
        envObj.NODE_ENV = "production";
        envObj.STORAGE_PROVIDER = "local";

        const validBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
        await expect(savePrivateProof(validBuffer, "photo.jpg")).rejects.toThrowError(
          /Local storage is strictly prohibited in production/
        );
      } finally {
        envObj.NODE_ENV = origEnv;
        envObj.STORAGE_PROVIDER = origProvider;
      }
    });

    it("fails cleanly when Supabase credentials are missing for Supabase storage", async () => {
      const origProvider = process.env.STORAGE_PROVIDER;
      const origUrl = process.env.SUPABASE_URL;

      try {
        process.env.STORAGE_PROVIDER = "supabase";
        delete process.env.SUPABASE_URL;

        const validBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
        await expect(savePrivateProof(validBuffer, "photo.jpg")).rejects.toThrowError(
          /Missing required Supabase private storage credentials/
        );
      } finally {
        process.env.STORAGE_PROVIDER = origProvider;
        if (origUrl) process.env.SUPABASE_URL = origUrl;
      }
    });

    it("fails cleanly when Supabase service role key is missing", async () => {
      const origProvider = process.env.STORAGE_PROVIDER;
      const origUrl = process.env.SUPABASE_URL;
      const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      try {
        process.env.STORAGE_PROVIDER = "supabase";
        process.env.SUPABASE_URL = "https://example.supabase.co";
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;

        const validBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
        await expect(savePrivateProof(validBuffer, "photo.jpg")).rejects.toThrowError(
          /Missing required Supabase private storage credentials/
        );
      } finally {
        process.env.STORAGE_PROVIDER = origProvider;
        if (origUrl) process.env.SUPABASE_URL = origUrl;
        else delete process.env.SUPABASE_URL;
        if (origKey) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
      }
    });

    it("cleans up stored proof file using deletePrivateProof", async () => {
      const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      const stored = await savePrivateProof(validPng, "proof.png");
      expect(stored.storageKey).toBeDefined();

      // Verify file exists
      const retrieved = await getPrivateProofBuffer(stored.storageKey);
      expect(retrieved.buffer).toBeDefined();

      // Delete file
      await deletePrivateProof(stored.storageKey);

      // Verify file is gone
      await expect(getPrivateProofBuffer(stored.storageKey)).rejects.toThrowError(StorageError);
    });

    it("rejects oversized files exceeding 5MB limit", async () => {
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 10); // 5MB + 10 bytes
      await expect(savePrivateProof(largeBuffer, "huge.jpg")).rejects.toThrowError(
        /File size exceeds 5MB limit/
      );
    });
  });
});
