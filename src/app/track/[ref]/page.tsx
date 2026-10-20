import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatINR, formatDateIST } from "@/lib/utils";
import { isValidReferenceCode } from "@/lib/reference";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Search,
  ShieldCheck,
} from "lucide-react";

export const revalidate = 0;

interface TrackPageProps {
  params: {
    ref: string;
  };
}

export default async function TrackStatusPage({ params }: TrackPageProps) {
  const refCode = decodeURIComponent(params.ref).trim().toUpperCase();

  if (!isValidReferenceCode(refCode)) {
    notFound();
  }

  // Fetch submission strictly matching the exact unpredictable reference code
  // Expose ONLY minimum necessary fields: DO NOT select contactInfo, submitterName, proofFileKey, etc.
  const submission = await prisma.taskSubmission.findUnique({
    where: { referenceCode: refCode },
    select: {
      id: false, // Do not leak DB id
      referenceCode: true,
      rewardSnapshot: true,
      status: true,
      rejectionReason: true,
      submittedAt: true,
      reviewedAt: true,
      task: {
        select: {
          title: true,
          rewardInr: true,
        },
      },
    },
  });

  if (!submission) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
            <Search className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Submission Not Found
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            No record matches reference code <span className="font-mono font-bold text-slate-800">{refCode}</span>. Please verify the code and try again.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/track"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Search className="h-4 w-4" />
              <span>Search Another Code</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Browse Active Tasks
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <Link
        href="/track"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Look up another submission
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header with Reference & Status Badge */}
        <div className="border-b border-slate-100 bg-slate-50/60 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="font-mono text-xs sm:text-sm font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
              {submission.referenceCode}
            </span>

            {/* Status Pill */}
            {submission.status === "PENDING" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800">
                <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                Under Review
              </span>
            )}
            {submission.status === "APPROVED" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Proof Approved
              </span>
            )}
            {submission.status === "REJECTED" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-800">
                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                Proof Rejected
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {submission.task.title}
          </h1>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-slate-500">Reward Value:</span>
            <span className="inline-flex items-center font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded text-sm">
              {formatINR(submission.rewardSnapshot.toString())}
            </span>
          </div>
        </div>

        {/* Status Body Details */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Status Message Cards */}
          {submission.status === "PENDING" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-amber-900 text-sm leading-relaxed">
              <div className="flex items-start gap-2.5">
                <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-bold text-amber-950">Review in Progress</h2>
                  <p className="mt-1 text-xs text-amber-800">
                    Your proof has been recorded and is currently waiting for an administrator to review. Most submissions are processed within 24 to 48 hours.
                  </p>
                </div>
              </div>
            </div>
          )}

          {submission.status === "APPROVED" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900 text-sm leading-relaxed">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-bold text-emerald-950">Proof Accepted!</h2>
                  <p className="mt-1 text-xs text-emerald-800">
                    Your submitted proof meets all task requirements and has been verified by the platform reviewer.
                  </p>
                  <p className="mt-2 text-xs text-slate-500 italic">
                    Note: Approval verifies proof compliance. Payouts and disbursements are handled in batches per platform schedule.
                  </p>
                </div>
              </div>
            </div>
          )}

          {submission.status === "REJECTED" && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-rose-900 text-sm leading-relaxed">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-bold text-rose-950">Review Feedback: Action Needed</h2>
                  <p className="mt-1 text-xs font-semibold text-rose-900">
                    Reason given by reviewer:
                  </p>
                  <div className="mt-1.5 rounded-lg bg-white border border-rose-200 p-3 text-xs font-medium text-rose-800">
                    &ldquo;{submission.rejectionReason}&rdquo;
                  </div>
                  <p className="mt-2 text-xs text-rose-700">
                    If task instructions allow resubmission, you may review the feedback and submit valid proof.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Timeline & Metadata */}
          <div className="border-t border-slate-100 pt-5 space-y-3 text-xs text-slate-500">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Submitted At:
              </span>
              <span className="font-medium text-slate-700">
                {formatDateIST(submission.submittedAt)}
              </span>
            </div>

            {submission.reviewedAt && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Reviewed At:
                </span>
                <span className="font-medium text-slate-700">
                  {formatDateIST(submission.reviewedAt)}
                </span>
              </div>
            )}
          </div>

          {/* Privacy Note */}
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 border border-slate-100">
            <ShieldCheck className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span>
              This public tracking view strictly displays status verification without revealing personal contact info or evidence files.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
