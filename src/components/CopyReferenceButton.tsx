"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyReferenceButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy reference code:", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      aria-label="Copy reference tracking code"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-emerald-700 font-bold">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5 text-slate-500" />
          <span>Copy Code</span>
        </>
      )}
    </button>
  );
}
