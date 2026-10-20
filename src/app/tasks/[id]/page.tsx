import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatINR, formatDateIST } from "@/lib/utils";
import {
  ArrowLeft,
  Clock,
  ShieldCheck,
  FileText,
  Image as ImageIcon,
  Layers,
  AlertTriangle,
  ArrowRight,
  ListOrdered,
  ExternalLink,
} from "lucide-react";

export const revalidate = 0;

interface TaskDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function TaskDetailsPage({ params }: TaskDetailsPageProps) {
  const task = await prisma.task.findUnique({
    where: { id: params.id },
  });

  if (!task) {
    notFound();
  }

  const isExpired = task.deadline ? new Date(task.deadline).getTime() < Date.now() : false;
  const isEligible = task.status === "ACTIVE" && !isExpired;

  // Split instructions by newlines if available
  const instructionLines = task.instructions
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to all tasks
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header Banner */}
        <div className="border-b border-slate-100 bg-slate-50/50 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-base font-bold text-emerald-800 border border-emerald-200">
              Reward: {formatINR(task.rewardInr.toString())}
            </span>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {task.proofType === "TEXT" && <FileText className="h-3.5 w-3.5 text-indigo-500" />}
                {task.proofType === "IMAGE" && <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />}
                {task.proofType === "BOTH" && <Layers className="h-3.5 w-3.5 text-indigo-500" />}
                {task.proofType === "TEXT" ? "Text Proof Only" : task.proofType === "IMAGE" ? "Screenshot Proof" : "Text + Screenshot"}
              </span>

              <span
                className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                  isEligible
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {isEligible ? "Accepting Submissions" : task.status === "ACTIVE" ? "Expired" : task.status}
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl leading-snug">
            {task.title}
          </h1>

          <p className="mt-3 text-sm text-slate-600 sm:text-base leading-relaxed whitespace-pre-line break-words">
            {task.description}
          </p>


          {task.deadline && (
            <div className="mt-4 flex items-center gap-2 text-xs sm:text-sm text-slate-500">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>
                Submission Deadline:{" "}
                <span className="font-semibold text-slate-800">{formatDateIST(task.deadline)}</span>
                {isExpired && <span className="ml-2 text-rose-600 font-bold">(Expired)</span>}
              </span>
            </div>
          )}

          {task.taskUrl && (
            <div className="mt-5 pt-4 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 p-4 sm:px-8">
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Task Destination Link</span>
                <p className="text-xs text-slate-600 truncate font-mono mt-0.5">{task.taskUrl}</p>
              </div>
              <a
                href={task.taskUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 flex-shrink-0"
              >
                <span>Open Task</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-6 sm:p-8 space-y-8">
          {/* Instructions */}
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-3">
              <ListOrdered className="h-5 w-5 text-indigo-600" />
              Task Instructions
            </h2>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-5">
              <ol className="space-y-3 text-sm text-slate-700 leading-relaxed list-decimal list-inside">
                {instructionLines.map((line, idx) => (
                  <li key={idx} className="pl-1">
                    <span className="font-medium text-slate-800">{line.replace(/^\d+[\.\)]\s*/, "")}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Proof Requirements */}
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-3">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              Proof Requirements
            </h2>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 text-sm text-slate-800 leading-relaxed">
              <p className="font-medium text-indigo-950 mb-2">What you need to submit:</p>
              <p className="text-slate-700 whitespace-pre-wrap">{task.proofRequirements}</p>
              
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600 border-t border-indigo-100/60 pt-3">
                <li>• Screenshots must be clear and readable (JPEG, PNG, or WebP under 5 MB).</li>
                <li>• Ensure proof directly matches instructions to guarantee approval.</li>
                <li>• Never upload private credentials, passwords, or unrelated files.</li>
              </ul>
            </div>
          </div>

          {/* Submission Action Callout */}
          <div className="pt-4 border-t border-slate-100">
            {isEligible ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Ready with your proof?</p>
                  <p className="text-xs text-slate-500">
                    Submit your proof to claim your reward of {formatINR(task.rewardInr.toString())}.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {task.taskUrl && (
                    <a
                      href={task.taskUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-5 py-3.5 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50 hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-200"
                    >
                      <span>Open Task</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <Link
                    href={`/tasks/${task.id}/submit`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300"
                  >
                    <span>Submit Task Proof</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold">Submissions Closed</h3>
                  <p className="mt-0.5 text-xs text-amber-700">
                    {isExpired
                      ? "The deadline for this task has passed. New submissions are no longer accepted."
                      : `This task is currently ${task.status.toLowerCase()} and cannot accept new submissions.`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
