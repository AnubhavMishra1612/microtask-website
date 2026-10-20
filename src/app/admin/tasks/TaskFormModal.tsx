"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useState } from "react";
import { saveTaskAction, TaskActionResponse } from "./actions";
import { TaskStatus } from "@prisma/client";
import { X, Loader2, Save, Plus } from "lucide-react";

export interface TaskFormData {
  id?: string;
  title: string;
  description: string;
  taskUrl?: string;
  instructions: string;
  rewardInr: string;
  proofRequirements: string;
  proofType: "TEXT" | "IMAGE" | "BOTH";
  status?: TaskStatus;
  deadline?: string;
  maxSubmissions?: string;
}

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: TaskFormData | null;
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Saving task...</span>
        </>
      ) : (
        <>
          {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span>{isEditing ? "Save Changes" : "Create Task"}</span>
        </>
      )}
    </button>
  );
}

export function TaskFormModal({ isOpen, onClose, taskToEdit }: TaskFormModalProps) {
  const isEditing = !!taskToEdit?.id;
  const [state, formAction] = useFormState<TaskActionResponse, FormData>(saveTaskAction, {});

  // Close modal when action succeeds
  useEffect(() => {
    if (state.success) {
      onClose();
    }
  }, [state.success, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            {isEditing ? "Edit Task Details" : "Create New Microtask"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {state.error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-5">
          {isEditing && <input type="hidden" name="taskId" value={taskToEdit.id} />}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              name="title"
              defaultValue={taskToEdit?.title || ""}
              required
              placeholder="e.g. Complete User Feedback Survey"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {state.fieldErrors?.title && (
              <p className="mt-1 text-xs text-rose-600">{state.fieldErrors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Short Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              name="description"
              rows={2}
              defaultValue={taskToEdit?.description || ""}
              required
              placeholder="Brief overview displayed on task cards..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {state.fieldErrors?.description && (
              <p className="mt-1 text-xs text-rose-600">{state.fieldErrors.description}</p>
            )}
          </div>

          {/* Task Link (URL) */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Task Link (URL) <span className="text-rose-500">*</span>
            </label>
            <input
              name="taskUrl"
              type="url"
              defaultValue={taskToEdit?.taskUrl || ""}
              required
              placeholder="https://example.com/task"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
            />
            {state.fieldErrors?.taskUrl && (
              <p className="mt-1 text-xs text-rose-600">{state.fieldErrors.taskUrl}</p>
            )}
          </div>

          {/* Step-by-step Instructions */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Step-by-step Instructions <span className="text-rose-500">*</span>
            </label>
            <textarea
              name="instructions"
              rows={4}
              defaultValue={taskToEdit?.instructions || ""}
              required
              placeholder="1. Open link&#10;2. Complete walkthrough&#10;3. Take screenshot"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
            />
            {state.fieldErrors?.instructions && (
              <p className="mt-1 text-xs text-rose-600">{state.fieldErrors.instructions}</p>
            )}
          </div>

          {/* Reward and Proof Type Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Reward Amount (INR ₹) <span className="text-rose-500">*</span>
              </label>
              <input
                name="rewardInr"
                type="text"
                defaultValue={taskToEdit?.rewardInr || "25.00"}
                required
                placeholder="25.00"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
              {state.fieldErrors?.rewardInr && (
                <p className="mt-1 text-xs text-rose-600">{state.fieldErrors.rewardInr}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Proof Type <span className="text-rose-500">*</span>
              </label>
              <select
                name="proofType"
                defaultValue={taskToEdit?.proofType || "BOTH"}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="IMAGE">Screenshot Only</option>
                <option value="TEXT">Text Proof Only</option>
                <option value="BOTH">Both (Screenshot + Text)</option>
              </select>
            </div>
          </div>

          {/* Proof Requirements Checklist */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Proof Checklist / Requirements <span className="text-rose-500">*</span>
            </label>
            <input
              name="proofRequirements"
              defaultValue={taskToEdit?.proofRequirements || ""}
              required
              placeholder="e.g. Screenshot must show the final success confirmation screen"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {state.fieldErrors?.proofRequirements && (
              <p className="mt-1 text-xs text-rose-600">{state.fieldErrors.proofRequirements}</p>
            )}
          </div>

          {/* Deadline and Initial Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Deadline (Optional)
              </label>
              <input
                name="deadline"
                type="datetime-local"
                defaultValue={
                  taskToEdit?.deadline ? new Date(taskToEdit.deadline).toISOString().slice(0, 16) : ""
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {!isEditing && (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Initial Publication Status
                </label>
                <select
                  name="status"
                  defaultValue="DRAFT"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="DRAFT">Draft (Not public)</option>
                  <option value="ACTIVE">Active (Publish immediately)</option>
                </select>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <SubmitButton isEditing={isEditing} />
          </div>
        </form>
      </div>
    </div>
  );
}
