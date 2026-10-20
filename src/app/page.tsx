import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { TaskList } from "@/components/TaskList";
import { TestimonialSection } from "@/components/TestimonialSection";
import {
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowDown,
  Search,
  ListOrdered,
  UploadCloud,
  FileCheck2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export const revalidate = 0; // Dynamic data for live task listings

export default async function HomePage() {
  const now = new Date();

  // Fetch only eligible ACTIVE tasks whose deadline is either null or in the future
  const activeTasks = await prisma.task.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { deadline: null },
        { deadline: { gt: now } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch Telegram link from site settings if available
  const telegramSetting = await prisma.siteSetting.findUnique({
    where: { key: "telegram_url" },
  });
  const telegramEnabled = await prisma.siteSetting.findUnique({
    where: { key: "telegram_enabled" },
  });
  const showTelegram = telegramEnabled?.value !== "false";
  const telegramUrl = telegramSetting?.value || process.env.DEFAULT_TELEGRAM_URL || "https://t.me/demo_microtask_channel";

  const formattedTasks = activeTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    rewardInr: t.rewardInr.toString(),
    proofType: t.proofType,
    deadline: t.deadline ? t.deadline.toISOString() : null,
    currentSubmissions: t.currentSubmissions,
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-8 sm:p-12 text-white shadow-xl border border-slate-800">
        {/* Subtle decorative background glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 border border-indigo-400/20 backdrop-blur animate-fade-in mb-5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Verified Digital Microtasks in India</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl leading-tight text-white animate-fade-in-up">
            Complete Microtasks. <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-indigo-200 to-white">
              Submit Proof. Earn INR.
            </span>
          </h1>

          <p className="mt-4 text-sm text-slate-300 sm:text-base sm:leading-relaxed max-w-2xl animate-fade-in-up-delay-1">
            Browse verified digital microtasks, follow step-by-step instructions, upload proof of completion, and track your review status with an unpredictable private reference code. Simple, honest verification with zero guesswork.
          </p>

          {/* Action Call to Actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 animate-fade-in-up-delay-2">
            <a
              href="#tasks"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 hover:shadow-indigo-600/40 focus:outline-none focus:ring-4 focus:ring-indigo-300"
            >
              <span>Browse Active Tasks</span>
              <ArrowDown className="h-4 w-4" />
            </a>

            <Link
              href="/track"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3.5 text-sm font-bold text-slate-200 backdrop-blur transition hover:bg-slate-800 hover:border-slate-600 hover:text-white focus:outline-none focus:ring-4 focus:ring-slate-700"
            >
              <Search className="h-4 w-4 text-slate-400" />
              <span>Track Submission Status</span>
            </Link>
          </div>

          {/* Trust and Feature Highlights */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>Exact INR Rewards Upfront</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-400 flex-shrink-0" />
              <span>No Account or Signup Required</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <span>Private Token Status Tracking</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. How it works in 3 steps */}
      <section id="how-it-works" className="mt-16 sm:mt-24">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-100 mb-2">
            Simple 3-Step Process
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl tracking-tight">
            How Microtask India Works
          </h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-base leading-relaxed">
            Follow these straightforward steps from task discovery to proof submission and status tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-indigo-200">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <ListOrdered className="h-6 w-6" />
                </div>
                <span className="text-2xl font-black text-slate-200">01</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                1. Select an Active Task
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Review available microtasks, check the reward amount in INR (₹), deadline, and proof requirements. Click &ldquo;View Task Details&rdquo; to read the full walkthrough instructions.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-indigo-600 font-semibold flex items-center gap-1">
              <span>Transparent task requirements</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-indigo-200">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <span className="text-2xl font-black text-slate-200">02</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                2. Complete Steps & Submit Proof
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Follow the instructions, complete the actions on the target destination link, and capture your proof (e.g. confirmation screenshot or text code). Upload your proof securely.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <span>Private server-side proof storage</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-indigo-200">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <FileCheck2 className="h-6 w-6" />
                </div>
                <span className="text-2xl font-black text-slate-200">03</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                3. Track Status with Private Code
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Upon submission, you receive an unpredictable reference code (e.g. <span className="font-mono text-xs font-bold text-slate-800">TSK-XXXX-XXXX-XXXX-XXXX</span>). Use it anytime to verify review progress without needing a login.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-amber-600 font-semibold flex items-center gap-1">
              <span>Instant private status lookup</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Active Tasks Section */}
      <section id="tasks" className="mt-16 sm:mt-24">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Available Microtasks
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {formattedTasks.length} active opportunities ready for submission
            </p>
          </div>
          <a
            href="#how-it-works"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition self-start sm:self-auto"
          >
            How it works &rarr;
          </a>
        </div>

        <TaskList initialTasks={formattedTasks} />
      </section>

      {/* 4. Testimonials Section (Clearly Labeled Demo Social Proof) */}
      <TestimonialSection />

      {/* 5. Community Announcements Callout */}
      {showTelegram && (
        <section className="mt-16 sm:mt-24 rounded-3xl bg-slate-900 p-8 sm:p-10 text-white border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300 border border-sky-400/20 mb-3">
              Official Telegram Channel
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Get Notified When New Tasks Are Added
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
              New microtasks, user testing campaigns, and app surveys are published regularly. Join our official announcement channel to receive alerts as soon as new campaigns open.
            </p>
          </div>

          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-300 flex-shrink-0"
          >
            <span>Join Telegram Channel</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </section>
      )}
    </main>
  );
}
