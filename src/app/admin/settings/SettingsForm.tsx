"use client";

import { useState } from "react";
import { TelegramSettings } from "@/lib/settings";
import { updateTelegramSettingsAction } from "./actions";
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Loader2,
  Shield,
  Radio,
  Eye,
  EyeOff,
  Link as LinkIcon,
} from "lucide-react";

interface SettingsFormProps {
  initialSettings: TelegramSettings;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [settings, setSettings] = useState<TelegramSettings>(initialSettings);
  const [urlInput, setUrlInput] = useState(
    initialSettings.configuredUrl || ""
  );
  const [isEnabled, setIsEnabled] = useState(initialSettings.enabled);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const formData = new FormData();
    formData.set("url", urlInput);
    formData.set("enabled", isEnabled ? "true" : "false");
    formData.set("restoreFallback", "false");

    try {
      const res = await updateTelegramSettingsAction(null, formData);

      if (res.error) {
        setErrorMessage(res.error);
        return;
      }

      if (res.success && res.settings) {
        setSettings(res.settings);
        setUrlInput(res.settings.configuredUrl);
        setIsEnabled(res.settings.enabled);
        setSuccessMessage(
          "Platform settings successfully saved! Public pages reflect changes immediately."
        );
      }
    } catch (err: unknown) {
      console.error("Save error:", err);
      setErrorMessage("An unexpected error occurred while saving settings.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreFallback = async () => {
    if (
      !confirm(
        "Are you sure you want to restore the environment fallback? Any custom Telegram URL will be cleared."
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const formData = new FormData();
    formData.set("enabled", isEnabled ? "true" : "false");
    formData.set("restoreFallback", "true");

    try {
      const res = await updateTelegramSettingsAction(null, formData);

      if (res.error) {
        setErrorMessage(res.error);
        return;
      }

      if (res.success && res.settings) {
        setSettings(res.settings);
        setUrlInput("");
        setIsEnabled(res.settings.enabled);
        setSuccessMessage(
          "Restored environment variable fallback! Default Telegram URL is now active."
        );
      }
    } catch (err: unknown) {
      console.error("Restore fallback error:", err);
      setErrorMessage("Failed to restore environment fallback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute live preview of the target link
  const currentEffectiveUrl = urlInput.trim() || settings.fallbackUrl;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Success Notification */}
      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 flex items-start gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-xs">Settings Updated</p>
            <p className="text-xs text-emerald-800 mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 flex items-start gap-3 animate-in fade-in duration-200">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-xs">Update Failed</p>
            <p className="text-xs text-rose-800 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Live Status and Preview Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Radio
              className={`h-4 w-4 ${
                settings.url
                  ? "text-emerald-600 animate-pulse"
                  : "text-slate-400"
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Public Button Visibility
            </span>
          </div>

          <div className="flex items-center gap-2">
            {settings.enabled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Eye className="h-3 w-3 text-emerald-600" /> Enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <EyeOff className="h-3 w-3 text-slate-500" /> Disabled
              </span>
            )}

            {settings.isCustom ? (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                Custom Override
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Env Fallback
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <span className="text-slate-400 font-bold uppercase text-[10px]">
            Live Effective Telegram Destination
          </span>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="font-mono text-xs text-slate-800 break-all select-all">
              {currentEffectiveUrl || "(No URL configured)"}
            </div>
            {currentEffectiveUrl && (
              <a
                href={currentEffectiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#229ED9] hover:bg-[#229ED9]/10 transition-colors shrink-0 self-start sm:self-auto"
              >
                Test Link <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <p className="text-[11px] text-slate-500 pt-1">
            {isEnabled
              ? currentEffectiveUrl
                ? "The floating Telegram button is currently visible on all public worker pages."
                : "No valid URL configured. The button remains hidden until a valid link is saved."
              : "The Telegram button is currently disabled and hidden on all public pages."}
          </p>
        </div>
      </div>

      {/* Configuration Form */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
      >
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-indigo-600" />
            Configure Telegram Channel or Support Link
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Set or update the public Telegram channel, community, or support bot link.
          </p>
        </div>

        {/* Telegram URL Input */}
        <div className="space-y-1.5">
          <label
            htmlFor="urlInput"
            className="block text-xs font-bold text-slate-700"
          >
            Telegram URL (HTTPS)
          </label>
          <input
            id="urlInput"
            type="url"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder={settings.fallbackUrl || "https://t.me/your_channel"}
            className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 font-mono shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-1 pt-0.5">
            <span>
              Format: <code className="text-indigo-600">https://t.me/channel_name</code> or <code className="text-indigo-600">https://t.me/+invite_hash</code>
            </span>
            {settings.fallbackUrl && (
              <span className="text-slate-400">
                Fallback: {settings.fallbackUrl}
              </span>
            )}
          </div>
        </div>

        {/* Enable / Disable Toggle */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-1">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => {
                setIsEnabled(e.target.checked);
                if (errorMessage) setErrorMessage(null);
              }}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs font-bold text-slate-800">
              Enable floating Telegram button on public pages
            </span>
          </label>
          <p className="text-[11px] text-slate-500 ml-7">
            When disabled, the button is immediately hidden without deleting the saved URL.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {settings.isCustom && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleRestoreFallback}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore Environment Fallback
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Settings
            </button>
          </div>
        </div>
      </form>

      {/* Platform & Environment Details Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-indigo-600" />
          Active Environment Diagnostics
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Node Environment:</span>
            <span className="font-mono font-bold text-slate-800">
              {process.env.NODE_ENV}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Storage Provider:</span>
            <span className="font-mono font-bold text-slate-800">
              {process.env.STORAGE_PROVIDER || (process.env.NODE_ENV === "production" ? "supabase" : "local")}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Database Driver:</span>
            <span className="font-mono font-bold text-slate-800">
              PostgreSQL (Prisma ORM)
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Default Telegram Env Fallback:</span>
            <span className="font-mono text-slate-700 truncate max-w-xs">
              {settings.fallbackUrl || "Not set in .env"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
