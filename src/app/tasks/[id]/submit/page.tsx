import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/utils";
import { SubmissionForm } from "./SubmissionForm";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export const revalidate = 0;

interface SubmitPageProps {
  params: {
    id: string;
  };
}

export default async function SubmitPage({ params }: SubmitPageProps) {
  const task = await prisma.task.findUnique({
    where: { id: params.id },
  });

  if (!task) {
    notFound();
  }

  const isExpired = task.deadline ? new Date(task.deadline).getTime() < Date.now() : false;
  const isEligible = task.status === "ACTIVE" && !isExpired;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href={`/tasks/${task.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to task details
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        {/* Task Header Summary */}
        <div className="border-b border-slate-100 pb-5 mb-6">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Submit Task Proof
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
              Reward: {formatINR(task.rewardInr.toString())}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {task.title}
          </h1>
        </div>

        {isEligible ? (
          <SubmissionForm
            taskId={task.id}
            taskTitle={task.title}
            proofType={task.proofType}
            proofRequirements={task.proofRequirements}
          />
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-600 mb-2" />
            <h2 className="text-base font-bold text-amber-900">
              Task Not Accepting Submissions
            </h2>
            <p className="mt-1 text-xs text-amber-700 max-w-sm mx-auto">
              {isExpired
                ? "The deadline for this task has passed."
                : `This task is currently ${task.status.toLowerCase()}.`}
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              Browse Active Tasks
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
