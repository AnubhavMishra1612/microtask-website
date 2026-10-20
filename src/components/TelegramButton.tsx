import { getTelegramUrl } from "@/lib/settings";

export async function TelegramButton() {
  const telegramUrl = await getTelegramUrl();

  if (!telegramUrl) {
    return null;
  }

  return (
    <aside
      aria-label="Telegram Community"
      className="fixed bottom-6 right-6 z-50 transition-transform duration-200 hover:scale-105 active:scale-95"
    >
      <a
        href={telegramUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Join our Telegram Channel or Support"
        className="group flex h-14 w-14 items-center justify-center rounded-full bg-[#229ED9] text-white shadow-lg shadow-sky-500/30 transition hover:bg-[#1e8ec3] focus:outline-none focus:ring-4 focus:ring-sky-300"
      >
        {/* Official Telegram Paper Airplane Icon */}
        <svg
          className="h-7 w-7 fill-current translate-x-[-1px] translate-y-[-1px]"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
        <span className="sr-only">Join Telegram Community</span>

        {/* Hover Tooltip */}
        <span className="pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 sm:inline-block hidden">
          Telegram Support & Updates
        </span>
      </a>
    </aside>
  );
}
