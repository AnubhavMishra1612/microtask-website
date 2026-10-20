import { describe, it, expect } from "vitest";
import { generateReferenceCode, isValidReferenceCode, generateSessionToken } from "../src/lib/reference";
import { hashPassword, verifyPassword } from "../src/lib/auth";
import {
  telegramUrlSchema,
  taskSchema,
  reviewSubmissionSchema,
  validateImageMagicBytes,
  MAX_FILE_SIZE_BYTES,
} from "../src/lib/validations";

describe("Milestone 1: Security, Utilities & Schema Validations", () => {
  describe("Cryptographically Unpredictable Reference Tokens", () => {
    it("generates reference codes matching the expected TSK format", () => {
      const code = generateReferenceCode();
      expect(code).toMatch(/^TSK-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
      expect(isValidReferenceCode(code)).toBe(true);
    });

    it("rejects invalid or tampered reference codes", () => {
      expect(isValidReferenceCode("TSK-123")).toBe(false);
      expect(isValidReferenceCode("INVALID-TOKEN")).toBe(false);
      expect(isValidReferenceCode("")).toBe(false);
      expect(isValidReferenceCode("TSK-ZZZZ-XXXX-YYYY-WWWW")).toBe(false);
    });

    it("produces unique codes with zero collisions across 2,000 samples", () => {
      const set = new Set<string>();
      for (let i = 0; i < 2000; i++) {
        const code = generateReferenceCode();
        expect(set.has(code)).toBe(false);
        set.add(code);
      }
      expect(set.size).toBe(2000);
    });

    it("generates 64-char high-entropy session tokens", () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();
      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });
  });

  describe("Password Hashing & Timing-Safe Verification", () => {
    it("correctly hashes and verifies passwords using bcrypt", async () => {
      const password = "SecureAdminPass123!@#";
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.startsWith("$2")).toBe(true);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword("WrongPassword123!", hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe("Telegram URL Validation", () => {
    it("accepts valid Telegram channel and profile URLs", () => {
      expect(telegramUrlSchema.safeParse("https://t.me/microtask_support").success).toBe(true);
      expect(telegramUrlSchema.safeParse("https://telegram.me/microtask_channel").success).toBe(true);
      expect(telegramUrlSchema.safeParse("https://t.me/earn_india_official/123").success).toBe(true);
    });

    it("accepts empty string to support disabled state gracefully", () => {
      expect(telegramUrlSchema.safeParse("").success).toBe(true);
    });

    it("rejects invalid, malicious or non-telegram URLs", () => {
      expect(telegramUrlSchema.safeParse("https://example.com/t.me").success).toBe(false);
      expect(telegramUrlSchema.safeParse("http://t.me/insecure_channel").success).toBe(false);
      expect(telegramUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
      expect(telegramUrlSchema.safeParse("https://t.me/").success).toBe(false);
    });
  });

  describe("Task & Reward Schema Constraints", () => {
    it("accepts valid task with positive INR Decimal reward", () => {
      const validTask = {
        title: "Test Mobile App Onboarding",
        description: "Install demo test app and complete basic 3-step walkthrough.",
        taskUrl: "https://example.com/onboarding",
        instructions: "Step 1: Download app. Step 2: Open welcome screen. Step 3: Take screenshot.",
        rewardInr: "35.50",
        proofRequirements: "Clear screenshot showing the completion badge.",
        proofType: "IMAGE",
        status: "ACTIVE",
      };
      const result = taskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it("rejects negative or zero monetary rewards", () => {
      const zeroReward = {
        title: "Valid Title",
        description: "Valid description longer than 10 chars",
        taskUrl: "https://example.com/onboarding",
        instructions: "Valid instructions longer than 10 chars",
        rewardInr: "0.00",
        proofRequirements: "Valid proof reqs",
        proofType: "IMAGE",
      };
      expect(taskSchema.safeParse(zeroReward).success).toBe(false);

      const negativeReward = { ...zeroReward, rewardInr: "-15.00" };
      expect(taskSchema.safeParse(negativeReward).success).toBe(false);
    });
  });

  describe("Mandatory Rejection Reasons (Audit Enforcement)", () => {
    it("allows approval without rejection reason", () => {
      const result = reviewSubmissionSchema.safeParse({ action: "APPROVED" });
      expect(result.success).toBe(true);
    });

    it("requires rejection reason when action is REJECTED", () => {
      const rejectedWithoutReason = reviewSubmissionSchema.safeParse({ action: "REJECTED" });
      expect(rejectedWithoutReason.success).toBe(false);

      const rejectedWithShortReason = reviewSubmissionSchema.safeParse({
        action: "REJECTED",
        reason: "bad",
      });
      expect(rejectedWithShortReason.success).toBe(false);

      const rejectedWithValidReason = reviewSubmissionSchema.safeParse({
        action: "REJECTED",
        reason: "Screenshot does not match task instructions.",
      });
      expect(rejectedWithValidReason.success).toBe(true);
    });
  });

  describe("File Privacy & Magic Bytes Sniffing", () => {
    it("accurately detects JPEG magic bytes", () => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const res = validateImageMagicBytes(jpegHeader);
      expect(res.valid).toBe(true);
      expect(res.detectedMime).toBe("image/jpeg");
    });

    it("accurately detects PNG magic bytes", () => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      const res = validateImageMagicBytes(pngHeader);
      expect(res.valid).toBe(true);
      expect(res.detectedMime).toBe("image/png");
    });

    it("accurately detects WEBP magic bytes", () => {
      const webpHeader = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // "RIFF"
        0x24, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50, // "WEBP"
      ]);
      const res = validateImageMagicBytes(webpHeader);
      expect(res.valid).toBe(true);
      expect(res.detectedMime).toBe("image/webp");
    });

    it("rejects text files or malicious scripts masquerading as images", () => {
      const fakeImage = Buffer.from("<?php echo 'malicious script'; ?>");
      const res = validateImageMagicBytes(fakeImage);
      expect(res.valid).toBe(false);
    });

    it("ensures MAX_FILE_SIZE_BYTES is exactly 5MB", () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(5 * 1024 * 1024);
    });
  });
});
