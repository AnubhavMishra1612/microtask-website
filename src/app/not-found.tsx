import Link from "next/link";
import { Search, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
        <Search className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-600">
        The requested task, reference, or page does not exist or has been removed.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Home className="h-4 w-4" />
          <span>Home</span>
        </Link>
        <Link
          href="/track"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Track Submission
        </Link>
      </div>
    </main>
  );
}
