"use client";

import { useState, useMemo } from "react";
import { formatINR, formatDateIST } from "@/lib/utils";
import { ReviewModal, SubmissionRecord, ReviewLogItem } from "./ReviewModal";
import {
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Image as ImageIcon,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  RotateCcw,
} from "lucide-react";

interface SubmissionQueueTableProps {
  initialSubmissions: SubmissionRecord[];
}

const ITEMS_PER_PAGE = 10;

export function SubmissionQueueTable({
  initialSubmissions,
}: SubmissionQueueTableProps) {
  const [submissions, setSubmissions] =
    useState<SubmissionRecord[]>(initialSubmissions);
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  >("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionRecord | null>(null);

  // Compute status counts
  const counts = useMemo(() => {
    return {
      ALL: submissions.length,
      PENDING: submissions.filter((s) => s.status === "PENDING").length,
      APPROVED: submissions.filter((s) => s.status === "APPROVED").length,
      REJECTED: submissions.filter((s) => s.status === "REJECTED").length,
    };
  }, [submissions]);

  // Filter & Search logic
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // 1. Status Filter
      if (statusFilter !== "ALL" && sub.status !== statusFilter) {
        return false;
      }

      // 2. Search Query (Case-insensitive trimmed match against referenceCode, taskTitle, or submitterName)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesRef = sub.referenceCode.toLowerCase().includes(query);
        const matchesTitle = sub.taskTitle.toLowerCase().includes(query);
        const matchesName = sub.submitterName.toLowerCase().includes(query);
        if (!matchesRef && !matchesTitle && !matchesName) {
          return false;
        }
      }

      return true;
    });
  }, [submissions, statusFilter, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE)
  );
  const paginatedSubmissions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSubmissions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSubmissions, currentPage]);

  const handleStatusChange = (
    filter: "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  ) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleOpenReview = (submission: SubmissionRecord) => {
    setSelectedSubmission(submission);
  };

  const handleCloseReview = () => {
    setSelectedSubmission(null);
  };

  const handleStatusUpdated = (
    submissionId: string,
    newStatus: "APPROVED" | "REJECTED",
    newLog?: ReviewLogItem
  ) => {
    setSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.id !== submissionId) return sub;

        const updatedLogs = newLog ? [newLog, ...sub.reviewLogs] : sub.reviewLogs;
        const updatedReason =
          newStatus === "REJECTED" && newLog?.reason
            ? newLog.reason
            : sub.rejectionReason;

        return {
          ...sub,
          status: newStatus,
          rejectionReason: updatedReason,
          reviewedAt: new Date().toISOString(),
          reviewLogs: updatedLogs,
        };
      })
    );

    // Keep selectedSubmission in sync if modal is open
    setSelectedSubmission((prev) => {
      if (!prev || prev.id !== submissionId) return prev;
      const updatedLogs = newLog ? [newLog, ...prev.reviewLogs] : prev.reviewLogs;
      return {
        ...prev,
        status: newStatus,
        rejectionReason:
          newStatus === "REJECTED" && newLog?.reason
            ? newLog.reason
            : prev.rejectionReason,
        reviewedAt: new Date().toISOString(),
        reviewLogs: updatedLogs,
      };
    });
  };

  const getStatusBadge = (status: "PENDING" | "APPROVED" | "REJECTED") => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="h-3 w-3 text-amber-600" />
            Pending
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="h-3 w-3 text-rose-600" />
            Rejected
          </span>
        );
    }
  };

  const getProofTypeIcon = (proofType: "TEXT" | "IMAGE" | "BOTH") => {
    switch (proofType) {
      case "TEXT":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
            <FileText className="h-3.5 w-3.5 text-indigo-500" /> Text
          </span>
        );
      case "IMAGE":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
            <ImageIcon className="h-3.5 w-3.5 text-blue-500" /> Screenshot
          </span>
        );
      case "BOTH":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
            <Layers className="h-3.5 w-3.5 text-purple-500" /> Text + Image
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {(
            [
              { key: "PENDING", label: "Pending", count: counts.PENDING },
              { key: "APPROVED", label: "Approved", count: counts.APPROVED },
              { key: "REJECTED", label: "Rejected", count: counts.REJECTED },
              { key: "ALL", label: "All Submissions", count: counts.ALL },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleStatusChange(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                statusFilter === tab.key
                  ? "bg-indigo-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  statusFilter === tab.key
                    ? "bg-indigo-800 text-indigo-100"
                    : "bg-slate-200/70 text-slate-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[280px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by ref code (TSK-...), title..."
            className="w-full rounded-xl border border-slate-200 pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Submissions Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {paginatedSubmissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Reference Code</th>
                  <th className="px-5 py-3">Task Title</th>
                  <th className="px-5 py-3">Submitter & Contact</th>
                  <th className="px-5 py-3">Proof Type</th>
                  <th className="px-5 py-3">Reward</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Submitted At</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSubmissions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono font-bold text-indigo-950">
                      {sub.referenceCode}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-800 max-w-xs truncate">
                      {sub.taskTitle}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900">
                        {sub.submitterName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 truncate max-w-[140px]">
                        {sub.contactInfo}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {getProofTypeIcon(sub.taskProofType)}
                    </td>
                    <td className="px-5 py-3 font-bold text-emerald-700 font-mono">
                      {formatINR(sub.rewardSnapshot)}
                    </td>
                    <td className="px-5 py-3">{getStatusBadge(sub.status)}</td>
                    <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                      {formatDateIST(sub.submittedAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenReview(sub)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                          sub.status === "PENDING"
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {sub.status === "PENDING" ? "Review" : "Details"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 text-sm space-y-2">
            <Clock className="mx-auto h-10 w-10 text-slate-300 mb-1" />
            <p className="font-semibold text-slate-800 text-base">
              No submissions found
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {searchQuery || statusFilter !== "ALL"
                ? `No submissions match the current filter (${statusFilter}) or search term.`
                : "No task submissions have been submitted by workers yet."}
            </p>
            {(searchQuery || statusFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("ALL");
                  setSearchQuery("");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
              </button>
            )}
          </div>
        )}

        {/* Pagination Footer */}
        {filteredSubmissions.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div>
              Showing{" "}
              <span className="font-bold text-slate-700">
                {Math.min(
                  (currentPage - 1) * ITEMS_PER_PAGE + 1,
                  filteredSubmissions.length
                )}
              </span>{" "}
              to{" "}
              <span className="font-bold text-slate-700">
                {Math.min(
                  currentPage * ITEMS_PER_PAGE,
                  filteredSubmissions.length
                )}
              </span>{" "}
              of{" "}
              <span className="font-bold text-slate-700">
                {filteredSubmissions.length}
              </span>{" "}
              submissions
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-mono text-xs font-medium text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Details Modal */}
      <ReviewModal
        submission={selectedSubmission}
        isOpen={!!selectedSubmission}
        onClose={handleCloseReview}
        onStatusUpdated={handleStatusUpdated}
      />
    </div>
  );
}
