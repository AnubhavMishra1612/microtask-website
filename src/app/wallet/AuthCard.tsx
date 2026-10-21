"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { userLoginAction, userRegisterAction, UserAuthState } from "./actions";
import { Wallet, ShieldCheck, ArrowRight, Lock, Phone, User, CheckCircle2 } from "lucide-react";

function SubmitButton({ isRegister }: { isRegister: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-indigo-200"
    >
      <span>{pending ? "Authenticating..." : isRegister ? "Create Wallet & Sign In" : "Sign In to Wallet"}</span>
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

export function AuthCard() {
  const [isRegister, setIsRegister] = useState(false);

  const [loginState, loginFormAction] = useFormState<UserAuthState, FormData>(
    userLoginAction,
    {}
  );
  const [registerState, registerFormAction] = useFormState<UserAuthState, FormData>(
    userRegisterAction,
    {}
  );

  const state = isRegister ? registerState : loginState;

  return (
    <div className="mx-auto max-w-md">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Card Header */}
        <div className="border-b border-slate-100 bg-slate-50/70 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 mb-3">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Worker Wallet Portal
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Sign in to check earnings, track balances, and withdraw directly to UPI
          </p>

          {/* Tab Switcher */}
          <div className="mt-5 flex rounded-xl bg-slate-200/70 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setIsRegister(false)}
              className={`flex-1 rounded-lg py-2 transition ${
                !isRegister
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              className={`flex-1 rounded-lg py-2 transition ${
                isRegister
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Create New Wallet
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8">
          {state.error && (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-800">
              {state.error}
            </div>
          )}

          <form action={isRegister ? registerFormAction : loginFormAction} className="space-y-4">
            {isRegister && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Full Name
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                {registerState.fieldErrors?.name && (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {registerState.fieldErrors.name}
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="contactInfo"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Phone Number or Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  id="contactInfo"
                  name="contactInfo"
                  type="text"
                  required
                  placeholder="e.g. 9876543210 or name@gmail.com"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Tip: Use the same contact info you provide when submitting tasks to automatically link earnings.
              </p>
              {state.fieldErrors?.contactInfo && (
                <p className="mt-1 text-xs font-medium text-rose-600">
                  {state.fieldErrors.contactInfo}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Password or PIN
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              {state.fieldErrors?.password && (
                <p className="mt-1 text-xs font-medium text-rose-600">
                  {state.fieldErrors.password}
                </p>
              )}
            </div>

            <div className="pt-2">
              <SubmitButton isRegister={isRegister} />
            </div>
          </form>

          {/* Trust Safeguards */}
          <div className="mt-6 border-t border-slate-100 pt-5 space-y-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>Instant payouts directly to any Indian UPI ID (GPay, PhonePe, Paytm)</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600 flex-shrink-0" />
              <span>Encrypted database storage with zero withdrawal fees</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
