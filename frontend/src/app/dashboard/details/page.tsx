"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import DashboardNavbar from "@/components/DashboardNavbar";
import { getStoredUser, clearSession, User } from "@/lib/api";
import {
  BookOpen,
  Calculator,
  Activity,
  Wind,
  ShieldCheck,
  Compass,
  Clock,
  Layers,
  Sparkles,
  Zap,
  ArrowRight,
  Info,
  CheckCircle2,
} from "lucide-react";

export default function ExposureDetailsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Interactive Live Calculator State
  const [calcPm25, setCalcPm25] = useState<number>(75);
  const [calcInfiltration, setCalcInfiltration] = useState<number>(0.5);
  const [calcBreathing, setCalcBreathing] = useState<number>(1.0);
  const [calcBaseRate] = useState<number>(0.0001); // 0.0001 m3/s = 6 L/min

  useEffect(() => {
    const currentUser = getStoredUser();
    if (!currentUser) {
      router.push("/signin");
      return;
    }
    setUser(currentUser);
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push("/signin");
  };

  // Live Formula Calculations
  const rateUgPerSec = calcPm25 * calcInfiltration * calcBreathing * calcBaseRate;
  const rateUgPerMin = rateUgPerSec * 60;
  const rateUgPerHour = rateUgPerSec * 3600;
  const doseMgPerDay = (rateUgPerHour * 24) / 1000;

  return (
    <div className="min-h-screen bg-[#f0f3f8] text-slate-900 flex font-sans">
      {/* 1. Sidebar */}
      <Sidebar
        user={user}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* 2. Top Dashboard Navbar */}
        <DashboardNavbar
          user={user}
          onLogout={handleLogout}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        {/* 3. Main Body */}
        <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-[#0062ff] bg-blue-50 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#0062ff]" />
                  Scientific Methodology &amp; Mathematical Engine
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Inhalation Rate Formula &amp; Architecture
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Full breakdown of physical units, respiratory ventilation constants, geofence infiltration, and real-time numerical integration.
              </p>
            </div>
          </div>

          {/* Master Formula Hero Banner */}
          <div className="bg-[#0f1117] text-white rounded-[26px] p-6 sm:p-8 shadow-card relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Primary Governing Equation
                </span>
                <span className="text-xs font-bold bg-[#ccf82f] text-slate-950 px-3 py-1 rounded-full shadow-sm">
                  Physical Inhalation Model v1.0
                </span>
              </div>

              {/* Formula Display Box */}
              <div className="p-4 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 text-center font-mono overflow-x-auto">
                <div className="text-lg sm:text-2xl font-black text-white tracking-wide leading-relaxed">
                  <span className="text-[#0062ff]">Inhalation Rate (μg/s)</span> ={" "}
                  <span className="text-amber-400">PM2.5 (μg/m³)</span> ×{" "}
                  <span className="text-emerald-400">Infiltration Factor (If)</span> ×{" "}
                  <span className="text-purple-400">Breathing Factor (Bf)</span> ×{" "}
                  <span className="text-cyan-400">Base Breathing Rate (VE)</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                AirDose calculates continuous respiratory particulate dosage by combining real-time spatial air quality, location infiltration mechanics, and metabolic activity rate into instantaneous microgram dosage.
              </p>
            </div>
          </div>

          {/* Interactive Calculator Playground */}
          <div className="bg-white rounded-[26px] p-6 sm:p-8 border border-slate-100 shadow-soft">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0062ff] flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Interactive Live Formula Calculator
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Adjust the parameters to inspect how exposure rate scales dynamically
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Sliders Area (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* 1. PM2.5 Concentration */}
                <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 flex items-center gap-1.5">
                      <Wind className="w-4 h-4 text-amber-500" />
                      Ambient PM2.5 Concentration
                    </span>
                    <span className="font-mono font-bold text-amber-600 text-sm">{calcPm25} μg/m³</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="350"
                    step="5"
                    value={calcPm25}
                    onChange={(e) => setCalcPm25(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0062ff]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>Clean (15 μg/m³)</span>
                    <span>Moderate (60 μg/m³)</span>
                    <span>Severe (250+ μg/m³)</span>
                  </div>
                </div>

                {/* 2. Infiltration Factor */}
                <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Micro-Environment Infiltration Factor (If)
                    </span>
                    <span className="font-mono font-bold text-emerald-600 text-sm">
                      {calcInfiltration.toFixed(2)} ({Math.round((1 - calcInfiltration) * 100)}% filtered)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { label: "Office (0.40)", val: 0.4 },
                      { label: "Home (0.50)", val: 0.5 },
                      { label: "Transit (0.80)", val: 0.8 },
                      { label: "Outdoor (1.00)", val: 1.0 },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setCalcInfiltration(item.val)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          calcInfiltration === item.val
                            ? "bg-[#0062ff] text-white shadow-sm"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Breathing Multiplier */}
                <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-purple-500" />
                      Breathing Factor Multiplier (Bf)
                    </span>
                    <span className="font-mono font-bold text-purple-600 text-sm">{calcBreathing.toFixed(1)}×</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { label: "1.0× Resting / Desk", val: 1.0 },
                      { label: "1.5× Walking / Transit", val: 1.5 },
                      { label: "2.2× Exercise / Jogging", val: 2.2 },
                      { label: "3.0× Heavy Exertion", val: 3.0 },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setCalcBreathing(item.val)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          calcBreathing === item.val
                            ? "bg-[#0062ff] text-white shadow-sm"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Output Rates (5 cols) */}
              <div className="lg:col-span-5 bg-[#0f1117] text-white rounded-2xl p-6 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Calculated Inhalation Output
                  </span>
                  <div className="mt-4 space-y-3">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">Per Second (μg/s)</span>
                      <span className="text-lg font-bold font-mono text-[#0062ff]">
                        {rateUgPerSec.toFixed(6)} μg/s
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">Per Minute (μg/min)</span>
                      <span className="text-lg font-bold font-mono text-emerald-400">
                        {rateUgPerMin.toFixed(4)} μg/min
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">Per Hour (μg/hr)</span>
                      <span className="text-xl font-black font-mono text-amber-400">
                        {rateUgPerHour.toFixed(2)} μg/hr
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">24h Continuous Equivalent</span>
                      <span className="text-lg font-bold font-mono text-rose-400">
                        {doseMgPerDay.toFixed(3)} mg/day
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Continuous accumulation integrated via active time slice: ΔExposure = Rate × Δt
                </div>
              </div>
            </div>
          </div>

          {/* Deep-Dive Grid into All 4 Mathematical Variables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Variable 1: PM2.5 Ambient Concentration */}
            <div className="bg-white rounded-[26px] p-6 border border-slate-100 shadow-soft space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  C
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">1. Ambient PM2.5 Concentration (C)</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Unit: μg/m³ (micrograms per cubic meter)</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Real-time outdoor particulate concentration retrieved from the nearest verified sensor station via the OpenAQ API. Telemetry is refreshed automatically whenever the user moves &gt; 1km or after 30 minutes.
              </p>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-mono text-slate-700">
                Data Source: OpenAQ API v3 • Nearest Station Inverse-Distance Weighted
              </div>
            </div>

            {/* Variable 2: Infiltration Factor */}
            <div className="bg-white rounded-[26px] p-6 border border-slate-100 shadow-soft space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  If
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">2. Infiltration Coefficient (If)</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Dimensionless factor [0.10 to 1.00]</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Models building envelope attenuation, natural settling, and air conditioning filtration. Buildings block a substantial fraction of outdoor fine particulates.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-700">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Home / Residential</span>
                  <span className="font-bold text-emerald-600">0.50 (50% filtered)</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Office / HVAC</span>
                  <span className="font-bold text-blue-600">0.40 (60% filtered)</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">College / Campus</span>
                  <span className="font-bold text-purple-600">0.50 (50% filtered)</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Outdoor Ambient</span>
                  <span className="font-bold text-slate-900">1.00 (0% filtered)</span>
                </div>
              </div>
            </div>

            {/* Variable 3: Base Breathing Rate */}
            <div className="bg-white rounded-[26px] p-6 border border-slate-100 shadow-soft space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
                  VE
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">3. Base Respiratory Rate (VE)</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Constant: 0.0001 m³/s (6 Liters / minute)</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Based on standard human physiological pulmonary ventilation (ICRP human respiratory tract reference values for resting adults: tidal volume ≈ 500mL × 12 breaths/minute = 6 L/min).
              </p>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-mono text-slate-700">
                0.0001 m³/s = 6.0 L/min = 360 L/hr = 8.64 m³/day
              </div>
            </div>

            {/* Variable 4: Breathing Multiplier */}
            <div className="bg-white rounded-[26px] p-6 border border-slate-100 shadow-soft space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  Bf
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">4. Activity Level Multiplier (Bf)</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Dimensionless Multiplier [1.0× to 3.0×]</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                During exercise and physical movement, respiratory ventilation and cardiac output increase proportionally to meet cellular oxygen demands, multiplying particulate inhalation.
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono text-slate-700">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                  <span className="text-slate-400 block text-[10px]">Resting</span>
                  <span className="font-bold text-slate-900">1.0× (6 L/m)</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                  <span className="text-slate-400 block text-[10px]">Walking</span>
                  <span className="font-bold text-blue-600">1.5× (9 L/m)</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                  <span className="text-slate-400 block text-[10px]">Exercise</span>
                  <span className="font-bold text-purple-600">2.2× (13.2 L/m)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Continuous Integration & Geofence Architecture Card */}
          <div className="bg-white rounded-[26px] p-6 sm:p-8 border border-slate-100 shadow-soft space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0062ff] flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Continuous Time-Integral &amp; Geofence Spatial Resolution
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  How AirDose avoids per-second database writes while preserving sub-second calculation accuracy
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#0062ff]" />
                  1. Haversine Spatial Matching
                </h5>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Distance from active GPS fix (lat1, lon1) to saved places (lat2, lon2) is evaluated using spherical trigonometry. If distance &le; geofence radius, the user is marked inside that micro-environment.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  2. Boundary Debouncing &amp; Hysteresis
                </h5>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  A 25-meter spatial hysteresis buffer and 2-sample consecutive threshold prevent GPS jitter from creating noisy boundary flaps between indoor and outdoor states.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  3. Segment Persistence Checkpoints
                </h5>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Ongoing exposure accumulates continuously in-memory. Complete segments are committed to SQLite on location transitions, user stop events, or 5-minute periodic checkpoints.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Spatio-Temporal Air Quality Caching Policy (1 km / 30 min) */}
          <div className="bg-white rounded-[26px] p-6 sm:p-8 border border-slate-100 shadow-soft space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Spatio-Temporal Air Quality Caching Policy (1.0 km / 30 Minutes)
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  How AirDose optimizes network bandwidth, battery consumption, and OpenAQ API rate limits
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900/90 leading-relaxed space-y-2">
              <p>
                When your device requests air quality or updates personal exposure for coordinate $(lat, lon)$, the backend validates whether an in-memory observation exists within a <strong>1.0 km (1000 meters)</strong> spatial radius and was measured within the last <strong>30 minutes (1800 seconds)</strong>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-white rounded-xl border border-amber-200/80 font-mono text-[11px] space-y-1">
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    ✓ Cache Hit (No External API Call)
                  </span>
                  <p className="text-slate-600 font-sans text-xs">
                    If distance &le; 1.0 km AND time elapsed &lt; 30 minutes, cached pollutant matrix &amp; AQI are served immediately with accurate remaining TTL.
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-amber-200/80 font-mono text-[11px] space-y-1">
                  <span className="font-bold text-[#0062ff] flex items-center gap-1">
                    ↻ Cache Invalidation &amp; Refresh
                  </span>
                  <p className="text-slate-600 font-sans text-xs">
                    If movement &gt; 1.0 km OR time elapsed &ge; 30 minutes, a fresh OpenAQ global sensor telemetry fetch is automatically executed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
