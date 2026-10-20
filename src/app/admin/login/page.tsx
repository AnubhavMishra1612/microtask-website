import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/session";
import { AdminLoginForm } from "./AdminLoginForm";
import { ShieldCheck, Lock } from "lucide-react";

export const metadata = {
  title: "Admin Sign In — Microtask Platform",
  description: "Secure administrator sign in portal.",
};

export default async function AdminLoginPage() {
  const currentAdmin = await getCurrentAdmin();
  if (currentAdmin) {
    redirect("/admin");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 mb-3">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Administrator Portal
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Sign in to manage tasks, verify submissions, and audit reviews
          </p>
        </div>

        <AdminLoginForm />

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500 text-center">
          <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>Protected by database-backed sessions and rate limiting.</span>
        </div>
      </div>
    </main>
  );
}
