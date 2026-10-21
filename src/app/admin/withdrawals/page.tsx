import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { paiseToInrString } from "@/lib/wallet";
import { WithdrawalQueueTable, WithdrawalItem } from "./WithdrawalQueueTable";
import { ArrowUpRight, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminWithdrawalsPage() {
  await requireAdmin();

  const withdrawals = await prisma.withdrawalRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        include: {
          wallet: true,
        },
      },
    },
    take: 100,
  });

  const formattedWithdrawals: WithdrawalItem[] = withdrawals.map((w) => ({
    id: w.id,
    userId: w.userId,
    userName: w.user.name,
    userContact: w.user.contactInfo,
    userAvailableInr: paiseToInrString(w.user.wallet?.availablePaise || 0),
    realFullName: w.realFullName,
    upiId: w.upiId,
    amountInr: paiseToInrString(w.amountPaise),
    amountPaise: w.amountPaise,
    status: w.status,
    rejectionReason: w.rejectionReason,
    adminNotes: w.adminNotes,
    paymentRef: w.paymentRef,
    createdAt: w.createdAt.toISOString(),
    reviewedAt: w.reviewedAt ? w.reviewedAt.toISOString() : null,
    paidAt: w.paidAt ? w.paidAt.toISOString() : null,
  }));

  // Aggregate metrics
  const pendingRequests = formattedWithdrawals.filter(
    (w) => w.status === "PENDING" || w.status === "APPROVED" || w.status === "PROCESSING"
  );
  const pendingAmount = pendingRequests.reduce((sum, w) => sum + w.amountPaise, 0);

  const paidRequests = formattedWithdrawals.filter((w) => w.status === "PAID");
  const paidAmount = paidRequests.reduce((sum, w) => sum + w.amountPaise, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Wallet & Withdrawals Management
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Review worker UPI withdrawal requests, verify bank account holder names, and record completed disbursements.
          </p>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-800">
            <span>Pending Payouts</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-950">
            ₹{paiseToInrString(pendingAmount)}
          </div>
          <p className="mt-1 text-xs text-amber-800">
            {pendingRequests.length} request{pendingRequests.length !== 1 ? "s" : ""} awaiting completion
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-800">
            <span>Completed Payouts</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-950">
            ₹{paiseToInrString(paidAmount)}
          </div>
          <p className="mt-1 text-xs text-emerald-800">
            {paidRequests.length} request{paidRequests.length !== 1 ? "s" : ""} finalized
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Total Requests</span>
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {formattedWithdrawals.length}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            All-time withdrawal requests logged
          </p>
        </div>
      </div>

      {/* Queue Table */}
      <WithdrawalQueueTable initialWithdrawals={formattedWithdrawals} />
    </div>
  );
}
