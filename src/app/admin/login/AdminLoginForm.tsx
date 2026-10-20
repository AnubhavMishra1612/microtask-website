"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { adminLoginAction, AdminLoginState } from "../actions";
import { Lock, Mail, ArrowRight, Loader2, AlertCircle } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Verifying credentials...</span>
        </>
      ) : (
        <>
          <span>Sign In to Dashboard</span>
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

export function AdminLoginForm() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";

  const [state, formAction] = useFormState<AdminLoginState, FormData>(
    adminLoginAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="from" value={from} />

      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Authentication failed</p>
            <p className="mt-0.5 text-xs text-rose-700">{state.error}</p>
          </div>
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
        >
          Admin Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="admin@example.com"
            className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        {state.fieldErrors?.email && (
          <p className="mt-1.5 text-xs font-medium text-rose-600">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
        >
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••••••"
            className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        {state.fieldErrors?.password && (
          <p className="mt-1.5 text-xs font-medium text-rose-600">
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
