import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatINR, formatDateIST } from "@/lib/utils";
import Link from "next/link";
import {
  CheckSquare,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Shield,
  Coins,
} from "lucide-react";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  // Independent Authorization Barrier
  await requireAdmin();

  // Fetch database metrics in structured batches to avoid connection bursts over WAN
  const [activeTasksCount, totalSubmissionsCount, pendingSubmissionsCount] =
    await Promise.all([
      prisma.task.count({ where: { status: "ACTIVE" } }),
      prisma.taskSubmission.count(),
      prisma.taskSubmission.count({ where: { status: "PENDING" } }),
    ]);

  const [
    approvedSubmissionsCount,
    rejectedSubmissionsCount,
    approvedRewardsAggregate,
    recentPendingSubmissions,
  ] = await Promise.all([
    prisma.taskSubmission.count({ where: { status: "APPROVED" } }),
    prisma.taskSubmission.count({ where: { status: "REJECTED" } }),
    prisma.taskSubmission.aggregate({
      _sum: { rewardSnapshot: true },
      where: { status: "APPROVED" },
    }),
    prisma.taskSubmission.findMany({
      where: { status: "PENDING" },
      take: 5,
      orderBy: { submittedAt: "desc" },
      include: {
        task: {
          select: { title: true },
        },
      },
    }),
  ]);

  const totalApprovedRewards = approvedRewardsAggregate._sum.rewardSnapshot || 0;

  return (
    <div className="space-y-8">
      {/* Dashboard Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Operational Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time platform metrics, task management, and submission queue.
          </p>
        </div>

        <Link
          href="/admin/tasks?action=new"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Task</span>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Tasks Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Tasks</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{activeTasksCount}</div>
          <p className="mt-1 text-xs text-slate-500">Available to public workers</p>
        </div>

        {/* Pending Reviews Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Reviews</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">{pendingSubmissionsCount}</div>
          <p className="mt-1 text-xs text-slate-500">Awaiting administrator verification</p>
        </div>

        {/* Approved Submissions Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Approved Submissions</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">{approvedSubmissionsCount}</div>
          <p className="mt-1 text-xs text-slate-500">Out of {totalSubmissionsCount} total submissions</p>
        </div>

        {/* Approved Rewards Card (Labeled accurately) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Approved Rewards</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatINR(totalApprovedRewards.toString())}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 leading-tight">
            Verified proof value (Approval does not represent proof of payment).
          </p>
        </div>
      </div>

      {/* Quick Access Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/admin/tasks"
          className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
        >
          <div>
            <div className="flex items-center gap-2 font-bold text-slate-900 group-hover:text-indigo-600">
              <CheckSquare className="h-5 w-5 text-indigo-600" />
              <span>Task Management</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              Create new tasks, toggle status (Publish, Pause, Close), and update instructions or rewards.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-indigo-600">
            <span>Manage Tasks</span>
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
          </div>
        </Link>

        <Link
          href="/admin/submissions"
          className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
        >
          <div>
            <div className="flex items-center gap-2 font-bold text-slate-900 group-hover:text-indigo-600">
              <ClipboardList className="h-5 w-5 text-amber-600" />
              <span>Review Queue</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              Inspect submitted proofs, preview private screenshots, and approve or reject submissions.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-indigo-600">
            <span>Review Submissions ({pendingSubmissionsCount})</span>
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
          </div>
        </Link>

        <Link
          href="/admin/settings"
          className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
        >
          <div>
            <div className="flex items-center gap-2 font-bold text-slate-900 group-hover:text-indigo-600">
              <Shield className="h-5 w-5 text-slate-600" />
              <span>Platform Settings</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              Configure the public Telegram support/channel URL and manage platform configuration.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-indigo-600">
            <span>Configure Settings</span>
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
          </div>
        </Link>
      </div>

      {/* Recent Submissions Queue Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Recent Submissions Awaiting Review
          </h2>
          <Link
            href="/admin/submissions"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            View all submissions →
          </Link>
        </div>

        {recentPendingSubmissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Reference Code</th>
                  <th className="px-6 py-3">Task Title</th>
                  <th className="px-6 py-3">Submitter</th>
                  <th className="px-6 py-3">Reward</th>
                  <th className="px-6 py-3">Submitted At</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPendingSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-3 font-mono text-xs font-bold text-indigo-900">
                      {sub.referenceCode}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-800 truncate max-w-xs">
                      {sub.task.title}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {sub.submitterName}
                    </td>
                    <td className="px-6 py-3 font-semibold text-emerald-700">
                      {formatINR(sub.rewardSnapshot.toString())}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-500">
                      {formatDateIST(sub.submittedAt)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/admin/submissions?ref=${sub.referenceCode}`}
                        className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-sm">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
            <p className="font-semibold text-slate-800">All caught up!</p>
            <p className="text-xs text-slate-500 mt-1">There are no pending submissions awaiting review right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
