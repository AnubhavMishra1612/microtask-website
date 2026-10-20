"use client";

import { useState } from "react";
import { formatINR, formatDateIST, formatBytes } from "@/lib/utils";
import { submitReviewAction, ReviewActionResponse } from "./actions";
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Copy,
  Check,
  User,
  History,
  ShieldAlert,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface ReviewLogItem {
  id: string;
  adminName: string;
  adminEmail: string;
  action: "APPROVED" | "REJECTED";
  reason: string | null;
  createdAt: string;
}

export interface SubmissionRecord {
  id: string;
  taskId: string;
  taskTitle: string;
  taskInstructions: string;
  taskProofType: "TEXT" | "IMAGE" | "BOTH";
  submitterName: string;
  contactInfo: string;
  proofText: string | null;
  proofFileKey: string | null;
  proofFileName: string | null;
  proofFileSize: number | null;
  proofMimeType: string | null;
  rewardSnapshot: string;
  referenceCode: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewLogs: ReviewLogItem[];
}

interface ReviewModalProps {
  submission: SubmissionRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated: (
    submissionId: string,
    newStatus: "APPROVED" | "REJECTED",
    log?: ReviewLogItem
  ) => void;
}

export function ReviewModal({
  submission,
  isOpen,
  onClose,
  onStatusUpdated,
}: ReviewModalProps) {
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Review action state
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState(false);

  if (!isOpen || !submission) return null;

  const handleCopyRef = async () => {
    try {
      await navigator.clipboard.writeText(submission.referenceCode);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyTextProof = async () => {
    if (!submission.proofText) return;
    try {
      await navigator.clipboard.writeText(submission.proofText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    setActionError(null);
    setConflictNotice(null);

    try {
      const res: ReviewActionResponse = await submitReviewAction(
        submission.id,
        "APPROVED"
      );

      if (res.conflict) {
        setConflictNotice(res.error || "Conflict: Status already updated by another admin.");
        if (res.newStatus) {
          onStatusUpdated(submission.id, res.newStatus);
        }
        return;
      }

      if (res.error) {
        setActionError(res.error);
        return;
      }

      if (res.success && res.newStatus) {
        onStatusUpdated(submission.id, res.newStatus, res.log);
        setConfirmApprove(false);
      }
    } catch (err: unknown) {
      console.error("Approval error:", err);
      setActionError("Failed to submit approval. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    const trimmed = rejectionReason.trim();
    if (trimmed.length < 5) {
      setActionError("A rejection reason of at least 5 characters is required.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setConflictNotice(null);

    try {
      const res: ReviewActionResponse = await submitReviewAction(
        submission.id,
        "REJECTED",
        trimmed
      );

      if (res.conflict) {
        setConflictNotice(res.error || "Conflict: Status already updated by another admin.");
        if (res.newStatus) {
          onStatusUpdated(submission.id, res.newStatus);
        }
        return;
      }

      if (res.error) {
        setActionError(res.error);
        return;
      }

      if (res.success && res.newStatus) {
        onStatusUpdated(submission.id, res.newStatus, res.log);
        setIsRejecting(false);
        setRejectionReason("");
      }
    } catch (err: unknown) {
      console.error("Rejection error:", err);
      setActionError("Failed to submit rejection. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: "PENDING" | "APPROVED" | "REJECTED") => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            Pending Review
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
            Rejected
          </span>
        );
    }
  };

  const isPending = submission.status === "PENDING";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl my-8 rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Submission Review
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-sm font-extrabold text-indigo-900">
                  {submission.referenceCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  title="Copy reference code"
                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  {copiedRef ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
            {getStatusBadge(submission.status)}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs text-slate-700">
          {/* Conflict Notification Banner */}
          {conflictNotice && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">Concurrent Update Conflict</p>
                <p className="text-[11px] text-amber-800 mt-0.5">{conflictNotice}</p>
                <p className="text-[11px] text-amber-700 mt-1">
                  The displayed status has been updated to reflect the server state.
                </p>
              </div>
            </div>
          )}

          {/* Action Error Banner */}
          {actionError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 flex items-center gap-2.5">
              <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
              <p className="text-xs font-semibold">{actionError}</p>
            </div>
          )}

          {/* 1. Task Information Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Task Information
              </span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs">
                Reward: {formatINR(submission.rewardSnapshot)}
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              {submission.taskTitle}
            </h3>

            <div>
              <button
                type="button"
                onClick={() => setShowInstructions(!showInstructions)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 transition-colors mt-1"
              >
                {showInstructions ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" /> Hide Task Instructions
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" /> View Task Instructions
                  </>
                )}
              </button>
              {showInstructions && (
                <div className="mt-2 p-3 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto font-sans">
                  {submission.taskInstructions}
                </div>
              )}
            </div>
          </div>

          {/* 2. Submitter & Contact (Restricted Admin View) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Worker Identification (Restricted Admin Data)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Submitter Name
                </span>
                <span className="font-semibold text-slate-900">
                  {submission.submitterName}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Contact / Identifier
                </span>
                <span className="font-mono text-slate-900 font-semibold break-all">
                  {submission.contactInfo}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Submitted At
                </span>
                <span className="text-slate-700">
                  {formatDateIST(submission.submittedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Proof Evidence Verification */}
          <div className="space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Proof of Work Evidence
            </span>

            {/* Text Proof */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  Text Proof
                </span>
                {submission.proofText && (
                  <button
                    type="button"
                    onClick={handleCopyTextProof}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                  >
                    {copiedText ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                )}
              </div>

              {submission.proofText ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {submission.proofText}
                </div>
              ) : (
                <p className="text-slate-400 italic text-[11px]">
                  No text proof was submitted for this task.
                </p>
              )}
            </div>

            {/* Screenshot / Image Proof */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                  <ImageIcon className="h-3.5 w-3.5 text-indigo-600" />
                  Screenshot Proof
                </span>
                {submission.proofFileKey && (
                  <a
                    href={`/api/admin/proofs/${submission.proofFileKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 transition-colors"
                  >
                    Open Full Size <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {submission.proofFileKey ? (
                <div className="space-y-2">
                  <div className="relative rounded-lg border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center max-h-80">
                    {/* Secure server-side proof endpoint */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/admin/proofs/${submission.proofFileKey}`}
                      alt="Submitted proof screenshot"
                      className="max-h-80 w-auto object-contain mx-auto"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono px-1">
                    <span>
                      {submission.proofFileName || submission.proofFileKey}
                    </span>
                    {submission.proofFileSize && (
                      <span>{formatBytes(submission.proofFileSize)}</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic text-[11px]">
                  No image proof was uploaded for this task.
                </p>
              )}
            </div>
          </div>

          {/* 4. Audit Trail & Decision History */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <History className="h-3.5 w-3.5 text-slate-400" />
              Chronological Audit Trail & Decisions
            </div>

            {submission.rejectionReason && (
              <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-rose-900">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 block">
                  Active Rejection Reason:
                </span>
                <p className="text-xs font-medium mt-0.5">
                  {submission.rejectionReason}
                </p>
              </div>
            )}

            {submission.reviewLogs && submission.reviewLogs.length > 0 ? (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {submission.reviewLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            log.action === "APPROVED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-rose-50 text-rose-800 border-rose-200"
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {log.adminName}
                        </span>
                        {log.adminEmail && (
                          <span className="text-slate-400 text-[11px]">
                            ({log.adminEmail})
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 text-[10px]">
                        {formatDateIST(log.createdAt)}
                      </span>
                    </div>
                    {log.reason && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 font-sans mt-0.5">
                        <span className="font-semibold text-slate-500">Note: </span>
                        {log.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic text-[11px]">
                No review decisions recorded yet.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-slate-500 text-[11px]">
            {isPending ? (
              <span>Action required: Inspect evidence before making a decision.</span>
            ) : (
              <span className="font-semibold text-slate-600">
                Decision finalized ({submission.status}). Historical decisions are logged immutably.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {isPending ? (
              <>
                {!isRejecting && !confirmApprove && (
                  <>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setIsRejecting(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                    >
                      Reject Submission...
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setConfirmApprove(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve Submission
                    </button>
                  </>
                )}

                {/* Confirm Approve State */}
                {confirmApprove && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-900">
                      Confirm Approval for {formatINR(submission.rewardSnapshot)}?
                    </span>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setConfirmApprove(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleApprove}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Yes, Approve
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Rejection Drawer / Form (When rejecting) */}
        {isRejecting && isPending && (
          <div className="p-4 border-t-2 border-rose-200 bg-rose-50/90 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-rose-600" />
                Mandatory Rejection Feedback (Min 5 Characters)
              </span>
              <span
                className={`text-[11px] font-mono font-bold ${
                  rejectionReason.trim().length >= 5
                    ? "text-emerald-700"
                    : "text-rose-600"
                }`}
              >
                {rejectionReason.trim().length} / 5 min
              </span>
            </div>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (actionError) setActionError(null);
              }}
              placeholder="Explain clearly why proof was rejected (e.g., 'Screenshot does not show completed transaction', 'Incorrect reference number')..."
              className="w-full rounded-xl border border-rose-300 p-2.5 text-xs text-slate-900 bg-white shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setIsRejecting(false);
                  setRejectionReason("");
                  setActionError(null);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-rose-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || rejectionReason.trim().length < 5}
                onClick={handleReject}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Confirm Rejection
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
