"use client";

import { useState } from "react";
import { TaskCard } from "./TaskCard";
import { Search, Filter, Inbox, X } from "lucide-react";

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  rewardInr: string;
  proofType: "TEXT" | "IMAGE" | "BOTH";
  deadline: string | null;
  currentSubmissions: number;
  maxSubmissions?: number | null;
}

export function TaskList({ initialTasks }: { initialTasks: TaskItem[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProofType, setSelectedProofType] = useState<string>("ALL");

  const filteredTasks = initialTasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      selectedProofType === "ALL" || task.proofType === selectedProofType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Controls: Search Bar and Proof Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks by title or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder-slate-400 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-slate-400" /> Filter:
          </span>
          {[
            { label: "All Tasks", value: "ALL" },
            { label: "Screenshot", value: "IMAGE" },
            { label: "Text Proof", value: "TEXT" },
            { label: "Both", value: "BOTH" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedProofType(tab.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                selectedProofType === tab.value
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task Grid or Empty State */}
      {filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              id={task.id}
              title={task.title}
              description={task.description}
              rewardInr={task.rewardInr}
              proofType={task.proofType}
              deadline={task.deadline}
              currentSubmissions={task.currentSubmissions}
              maxSubmissions={task.maxSubmissions}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Inbox className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900">
            No active tasks found
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            {searchQuery || selectedProofType !== "ALL"
              ? "No tasks match your current search criteria. Try resetting your search or filters."
              : "There are currently no active tasks available. Check back soon or join our Telegram channel for announcements."}
          </p>
          {(searchQuery || selectedProofType !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedProofType("ALL");
              }}
              className="mt-4 inline-flex items-center rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

