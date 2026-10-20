import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
      <p className="text-sm font-medium text-slate-600">Loading platform data...</p>
    </div>
  );
}
