"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { requestWithdrawalAction, WithdrawalActionState } from "./actions";
import {
  X,
  Send,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Info,
  IndianRupee,
  User,
  CreditCard,
} from "lucide-react";

interface WithdrawModalProps {
  availableInr: string;
  availablePaise: number;
  userName: string;
  onClose: () => void;
}

const PRESET_AMOUNTS = [25, 30, 35, 40, 50, 75, 100];

function SubmitWithdrawalButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-emerald-200"
    >
      <Send className="h-4 w-4" />
      <span>{pending ? "Reserving Funds..." : "Confirm & Request Withdrawal"}</span>
    </button>
  );
}

export function WithdrawModal({
  availableInr,
  availablePaise,
  userName,
  onClose,
}: WithdrawModalProps) {
  const availableNumber = parseFloat(availableInr);
  const [selectedPreset, setSelectedPreset] = useState<number | "custom">(
    availableNumber >= 25 ? 25 : "custom"
  );
  const [customAmount, setCustomAmount] = useState<string>(
    availableNumber >= 25 ? "25" : ""
  );

  const [state, formAction] = useFormState<WithdrawalActionState, FormData>(
    requestWithdrawalAction,
    {}
  );

  const effectiveAmount =
    selectedPreset === "custom" ? parseFloat(customAmount) : selectedPreset;

  const isAmountValid =
    !isNaN(effectiveAmount) &&
    Number.isFinite(effectiveAmount) &&
    effectiveAmount >= 25 &&
    effectiveAmount <= availableNumber;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
              ₹
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Withdraw Money via UPI
              </h2>
              <p className="text-xs text-slate-500">
                Available: <span className="font-bold text-emerald-700">₹{availableInr}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[85vh] overflow-y-auto">
          {state.success ? (
            <div className="text-center py-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Withdrawal Request Submitted!
              </h3>
              <p className="mt-2 text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Your request has been recorded and funds have been securely reserved from your balance. An administrator will verify and process your UPI transfer within 24 to 48 hours.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    window.location.reload();
                  }}
                  className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition"
                >
                  Done & Refresh Wallet
                </button>
              </div>
            </div>
          ) : (
            <form action={formAction} className="space-y-5">
              {state.error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-800 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{state.error}</span>
                </div>
              )}

              {/* 1. Real Full Name */}
              <div>
                <label
                  htmlFor="realFullName"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Real Full Name
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="realFullName"
                    name="realFullName"
                    type="text"
                    required
                    defaultValue={userName}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <p className="mt-1 flex items-start gap-1 text-[11px] text-amber-700">
                  <Info className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Important:</strong> Your full name must match the bank account holder name associated with your UPI ID. Mismatched names will cause payment rejection.
                  </span>
                </p>
                {state.fieldErrors?.realFullName && (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {state.fieldErrors.realFullName}
                  </p>
                )}
              </div>

              {/* 2. UPI ID */}
              <div>
                <label
                  htmlFor="upiId"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                >
                  UPI ID (VPA)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <input
                    id="upiId"
                    name="upiId"
                    type="text"
                    required
                    placeholder="e.g. 9876543210@paytm or rahul@okhdfcbank"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 font-mono focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  We check UPI format syntax. Please double check accuracy before submitting.
                </p>
                {state.fieldErrors?.upiId && (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {state.fieldErrors.upiId}
                  </p>
                )}
              </div>

              {/* 3. Withdrawal Amount Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Select Amount (Min ₹25)
                  </label>
                  <span className="text-xs text-slate-500">
                    Max: ₹{availableInr}
                  </span>
                </div>

                {/* Amount Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {PRESET_AMOUNTS.map((amt) => {
                    const isAllowed = amt <= availableNumber;
                    const isSelected = selectedPreset === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        disabled={!isAllowed}
                        onClick={() => {
                          setSelectedPreset(amt);
                          setCustomAmount(amt.toString());
                        }}
                        className={`rounded-xl py-2 px-2 text-xs font-bold transition border ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : isAllowed
                            ? "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
                            : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50"
                        }`}
                      >
                        ₹{amt}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPreset("custom");
                    }}
                    className={`rounded-xl py-2 px-2 text-xs font-bold transition border ${
                      selectedPreset === "custom"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {/* Amount Input */}
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 font-bold text-sm">
                    ₹
                  </div>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    step="any"
                    min="25"
                    max={availableNumber}
                    required
                    value={selectedPreset === "custom" ? customAmount : selectedPreset}
                    onChange={(e) => {
                      setSelectedPreset("custom");
                      setCustomAmount(e.target.value);
                    }}
                    placeholder="Enter amount in ₹ (e.g. 27 or 33)"
                    className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-4 py-2.5 text-base font-bold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                {availableNumber < 25 && (
                  <p className="mt-1.5 text-xs font-medium text-rose-600">
                    Your available balance is below the minimum threshold of ₹25. Complete more tasks to withdraw.
                  </p>
                )}

                {effectiveAmount > availableNumber && (
                  <p className="mt-1.5 text-xs font-medium text-rose-600">
                    Requested amount exceeds your available balance of ₹{availableInr}.
                  </p>
                )}

                {state.fieldErrors?.amount && (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {state.fieldErrors.amount}
                  </p>
                )}
              </div>

              {/* Zero Fee & Reservation Explanation */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between font-semibold text-slate-700">
                  <span>Transfer Fee:</span>
                  <span className="text-emerald-700">₹0.00 (Free)</span>
                </div>
                <div className="flex items-center justify-between font-semibold text-slate-700">
                  <span>Amount to receive:</span>
                  <span className="text-base font-extrabold text-slate-900">
                    ₹{isAmountValid ? effectiveAmount.toFixed(2) : "0.00"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 border-t border-slate-200/60 pt-2 leading-relaxed">
                  When you submit, this amount is atomically reserved from your available balance. If your request is rejected for any reason, the funds are automatically released back to your available balance.
                </p>
              </div>

              <div className="pt-2">
                <SubmitWithdrawalButton disabled={!isAmountValid} />
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
