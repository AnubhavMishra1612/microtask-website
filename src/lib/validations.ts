import { z } from "zod";

export const telegramUrlRegex = /^https:\/\/(t\.me|telegram\.me)\/(\+[a-zA-Z0-9_-]+|[a-zA-Z0-9_]{3,}(\/[a-zA-Z0-9_-]+)?)$/;

export const telegramUrlSchema = z.string().trim().refine(
  (val) => {
    if (!val) return true; // empty allowed to disable/fallback
    return telegramUrlRegex.test(val);
  },
  {
    message: "Invalid Telegram URL. Format must be an HTTPS URL such as https://t.me/your_channel or https://t.me/+join_hash",
  }
);

export const telegramSettingsSchema = z.object({
  url: z
    .string()
    .trim()
    .refine(
      (val) => !val || telegramUrlRegex.test(val),
      {
        message: "Invalid Telegram URL. Format must be an HTTPS link such as https://t.me/your_channel or https://t.me/+join_hash",
      }
    ),
  enabled: z.boolean(),
  restoreFallback: z.boolean().optional(),
});


export const adminLoginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const taskStatusEnum = z.enum(["DRAFT", "ACTIVE", "PAUSED", "CLOSED", "EXPIRED"]);
export const proofTypeEnum = z.enum(["TEXT", "IMAGE", "BOTH"]);
export const submissionStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const taskUrlSchema = z
  .string()
  .trim()
  .min(1, "Task link is required")
  .refine(
    (val) => {
      try {
        const parsed = new URL(val);
        return parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    {
      message: "Task link must be a valid secure URL starting with https:// (e.g. https://example.com/task)",
    }
  );

export const taskSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(150, "Title cannot exceed 150 characters"),
  description: z.string().trim().min(10, "Description must be at least 10 characters"),
  taskUrl: taskUrlSchema,
  instructions: z.string().trim().min(10, "Instructions must be at least 10 characters"),
  rewardInr: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Reward must be a valid positive amount (e.g., 25 or 25.50)")
    .refine((val) => parseFloat(val) > 0, "Reward must be greater than 0"),
  proofRequirements: z.string().trim().min(5, "Proof requirements must be at least 5 characters"),
  proofType: proofTypeEnum,
  status: taskStatusEnum.default("DRAFT"),
  deadline: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid deadline date format"),
  maxSubmissions: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || (!isNaN(parseInt(val, 10)) && parseInt(val, 10) > 0), "Max submissions must be a positive integer"),
});

export const submissionInputSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  submitterName: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name cannot exceed 80 characters"),
  contactInfo: z.string().trim().min(3, "Contact info must be at least 3 characters").max(120, "Contact info cannot exceed 120 characters"),
  proofText: z.string().trim().max(3000, "Proof text cannot exceed 3000 characters").optional().default(""),
});

export const reviewSubmissionSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().optional(),
}).refine(
  (data) => {
    if (data.action === "REJECTED") {
      return !!data.reason && data.reason.trim().length >= 5;
    }
    return true;
  },
  {
    message: "A rejection reason of at least 5 characters is mandatory when rejecting a submission",
    path: ["reason"],
  }
);

// File validation constants
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

/**
 * Validates file buffer magic bytes (never trust user supplied Content-Type alone)
 */
export function validateImageMagicBytes(buffer: Buffer): { valid: boolean; detectedMime?: string } {
  if (buffer.length < 12) return { valid: false };

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: "image/png" };
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, detectedMime: "image/webp" };
  }

  return { valid: false };
}
