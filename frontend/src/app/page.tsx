"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Wind,
  HeartPulse,
  Activity,
  Cigarette,
  Compass,
  Zap,
  Sparkles,
  Layers,
  Clock,
  Play,
} from "lucide-react";
import { getStoredUser, User } from "@/lib/api";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [demoDose, setDemoDose] = useState<number>(38.4);
  const [demoExertion, setDemoExertion] = useState<number>(1.0);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  // Ticking demo dosimeter
  useEffect(() => {
    const rate = 75.0 * 0.5 * demoExertion * 0.0001; // µg/s
    const interval = setInterval(() => {
      setDemoDose((prev) => prev + rate);
    }, 1000);
    return () => clearInterval(interval);
  }, [demoExertion]);

  const demoCigs = (demoDose / 20.0).toFixed(2);
  const whoPct = Math.round((demoDose / 25.0) * 100);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      {/* Background Ambient Glow Circles */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-blue-600/15 via-emerald-500/10 to-purple-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-[450px] h-[450px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 sm:py-24 text-center relative z-10">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-semibold text-slate-300 mb-8 shadow-glow-blue backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <HeartPulse className="w-3.5 h-3.5 text-blue-400" />
            <span>The Apple Health &amp; Dosimeter for Your Respiratory System</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white mb-6 leading-[1.08]">
            Measure What Your Lungs{" "}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Actually Inhale
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed font-normal">
            Weather apps only show outdoor AQI. <strong>AirDose</strong> calculates your actual microgram PM2.5 lung retention second-by-second across Home, Office, Transit, and Outdoor zones.
          </p>

          {/* Direct CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto mb-16">
            {user ? (
              <Link
                href="/dashboard"
                id="hero-go-dashboard-btn"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-bold text-white bg-[#0062ff] hover:bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200"
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  id="hero-get-started-btn"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 transition-all duration-200"
                >
                  Start Tracking Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/signin"
                  id="hero-sign-in-btn"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-semibold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-2xl transition-all duration-200"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Live Interactive Preview Dosimeter Card (Shock Value Hook) */}
          <div className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-800/90 shadow-2xl text-left relative overflow-hidden group">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shadow-inner">
                  <HeartPulse className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white">Live Inhalation Simulator</span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Ticking Realtime
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Microgram particulate retention calibrated to ICRP respiration kinetics
                  </p>
                </div>
              </div>

              {/* Exertion Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {[
                  { label: "Rest", factor: 1.0 },
                  { label: "Walk", factor: 1.8 },
                  { label: "Run", factor: 3.5 },
                ].map((act) => (
                  <button
                    key={act.factor}
                    onClick={() => setDemoExertion(act.factor)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      demoExertion === act.factor
                        ? "bg-[#0062ff] text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dosimeter Core Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6">
              {/* Metric 1: Total PM2.5 Dose */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Absorbed Particulate
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white font-mono tracking-tight">
                    {demoDose.toFixed(2)}
                  </span>
                  <span className="text-xs font-mono text-slate-400">μg PM₂.₅</span>
                </div>
                <span className="text-[10px] text-blue-400 font-semibold mt-1 block">
                  +{(75 * 0.5 * demoExertion * 0.0001).toFixed(4)} μg / sec
                </span>
              </div>

              {/* Metric 2: Berkeley Earth Cigarettes */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                  <Cigarette className="w-3 h-3 text-amber-400" />
                  Cigarette Equivalent
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-amber-400 font-mono tracking-tight">
                    ~{demoCigs}
                  </span>
                  <span className="text-xs font-mono text-slate-400">cigs</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium mt-1 block truncate">
                  1 cig ≈ 20 µg lung deposition
                </span>
              </div>

              {/* Metric 3: WHO 24h Threshold */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  WHO 24h Benchmark
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-3xl font-black font-mono tracking-tight ${
                      whoPct > 100 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {whoPct}%
                  </span>
                  <span className="text-xs font-mono text-slate-400">of safe cap</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                  Cap: 25.0 µg/day deposited
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Indoor Walls &amp; HEPA save ~45% of dose
              </span>
              <Link
                href="/signup"
                className="text-[#0062ff] hover:text-blue-400 font-bold flex items-center gap-1"
              >
                <span>Track Your Live GPS Air</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-16 text-left w-full">
            <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
                <Wind className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base mb-1.5">Physical Inhalation Kinetics</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                ICRP biokinetic modeling: <code>Rate = PM2.5 × Infiltration × Exertion × Minute Volume</code>. Never relies on arbitrary fixed estimates.
              </p>
            </div>

            <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base mb-1.5">Geofenced Micro-Environments</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Smart attenuation for Home (0.50), Office (0.40), College (0.50), and Roadway Transit (0.80) with boundary hysteresis debouncing.
              </p>
            </div>

            <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 border border-purple-500/20">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base mb-1.5">Clean Route Commute Simulator</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                AI trip planner evaluates walking vs cycling vs metro vs car recirculation to minimize particulate intake during your daily travel.
              </p>
            </div>
          </div>

          {/* Quick Demo Credentials Info */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Demo account: <code>demo@example.com / password123</code>
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" /> SQLite Persistence with 7-Day History
            </span>
          </div>
        </div>
      </main>

      {/* Clean minimal footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 font-medium bg-[#07090e]">
        AirDose &copy; 2026. Personal PM2.5 Inhalation Health Engine.
      </footer>
    </div>
  );
}
