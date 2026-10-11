"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
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
  Home as HomeIcon,
  Building2,
  Train,
  Sliders,
  ChevronDown,
  Info,
  ShieldAlert,
  HelpCircle,
  Cpu,
  MapPin,
  TrendingDown,
  Check,
  Flame,
  Award,
} from "lucide-react";
import { getStoredUser, User } from "@/lib/api";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  // Interactive Simulator State
  const [ambientPm25, setAmbientPm25] = useState<number>(115); // µg/m³
  const [selectedEnv, setSelectedEnv] = useState<"home" | "office" | "outdoor" | "transit">("home");
  const [selectedExertion, setSelectedExertion] = useState<number>(1.0); // 1.0 = Rest
  const [simAccumulatedDose, setSimAccumulatedDose] = useState<number>(42.8);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  // Environment configs with exact infiltration coefficients
  const envConfigs = {
    home: { label: "Home (Residential)", infiltration: 0.5, icon: HomeIcon, desc: "Standard residential walls & AC block 50% of outdoor PM2.5", color: "text-[#ff7a00] bg-amber-50 border-amber-200" },
    office: { label: "Tech Hub Office", infiltration: 0.4, icon: Building2, desc: "Commercial HVAC & MERV filters attenuate 60% of particulate", color: "text-[#0062ff] bg-blue-50 border-blue-200" },
    transit: { label: "Metro / Sealed Car", infiltration: 0.35, icon: Train, desc: "Recirculated cabin air filters 65% of roadway emissions", color: "text-purple-600 bg-purple-50 border-purple-200" },
    outdoor: { label: "Unprotected Outdoor", infiltration: 1.0, icon: Wind, desc: "100% direct ambient exposure with zero building protection", color: "text-rose-600 bg-rose-50 border-rose-200" },
  };

  const exertionConfigs = [
    { label: "Rest", factor: 1.0, volume: "6 L/min", desc: "Sleeping, desk work, resting" },
    { label: "Walking", factor: 1.8, volume: "11 L/min", desc: "Normal pace, strolling, light chores" },
    { label: "Transit", factor: 1.1, volume: "7 L/min", desc: "Seated in car, metro, or bus" },
    { label: "Running", factor: 3.5, volume: "21 L/min", desc: "Jogging, cycling, high exertion" },
  ];

  // Mathematical rate calculation: Rate = PM2.5 × Infiltration × Exertion × (6 L/min in m³/s)
  const basalVolumeM3s = 0.0001; // 6 L/min = 0.0001 m³/s
  const currentInfiltration = envConfigs[selectedEnv].infiltration;
  const currentRateUgPerSec = ambientPm25 * currentInfiltration * selectedExertion * basalVolumeM3s;

  // Real-time dose ticking in the interactive sandbox
  useEffect(() => {
    const interval = setInterval(() => {
      setSimAccumulatedDose((prev) => prev + currentRateUgPerSec * 0.5);
    }, 500);
    return () => clearInterval(interval);
  }, [currentRateUgPerSec]);

  // Comparative metrics
  const cigsEquivalent = (simAccumulatedDose / 20.0).toFixed(2);
  const whoPct = Math.round((simAccumulatedDose / 25.0) * 100);
  const cleanAirShieldSavedUg = (ambientPm25 * (1.0 - currentInfiltration) * selectedExertion * basalVolumeM3s * 3600 * 4).toFixed(1);

  // FAQ data
  const faqs = [
    {
      q: "How does AirDose know what I inhale without a physical wearable sensor?",
      a: "AirDose combines three scientific data layers: 1) High-accuracy live ambient PM2.5 from OpenAQ v3 monitoring stations, 2) Geofenced building physics formulas that calculate how many micrograms penetrate your specific home, office, or vehicle walls, and 3) Motion-derived respiration kinetics (ICRP Human Respiratory Tract Model) that adjust your lung tidal volume from 6 L/min (rest) up to 21 L/min (running).",
    },
    {
      q: "Why is traditional outdoor AQI misleading for personal health?",
      a: "Traditional weather apps report an outdoor AQI measured at a government station that might be 5–15 km away from you. Furthermore, humans spend ~90% of their day indoors, where walls, glass, ACs, and purifiers cut pollution by 40%–70%. Looking at outdoor AQI assumes you stand outdoors 24/7. AirDose measures your true indoor/outdoor exposure continuum.",
    },
    {
      q: "How is the cigarette equivalence calculated?",
      a: "We calibrate to the peer-reviewed Berkeley Earth air pollution methodology, which equates the inhalation and blood-barrier translocation of 20 micrograms of fine PM2.5 particulate to smoking approximately one standard combustible cigarette.",
    },
    {
      q: "Can I customize the infiltration protection of my own home or room?",
      a: "Yes! AirDose includes a 5-parameter building infiltration questionnaire in the Locations manager. You can configure window seal quality, air conditioning type, HEPA filtration, and street setback distance to produce an exact mathematical infiltration factor for your bedroom or office.",
    },
    {
      q: "Is my GPS tracking data private?",
      a: "Yes. All location samples and calculated exposure segments are stored securely in your dedicated SQLite database. We do not sell your movement data to third-party ad networks.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Sleek Light Theme Navbar */}
      <Navbar />

      {/* Decorative Radiant Background Mesh */}
      <div className="absolute top-0 inset-x-0 h-[650px] overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[650px] bg-gradient-to-b from-blue-100/70 via-indigo-50/50 to-emerald-50/30 rounded-full blur-3xl opacity-75" />
        <div className="absolute top-20 left-1/4 w-[350px] h-[350px] bg-sky-200/40 rounded-full blur-3xl" />
        <div className="absolute top-32 right-1/4 w-[350px] h-[350px] bg-emerald-100/60 rounded-full blur-3xl" />
      </div>

      {/* Hero Section */}
      <section className="pt-12 sm:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Pre-Header Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-soft text-xs font-bold text-slate-700 mb-8 animate-fade-in">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[#0062ff] font-extrabold uppercase tracking-wide">Clinical-Grade Health Telemetry</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600 font-semibold">The Personal Dosimeter for Your Lungs</span>
        </div>

        {/* Impactful Heading */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-900 max-w-5xl leading-[1.08] mb-6">
          Measure What Your Lungs{" "}
          <span className="bg-gradient-to-r from-[#0062ff] via-indigo-600 to-emerald-500 bg-clip-text text-transparent">
            Actually Inhale.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal mb-10">
          Traditional weather apps only show generic outdoor AQI at a municipal station miles away.{" "}
          <strong className="text-slate-900 font-semibold">AirDose</strong> calculates your actual second-by-second microgram PM2.5 lung deposition across Home, Office, Transit, and Outdoor micro-environments.
        </p>

        {/* Primary Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-8">
          {user ? (
            <Link
              href="/dashboard"
              id="hero-dashboard-cta"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-bold text-white bg-[#0062ff] hover:bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all duration-200 hover:-translate-y-0.5"
            >
              Open Your Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                id="hero-signup-cta"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-[#0062ff] to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all duration-200 hover:-translate-y-0.5"
              >
                Start Free Live Tracking
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/signin"
                id="hero-signin-cta"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-soft rounded-2xl transition-all duration-200"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Demo Account Indicator */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50/80 border border-blue-200/60 text-xs font-medium text-slate-700 mb-14">
          <Sparkles className="w-4 h-4 text-[#0062ff]" />
          <span>Quick Demo Access:</span>
          <code className="bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-700 font-bold">demo@example.com / password123</code>
        </div>

        {/* Key Feature Metric Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 w-full max-w-4xl text-left">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
            <div className="flex items-center gap-2 text-blue-600 mb-1 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Indoor Attenuation
            </div>
            <div className="text-2xl font-black text-slate-900">40% - 65%</div>
            <p className="text-xs text-slate-500 mt-1">Dose blocked by walls &amp; AC filters</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
            <div className="flex items-center gap-2 text-emerald-600 mb-1 font-bold text-xs uppercase tracking-wider">
              <HeartPulse className="w-4 h-4" />
              Respiration Dynamics
            </div>
            <div className="text-2xl font-black text-slate-900">6 - 21 L/min</div>
            <p className="text-xs text-slate-500 mt-1">Minute volume scales with motion</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
            <div className="flex items-center gap-2 text-amber-600 mb-1 font-bold text-xs uppercase tracking-wider">
              <Cigarette className="w-4 h-4" />
              Health Impact
            </div>
            <div className="text-2xl font-black text-slate-900">Berkeley Math</div>
            <p className="text-xs text-slate-500 mt-1">20 µg PM2.5 ≈ 1 cigarette equivalent</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-soft">
            <div className="flex items-center gap-2 text-purple-600 mb-1 font-bold text-xs uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              Commute Simulator
            </div>
            <div className="text-2xl font-black text-slate-900">Route AI</div>
            <p className="text-xs text-slate-500 mt-1">Compare Metro vs Bus vs Walking</p>
          </div>
        </div>
      </section>

      {/* Interactive Live Dosimeter Sandbox Section */}
      <section id="simulator" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50/40 rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 relative overflow-hidden">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-8 border-b border-slate-200/80">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-[#0062ff] text-xs font-bold mb-2">
                <Play className="w-3.5 h-3.5 fill-current" />
                Live Inhalation Sandbox
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Test the Dosimeter Math in Real-Time
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Toggle your physical activity and location below to see how indoor filters and respiration volume reshape your lung intake.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-xl text-xs font-bold shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time Ticker Active</span>
            </div>
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
            {/* Left Column: Interactive Controls (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* 1. Ambient Outdoor Pollution Slider */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Wind className="w-4 h-4 text-[#0062ff]" />
                    Outdoor Ambient PM2.5 Level
                  </span>
                  <span className="text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full font-mono">
                    {ambientPm25} μg/m³
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="350"
                  value={ambientPm25}
                  onChange={(e) => setAmbientPm25(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0062ff]"
                />
                <div className="flex justify-between text-[11px] text-slate-600 font-medium mt-2">
                  <span>Good (15 µg)</span>
                  <span>Moderate (60 µg)</span>
                  <span>Unhealthy (150 µg)</span>
                  <span className="text-rose-600 font-bold">Severe (350 µg)</span>
                </div>
              </div>

              {/* 2. Micro-Environment Selector */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-3 flex items-center gap-1.5">
                  <HomeIcon className="w-4 h-4 text-emerald-600" />
                  Select Your Current Micro-Environment
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(Object.keys(envConfigs) as Array<keyof typeof envConfigs>).map((key) => {
                    const env = envConfigs[key];
                    const EnvIcon = env.icon;
                    const isSelected = selectedEnv === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedEnv(key)}
                        className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? "bg-blue-50/70 border-[#0062ff] shadow-sm ring-2 ring-[#0062ff]/20"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <EnvIcon className={`w-4 h-4 ${isSelected ? "text-[#0062ff]" : "text-slate-500"}`} />
                            <span className="text-xs font-bold text-slate-900">{env.label}</span>
                          </div>
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${env.color}`}>
                            {(env.infiltration * 100).toFixed(0)}% Penetration
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight mt-1">{env.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Physical Activity Exertion Mode */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-3 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-purple-600" />
                  Physical Activity &amp; Breathing Rate
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {exertionConfigs.map((act) => {
                    const isSelected = selectedExertion === act.factor;
                    return (
                      <button
                        key={act.factor}
                        onClick={() => setSelectedExertion(act.factor)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? "bg-[#0062ff] text-white border-[#0062ff] shadow-md shadow-blue-500/20"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-xs font-black">{act.label}</div>
                        <div className={`text-[10px] font-mono mt-0.5 ${isSelected ? "text-blue-100" : "text-slate-500"}`}>
                          {act.factor}x ({act.volume})
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Live Inhalation Display Output (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-soft">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    Live Dosimeter Telemetry
                  </span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    +{(currentRateUgPerSec).toFixed(4)} μg / sec
                  </span>
                </div>

                {/* Primary Metric 1: Micrograms PM2.5 Inhaled */}
                <div className="py-6">
                  <span className="text-xs font-bold text-slate-500 block mb-1">
                    Cumulative Inhaled Mass (Today)
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-slate-900 font-mono tracking-tight">
                      {simAccumulatedDose.toFixed(2)}
                    </span>
                    <span className="text-sm font-bold text-slate-500 font-mono">μg PM₂.₅</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Your walls and filters are blocking <strong>{((1 - currentInfiltration) * 100).toFixed(0)}%</strong> of outside dirt.</span>
                  </div>
                </div>

                {/* Secondary Metric Cards Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 pb-4">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                      <Cigarette className="w-3.5 h-3.5 text-amber-500" />
                      Cigarette Ratio
                    </span>
                    <div className="text-2xl font-black text-amber-600 font-mono">
                      ~{cigsEquivalent}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      1 cig ≈ 20 μg lung load
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                      <HeartPulse className="w-3.5 h-3.5 text-blue-500" />
                      WHO 24h Cap
                    </span>
                    <div className={`text-2xl font-black font-mono ${whoPct > 100 ? "text-rose-600" : "text-emerald-600"}`}>
                      {whoPct}%
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Daily safe limit: 25.0 μg
                    </span>
                  </div>
                </div>

                {/* Clean Air Shield Saved */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl text-xs text-emerald-900">
                  <div className="flex items-center gap-2 font-bold mb-1 text-emerald-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Clean Air Shield Savings
                  </div>
                  <p className="text-[11px] leading-relaxed text-emerald-700">
                    By staying in <strong>{envConfigs[selectedEnv].label}</strong>, you have filtered out <strong>+{cleanAirShieldSavedUg} μg</strong> of PM2.5 that you would have inhaled outdoors.
                  </p>
                </div>
              </div>

              {/* Bottom Quick Action */}
              <div className="pt-6 border-t border-slate-100">
                <Link
                  href="/signup"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-[#0062ff] hover:bg-blue-600 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all"
                >
                  Save Your Places &amp; Track 24/7
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison: Traditional Weather Apps vs AirDose */}
      <section id="comparison" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#0062ff] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Why AQI Is Not Enough
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3">
            Weather Apps Show What Is Outside. <br />
            AirDose Shows What Reaches Your Lungs.
          </h2>
          <p className="text-base text-slate-600 mt-3">
            Outdoor AQI is an environmental metric, not a biological one. Here is why personal dosimeter tracking gives you the true picture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Traditional Weather Apps */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-soft relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-6 border border-rose-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              Standard Weather &amp; AQI Apps
            </h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Designed for city-wide overviews, not individual human health protection.
            </p>

            <ul className="space-y-4 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✕</span>
                <span><strong>Station Distance:</strong> Measures air at a government monitoring tower often 10+ km away from your actual position.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✕</span>
                <span><strong>Assumes 100% Outdoor Exposure:</strong> Treats you as if you are standing in the middle of a highway 24 hours a day.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✕</span>
                <span><strong>Ignores Physical Exertion:</strong> Gives the same score whether you are sleeping in bed (6 L/min) or running outdoors (21 L/min).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✕</span>
                <span><strong>Abstract Numbers:</strong> Shows arbitrary color scales that don't translate into actual physical particulate mass in your blood.</span>
              </li>
            </ul>
          </div>

          {/* Card 2: AirDose Personal Dosimeter */}
          <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-3xl p-8 border-2 border-[#0062ff]/30 shadow-xl relative overflow-hidden ring-4 ring-blue-500/5">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#0062ff] flex items-center justify-center mb-6 border border-blue-200 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold text-slate-900">
                AirDose Personal Dosimeter
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#0062ff] text-white">
                Active Engine
              </span>
            </div>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              A clinical-grade dosimeter tracking personal biological inhalation.
            </p>

            <ul className="space-y-4 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
                <span><strong>Nearest Station Triangulation:</strong> Auto-selects true closest PM2.5 monitoring stations with multi-factor quality scoring.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
                <span><strong>Building Infiltration Physics:</strong> Uses specific building attenuation factors (Home 0.50, Office 0.40, Transit 0.35).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
                <span><strong>Motion &amp; Respiration Multipliers:</strong> Automatically tracks rest vs walking vs running with hardware jitter filtering.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
                <span><strong>Biological Impact Benchmarks:</strong> Reports actual microgram lung mass, WHO daily limits, and Berkeley Earth cigarette equivalence.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* How It Works (4-Step Pipeline) */}
      <section id="how-it-works" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#0062ff] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            System Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3">
            How AirDose Works in 4 Steps
          </h2>
          <p className="text-base text-slate-600 mt-3">
            Every second, our decoupled core engine executes a mathematical pipeline that turns raw environmental telemetry into personal biological health insights.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft relative flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0062ff] flex items-center justify-center font-black text-sm mb-4 border border-blue-200">
                01
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">Live Sensor Fetch</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Queries OpenAQ v3 API in parallel. Triangulates true nearest monitor using native distance scoring and observation freshness checks.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] font-semibold text-blue-600">
              OpenAQ v3 Telemetry &rarr;
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft relative flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm mb-4 border border-emerald-200">
                02
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">Geofenced Infiltration</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Applies 5-parameter infiltration model to resolve whether you are in your Home, Office, or Transit zone with boundary hysteresis debouncing.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] font-semibold text-emerald-600">
              Building Attenuation &rarr;
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft relative flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-sm mb-4 border border-purple-200">
                03
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">Exertion Multiplier</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hardware accelerometer and GPS speed calculate your instantaneous exertion (Rest: 1.0x, Walk: 1.8x, Run: 3.5x, Transit: 1.1x).
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] font-semibold text-purple-600">
              ICRP Respiration Kinetics &rarr;
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft relative flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-sm mb-4 border border-amber-200">
                04
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">Daily Tissue Dosimeter</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Integrates differential exposure rate (µg/s) over elapsed seconds. Persists segments to SQLite and renders real-time 7-day trend graphs.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] font-semibold text-amber-600">
              SQLite 7-Day History &rarr;
            </div>
          </div>
        </div>
      </section>

      {/* The Core Formula Section (Educational & Scientific Trust) */}
      <section id="science" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-soft p-8 sm:p-12">
          <div className="max-w-3xl mb-8">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#0062ff] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Mathematical Foundation
            </span>
            <h2 className="text-3xl font-black text-slate-900 mt-3">
              The Peer-Reviewed Inhalation Formula
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              AirDose never relies on arbitrary fixed estimates. Every microgram is calculated using fundamental aerosol physics and human respiratory physiology:
            </p>
          </div>

          {/* Formula Display Box */}
          <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl font-mono text-center shadow-lg mb-8 overflow-x-auto">
            <div className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-sans font-bold">
              Instantaneous Lung Inhalation Rate
            </div>
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-cyan-300">
              Rate (μg/s) = PM₂.₅ × I_factor × E_factor × V_basal
            </div>
          </div>

          {/* Variable Breakdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="border-l-2 border-blue-500 pl-4">
              <span className="text-xs font-bold uppercase text-slate-400">Variable 1</span>
              <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">PM₂.₅ Concentration</h4>
              <p className="text-xs text-slate-500 mt-1">
                Ambient outdoor particulate mass in <code>μg/m³</code> from the nearest live OpenAQ v3 monitoring station.
              </p>
            </div>

            <div className="border-l-2 border-emerald-500 pl-4">
              <span className="text-xs font-bold uppercase text-slate-400">Variable 2</span>
              <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">Infiltration Factor (I)</h4>
              <p className="text-xs text-slate-500 mt-1">
                Fraction of outdoor particulate penetrating indoor airspace (Home: 0.50, Office: 0.40, Transit: 0.35, Outdoor: 1.00).
              </p>
            </div>

            <div className="border-l-2 border-purple-500 pl-4">
              <span className="text-xs font-bold uppercase text-slate-400">Variable 3</span>
              <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">Exertion Multiplier (E)</h4>
              <p className="text-xs text-slate-500 mt-1">
                Activity ratio: Rest = 1.0x, Transit = 1.1x, Walking = 1.8x, Running = 3.5x based on real-time device motion sensors.
              </p>
            </div>

            <div className="border-l-2 border-amber-500 pl-4">
              <span className="text-xs font-bold uppercase text-slate-400">Variable 4</span>
              <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">Basal Ventilation (V)</h4>
              <p className="text-xs text-slate-500 mt-1">
                Standard resting adult minute volume = <code>6.0 L/min</code> (calibrated to <code>0.0001 m³/s</code> in SI units).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="text-center mb-12">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#0062ff] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Got Questions?
          </span>
          <h2 className="text-3xl font-black text-slate-900 mt-3">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-soft overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 hover:text-[#0062ff] transition-colors"
                >
                  <span className="text-sm sm:text-base">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[#0062ff]" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Final Call to Action Banner */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="bg-gradient-to-r from-[#0062ff] via-indigo-600 to-blue-700 text-white rounded-3xl p-8 sm:p-14 text-center shadow-xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
              Start Tracking What Enters Your Body.
            </h2>
            <p className="text-sm sm:text-base text-blue-100 mb-8 leading-relaxed font-normal">
              Join thousands of health-conscious city commuters who no longer rely on misleading outdoor weather apps. Experience true personal air dosimeter tracking.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                id="cta-bottom-start-btn"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-950 font-black rounded-2xl shadow-lg hover:bg-slate-100 transition-all duration-200 hover:-translate-y-0.5"
              >
                Create Free Account
                <ArrowRight className="w-4 h-4 text-[#0062ff]" />
              </Link>
              <Link
                href="/signin"
                id="cta-bottom-signin-btn"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-500/30 text-white font-bold rounded-2xl hover:bg-blue-500/40 border border-white/20 transition-all duration-200"
              >
                Sign In With Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Light-Themed Footer */}
      <footer className="border-t border-slate-200 bg-white py-10 px-4 sm:px-6 lg:px-8 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0062ff] text-white flex items-center justify-center font-bold text-xs">
              AD
            </div>
            <span className="font-extrabold text-slate-900 text-sm">AirDose</span>
            <span className="text-slate-400">|</span>
            <span>Personal PM2.5 Inhalation Health Engine &copy; 2026</span>
          </div>

          <div className="flex items-center gap-6 text-slate-600 font-semibold">
            <a href="#how-it-works" className="hover:text-[#0062ff] transition-colors">
              Architecture
            </a>
            <a href="#simulator" className="hover:text-[#0062ff] transition-colors">
              Simulator
            </a>
            <a href="#science" className="hover:text-[#0062ff] transition-colors">
              ICRP Math
            </a>
            <Link href="/signin" className="hover:text-[#0062ff] transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
