"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import DashboardNavbar from "@/components/layout/DashboardNavbar";
import {
  getStoredUser,
  clearSession,
  simulateTripApi,
  fetchAirQuality,
  User,
  TripSimulationResponse,
  TransitModeSimulation,
} from "@/lib/api";
import {
  Compass,
  Footprints,
  Bike,
  Car,
  Train,
  Bus,
  Wind,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Cigarette,
  Clock,
  Gauge,
  TrendingDown,
  Info,
  RefreshCw,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from "lucide-react";

export default function RouteSimulatorPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Simulation parameters
  const [duration, setDuration] = useState<number>(35);
  const [ambientPm25, setAmbientPm25] = useState<number>(85);
  const [origin, setOrigin] = useState<string>("Home (Central Delhi)");
  const [destination, setDestination] = useState<string>("Tech Hub (Cyber City)");
  const [simulation, setSimulation] = useState<TripSimulationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncingOutdoor, setSyncingOutdoor] = useState<boolean>(false);

  useEffect(() => {
    const currentUser = getStoredUser();
    if (!currentUser) {
      router.push("/signin");
      return;
    }
    setUser(currentUser);
  }, [router]);

  // Execute simulation API
  const runSimulation = useCallback(async (dur: number, pm: number) => {
    setLoading(true);
    try {
      const data = await simulateTripApi(dur, pm);
      setSimulation(data);
    } catch (err) {
      console.error("Failed to run commute simulation:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSimulation(duration, ambientPm25);
  }, [runSimulation, duration, ambientPm25]);

  // Fetch current live outdoor PM2.5 to sync
  const handleSyncCurrentLocation = async () => {
    setSyncingOutdoor(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const data = await fetchAirQuality(pos.coords.latitude, pos.coords.longitude);
              const livePm = data.pollutants?.pm25?.value ?? data.aqi ?? 85;
              setAmbientPm25(Math.round(livePm));
            } catch {
              // Fallback default
              setAmbientPm25(90);
            } finally {
              setSyncingOutdoor(false);
            }
          },
          () => {
            // Permission denied or error, use fallback
            setAmbientPm25(90);
            setSyncingOutdoor(false);
          },
          { timeout: 5000 }
        );
      } else {
        setSyncingOutdoor(false);
      }
    } catch {
      setSyncingOutdoor(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    router.push("/signin");
  };

  const getModeIcon = (iconName: string) => {
    switch (iconName) {
      case "Footprints":
        return <Footprints className="w-5 h-5" />;
      case "Bike":
        return <Bike className="w-5 h-5" />;
      case "Car":
        return <Car className="w-5 h-5" />;
      case "Train":
        return <Train className="w-5 h-5" />;
      case "Bus":
        return <Bus className="w-5 h-5" />;
      default:
        return <Wind className="w-5 h-5" />;
    }
  };

  const durationPresets = [15, 30, 45, 60, 90];
  const pm25Presets = [
    { label: "Clean Air", val: 25, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    { label: "Moderate", val: 60, color: "text-amber-700 bg-amber-50 border-amber-200" },
    { label: "High / Delhi Avg", val: 120, color: "text-orange-700 bg-orange-50 border-orange-200" },
    { label: "Severe Smog", val: 260, color: "text-rose-700 bg-rose-50 border-rose-200" },
  ];

  const routePresets = [
    { from: "Home (Central Delhi)", to: "Cyber Hub (Gurugram)", dur: 45 },
    { from: "IIT Delhi Campus", to: "Connaught Place", dur: 30 },
    { from: "Noida Sector 62", to: "Nehru Place", dur: 40 },
    { from: "Dwarka Sector 21", to: "Delhi Airport T3", dur: 20 },
  ];

  const safest = simulation?.options ? simulation.options[0] : null;
  const mostExposed = simulation?.options ? simulation.options[simulation.options.length - 1] : null;
  const savingsUg = simulation?.max_dose_savings_ug ?? 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans">
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

        {/* 3. Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header Title & Intro Banner */}
          <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-slate-100 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#0062ff] text-xs font-bold border border-blue-100">
                <Compass className="w-3.5 h-3.5" />
                <span>AI Inhalation Telemetry Simulator</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Simulate Route Exposure
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                Estimate and compare real-time personal PM2.5 inhalation doses across different transport modes
                (Metro, AC Car with Recirculation, Public Bus, Cycling, Walking) for any commute.
              </p>
            </div>

            {/* Quick Live Stats Pill */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl shrink-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0062ff] flex items-center justify-center font-bold">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Dosimeter Mode
                </p>
                <p className="text-xs font-bold text-slate-800">Kinetic Pulmonary Model</p>
                <p className="text-[10px] text-slate-400 font-mono">Basal 6 L/min × Infiltration</p>
              </div>
            </div>
          </div>

          {/* Interactive Controls & Scenario Modeler */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Route & Commute Duration (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-[28px] p-6 sm:p-7 border border-slate-100 shadow-soft space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0062ff]" />
                  <span>Commute Parameters</span>
                </h2>
                <span className="text-xs font-mono font-bold text-[#0062ff] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  {duration} minutes
                </span>
              </div>

              {/* Preset Route Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Popular Route Presets
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {routePresets.map((r, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setOrigin(r.from);
                        setDestination(r.to);
                        setDuration(r.dur);
                      }}
                      className={`text-left p-2.5 rounded-xl text-xs transition-all border ${
                        origin === r.from && destination === r.to
                          ? "bg-blue-50/70 border-blue-300 text-slate-900 font-bold"
                          : "bg-slate-50/70 border-slate-200/60 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="truncate">{r.from}</span>
                        <span className="text-[10px] text-[#0062ff] font-mono shrink-0 ml-1">
                          {r.dur}m
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{r.to}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Origin and Destination Custom Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Origin Point</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      placeholder="e.g. Home"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Destination Point</label>
                  <div className="relative">
                    <Compass className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="e.g. Office"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Duration Slider */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Trip Duration</label>
                  <span className="text-sm font-extrabold text-[#0062ff] font-mono">{duration} min</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#0062ff]"
                />
                <div className="flex items-center gap-2">
                  {durationPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDuration(preset)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        duration === preset
                          ? "bg-[#0062ff] text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Ambient Air Quality & Live Sync (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-[28px] p-6 sm:p-7 border border-slate-100 shadow-soft space-y-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Wind className="w-4 h-4 text-[#0062ff]" />
                    <span>Ambient Air Pollution</span>
                  </h2>
                  <button
                    type="button"
                    onClick={handleSyncCurrentLocation}
                    disabled={syncingOutdoor}
                    className="text-[11px] font-bold text-[#0062ff] hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full flex items-center gap-1 transition-all disabled:opacity-50"
                    title="Detect outdoor PM2.5 from current location"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncingOutdoor ? "animate-spin" : ""}`} />
                    <span>Sync Live GPS</span>
                  </button>
                </div>

                {/* PM2.5 Slider and Value */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Ambient PM2.5 Concentration</span>
                    <span className="text-sm font-extrabold text-slate-900 font-mono">
                      {ambientPm25} <span className="text-xs text-slate-400 font-normal">μg/m³</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="350"
                    step="5"
                    value={ambientPm25}
                    onChange={(e) => setAmbientPm25(Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#0062ff]"
                  />
                </div>

                {/* PM2.5 Presets */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {pm25Presets.map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setAmbientPm25(p.val)}
                      className={`p-2 rounded-xl text-left border text-xs font-semibold transition-all ${
                        ambientPm25 === p.val
                          ? `${p.color} ring-2 ring-blue-500/20 font-bold`
                          : "bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100"
                      }`}
                    >
                      <div className="text-[11px] opacity-80">{p.label}</div>
                      <div className="font-mono font-bold mt-0.5">{p.val} μg/m³</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Context Summary Pill */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 font-medium text-[11px]">
                  <span>Commute Scenario:</span>
                  <span className="font-bold text-slate-800">{duration} min trip</span>
                </div>
                <div className="text-slate-600 text-xs">
                  Inhaling at outdoor air of{" "}
                  <strong className="text-slate-900 font-mono">{ambientPm25} μg/m³</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Winner / Safest Choice Spotlight Banner */}
          {safest && mostExposed && (
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-[28px] p-6 sm:p-8 shadow-lg shadow-emerald-600/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-bold text-emerald-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-200" />
                  <span>Optimal Route Choice Recommendation</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                  Choose {safest.mode}
                </h3>
                <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                  Reduces your toxic particulate burden by up to{" "}
                  <strong className="text-white underline decoration-white/40 font-mono">
                    {savingsUg.toFixed(1)} μg
                  </strong>{" "}
                  compared to {mostExposed.mode}. Your lungs are shielded by micro-air filtration and low exertion.
                </p>
              </div>

              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shrink-0 self-stretch md:self-auto justify-around">
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-emerald-200">Safest Dose</p>
                  <p className="text-2xl font-black font-mono mt-0.5">{safest.estimated_dose_ug.toFixed(1)}</p>
                  <p className="text-[10px] text-emerald-200 font-mono">μg PM2.5</p>
                </div>
                <div className="h-10 w-px bg-white/20" />
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-emerald-200">Max Saved</p>
                  <p className="text-2xl font-black font-mono text-emerald-200 mt-0.5">
                    {savingsUg.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-emerald-200 font-mono">μg Shielded</p>
                </div>
              </div>
            </div>
          )}

          {/* Transit Modes Comparison Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Transit Mode Inhalation Breakdown
                </h2>
                <p className="text-xs text-slate-500">
                  Calculated based on in-cabin infiltration factor and physical ventilation rates
                </p>
              </div>
              {loading && (
                <div className="flex items-center gap-1.5 text-xs text-[#0062ff] font-bold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Recalculating...</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {simulation?.options.map((option, index) => {
                const isSafest = index === 0;
                const isHighest = index === (simulation.options.length - 1);
                const doseUg = option.estimated_dose_ug;
                const maxDose = mostExposed?.estimated_dose_ug || 50;
                const progressPct = Math.min(100, Math.max(8, (doseUg / maxDose) * 100));

                return (
                  <div
                    key={option.key}
                    className={`bg-white rounded-[24px] p-5 border transition-all flex flex-col justify-between space-y-4 ${
                      isSafest
                        ? "border-emerald-300 shadow-md ring-1 ring-emerald-500/20"
                        : isHighest
                        ? "border-rose-200 shadow-soft"
                        : "border-slate-100 shadow-soft hover:border-slate-200"
                    }`}
                  >
                    {/* Header: Mode Icon & Title */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                            isSafest
                              ? "bg-emerald-50 text-emerald-600"
                              : isHighest
                              ? "bg-rose-50 text-rose-600"
                              : "bg-blue-50 text-[#0062ff]"
                          }`}
                        >
                          {getModeIcon(option.icon)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">{option.mode}</h3>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {option.inhalation_rate_ug_s.toFixed(5)} μg/s
                          </span>
                        </div>
                      </div>

                      {/* Rank / Status Badge */}
                      {isSafest ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          #1 Safest
                        </span>
                      ) : isHighest ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 flex items-center gap-1 shrink-0">
                          <AlertTriangle className="w-3 h-3" />
                          Highest Dose
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 shrink-0 font-mono">
                          #{index + 1}
                        </span>
                      )}
                    </div>

                    {/* Inhaled Dose Big Metric */}
                    <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-semibold text-slate-500">Inhaled Dose:</span>
                        <div className="text-right">
                          <span
                            className={`text-xl font-extrabold font-mono ${
                              isSafest
                                ? "text-emerald-600"
                                : isHighest
                                ? "text-rose-600"
                                : "text-slate-900"
                            }`}
                          >
                            {doseUg.toFixed(2)}
                          </span>
                          <span className="text-xs text-slate-400 font-bold ml-1">μg</span>
                        </div>
                      </div>

                      {/* Dose Bar */}
                      <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isSafest
                              ? "bg-emerald-500"
                              : isHighest
                              ? "bg-rose-500"
                              : "bg-[#0062ff]"
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      {/* Cigarettes Equivalent */}
                      <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                        <span className="flex items-center gap-1">
                          <Cigarette className="w-3 h-3 text-slate-400" />
                          <span>Cigarette Equiv:</span>
                        </span>
                        <span className="font-bold text-slate-800 font-mono">
                          {option.cigarettes_equivalent.toFixed(2)} cigs
                        </span>
                      </div>
                    </div>

                    {/* Physiology & Physical Factors */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-slate-400 text-[10px] uppercase font-bold">Infiltration</p>
                        <p className="font-bold text-slate-800 font-mono mt-0.5">
                          {(option.infiltration_factor * 100).toFixed(0)}%
                        </p>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-slate-400 text-[10px] uppercase font-bold">Ventilation Exertion</p>
                        <p className="font-bold text-slate-800 font-mono mt-0.5">
                          {option.breathing_factor.toFixed(1)}x
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Route Advisory & Physiological Formula Guidance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Practical Clean Commuting Guidelines */}
            <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-soft space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Clean Commuting Best Practices</span>
              </h3>
              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    1
                  </div>
                  <span>
                    <strong className="text-slate-900">Activate In-Cabin Recirculation:</strong> Keeping car
                    windows sealed and AC set to internal recirculation maintains PM2.5 infiltration below 25%,
                    blocking tailpipe black carbon.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    2
                  </div>
                  <span>
                    <strong className="text-slate-900">Prefer Underground Metro:</strong> Metro stations and
                    trains feature centralized HVAC particulate scrubbers and require zero cardiovascular
                    over-breathing.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    3
                  </div>
                  <span>
                    <strong className="text-slate-900">Respiratory Protection When Cycling:</strong> Active
                    commutes elevate breathing volume from 6 L/min to 25+ L/min. Always wear a snug N95/FFP2
                    respirator when PM2.5 exceeds 50 μg/m³.
                  </span>
                </li>
              </ul>
            </div>

            {/* Dosimetry Formula Breakdown */}
            <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-soft space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#0062ff]" />
                <span>The Inhalation Dosimetry Formula</span>
              </h3>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 font-mono text-[11px] text-slate-800 leading-relaxed space-y-1">
                <div className="font-bold text-[#0062ff]">
                  Dose (μg) = PM2.5 × Infiltration × Breathing Factor × Basal Vent × Duration
                </div>
                <div className="text-slate-500 text-[10px]">
                  • Basal Ventilation: 0.0001 m³/s (6 Liters / minute resting adult)
                </div>
                <div className="text-slate-500 text-[10px]">
                  • Infiltration: 0.20 (Recirc AC) to 1.0 (Open air / Pedestrian)
                </div>
                <div className="text-slate-500 text-[10px]">
                  • Exertion: 1.0x (Sitting) → 1.8x (Walking) → 3.5x (Cycling)
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Notice that because cycling has a 3.5x ventilation multiplier, a cyclist inhales over 3 times more
                toxic particulate matter per minute than an open-air pedestrian walking the same distance.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
