import { MessageSquareQuote, CheckCircle, Info, User } from "lucide-react";

export interface TestimonialItem {
  id: string;
  category: string;
  feedback: string;
  authorLabel: string;
  role: string;
  isDemo: boolean;
  dateLabel: string;
}

/**
 * Demo testimonials list.
 * TO REPLACE WITH REAL SOCIAL PROOF:
 * Replace these placeholder cards with verified, permissioned feedback from real users
 * once campaigns have completed review and payout cycles.
 */
export const DEMO_TESTIMONIALS: TestimonialItem[] = [
  {
    id: "demo-1",
    category: "Workflow Clarity",
    feedback:
      "The survey instructions were unambiguous and concise. Having step-by-step numbers made it easy to complete without second-guessing requirements.",
    authorLabel: "Participant A.R.",
    role: "Survey Reviewer",
    isDemo: true,
    dateLabel: "Beta Verification",
  },
  {
    id: "demo-2",
    category: "Tracking Transparency",
    feedback:
      "Tracking with the generated TSK token worked immediately. I could check review status without having to register a separate user account.",
    authorLabel: "Participant K.S.",
    role: "Mobile App Tester",
    isDemo: true,
    dateLabel: "Beta Verification",
  },
  {
    id: "demo-3",
    category: "Proof Requirements",
    feedback:
      "The proof checklist specifies exactly what screenshot details are audited. It eliminates confusion about whether the proof will be accepted.",
    authorLabel: "Participant V.N.",
    role: "Task Contributor",
    isDemo: true,
    dateLabel: "Beta Verification",
  },
  {
    id: "demo-4",
    category: "Mobile Performance",
    feedback:
      "The layout loads fast on mobile 4G with clean buttons and legible text. No intrusive ads or confusing redirects.",
    authorLabel: "Participant M.P.",
    role: "Android User",
    isDemo: true,
    dateLabel: "Beta Verification",
  },
  {
    id: "demo-5",
    category: "Validation Feedback",
    feedback:
      "Form validation catches wrong image formats and large files right away before submitting, which saves mobile data.",
    authorLabel: "Participant S.G.",
    role: "Community Tester",
    isDemo: true,
    dateLabel: "Beta Verification",
  },
  {
    id: "demo-6",
    category: "Data Privacy",
    feedback:
      "Only the reference code is used to query submission status. Contact info and personal worker details are never leaked on the public tracking page.",
    authorLabel: "Participant D.B.",
    role: "Privacy Reviewer",
    isDemo: true,
    dateLabel: "Beta Verification",
  },
];

interface TestimonialSectionProps {
  testimonials?: TestimonialItem[];
}

export function TestimonialSection({
  testimonials = DEMO_TESTIMONIALS,
}: TestimonialSectionProps) {
  const hasDemoEntries = testimonials.some((t) => t.isDemo);

  return (
    <section
      id="feedback"
      aria-labelledby="testimonials-heading"
      className="mt-16 sm:mt-24"
    >
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200 mb-3">
          <MessageSquareQuote className="h-3.5 w-3.5 text-indigo-600" />
          User Experience & Testing Feedback
        </div>

        <h2
          id="testimonials-heading"
          className="text-2xl font-extrabold text-slate-900 sm:text-3xl tracking-tight"
        >
          Built for Clarity, Speed & Worker Trust
        </h2>
        <p className="mt-2 text-sm text-slate-600 sm:text-base leading-relaxed">
          See how our transparent microtask workflow, private token tracking, and structured proof submission perform in real-world testing.
        </p>

        {hasDemoEntries && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-1.5 text-xs text-amber-800 text-left">
            <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Transparency Notice:</strong> Displaying demo test cards for UX demonstration. Replace with verified participant feedback post-campaign.
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((item) => (
          <div
            key={item.id}
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
                  {item.category}
                </span>

                {item.isDemo && (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border border-slate-200">
                    Demo Card
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-700 leading-relaxed italic">
                &ldquo;{item.feedback}&rdquo;
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{item.authorLabel}</p>
                  <p className="text-[11px] text-slate-500">{item.role}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                <CheckCircle className="h-3 w-3" />
                <span>{item.dateLabel}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
