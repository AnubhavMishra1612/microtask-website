"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";

export default function TrackLookupPage() {
  const router = useRouter();
  const [referenceCode, setReferenceCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = referenceCode.trim().toUpperCase();

    if (!clean) {
      setError("Please enter a tracking reference code.");
      return;
    }

    if (!/^TSK-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(clean)) {
      setError("Invalid code format. Example: TSK-ABCD-1234-EF56-7890");
      return;
    }

    setError(null);
    router.push(`/track/${encodeURIComponent(clean)}`);
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Track Your Submission
            </h1>
            <p className="text-xs text-slate-500">
              Check real-time approval status and review feedback
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Enter the unique 16-character tracking reference you received upon submitting your task proof.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="referenceInput"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Tracking Reference Code
            </label>
            <input
              id="referenceInput"
              type="text"
              placeholder="e.g. TSK-9F8A-3C2B-7E1D-4A5F"
              value={referenceCode}
              onChange={(e) => {
                setReferenceCode(e.target.value.toUpperCase());
                if (error) setError(null);
              }}
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-3 font-mono text-base tracking-wide text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            {error && (
              <p className="mt-1.5 text-xs font-medium text-rose-600">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
          >
            <span>Search Status</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Helpful Info Accordion / Tips */}
        <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
          <div className="flex items-start gap-2.5 text-xs text-slate-500">
            <HelpCircle className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-700">Where can I find my code?</p>
              <p className="mt-0.5 text-slate-500">
                Your reference code was displayed on the confirmation screen immediately after uploading your task proof.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-700">Privacy Safeguard</p>
              <p className="mt-0.5 text-slate-500">
                Only someone with the exact random reference code can check the status. Personal details and evidence screenshots remain confidential.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            ← Back to Active Tasks
          </Link>
        </div>
      </div>
    </main>
  );
}
