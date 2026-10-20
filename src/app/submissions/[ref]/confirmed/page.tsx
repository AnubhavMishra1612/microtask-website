import { notFound } from "next/navigation";
import Link from "next/link";
import { isValidReferenceCode } from "@/lib/reference";
import { CopyReferenceButton } from "@/components/CopyReferenceButton";
import { CheckCircle2, Search, ArrowRight, ShieldCheck, Home } from "lucide-react";

interface ConfirmedPageProps {
  params: {
    ref: string;
  };
}

export default function SubmissionConfirmedPage({ params }: ConfirmedPageProps) {
  const refCode = decodeURIComponent(params.ref).trim().toUpperCase();

  if (!isValidReferenceCode(refCode)) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 text-center shadow-sm">
        {/* Success Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-5">
          <CheckCircle2 className="h-9 w-9" />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
          Submission Received!
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Your proof has been submitted securely and is queued for administrative review.
        </p>

        {/* Reference Box */}
        <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Your Tracking Reference
            </span>
            <CopyReferenceButton code={refCode} />
          </div>

          <div className="font-mono text-xl sm:text-2xl font-bold tracking-wider text-indigo-950 select-all">
            {refCode}
          </div>

          <p className="mt-2 text-xs text-indigo-800/80 leading-relaxed">
            Please save or bookmark this reference code. You will need it to monitor your approval status and read reviewer feedback.
          </p>
        </div>

        {/* Security & Privacy Reminder */}
        <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-left text-xs text-slate-600">
          <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>
            Your proof file is stored in private storage and is only accessible by platform reviewers.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/track/${encodeURIComponent(refCode)}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700"
          >
            <Search className="h-4 w-4" />
            <span>Track Submission Status</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Home className="h-4 w-4" />
            <span>Browse More Tasks</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
