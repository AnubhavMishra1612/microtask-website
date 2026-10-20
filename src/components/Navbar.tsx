"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckSquare, Search, Menu, X, Shield } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900 transition hover:opacity-90">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <CheckSquare className="h-5 w-5" />
          </div>
          <span className="text-lg tracking-tight">Microtask<span className="text-indigo-600 font-extrabold ml-1">India</span></span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 sm:flex">
          <Link
            href="/"
            className="text-sm font-medium text-slate-700 transition hover:text-indigo-600"
          >
            Active Tasks
          </Link>
          <Link
            href="/track"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-700 transition hover:text-indigo-600"
          >
            <Search className="h-4 w-4" />
            Track Submission
          </Link>
          <Link
            href="/admin/login"
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Shield className="h-3.5 w-3.5 text-slate-500" />
            Admin
          </Link>
        </nav>

        {/* Mobile menu toggle */}
        <div className="flex items-center sm:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-md px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-50 hover:text-indigo-600"
            >
              Active Tasks
            </Link>
            <Link
              href="/track"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-50 hover:text-indigo-600"
            >
              <Search className="h-4 w-4" />
              Track Submission
            </Link>
            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              <Shield className="h-4 w-4 text-slate-500" />
              Admin Portal
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
