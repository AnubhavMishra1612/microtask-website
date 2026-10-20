import { requireAdmin } from "@/lib/session";
import { getTelegramSettings } from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";

export const revalidate = 0;

export default async function AdminSettingsPage() {
  // 1. Independent Server-Side Authorization Barrier
  await requireAdmin();

  // 2. Fetch current settings from database
  const settings = await getTelegramSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Platform Settings
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Configure live platform parameters, Telegram community link, and runtime defaults.
        </p>
      </div>

      <SettingsForm initialSettings={settings} />
    </div>
  );
}
