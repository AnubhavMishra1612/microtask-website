"use client";

import { useState } from "react";
import { formatINR, formatDateIST } from "@/lib/utils";
import { updateTaskStatusAction, deleteTaskAction } from "./actions";
import { TaskFormModal, TaskFormData } from "./TaskFormModal";
import { TaskStatus } from "@prisma/client";
import {
  Play,
  Pause,
  XCircle,
  Edit,
  Trash2,
  Clock,
  Search,
  Filter,
  Plus,
  Layers,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  taskUrl: string | null;
  instructions: string;
  rewardInr: string;
  proofRequirements: string;
  proofType: "TEXT" | "IMAGE" | "BOTH";
  status: TaskStatus;
  deadline: string | null;
  maxSubmissions: number | null;
  currentSubmissions: number;
  createdAt: string;
}

export function TaskTable({ initialTasks }: { initialTasks: TaskRecord[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskFormData | null>(null);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await deleteTaskAction(taskToDelete.id);
      if (res.success) {
        setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
        setTaskToDelete(null);
      } else {
        setDeleteError(res.error || "Failed to delete task.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setDeleteError("An unexpected error occurred while deleting the task.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setStatusLoadingId(taskId);
    try {
      const res = await updateTaskStatusAction(taskId, newStatus);
      if (res.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
      } else {
        alert(res.error || "Failed to update status.");
      }
    } catch (err) {
      console.error("Status update error:", err);
      alert("Failed to update status.");
    } finally {
      setStatusLoadingId(null);
    }
  };

  const handleOpenCreate = () => {
    setTaskToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (task: TaskRecord) => {
    setTaskToEdit({
      id: task.id,
      title: task.title,
      description: task.description,
      taskUrl: task.taskUrl || "",
      instructions: task.instructions,
      rewardInr: task.rewardInr,
      proofRequirements: task.proofRequirements,
      proofType: task.proofType,
      status: task.status,
      deadline: task.deadline || undefined,
    });
    setModalOpen(true);
  };

  const filtered = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filterStatus === "ALL" || t.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Search, Filter & Create Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {["ALL", "ACTIVE", "DRAFT", "PAUSED", "CLOSED"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition ${
                  filterStatus === s
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Task Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Task Title</th>
                <th className="px-5 py-3.5">Reward</th>
                <th className="px-5 py-3.5">Proof Type</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Submissions</th>
                <th className="px-5 py-3.5">Deadline</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5 max-w-xs truncate">
                      <div className="font-semibold text-slate-900 truncate">{task.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">{task.description}</div>
                    </td>

                    <td className="px-5 py-3.5 font-bold text-emerald-700 font-mono">
                      {formatINR(task.rewardInr)}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {task.proofType === "TEXT" && <FileText className="h-3 w-3 text-indigo-500" />}
                        {task.proofType === "IMAGE" && <ImageIcon className="h-3 w-3 text-indigo-500" />}
                        {task.proofType === "BOTH" && <Layers className="h-3 w-3 text-indigo-500" />}
                        {task.proofType}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          task.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : task.status === "PAUSED"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : task.status === "DRAFT"
                            ? "bg-slate-100 text-slate-600 border border-slate-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 font-medium text-slate-700">
                      {task.currentSubmissions}
                    </td>

                    <td className="px-5 py-3.5 text-slate-500">
                      {task.deadline ? formatDateIST(task.deadline) : "None"}
                    </td>

                    <td className="px-5 py-3.5 text-right space-x-1 whitespace-nowrap">
                      {/* State transition buttons */}
                      {task.status === "DRAFT" && (
                        <button
                          disabled={statusLoadingId === task.id}
                          onClick={() => handleStatusChange(task.id, "ACTIVE")}
                          className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                          title="Publish task as Active"
                        >
                          <Play className="h-3 w-3" />
                          Publish
                        </button>
                      )}

                      {task.status === "ACTIVE" && (
                        <button
                          disabled={statusLoadingId === task.id}
                          onClick={() => handleStatusChange(task.id, "PAUSED")}
                          className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-100"
                          title="Pause task submissions"
                        >
                          <Pause className="h-3 w-3" />
                          Pause
                        </button>
                      )}

                      {task.status === "PAUSED" && (
                        <button
                          disabled={statusLoadingId === task.id}
                          onClick={() => handleStatusChange(task.id, "ACTIVE")}
                          className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                          title="Resume active submissions"
                        >
                          <Play className="h-3 w-3" />
                          Resume
                        </button>
                      )}

                      {task.status !== "CLOSED" && (
                        <button
                          disabled={statusLoadingId === task.id}
                          onClick={() => {
                            if (confirm(`Are you sure you want to close task "${task.title}"?`)) {
                              handleStatusChange(task.id, "CLOSED");
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                          title="Close task"
                        >
                          <XCircle className="h-3 w-3" />
                          Close
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEdit(task)}
                        className="inline-flex items-center gap-1 rounded bg-indigo-50 border border-indigo-200 px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
                        title="Edit task instructions and rewards"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </button>

                      <button
                        onClick={() => {
                          setDeleteError(null);
                          setTaskToDelete(task);
                        }}
                        className="inline-flex items-center gap-1 rounded bg-rose-50 border border-rose-200 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition"
                        title="Delete task permanently"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No tasks found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Creation & Edit Modal */}
      {modalOpen && (
        <TaskFormModal
          key={taskToEdit?.id ?? "create-task-modal"}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setTaskToEdit(null);
          }}
          taskToEdit={taskToEdit}
        />
      )}

      {/* Permanent Deletion Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 flex-shrink-0 mt-0.5">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete this task permanently?
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  This action cannot be undone. The task and its associated data may be permanently removed.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-800">
                {deleteError}
              </div>
            )}

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Task Title:</span>
                <span className="font-bold text-slate-900 line-clamp-1">{taskToDelete.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                <span className="font-semibold text-slate-800">{taskToDelete.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Submissions Logged:</span>
                <span className="font-semibold text-slate-800">{taskToDelete.currentSubmissions}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => {
                  setTaskToDelete(null);
                  setDeleteError(null);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 transition flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deleteLoading ? "Deleting..." : "Delete Permanently"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
