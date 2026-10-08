"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ArrowRight, ShieldCheck, Database, Sparkles, CheckCircle2 } from "lucide-react";
import { getStoredUser, User } from "@/lib/api";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-emerald-500/10 to-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar with Sign In and Get Started */}
      <Navbar />

      {/* Clean minimal hero content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center relative z-10">
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          {/* Subtle status tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400 mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>SQLite Powered Database Engine</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            AirDose{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Platform
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-lg mb-10 leading-relaxed">
            Minimalist MVP foundation with SQLite authentication and intuitive dashboard architecture.
          </p>

          {/* Direct CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            {user ? (
              <Link
                href="/dashboard"
                id="hero-go-dashboard-btn"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 rounded-xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  id="hero-get-started-btn"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 rounded-xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/signin"
                  id="hero-sign-in-btn"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all duration-200"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Quick Demo Credentials Info */}
          <div className="mt-14 pt-8 border-t border-slate-800/60 flex items-center justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Demo account pre-seeded
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> SQLite Persistence
            </span>
          </div>
        </div>
      </main>

      {/* Clean minimal footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        AirDose MVP &copy; 2026. All rights reserved.
      </footer>
    </div>
  );
}
