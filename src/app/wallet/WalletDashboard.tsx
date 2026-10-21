"use client";

import { useState } from "react";
import Link from "next/link";
import { UserWalletSummary } from "@/lib/wallet";
import { userLogoutAction } from "./actions";
import { WithdrawModal } from "./WithdrawModal";
import {
  Wallet,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  LogOut,
  IndianRupee,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface WalletDashboardProps {
  summary: UserWalletSummary;
}

export function WalletDashboard({ summary }: WalletDashboardProps) {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  return (
    <div className="space-y-8">
      {/* Top Banner / User Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Welcome, {summary.user.name}
            </h1>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              Verified Worker
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-mono">
            Contact: {summary.user.contactInfo}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowWithdrawModal(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>Withdraw Money</span>
          </button>

          <form action={userLogoutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
              title="Sign out of your wallet"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </form>
        </div>
      </div>

      {/* Main Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Available Balance */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 p-5 shadow-sm sm:col-span-2 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-800">
              <span>Available Balance</span>
              <span className="rounded-md bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-extrabold">
                Ready to Withdraw
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1 text-3xl sm:text-4xl font-black text-emerald-950">
              <span>₹{summary.availableInr}</span>
            </div>
            <p className="mt-1 text-xs text-emerald-700">
              Funds available for immediate UPI transfer (Min ₹25)
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-emerald-200/60 flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-medium">
              Zero transfer fees
            </span>
            <button
              type="button"
              onClick={() => setShowWithdrawModal(true)}
              className="text-xs font-bold text-emerald-900 hover:text-emerald-950 underline underline-offset-2"
            >
              Withdraw Now →
            </button>
          </div>
        </div>

        {/* 2. Pending Earnings */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-800">
              <span>Pending Earnings</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-950">
              ₹{summary.pendingEarningsInr}
            </div>
            <p className="mt-1 text-xs text-amber-800">
              {summary.pendingSubmissionsCount} submission{summary.pendingSubmissionsCount !== 1 ? "s" : ""} under review
            </p>
          </div>
          <p className="mt-3 text-[11px] text-amber-700/80 border-t border-amber-200/50 pt-2">
            Credited upon admin verification
          </p>
        </div>

        {/* 3. Total Approved Earnings */}
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-indigo-800">
              <span>Total Approved</span>
              <CheckCircle2 className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-indigo-950">
              ₹{summary.totalApprovedEarningsInr}
            </div>
            <p className="mt-1 text-xs text-indigo-800">
              Lifetime verified task rewards
            </p>
          </div>
          <p className="mt-3 text-[11px] text-indigo-700/80 border-t border-indigo-200/50 pt-2">
            All-time earnings
          </p>
        </div>

        {/* 4. Total Withdrawals Paid & Reserved */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600">
              <span>Payouts & Reserved</span>
              <Layers className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 text-xl font-bold text-slate-900">
              ₹{summary.totalPaidInr} <span className="text-xs font-normal text-slate-500">paid</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Reserved: <span className="font-semibold text-slate-700">₹{summary.reservedInr}</span>
            </p>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            Total completed withdrawals
          </p>
        </div>
      </div>

      {/* Withdrawal Requests Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Withdrawal Requests
            </h2>
            <p className="text-xs text-slate-500">
              Track the progress of your UPI payout requests
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600">
            {summary.withdrawalRequests.length} Request{summary.withdrawalRequests.length !== 1 ? "s" : ""}
          </span>
        </div>

        {summary.withdrawalRequests.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-3">
              <ArrowUpRight className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              No withdrawal requests yet
            </p>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Once you reach ₹25 in available balance, click &ldquo;Withdraw Money&rdquo; to transfer funds to your UPI ID.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Request ID</th>
                  <th className="px-6 py-3">UPI ID</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Details / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.withdrawalRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-3.5 font-mono text-slate-700 font-medium">
                      #{req.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-800">
                      {req.upiId}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-900 text-sm">
                      ₹{req.amountInr}
                    </td>
                    <td className="px-6 py-3.5">
                      {req.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                          <Clock className="h-3 w-3 animate-pulse" />
                          Pending Review
                        </span>
                      )}
                      {req.status === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                          <CheckCircle2 className="h-3 w-3" />
                          Approved
                        </span>
                      )}
                      {req.status === "PROCESSING" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
                          <Clock className="h-3 w-3" />
                          Processing Payment
                        </span>
                      )}
                      {req.status === "PAID" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          Paid
                        </span>
                      )}
                      {req.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                          <XCircle className="h-3 w-3" />
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {new Date(req.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {req.rejectionReason && (
                        <span className="text-rose-700 font-medium">
                          Reason: {req.rejectionReason} (Funds Released)
                        </span>
                      )}
                      {req.paymentRef && (
                        <span className="font-mono text-emerald-800">
                          UTR/Ref: {req.paymentRef}
                        </span>
                      )}
                      {!req.rejectionReason && !req.paymentRef && (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction History Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Transaction History
            </h2>
            <p className="text-xs text-slate-500">
              Auditable chronological ledger of task earnings and balance reservations
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600">
            {summary.transactions.length} Records
          </span>
        </div>

        {summary.transactions.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-3">
              <Wallet className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              No transactions recorded yet
            </p>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Complete active microtasks to earn rewards that appear directly in this ledger.
            </p>
            <div className="mt-5">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
              >
                Browse Tasks <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.transactions.map((tx) => {
                  const isCredit =
                    tx.type === "EARNING" || tx.type === "WITHDRAWAL_RELEASE";
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-3.5">
                        {tx.type === "EARNING" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 text-[11px] border border-emerald-200">
                            + Earning
                          </span>
                        )}
                        {tx.type === "WITHDRAWAL_RESERVE" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-700 font-bold px-2 py-0.5 text-[11px] border border-slate-200">
                            - Reserved
                          </span>
                        )}
                        {tx.type === "WITHDRAWAL_RELEASE" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 text-amber-800 font-bold px-2 py-0.5 text-[11px] border border-amber-200">
                            + Released
                          </span>
                        )}
                        {tx.type === "WITHDRAWAL_PAID" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 text-blue-800 font-bold px-2 py-0.5 text-[11px] border border-blue-200">
                            Paid Out
                          </span>
                        )}
                        {tx.type === "ADJUSTMENT" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 text-purple-800 font-bold px-2 py-0.5 text-[11px] border border-purple-200">
                            Adjustment
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-slate-800 font-medium max-w-md">
                        {tx.description}
                      </td>
                      <td
                        className={`px-6 py-3.5 font-bold text-sm ${
                          isCredit ? "text-emerald-700" : "text-slate-800"
                        }`}
                      >
                        {isCredit ? `+₹${tx.amountInr}` : `-₹${tx.amountInr}`}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {new Date(tx.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showWithdrawModal && (
        <WithdrawModal
          availableInr={summary.availableInr}
          availablePaise={summary.availablePaise}
          userName={summary.user.name}
          onClose={() => setShowWithdrawModal(false)}
        />
      )}
    </div>
  );
}
