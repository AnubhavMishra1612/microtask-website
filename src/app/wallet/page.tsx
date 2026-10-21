import { Metadata } from "next";
import { getCurrentUser } from "@/lib/user-session";
import { getUserWalletSummary } from "@/lib/wallet";
import { AuthCard } from "./AuthCard";
import { WalletDashboard } from "./WalletDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "My Wallet - Microtask India",
  description: "View available earnings, request UPI payouts, and track verified task rewards.",
};

export default async function WalletPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <AuthCard />
      </main>
    );
  }

  const summary = await getUserWalletSummary(user.id);

  if (!summary) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <AuthCard />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <WalletDashboard summary={summary} />
    </main>
  );
}
