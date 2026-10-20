"use server";

import { requireAdmin } from "@/lib/session";
import { telegramSettingsSchema, telegramUrlRegex } from "@/lib/validations";
import {
  updateTelegramSettingsInDb,
  getTelegramSettings,
  TelegramSettings,
} from "@/lib/settings";

export interface SettingsActionResponse {
  success?: boolean;
  error?: string;
  fieldErrors?: {
    url?: string;
  };
  settings?: TelegramSettings;
}

/**
 * Protected Server Action to update site settings.
 * Enforces independent administrator authorization on every call.
 */
export async function updateTelegramSettingsAction(
  prevState: SettingsActionResponse | null,
  formData: FormData
): Promise<SettingsActionResponse> {
  // 1. Independent Server-Side Authorization Barrier
  await requireAdmin();

  const rawUrl = (formData.get("url") as string)?.trim() || "";
  const enabled = formData.get("enabled") === "true";
  const restoreFallback = formData.get("restoreFallback") === "true";

  // 2. Server-side validation
  if (!restoreFallback && rawUrl) {
    const validation = telegramSettingsSchema.safeParse({
      url: rawUrl,
      enabled,
      restoreFallback,
    });

    if (!validation.success) {
      const fieldErrors: { url?: string } = {};
      for (const issue of validation.error.issues) {
        if (issue.path[0] === "url") {
          fieldErrors.url = issue.message;
        }
      }
      return {
        error: fieldErrors.url || "Validation failed: Please enter a valid Telegram HTTPS URL.",
        fieldErrors,
      };
    }
  }

  // 3. Database persistence with error shielding
  try {
    const updated = await updateTelegramSettingsInDb({
      url: rawUrl,
      enabled,
      restoreFallback,
    });

    return {
      success: true,
      settings: updated,
    };
  } catch (error: unknown) {
    console.error("Error saving Telegram site settings:", error);
    // Never expose stack traces or internal DB details to client
    return {
      error: "An unexpected error occurred while saving platform settings. Please try again.",
    };
  }
}
