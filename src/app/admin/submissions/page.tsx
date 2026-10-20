import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SubmissionQueueTable } from "./SubmissionQueueTable";
import { SubmissionRecord } from "./ReviewModal";

export const revalidate = 0;

export default async function AdminSubmissionsPage() {
  // 1. Independent Server-Side Authorization Barrier
  await requireAdmin();

  // 2. Fetch real submissions with task info and audit logs from PostgreSQL
  const rawSubmissions = await prisma.taskSubmission.findMany({
    orderBy: { submittedAt: "desc" },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          instructions: true,
          proofType: true,
        },
      },
      reviewLogs: {
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // 3. Serialize PostgreSQL Decimal and Date types safely for Client Components
  const formattedSubmissions: SubmissionRecord[] = rawSubmissions.map((sub) => ({
    id: sub.id,
    taskId: sub.taskId,
    taskTitle: sub.task.title,
    taskInstructions: sub.task.instructions,
    taskProofType: sub.task.proofType,
    submitterName: sub.submitterName,
    contactInfo: sub.contactInfo,
    proofText: sub.proofText,
    proofFileKey: sub.proofFileKey,
    proofFileName: sub.proofFileName,
    proofFileSize: sub.proofFileSize,
    proofMimeType: sub.proofMimeType,
    rewardSnapshot: sub.rewardSnapshot.toString(),
    referenceCode: sub.referenceCode,
    status: sub.status,
    rejectionReason: sub.rejectionReason,
    submittedAt: sub.submittedAt.toISOString(),
    reviewedAt: sub.reviewedAt ? sub.reviewedAt.toISOString() : null,
    reviewLogs: sub.reviewLogs.map((log) => ({
      id: log.id,
      adminName: log.admin.name,
      adminEmail: log.admin.email,
      action: log.action,
      reason: log.reason,
      createdAt: log.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Submissions Review Queue
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Review submitted proofs, verify screenshots, record approval or rejection feedback, and inspect audit trails.
        </p>
      </div>

      <SubmissionQueueTable initialSubmissions={formattedSubmissions} />
    </div>
  );
}
