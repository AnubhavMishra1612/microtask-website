"use client";

import { useState } from "react";
import { updateWithdrawalStatusAction } from "./actions";
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  CreditCard,
  User,
  ExternalLink,
  ShieldAlert,
  Copy,
  Check,
} from "lucide-react";

export interface WithdrawalItem {
  id: string;
  userId: string;
  userName: string;
  userContact: string;
  userAvailableInr: string;
  realFullName: string;
  upiId: string;
  amountInr: string;
  amountPaise: number;
  status: "PENDING" | "APPROVED" | "PROCESSING" | "PAID" | "REJECTED";
  rejectionReason: string | null;
  adminNotes: string | null;
  paymentRef: string | null;
  createdAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
}

interface WithdrawalQueueTableProps {
  initialWithdrawals: WithdrawalItem[];
}

export function WithdrawalQueueTable({
  initialWithdrawals,
}: WithdrawalQueueTableProps) {
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>(initialWithdrawals);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedUpi, setCopiedUpi] = useState<string | null>(null);

  // Modal states
  const [actionItem, setActionItem] = useState<WithdrawalItem | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "PROCESSING" | "PAID" | "REJECT" | "DETAILS" | null>(null);
  const [reasonInput, setReasonInput] = useState("");
  const [paymentRefInput, setPaymentRefInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUpi(text);
    setTimeout(() => setCopiedUpi(null), 2000);
  };

  const filtered = withdrawals.filter((w) => {
    if (statusFilter !== "ALL" && w.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      w.id.toLowerCase().includes(q) ||
      w.realFullName.toLowerCase().includes(q) ||
      w.upiId.toLowerCase().includes(q) ||
      w.userName.toLowerCase().includes(q) ||
      w.userContact.toLowerCase().includes(q)
    );
  });

  const handleStatusTransition = async () => {
    if (!actionItem || !actionType) return;

    let targetStatus: "APPROVED" | "PROCESSING" | "PAID" | "REJECTED";
    if (actionType === "APPROVE") targetStatus = "APPROVED";
    else if (actionType === "PROCESSING") targetStatus = "PROCESSING";
    else if (actionType === "PAID") targetStatus = "PAID";
    else if (actionType === "REJECT") targetStatus = "REJECTED";
    else return;

    if (targetStatus === "REJECTED" && (!reasonInput.trim() || reasonInput.trim().length < 5)) {
      setErrorMessage("Please enter a rejection reason of at least 5 characters.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await updateWithdrawalStatusAction({
      withdrawalId: actionItem.id,
      targetStatus,
      reason: reasonInput,
      paymentRef: paymentRefInput,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || "Failed to update status.");
      return;
    }

    // Update local state
    setWithdrawals((prev) =>
      prev.map((item) =>
        item.id === actionItem.id
          ? {
              ...item,
              status: targetStatus,
              rejectionReason: targetStatus === "REJECTED" ? reasonInput.trim() : item.rejectionReason,
              paymentRef: targetStatus === "PAID" ? paymentRefInput.trim() || null : item.paymentRef,
            }
          : item
      )
    );

    // Close modal
    setActionItem(null);
    setActionType(null);
    setReasonInput("");
    setPaymentRefInput("");
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search by UPI, Name, Contact, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          {["ALL", "PENDING", "APPROVED", "PROCESSING", "PAID", "REJECTED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 transition ${
                statusFilter === st
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Processing Notice */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-bold text-amber-950">Manual UPI Payout Workflow</p>
          <p className="mt-0.5 text-amber-800">
            Microtask India payouts are processed manually by the platform administrator via your bank or UPI application (GPay / PhonePe / Paytm / BHIM). Copy the user&apos;s UPI ID and verify their real full name before transferring. Only mark a request as <strong>PAID</strong> after you have successfully completed the bank transfer.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">ID / Date</th>
                <th className="px-5 py-3.5">Worker Details</th>
                <th className="px-5 py-3.5">Account Holder Name</th>
                <th className="px-5 py-3.5">UPI ID</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Available Balance</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No withdrawal requests match your active filters.
                  </td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-4">
                      <div className="font-mono text-slate-800 font-bold">
                        #{w.id.slice(-8).toUpperCase()}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(w.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{w.userName}</div>
                      <div className="text-[11px] font-mono text-slate-500">{w.userContact}</div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {w.realFullName}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 font-mono text-slate-800 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg w-fit">
                        <span>{w.upiId}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(w.upiId)}
                          className="text-slate-400 hover:text-slate-700"
                          title="Copy UPI ID"
                        >
                          {copiedUpi === w.upiId ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-black text-slate-900 text-sm">
                        ₹{w.amountInr}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-slate-600 font-semibold">
                        ₹{w.userAvailableInr}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {w.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                          <Clock className="h-3 w-3 animate-pulse" />
                          PENDING
                        </span>
                      )}
                      {w.status === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                          <CheckCircle2 className="h-3 w-3" />
                          APPROVED
                        </span>
                      )}
                      {w.status === "PROCESSING" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
                          <Clock className="h-3 w-3" />
                          PROCESSING
                        </span>
                      )}
                      {w.status === "PAID" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          PAID
                        </span>
                      )}
                      {w.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                          <XCircle className="h-3 w-3" />
                          REJECTED
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {w.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setActionItem(w);
                                setActionType("APPROVE");
                              }}
                              className="rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActionItem(w);
                                setActionType("PROCESSING");
                              }}
                              className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
                            >
                              Process
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActionItem(w);
                                setActionType("REJECT");
                              }}
                              className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {w.status === "APPROVED" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setActionItem(w);
                                setActionType("PROCESSING");
                              }}
                              className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
                            >
                              Process
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActionItem(w);
                                setActionType("PAID");
                              }}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition"
                            >
                              Mark Paid
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActionItem(w);
                                setActionType("REJECT");
                              }}
                              className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {w.status === "PROCESSING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setActionItem(w);
                                setActionType("PAID");
                              }}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition"
                            >
                              Mark Paid
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActionItem(w);
                                setActionType("REJECT");
                              }}
                              className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {(w.status === "PAID" || w.status === "REJECTED") && (
                          <button
                            type="button"
                            onClick={() => {
                              setActionItem(w);
                              setActionType("DETAILS");
                            }}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                          >
                            Details
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action / Confirmation Modal */}
      {actionItem && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {actionType === "APPROVE" && "Approve Withdrawal Request"}
              {actionType === "PROCESSING" && "Mark Request as Processing"}
              {actionType === "PAID" && "Confirm Payment Completion"}
              {actionType === "REJECT" && "Reject Request & Release Funds"}
              {actionType === "DETAILS" && "Withdrawal Details"}
            </h3>

            {errorMessage && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
                {errorMessage}
              </div>
            )}

            <div className="rounded-xl bg-slate-50 p-3.5 space-y-1.5 text-xs text-slate-700 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Request ID:</span>
                <span className="font-mono font-bold">#{actionItem.id.slice(-8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Beneficiary Name:</span>
                <span className="font-bold">{actionItem.realFullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">UPI ID:</span>
                <span className="font-mono font-bold text-indigo-700">{actionItem.upiId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-sm text-emerald-800">₹{actionItem.amountInr}</span>
              </div>
              {actionItem.paymentRef && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment UTR/Ref:</span>
                  <span className="font-mono font-semibold">{actionItem.paymentRef}</span>
                </div>
              )}
              {actionItem.rejectionReason && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Rejection Reason:</span>
                  <span className="text-rose-700 font-semibold">{actionItem.rejectionReason}</span>
                </div>
              )}
            </div>

            {/* Inputs based on actionType */}
            {actionType === "PAID" && (
              <div className="space-y-3">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900">
                  <p className="font-bold">Confirmation Required:</p>
                  <p className="mt-0.5">
                    Confirm that you have manually executed the UPI payout of <strong>₹{actionItem.amountInr}</strong> to <strong>{actionItem.upiId}</strong> via your banking application.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank UTR / Transaction Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI/123456789012"
                    value={paymentRefInput}
                    onChange={(e) => setPaymentRefInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>
            )}

            {actionType === "REJECT" && (
              <div>
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-900 mb-3">
                  <p className="font-bold">Important:</p>
                  <p className="mt-0.5">
                    Rejecting this request will atomically release the reserved amount (<strong>₹{actionItem.amountInr}</strong>) back to the worker&apos;s available balance.
                  </p>
                </div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rejection Reason (Mandatory, min 5 chars)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Invalid UPI ID or Account name mismatch with bank records."
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900"
                />
              </div>
            )}

            {actionType === "APPROVE" && (
              <p className="text-xs text-slate-600">
                Approving this request indicates that details have been verified and it is queued for payment. Funds will remain reserved.
              </p>
            )}

            {actionType === "PROCESSING" && (
              <p className="text-xs text-slate-600">
                Marking this request as processing indicates that payment transfer is currently in progress. Funds will remain reserved.
              </p>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActionItem(null);
                  setActionType(null);
                  setErrorMessage(null);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>

              {actionType !== "DETAILS" && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleStatusTransition}
                  className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50 ${
                    actionType === "REJECT"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : actionType === "PAID"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {isSubmitting ? "Updating..." : "Confirm Action"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
