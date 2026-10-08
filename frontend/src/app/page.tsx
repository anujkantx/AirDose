"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ArrowRight, ShieldCheck, CheckCircle2, Wind, HeartPulse, Activity } from "lucide-react";
import { getStoredUser, User } from "@/lib/api";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f3f8] text-slate-900 flex flex-col relative overflow-hidden font-sans">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 sm:py-24 text-center relative z-10">
        <div className="max-w-3xl mx-auto flex flex-col items-center">
          {/* Subtle status tag */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200/80 text-xs font-semibold text-slate-700 mb-8 shadow-soft">
            <span className="w-2 h-2 rounded-full bg-[#0062ff] animate-pulse" />
            <HeartPulse className="w-3.5 h-3.5 text-[#0062ff]" />
            <span>Personal PM2.5 Inhalation Health Engine</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
            Your Personal{" "}
            <span className="text-[#0062ff]">
              Clean Air
            </span>{" "}
            Journey
          </h1>

          <p className="text-base sm:text-xl text-slate-500 max-w-xl mb-10 leading-relaxed font-normal">
            Continuous real-time inhalation tracking, micro-environment infiltration modeling, and telemetry insights designed for everyday wellness.
          </p>

          {/* Direct CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
            {user ? (
              <Link
                href="/dashboard"
                id="hero-go-dashboard-btn"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm sm:text-base font-semibold text-white bg-[#0062ff] hover:bg-blue-700 rounded-full shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all duration-200"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  id="hero-get-started-btn"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm sm:text-base font-semibold text-white bg-[#0062ff] hover:bg-blue-700 rounded-full shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all duration-200"
                >
                  Start Tracking Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/signin"
                  id="hero-sign-in-btn"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm sm:text-base font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-full shadow-soft transition-all duration-200"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 text-left w-full">
            <div className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0062ff] flex items-center justify-center mb-4">
                <Wind className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Mathematical Inhalation</h3>
              <p className="text-xs text-slate-400">Calculates precise microgram particulate dosage based on respiratory rate and ventilation.</p>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Geofence Infiltration</h3>
              <p className="text-xs text-slate-400">Indoor filtration coefficient adjustments for Home, Office, and College zones.</p>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Live Telemetry</h3>
              <p className="text-xs text-slate-400">Real-time OpenAQ sensor feed with continuous background spatial tracking.</p>
            </div>
          </div>

          {/* Quick Demo Credentials Info */}
          <div className="mt-12 flex items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Demo account pre-seeded
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0062ff]" /> SQLite Persistence
            </span>
          </div>
        </div>
      </main>

      {/* Clean minimal footer */}
      <footer className="border-t border-slate-200/80 py-6 text-center text-xs text-slate-400 font-medium bg-white">
        AirDose &copy; 2026. All rights reserved.
      </footer>
    </div>
  );
}
