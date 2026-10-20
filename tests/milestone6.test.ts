import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import {
  getTelegramSettings,
  getTelegramUrl,
  updateTelegramSettingsInDb,
} from "../src/lib/settings";
import { updateTelegramSettingsAction } from "../src/app/admin/settings/actions";
import { telegramUrlRegex, telegramSettingsSchema } from "../src/lib/validations";

describe("Milestone 6: Site Settings & Dynamic Telegram Configuration", () => {
  let originalDbUrl: string | null = null;
  let originalDbEnabled: string | null = null;
  const originalEnvUrl = process.env.DEFAULT_TELEGRAM_URL;

  beforeAll(async () => {
    await prisma.$connect();

    // Preserve existing settings
    const existingUrl = await prisma.siteSetting.findUnique({
      where: { key: "telegram_url" },
    });
    const existingEnabled = await prisma.siteSetting.findUnique({
      where: { key: "telegram_enabled" },
    });

    originalDbUrl = existingUrl?.value ?? null;
    originalDbEnabled = existingEnabled?.value ?? null;
  });

  afterAll(async () => {
    // Restore initial state
    if (originalDbUrl !== null) {
      await prisma.siteSetting.upsert({
        where: { key: "telegram_url" },
        update: { value: originalDbUrl },
        create: { key: "telegram_url", value: originalDbUrl },
      });
    } else {
      await prisma.siteSetting.deleteMany({
        where: { key: "telegram_url" },
      });
    }

    if (originalDbEnabled !== null) {
      await prisma.siteSetting.upsert({
        where: { key: "telegram_enabled" },
        update: { value: originalDbEnabled },
        create: { key: "telegram_enabled", value: originalDbEnabled },
      });
    } else {
      await prisma.siteSetting.deleteMany({
        where: { key: "telegram_enabled" },
      });
    }

    process.env.DEFAULT_TELEGRAM_URL = originalEnvUrl;
    await prisma.$disconnect();
  });

  describe("Telegram URL Validation & XSS/Phishing Prevention", () => {
    it("accepts valid Telegram HTTPS links", () => {
      const validUrls = [
        "https://t.me/microtask_india",
        "https://t.me/support_bot",
        "https://telegram.me/microtask_community",
        "https://t.me/+AbCdEf12345",
        "https://t.me/joinchat/AbCdEf12345",
      ];

      for (const url of validUrls) {
        expect(telegramUrlRegex.test(url)).toBe(true);
        const res = telegramSettingsSchema.safeParse({ url, enabled: true });
        expect(res.success).toBe(true);
      }
    });

    it("rejects javascript:, data:, HTTP, and unauthorized domains", () => {
      const invalidUrls = [
        "javascript:alert(1)",
        "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
        "http://t.me/microtask", // non-HTTPS
        "https://evil.com/t.me/microtask",
        "https://t.me.evil.com/microtask",
        "https://google.com",
        "t.me/missing_protocol",
        "ftp://t.me/channel",
      ];

      for (const url of invalidUrls) {
        expect(telegramUrlRegex.test(url)).toBe(false);
        const res = telegramSettingsSchema.safeParse({ url, enabled: true });
        expect(res.success).toBe(false);
      }
    });
  });

  describe("Independent Server-Side Authorization Barrier", () => {
    it("rejects unauthorized settings mutations via Server Action", async () => {
      const formData = new FormData();
      formData.set("url", "https://t.me/unauthorized_channel");
      formData.set("enabled", "true");

      await expect(
        updateTelegramSettingsAction(null, formData)
      ).rejects.toThrowError(/UNAUTHORIZED/);
    });
  });

  describe("Environment Fallback Behavior", () => {
    it("falls back to process.env.DEFAULT_TELEGRAM_URL when no custom override exists", async () => {
      process.env.DEFAULT_TELEGRAM_URL = "https://t.me/env_fallback_channel";

      // Clear custom override
      await updateTelegramSettingsInDb({
        enabled: true,
        restoreFallback: true,
      });

      const settings = await getTelegramSettings();
      expect(settings.isCustom).toBe(false);
      expect(settings.configuredUrl).toBe("");
      expect(settings.fallbackUrl).toBe("https://t.me/env_fallback_channel");
      expect(settings.effectiveUrl).toBe("https://t.me/env_fallback_channel");
      expect(settings.url).toBe("https://t.me/env_fallback_channel");
      expect(settings.enabled).toBe(true);
    });
  });

  describe("Administrator Custom Override & Persistence", () => {
    it("overrides environment fallback when administrator sets a custom URL", async () => {
      process.env.DEFAULT_TELEGRAM_URL = "https://t.me/env_fallback_channel";
      const customUrl = "https://t.me/custom_admin_channel";

      const updated = await updateTelegramSettingsInDb({
        url: customUrl,
        enabled: true,
      });

      expect(updated.isCustom).toBe(true);
      expect(updated.configuredUrl).toBe(customUrl);
      expect(updated.effectiveUrl).toBe(customUrl);
      expect(updated.url).toBe(customUrl);

      // Verify direct database persistence
      const dbRow = await prisma.siteSetting.findUnique({
        where: { key: "telegram_url" },
      });
      expect(dbRow?.value).toBe(customUrl);

      // Ensure no duplicate records were created for the same key
      const count = await prisma.siteSetting.count({
        where: { key: "telegram_url" },
      });
      expect(count).toBe(1);
    });
  });

  describe("Enabling and Disabling the Telegram Button", () => {
    it("disables and hides the button without deleting the configured URL", async () => {
      const customUrl = "https://t.me/custom_admin_channel";

      // Save URL and disable button
      const disabled = await updateTelegramSettingsInDb({
        url: customUrl,
        enabled: false,
      });

      expect(disabled.enabled).toBe(false);
      expect(disabled.configuredUrl).toBe(customUrl);
      // Effective URL remains saved in configuration
      expect(disabled.effectiveUrl).toBe(customUrl);
      // But public active URL is null (hidden)
      expect(disabled.url).toBeNull();

      const publicUrl = await getTelegramUrl();
      expect(publicUrl).toBeNull();

      // Check DB
      const enabledRow = await prisma.siteSetting.findUnique({
        where: { key: "telegram_enabled" },
      });
      expect(enabledRow?.value).toBe("false");
    });

    it("re-enabling the button restores the public link immediately", async () => {
      const customUrl = "https://t.me/custom_admin_channel";

      const reEnabled = await updateTelegramSettingsInDb({
        url: customUrl,
        enabled: true,
      });

      expect(reEnabled.enabled).toBe(true);
      expect(reEnabled.url).toBe(customUrl);

      const publicUrl = await getTelegramUrl();
      expect(publicUrl).toBe(customUrl);
    });

    it("disabled state overrides environment fallback and hides the button", async () => {
      process.env.DEFAULT_TELEGRAM_URL = "https://t.me/env_fallback_channel";

      // Restore fallback but keep disabled
      const disabledFallback = await updateTelegramSettingsInDb({
        enabled: false,
        restoreFallback: true,
      });

      expect(disabledFallback.isCustom).toBe(false);
      expect(disabledFallback.enabled).toBe(false);
      expect(disabledFallback.effectiveUrl).toBe("https://t.me/env_fallback_channel");
      expect(disabledFallback.url).toBeNull();

      const publicUrl = await getTelegramUrl();
      expect(publicUrl).toBeNull();
    });
  });

  describe("Restore Fallback Functionality", () => {
    it("restores environment fallback when administrator requests it", async () => {
      process.env.DEFAULT_TELEGRAM_URL = "https://t.me/env_fallback_channel";

      // First set custom override
      await updateTelegramSettingsInDb({
        url: "https://t.me/override_to_be_cleared",
        enabled: true,
      });

      // Now restore fallback
      const restored = await updateTelegramSettingsInDb({
        enabled: true,
        restoreFallback: true,
      });

      expect(restored.isCustom).toBe(false);
      expect(restored.configuredUrl).toBe("");
      expect(restored.url).toBe("https://t.me/env_fallback_channel");
    });
  });

  describe("Missing or Invalid URLs Handled Gracefully", () => {
    it("returns null and hides the button when both custom and env URLs are missing", async () => {
      delete process.env.DEFAULT_TELEGRAM_URL;

      await updateTelegramSettingsInDb({
        enabled: true,
        restoreFallback: true,
      });

      const settings = await getTelegramSettings();
      expect(settings.url).toBeNull();

      const publicUrl = await getTelegramUrl();
      expect(publicUrl).toBeNull();
    });

    it("returns null and hides the button when configured URL is invalid", async () => {
      delete process.env.DEFAULT_TELEGRAM_URL;

      // Force invalid value directly in DB to simulate unexpected corrupted data
      await prisma.siteSetting.upsert({
        where: { key: "telegram_url" },
        update: { value: "https://not-telegram.com/bad" },
        create: { key: "telegram_url", value: "https://not-telegram.com/bad" },
      });

      await prisma.siteSetting.upsert({
        where: { key: "telegram_enabled" },
        update: { value: "true" },
        create: { key: "telegram_enabled", value: "true" },
      });

      const settings = await getTelegramSettings();
      expect(settings.url).toBeNull();

      const publicUrl = await getTelegramUrl();
      expect(publicUrl).toBeNull();
    });
  });
});
