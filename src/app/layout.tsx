import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TelegramButton } from "@/components/TelegramButton";

export const metadata: Metadata = {
  title: "Microtask India - Complete Simple Tasks & Earn",
  description: "Browse verified microtasks, submit completion proof, and track your submission status.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
        <TelegramButton />
      </body>
    </html>
  );
}

