import Link from "next/link";
import { formatINR, formatDateIST } from "@/lib/utils";
import {
  Clock,
  FileText,
  Image as ImageIcon,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
} from "lucide-react";

export interface TaskCardProps {
  id: string;
  title: string;
  description: string;
  rewardInr: string | number;
  proofType: "TEXT" | "IMAGE" | "BOTH";
  deadline: Date | string | null;
  currentSubmissions?: number;
  maxSubmissions?: number | null;
}

export function TaskCard({
  id,
  title,
  description,
  rewardInr,
  proofType,
  deadline,
  currentSubmissions,
  maxSubmissions,
}: TaskCardProps) {
  const isExpiringSoon = deadline
    ? new Date(deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000 &&
      new Date(deadline).getTime() > Date.now()
    : false;

  return (
    <article className="group relative flex flex-col justify-between h-full rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-indigo-500 overflow-hidden">
      {/* Decorative top accent gradient bar */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 opacity-80 group-hover:opacity-100 transition-opacity" />

      {/* Main Card Content */}
      <div className="flex flex-col flex-1">
        {/* Top Header: Category Icon & Reward Badge */}
        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-slate-50 text-indigo-600 border border-indigo-100 shadow-xs group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
              {proofType === "IMAGE" && <ImageIcon className="h-5 w-5" />}
              {proofType === "TEXT" && <FileText className="h-5 w-5" />}
              {proofType === "BOTH" && <Layers className="h-5 w-5" />}
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                {proofType === "IMAGE"
                  ? "Screenshot Task"
                  : proofType === "TEXT"
                  ? "Text Task"
                  : "Multi-Proof Task"}
              </span>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                <span>Verified Microtask</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end flex-shrink-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm font-extrabold text-emerald-700 border border-emerald-200/80 shadow-xs">
              {formatINR(rewardInr)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">Fixed Reward</span>
          </div>
        </div>

        {/* Task Title */}
        <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
          {title}
        </h3>

        {/* Task Description */}
        <p className="mt-2 text-xs sm:text-sm text-slate-600 whitespace-pre-line break-words line-clamp-3 leading-relaxed">
          {description}
        </p>


        {/* Metadata Badges */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200/60">
            {proofType === "TEXT" && <FileText className="h-3 w-3 text-indigo-600" />}
            {proofType === "IMAGE" && <ImageIcon className="h-3 w-3 text-indigo-600" />}
            {proofType === "BOTH" && <Layers className="h-3 w-3 text-indigo-600" />}
            <span>
              {proofType === "TEXT"
                ? "Text Proof"
                : proofType === "IMAGE"
                ? "Screenshot"
                : "Text + Image"}
            </span>
          </span>

          {maxSubmissions && maxSubmissions > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50/70 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-100">
              <Users className="h-3 w-3" />
              <span>
                {currentSubmissions ?? 0}/{maxSubmissions} completed
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 border border-slate-200/60">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span>Open Enrollment</span>
            </span>
          )}
        </div>
      </div>

      {/* Card Footer: Deadline & Action CTA */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col justify-end">
        {/* Deadline Information */}
        {deadline ? (
          <div className="flex items-center justify-between text-xs mb-3">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock
                className={`h-3.5 w-3.5 ${
                  isExpiringSoon ? "text-amber-500" : "text-slate-400"
                }`}
              />
              <span>Deadline:</span>
            </div>
            <span
              className={`font-semibold ${
                isExpiringSoon ? "text-amber-700 font-bold" : "text-slate-700"
              }`}
            >
              {formatDateIST(deadline)}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs mb-3 text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-500">No expiration</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Review on submit</span>
          </div>
        )}

        {/* View Details Button */}
        <Link
          href={`/tasks/${id}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition-all duration-150 hover:bg-indigo-600 hover:text-white group-hover:bg-indigo-600 group-hover:text-white shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <span>View Task Details</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
    </article>
  );
}

