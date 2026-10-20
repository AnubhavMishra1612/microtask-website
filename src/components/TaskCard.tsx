import Link from "next/link";
import { formatINR, formatDateIST } from "@/lib/utils";
import { Clock, FileText, Image as ImageIcon, Layers, ArrowRight } from "lucide-react";

export interface TaskCardProps {
  id: string;
  title: string;
  description: string;
  rewardInr: string | number;
  proofType: "TEXT" | "IMAGE" | "BOTH";
  deadline: Date | string | null;
  currentSubmissions?: number;
}

export function TaskCard({
  id,
  title,
  description,
  rewardInr,
  proofType,
  deadline,
}: TaskCardProps) {
  const isExpiringSoon = deadline
    ? new Date(deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000 &&
      new Date(deadline).getTime() > Date.now()
    : false;

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-500">
      <div>
        {/* Top Header: Reward Badge & Proof Type */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800 border border-emerald-200">
            {formatINR(rewardInr)}
          </span>

          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {proofType === "TEXT" && <FileText className="h-3.5 w-3.5 text-indigo-600" />}
            {proofType === "IMAGE" && <ImageIcon className="h-3.5 w-3.5 text-indigo-600" />}
            {proofType === "BOTH" && <Layers className="h-3.5 w-3.5 text-indigo-600" />}
            {proofType === "TEXT" ? "Text Proof" : proofType === "IMAGE" ? "Screenshot" : "Text + Image"}
          </span>
        </div>

        {/* Task Title */}
        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
          {title}
        </h3>

        {/* Task Description */}
        <p className="mt-2 text-sm text-slate-600 line-clamp-2 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100">
        {/* Deadline Information */}
        {deadline && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
            <Clock className={`h-3.5 w-3.5 ${isExpiringSoon ? "text-amber-500" : "text-slate-400"}`} />
            <span>
              Deadline: <span className="font-semibold text-slate-700">{formatDateIST(deadline)}</span>
            </span>
          </div>
        )}

        {/* View Details Button */}
        <Link
          href={`/tasks/${id}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition-all duration-150 hover:bg-indigo-600 hover:text-white group-hover:bg-indigo-600 group-hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <span>View Task Details</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}
