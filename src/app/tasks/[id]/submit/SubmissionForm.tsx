"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState, useRef } from "react";
import { submitTaskAction, SubmitActionState } from "./actions";
import {
  Upload,
  AlertCircle,
  FileCheck,
  X,
  FileText,
  Image as ImageIcon,
  Send,
  Loader2,
} from "lucide-react";

interface SubmissionFormProps {
  taskId: string;
  taskTitle: string;
  proofType: "TEXT" | "IMAGE" | "BOTH";
  proofRequirements: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Verifying & Submitting...</span>
        </>
      ) : (
        <>
          <Send className="h-4 w-4" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

export function SubmissionForm({
  taskId,
  taskTitle,
  proofType,
  proofRequirements,
}: SubmissionFormProps) {
  const [state, formAction] = useFormState<SubmitActionState, FormData>(
    submitTaskAction,
    {}
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiresText = proofType === "TEXT" || proofType === "BOTH";
  const requiresImage = proofType === "IMAGE" || proofType === "BOTH";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        const previewUrl = URL.createObjectURL(file);
        setFilePreview(previewUrl);
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="taskId" value={taskId} />

      {/* General Error Alert */}
      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Submission failed</p>
            <p className="mt-0.5 text-xs text-rose-700">{state.error}</p>
          </div>
        </div>
      )}

      {/* Submitter Name */}
      <div>
        <label
          htmlFor="submitterName"
          className="block text-sm font-semibold text-slate-800"
        >
          Your Name <span className="text-rose-500">*</span>
        </label>
        <p className="text-xs text-slate-500 mb-1.5">
          Enter your full name or preferred display name.
        </p>
        <input
          id="submitterName"
          name="submitterName"
          type="text"
          required
          placeholder="e.g. Rahul Sharma"
          className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
            state.fieldErrors?.submitterName
              ? "border-rose-400 focus:ring-rose-200"
              : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
          }`}
        />
        {state.fieldErrors?.submitterName && (
          <p className="mt-1 text-xs text-rose-600">
            {state.fieldErrors.submitterName}
          </p>
        )}
      </div>

      {/* Contact Details */}
      <div>
        <label
          htmlFor="contactInfo"
          className="block text-sm font-semibold text-slate-800"
        >
          Contact / Reward Detail <span className="text-rose-500">*</span>
        </label>
        <p className="text-xs text-slate-500 mb-1.5">
          Telegram username (@handle), Mobile number, or Email for verification and tracking.
        </p>
        <input
          id="contactInfo"
          name="contactInfo"
          type="text"
          required
          placeholder="e.g. @rahul_earnings or 9876543210"
          className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
            state.fieldErrors?.contactInfo
              ? "border-rose-400 focus:ring-rose-200"
              : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
          }`}
        />
        {state.fieldErrors?.contactInfo && (
          <p className="mt-1 text-xs text-rose-600">
            {state.fieldErrors.contactInfo}
          </p>
        )}
      </div>

      {/* Proof Text Input (if required or optional) */}
      {requiresText && (
        <div>
          <label
            htmlFor="proofText"
            className="flex items-center justify-between text-sm font-semibold text-slate-800"
          >
            <span>
              Proof Text / Confirmation Code <span className="text-rose-500">*</span>
            </span>
            <span className="text-xs font-normal text-indigo-600 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              Required
            </span>
          </label>
          <p className="text-xs text-slate-500 mb-1.5">
            Instructions requirement: &ldquo;{proofRequirements}&rdquo;
          </p>
          <textarea
            id="proofText"
            name="proofText"
            rows={4}
            required
            placeholder="Paste your confirmation code, answers, or submission details here..."
            className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
              state.fieldErrors?.proofText
                ? "border-rose-400 focus:ring-rose-200"
                : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
            }`}
          />
          {state.fieldErrors?.proofText && (
            <p className="mt-1 text-xs text-rose-600">
              {state.fieldErrors.proofText}
            </p>
          )}
        </div>
      )}

      {/* File Upload (if image or both) */}
      {requiresImage && (
        <div>
          <label className="flex items-center justify-between text-sm font-semibold text-slate-800">
            <span>
              Screenshot Proof <span className="text-rose-500">*</span>
            </span>
            <span className="text-xs font-normal text-indigo-600 flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5" />
              JPEG, PNG, or WebP (Max 5 MB)
            </span>
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Upload a clear, unaltered screenshot proving task completion.
          </p>

          <input
            ref={fileInputRef}
            id="proofFile"
            name="proofFile"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition hover:bg-slate-50 ${
                state.fieldErrors?.proofFile
                  ? "border-rose-300 bg-rose-50/30"
                  : "border-slate-300 bg-slate-50/50"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-800">
                Tap to upload or drag screenshot here
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Accepted: JPEG, PNG, WebP up to 5 MB
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3 overflow-hidden">
                {filePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="h-12 w-12 rounded-lg object-cover border border-slate-200"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <FileCheck className="h-6 w-6" />
                  </div>
                )}
                <div className="truncate">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemoveFile}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                aria-label="Remove uploaded screenshot"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {state.fieldErrors?.proofFile && (
            <p className="mt-1 text-xs text-rose-600">
              {state.fieldErrors.proofFile}
            </p>
          )}
        </div>
      )}

      {/* Privacy Notice */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-500 leading-relaxed">
        🔒 <strong>Privacy Assurance:</strong> Your uploaded screenshots are kept in private storage and never displayed publicly. Only authorized platform administrators can view them for verification.
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <SubmitButton label="Submit Proof for Review" />
      </div>
    </form>
  );
}
