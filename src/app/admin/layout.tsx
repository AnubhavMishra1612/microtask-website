import Link from "next/link";
import { getCurrentAdmin } from "@/lib/session";
import { adminLogoutAction } from "./actions";
import {
  LayoutDashboard,
  CheckSquare,
  ClipboardList,
  Settings,
  LogOut,
  Shield,
  User,
  Wallet,
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();

  // If not logged in (e.g. viewing /admin/login), render children without the admin frame
  if (!admin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Admin Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2 font-bold text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white">
                <Shield className="h-4 w-4" />
              </div>
              <span className="text-base tracking-tight font-extrabold">
                Admin<span className="text-indigo-400 font-normal ml-1">Portal</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/admin/tasks"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <CheckSquare className="h-4 w-4" />
                Tasks
              </Link>
              <Link
                href="/admin/submissions"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <ClipboardList className="h-4 w-4" />
                Submissions
              </Link>
              <Link
                href="/admin/withdrawals"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <Wallet className="h-4 w-4" />
                Withdrawals
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs text-slate-300 border border-slate-700">
              <User className="h-3.5 w-3.5 text-indigo-400" />
              <span className="font-medium text-slate-200">{admin.email}</span>
            </div>

            <form action={adminLogoutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-rose-950/40 border border-rose-800/60 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 transition focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </form>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden border-t border-slate-800 bg-slate-950/70 px-4 py-2 overflow-x-auto gap-1">
          <Link
            href="/admin"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 whitespace-nowrap"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <Link
            href="/admin/tasks"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 whitespace-nowrap"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Tasks
          </Link>
          <Link
            href="/admin/submissions"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 whitespace-nowrap"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Submissions
          </Link>
          <Link
            href="/admin/withdrawals"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 whitespace-nowrap"
          >
            <Wallet className="h-3.5 w-3.5" />
            Withdrawals
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 whitespace-nowrap"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Link>
        </div>
      </header>

      {/* Main Admin Content Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}
