import { prisma } from "./prisma";
import { telegramUrlRegex } from "./validations";
import { unstable_cache, revalidateTag, revalidatePath } from "next/cache";

export interface TelegramSettings {
  url: string | null;
  configuredUrl: string;
  fallbackUrl: string;
  effectiveUrl: string;
  enabled: boolean;
  isCustom: boolean;
}

/**
 * Fetches Telegram site settings directly from the PostgreSQL database.
 */
export async function fetchTelegramSettingsFromDb(): Promise<TelegramSettings> {
  const fallbackUrl = process.env.DEFAULT_TELEGRAM_URL?.trim() || "";

  try {
    const [urlRow, enabledRow] = await Promise.all([
      prisma.siteSetting.findUnique({
        where: { key: "telegram_url" },
      }),
      prisma.siteSetting.findUnique({
        where: { key: "telegram_enabled" },
      }),
    ]);

    const configuredUrl = urlRow?.value?.trim() || "";
    const isCustom = configuredUrl.length > 0;
    const effectiveUrl = isCustom ? configuredUrl : fallbackUrl;

    // Enabled defaults to true unless explicitly set to "false"
    const enabled = enabledRow ? enabledRow.value === "true" : true;

    // Final URL is only exposed if enabled AND passes strict Telegram HTTPS regex
    const isValid = telegramUrlRegex.test(effectiveUrl);
    const url = enabled && isValid ? effectiveUrl : null;

    return {
      url,
      configuredUrl,
      fallbackUrl,
      effectiveUrl,
      enabled,
      isCustom,
    };
  } catch (error) {
    console.error("Error querying Telegram site settings from database:", error);

    // Resilient fallback to environment variable if DB fails
    const isValidFallback = telegramUrlRegex.test(fallbackUrl);
    return {
      url: isValidFallback ? fallbackUrl : null,
      configuredUrl: "",
      fallbackUrl,
      effectiveUrl: fallbackUrl,
      enabled: true,
      isCustom: false,
    };
  }
}

/**
 * Shared server-side cached fetcher to prevent repeated database queries on every render.
 * Cache is tagged with 'site-settings' for instant invalidation.
 */
export const getCachedTelegramSettings = unstable_cache(
  async () => {
    return await fetchTelegramSettingsFromDb();
  },
  ["site-settings-telegram"],
  {
    tags: ["site-settings"],
    revalidate: 3600,
  }
);

/**
 * Retrieves full Telegram configuration.
 * Uses cache in Next.js request lifecycle, falling back gracefully in test runner.
 */
export async function getTelegramSettings(): Promise<TelegramSettings> {
  try {
    return await getCachedTelegramSettings();
  } catch {
    // If called outside Next.js request lifecycle (e.g. in test suite)
    return await fetchTelegramSettingsFromDb();
  }
}

/**
 * Convenience helper returning the active Telegram URL or null if disabled/invalid.
 */
export async function getTelegramUrl(): Promise<string | null> {
  const settings = await getTelegramSettings();
  return settings.url;
}

/**
 * Core database update logic for Telegram configuration.
 * Atomic upserts guarantee no duplicate records for the same key.
 */
export async function updateTelegramSettingsInDb({
  url,
  enabled,
  restoreFallback = false,
}: {
  url?: string;
  enabled: boolean;
  restoreFallback?: boolean;
}): Promise<TelegramSettings> {
  await prisma.$transaction(async (tx) => {
    if (restoreFallback) {
      // Remove custom URL override or set to empty string to revert to env fallback
      await tx.siteSetting.upsert({
        where: { key: "telegram_url" },
        update: { value: "" },
        create: { key: "telegram_url", value: "" },
      });
    } else if (url !== undefined) {
      const trimmed = url.trim();
      await tx.siteSetting.upsert({
        where: { key: "telegram_url" },
        update: { value: trimmed },
        create: { key: "telegram_url", value: trimmed },
      });
    }

    // Persist enabled/disabled state
    await tx.siteSetting.upsert({
      where: { key: "telegram_enabled" },
      update: { value: enabled ? "true" : "false" },
      create: { key: "telegram_enabled", value: enabled ? "true" : "false" },
    });
  }, {
    maxWait: 10000,
    timeout: 20000,
  });

  // Invalidate cache immediately so public pages reflect changes without redeployment
  try {
    revalidateTag("site-settings");
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
  } catch {
    // Revalidation might be skipped outside Next request context (e.g. in tests)
  }

  return await fetchTelegramSettingsFromDb();
}
