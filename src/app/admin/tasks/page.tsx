import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TaskTable, TaskRecord } from "./TaskTable";

export const revalidate = 0;

export default async function AdminTasksPage() {
  // Independent Authorization Barrier
  await requireAdmin();

  const rawTasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
  });

  const formattedTasks: TaskRecord[] = rawTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    taskUrl: t.taskUrl,
    instructions: t.instructions,
    rewardInr: t.rewardInr.toString(),
    proofRequirements: t.proofRequirements,
    proofType: t.proofType,
    status: t.status,
    deadline: t.deadline ? t.deadline.toISOString() : null,
    maxSubmissions: t.maxSubmissions,
    currentSubmissions: t.currentSubmissions,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Task Management
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Create, edit, publish, pause, and close microtasks.
          </p>
        </div>
      </div>

      <TaskTable initialTasks={formattedTasks} />
    </div>
  );
}
