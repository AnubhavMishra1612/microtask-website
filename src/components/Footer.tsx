import Link from "next/link";
import { CheckSquare, Send } from "lucide-react";
import { getTelegramUrl } from "@/lib/settings";

export async function Footer() {
  const telegramUrl = await getTelegramUrl();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <CheckSquare className="h-4 w-4" />
            </div>
            <span className="font-semibold text-slate-900 tracking-tight">Microtask India</span>
          </div>

          <p className="text-xs text-slate-500 max-w-md">
            Notice: Task approval verifies valid proof submission. Payouts and disbursements are managed independently in accordance with campaign terms.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600">
            <Link href="/" className="hover:text-indigo-600 transition">
              Browse Tasks
            </Link>
            <Link href="/track" className="hover:text-indigo-600 transition">
              Check Status
            </Link>
            {telegramUrl && (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#229ED9] hover:underline transition"
              >
                <Send className="h-3 w-3" />
                Telegram Channel
              </a>
            )}
            <Link href="/admin/login" className="hover:text-indigo-600 transition">
              Admin
            </Link>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Microtask Platform. Built for Indian workers with mobile-first simplicity.
        </div>
      </div>
    </footer>
  );
}

