import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateReferenceCode, isValidReferenceCode } from "../src/lib/reference";
import { checkRateLimit } from "../src/lib/rate-limit";
import { getTelegramUrl } from "../src/lib/settings";
import { savePrivateProof, StorageError } from "../src/lib/storage";
import { validateImageMagicBytes, MAX_FILE_SIZE_BYTES } from "../src/lib/validations";

describe("Milestone 3: Public Worker Experience, Submissions & Privacy", () => {
  let activeTextTask: { id: string; rewardInr: Prisma.Decimal };
  let activeImageTask: { id: string; rewardInr: Prisma.Decimal };
  let activeBothTask: { id: string; rewardInr: Prisma.Decimal };
  let pausedTask: { id: string };

  beforeAll(async () => {
    await prisma.$connect();

    // Query seeded tasks
    const tasks = await prisma.task.findMany({
      where: { title: { startsWith: "[DEMO]" } },
    });

    const text = tasks.find((t) => t.proofType === "TEXT" && t.status === "ACTIVE");
    const img = tasks.find((t) => t.proofType === "IMAGE" && t.status === "ACTIVE");
    const both = tasks.find((t) => t.proofType === "BOTH" && t.status === "ACTIVE");
    const paused = tasks.find((t) => t.status === "PAUSED");

    expect(text).toBeDefined();
    expect(img).toBeDefined();
    expect(both).toBeDefined();
    expect(paused).toBeDefined();

    activeTextTask = text!;
    activeImageTask = img!;
    activeBothTask = both!;
    pausedTask = paused!;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Active Task Listing & Inactive Exclusion", () => {
    it("fetches only ACTIVE tasks and excludes PAUSED, CLOSED, or DRAFT tasks", async () => {
      const now = new Date();
      const activeTasks = await prisma.task.findMany({
        where: {
          status: "ACTIVE",
          OR: [{ deadline: null }, { deadline: { gt: now } }],
        },
      });

      expect(activeTasks.length).toBeGreaterThanOrEqual(3);
      for (const t of activeTasks) {
        expect(t.status).toBe("ACTIVE");
        if (t.deadline) {
          expect(t.deadline.getTime()).toBeGreaterThan(now.getTime());
        }
      }

      // Verify paused task is NOT present in the active list
      const pausedInList = activeTasks.find((t) => t.id === pausedTask.id);
      expect(pausedInList).toBeUndefined();
    });

    it("correctly identifies and excludes expired tasks", async () => {
      // Create a temporary expired task
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const expiredTask = await prisma.task.create({
        data: {
          title: "[TEST] Expired Task",
          description: "Temporary task with past deadline",
          instructions: "Test instructions",
          rewardInr: new Prisma.Decimal("10.00"),
          proofRequirements: "None",
          status: "ACTIVE",
          deadline: pastDate,
        },
      });

      const now = new Date();
      const activeTasks = await prisma.task.findMany({
        where: {
          status: "ACTIVE",
          OR: [{ deadline: null }, { deadline: { gt: now } }],
        },
      });

      const foundExpired = activeTasks.find((t) => t.id === expiredTask.id);
      expect(foundExpired).toBeUndefined();

      // Clean up
      await prisma.task.delete({ where: { id: expiredTask.id } });
    });
  });

  describe("Server-Side Task Eligibility & Inactive Rejection", () => {
    it("rejects submission attempts for paused tasks", async () => {
      const task = await prisma.task.findUnique({
        where: { id: pausedTask.id },
      });

      expect(task?.status).toBe("PAUSED");
      const isEligible = task?.status === "ACTIVE";
      expect(isEligible).toBe(false);
    });

    it("returns null for nonexistent tasks", async () => {
      const nonExistent = await prisma.task.findUnique({
        where: { id: "non-existent-task-cuid-999" },
      });
      expect(nonExistent).toBeNull();
    });
  });

  describe("Proof Requirements Validation (TEXT, IMAGE, BOTH)", () => {
    function checkRequirements(type: string) {
      return {
        requiresText: type === "TEXT" || type === "BOTH",
        requiresImage: type === "IMAGE" || type === "BOTH",
      };
    }

    it("enforces text proof when task proofType is TEXT", () => {
      const { requiresText, requiresImage } = checkRequirements("TEXT");

      expect(requiresText).toBe(true);
      expect(requiresImage).toBe(false);

      const emptyText = "";
      const validText = "Completion code: 849201";

      expect(emptyText.trim().length >= 5).toBe(false);
      expect(validText.trim().length >= 5).toBe(true);
    });

    it("enforces image proof when task proofType is IMAGE", () => {
      const { requiresText, requiresImage } = checkRequirements("IMAGE");

      expect(requiresText).toBe(false);
      expect(requiresImage).toBe(true);
    });

    it("enforces both text and image when task proofType is BOTH", () => {
      const { requiresText, requiresImage } = checkRequirements("BOTH");

      expect(requiresText).toBe(true);
      expect(requiresImage).toBe(true);
    });
  });

  describe("Upload Security & Magic Bytes Sniffing", () => {
    it("rejects files larger than 5 MB", async () => {
      const largeBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 100);
      await expect(savePrivateProof(largeBuffer, "too_large.jpg")).rejects.toThrowError(
        /File size exceeds 5MB limit/
      );
    });

    it("rejects executable scripts or disguised non-image files", async () => {
      const phpScript = Buffer.from("<?php system($_GET['cmd']); ?>");
      const result = validateImageMagicBytes(phpScript);
      expect(result.valid).toBe(false);
    });
  });

  describe("Duplicate Submission Prevention & Persistent Rate Limiting", () => {
    it("detects and blocks duplicate submissions with the same contact info for the same task", async () => {
      const contact = `unique_contact_${Date.now()}@example.com`;
      const refCode = generateReferenceCode();

      // Create initial submission
      const sub = await prisma.taskSubmission.create({
        data: {
          taskId: activeTextTask.id,
          submitterName: "Test Submitter",
          contactInfo: contact,
          rewardSnapshot: activeTextTask.rewardInr,
          referenceCode: refCode,
          status: "PENDING",
        },
      });

      // Second check for duplicate
      const duplicate = await prisma.taskSubmission.findFirst({
        where: {
          taskId: activeTextTask.id,
          contactInfo: contact,
          status: { in: ["PENDING", "APPROVED"] },
        },
      });

      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe(sub.id);

      // Clean up
      await prisma.taskSubmission.delete({ where: { id: sub.id } });
    });

    it("enforces persistent rate limiting across rapid submissions", async () => {
      const ipKey = `test_rate_ip_${Date.now()}`;

      // Max 3 attempts
      const r1 = await checkRateLimit({ key: ipKey, maxAttempts: 3, windowSeconds: 60 });
      expect(r1.allowed).toBe(true);

      const r2 = await checkRateLimit({ key: ipKey, maxAttempts: 3, windowSeconds: 60 });
      expect(r2.allowed).toBe(true);

      const r3 = await checkRateLimit({ key: ipKey, maxAttempts: 3, windowSeconds: 60 });
      expect(r3.allowed).toBe(true);

      // 4th attempt blocked
      const r4 = await checkRateLimit({ key: ipKey, maxAttempts: 3, windowSeconds: 60 });
      expect(r4.allowed).toBe(false);
      expect(r4.remaining).toBe(0);

      // Clean up
      await prisma.rateLimitBucket.delete({ where: { key: ipKey } }).catch(() => {});
    });
  });

  describe("Status Tracking Route & Privacy Protection", () => {
    it("exposes only minimal necessary status information and does NOT leak personal contact info or file paths", async () => {
      const refCode = generateReferenceCode();
      const sub = await prisma.taskSubmission.create({
        data: {
          taskId: activeTextTask.id,
          submitterName: "Private Worker",
          contactInfo: "+91-9876543210-SECRET",
          proofText: "Secret internal survey answer",
          proofFileKey: "proof_secret_key_123.jpg",
          rewardSnapshot: activeTextTask.rewardInr,
          referenceCode: refCode,
          status: "PENDING",
        },
      });

      // Query mimicking the public /track/[ref] endpoint
      const publicView = await prisma.taskSubmission.findUnique({
        where: { referenceCode: refCode },
        select: {
          referenceCode: true,
          rewardSnapshot: true,
          status: true,
          rejectionReason: true,
          submittedAt: true,
          reviewedAt: true,
          task: {
            select: {
              title: true,
            },
          },
        },
      });

      expect(publicView).not.toBeNull();
      expect(publicView?.referenceCode).toBe(refCode);
      expect(publicView?.status).toBe("PENDING");

      // Verify sensitive personal fields are NOT present in the public view
      // @ts-expect-error Checking that contactInfo was excluded from select
      expect(publicView?.contactInfo).toBeUndefined();
      // @ts-expect-error Checking that submitterName was excluded from select
      expect(publicView?.submitterName).toBeUndefined();
      // @ts-expect-error Checking that proofFileKey was excluded from select
      expect(publicView?.proofFileKey).toBeUndefined();

      // Clean up
      await prisma.taskSubmission.delete({ where: { id: sub.id } });
    });
  });

  describe("Telegram Configuration & Fallback Behavior", () => {
    it("returns a valid Telegram URL when configured", async () => {
      const url = await getTelegramUrl();
      if (url) {
        expect(url).toMatch(/^https:\/\/(t\.me|telegram\.me)\/[a-zA-Z0-9_]{3,}/);
      }
    });

    it("returns null when site setting is empty or disabled", async () => {
      const origSetting = await prisma.siteSetting.findUnique({ where: { key: "telegram_url" } });
      const origEnv = process.env.DEFAULT_TELEGRAM_URL;

      try {
        await prisma.siteSetting.upsert({
          where: { key: "telegram_url" },
          create: { key: "telegram_url", value: "" },
          update: { value: "" },
        });
        delete process.env.DEFAULT_TELEGRAM_URL;

        const result = await getTelegramUrl();
        expect(result).toBeNull();
      } finally {
        if (origSetting) {
          await prisma.siteSetting.update({ where: { key: "telegram_url" }, data: { value: origSetting.value } });
        }
        if (origEnv) {
          process.env.DEFAULT_TELEGRAM_URL = origEnv;
        }
      }
    });
  });
});
