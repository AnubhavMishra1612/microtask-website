import {
  ShieldCheck,
  ListOrdered,
  FileCheck2,
  UserCheck,
  KeyRound,
  ClipboardCheck,
  Coins,
  CheckCircle2,
} from "lucide-react";

export interface TrustFeatureItem {
  id: string;
  category: string;
  title: string;
  description: string;
  highlight: string;
  iconName: "list" | "proof" | "account" | "tracking" | "review" | "reward";
}

export const PLATFORM_TRUST_FEATURES: TrustFeatureItem[] = [
  {
    id: "feature-instructions",
    category: "Task Clarity",
    title: "Clear Task Instructions",
    description:
      "Every microtask provides numbered step-by-step instructions and a direct target link, ensuring you understand exactly what actions are required before you begin.",
    highlight: "Numbered step-by-step guidance",
    iconName: "list",
  },
  {
    id: "feature-proof",
    category: "Verification Standards",
    title: "Defined Proof Requirements",
    description:
      "Tasks explicitly specify the required proof format—whether a verification screenshot, completion text code, or both—removing guesswork from your submission.",
    highlight: "Specific screenshot or text criteria",
    iconName: "proof",
  },
  {
    id: "feature-no-account",
    category: "Worker Privacy",
    title: "No Worker Account Required",
    description:
      "Participants can complete active tasks and submit proof without passwords or account registration. We collect only what is necessary to audit task completion.",
    highlight: "Frictionless, registration-free access",
    iconName: "account",
  },
  {
    id: "feature-tracking",
    category: "Transparent Status",
    title: "Private Submission Tracking",
    description:
      "Every submission generates an unpredictable cryptographic reference token (e.g. TSK-XXXX-XXXX-XXXX). Use this code anytime to check review status without exposing personal details.",
    highlight: "Unpredictable private reference tokens",
    iconName: "tracking",
  },
  {
    id: "feature-review",
    category: "Audit Integrity",
    title: "Admin-Reviewed Submissions",
    description:
      "Submissions are evaluated manually by administrators against defined criteria. Any rejected submission includes a clear reason recorded in the review log.",
    highlight: "Manual review with explicit feedback",
    iconName: "review",
  },
  {
    id: "feature-reward",
    category: "Reward Transparency",
    title: "Transparent Task Rewards",
    description:
      "Listed INR (₹) reward amounts are shown upfront on every task. The platform records a snapshot of the active reward at the exact moment of submission.",
    highlight: "Upfront listed INR reward snapshot",
    iconName: "reward",
  },
];

interface TestimonialSectionProps {
  features?: TrustFeatureItem[];
}

export function TestimonialSection({
  features = PLATFORM_TRUST_FEATURES,
}: TestimonialSectionProps) {
  return (
    <section
      id="trust"
      aria-labelledby="trust-features-heading"
      className="mt-16 sm:mt-24"
    >
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-100 mb-3 shadow-xs">
          <ShieldCheck className="h-4 w-4 text-indigo-600" />
          <span>How We Build Trust</span>
        </div>

        <h2
          id="trust-features-heading"
          className="text-2xl font-extrabold text-slate-900 sm:text-3xl tracking-tight"
        >
          Engineered for Transparency & Simplicity
        </h2>
        <p className="mt-2 text-sm text-slate-600 sm:text-base leading-relaxed">
          We operate with open rules, private token tracking, and structured proof verification. Here is how our workflow protects participant time and privacy.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((item) => (
          <div
            key={item.id}
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
                  {item.category}
                </span>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-indigo-600 border border-slate-200/60 shadow-xs group-hover:scale-105 transition-transform duration-200">
                  {item.iconName === "list" && <ListOrdered className="h-4 w-4" />}
                  {item.iconName === "proof" && <FileCheck2 className="h-4 w-4" />}
                  {item.iconName === "account" && <UserCheck className="h-4 w-4" />}
                  {item.iconName === "tracking" && <KeyRound className="h-4 w-4" />}
                  {item.iconName === "review" && <ClipboardCheck className="h-4 w-4" />}
                  {item.iconName === "reward" && <Coins className="h-4 w-4" />}
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                {item.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{item.highlight}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

