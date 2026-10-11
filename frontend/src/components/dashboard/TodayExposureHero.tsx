"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sun,
  ArrowUpRight,
  MoreHorizontal,
  Home,
  Building2,
  GraduationCap,
  MapPin,
  Compass,
  Clock,
  Play,
  Square,
  ShieldCheck,
  ShieldAlert,
  Info,
  X,
  Zap,
  Activity,
  Wind,
  Layers,
  CheckCircle2,
  Cigarette,
  Sparkles,
  HeartPulse,
  Flame,
  Footprints,
  Cpu,
  Coffee,
} from "lucide-react";
import { TodayExposureData, UserLocation, fetchUserLocations } from "@/lib/api";
import { calculateHaversineDistance, formatDistance } from "@/lib/haversine";
import ExposureFormulaModal from "./ExposureFormulaModal";

interface TodayExposureHeroProps {
  userName?: string;
  userId?: number;
  userCoords?: { lat: number; lon: number };
  exposureData: TodayExposureData | null;
  isTracking: boolean;
  onToggleTracking: () => void;
  selectedBreathingFactor: number;
  onBreathingFactorChange: (factor: number) => void;
  isAutoMode?: boolean;
  onAutoModeChange?: (auto: boolean, cycleSimulated?: boolean) => void;
  autoDetectedLabel?: string;
  permissionDenied?: boolean;
  onOpenAiAdvisor?: (mode: "chat" | "explain") => void;
}

export default function TodayExposureHero({
  userName,
  userId,
  userCoords,
  exposureData,
  isTracking,
  onToggleTracking,
  selectedBreathingFactor,
  onBreathingFactorChange,
  isAutoMode = true,
  onAutoModeChange,
  autoDetectedLabel = "Rest",
  permissionDenied,
  onOpenAiAdvisor,
}: TodayExposureHeroProps) {
  const [internalAutoMode, setInternalAutoMode] = useState<boolean>(isAutoMode);
  const autoModeActive = isAutoMode !== undefined ? isAutoMode : internalAutoMode;

  const handleToggleAuto = () => {
    setInternalAutoMode(true);
    onAutoModeChange?.(true, false);
  };

  // Live ticker for smooth real-time sub-microgram accumulation
  const [liveDisplayExposure, setLiveDisplayExposure] = useState<number>(
    exposureData?.total_exposure_ug || 0.0
  );
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [lastUpdateSecondsAgo, setLastUpdateSecondsAgo] = useState<number>(0);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState<boolean>(false);

  const baseTotal = exposureData?.total_exposure_ug || 0.0;
  const currentRate = exposureData?.current?.inhalation_rate_ug_s || 0.0;
  const current = exposureData?.current;
  const environment = current?.environment?.toUpperCase() || "OUTDOOR";
  const placeName = current?.location_name || (environment === "OUTDOOR" ? "Outdoor" : environment);
  const infiltrationFactor = current?.infiltration_factor ?? 1.0;
  const pm25Value = current?.pm25 ?? 75.0;
  const basalVentilation = current?.base_breathing_rate_m3_s ?? 0.0001; // 0.0001 m3/s = 6 L/min

  // Real-time calculated rate based on active exertion factor (auto or manual)
  const calculatedLiveRate = pm25Value * infiltrationFactor * selectedBreathingFactor * basalVentilation;
  const activeRate = calculatedLiveRate > 0 ? calculatedLiveRate : currentRate;

  useEffect(() => {
    setLiveDisplayExposure(baseTotal);
  }, [baseTotal]);

  useEffect(() => {
    if (!isTracking || activeRate <= 0) return;

    const interval = setInterval(() => {
      setLiveDisplayExposure((prev) => prev + activeRate);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking, activeRate]);

  // Load Saved Locations for proximity radar
  useEffect(() => {
    fetchUserLocations(userId)
      .then((data) => {
        if (data && data.length > 0) {
          setLocations(data);
        } else {
          setLocations([]);
        }
      })
      .catch(() => {
        setLocations([]);
      });
  }, [userId]);

  // Track seconds since last pollution update
  useEffect(() => {
    setLastUpdateSecondsAgo(0);
    const interval = setInterval(() => {
      setLastUpdateSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [exposureData]);

  // Medically calibrated health equivalence metrics
  const liveCigarettes = Number((liveDisplayExposure / 20.0).toFixed(2));
  const whoDailyLimitUg = 25.0;
  const whoPercentage = Math.round((liveDisplayExposure / whoDailyLimitUg) * 100);
  const shieldSavedUg = exposureData?.clean_air_shield_saved_ug || 0.0;

  // Contributions for progress bars
  const contribs = exposureData?.contributions || {};
  const totalSafe = baseTotal > 0 ? baseTotal : 1.0;

  const categories = [
    { key: "HOME", label: "Home (0.50)", color: "bg-[#ff7a00]", raw: contribs["HOME"] || 0 },
    { key: "OFFICE", label: "Office (0.40)", color: "bg-[#10b981]", raw: contribs["OFFICE"] || 0 },
    { key: "OUTDOOR", label: "Outdoor (1.0)", color: "bg-[#8b5cf6]", raw: contribs["OUTDOOR"] || 0 },
    { key: "TRANSIT", label: "Transit (0.80)", color: "bg-[#0062ff]", raw: contribs["TRANSIT"] || 0 },
  ];

  // Circular gauge calculations
  const circumference = 2 * Math.PI * 40;
  const whoGaugeOffset = Math.max(0, circumference - Math.min(1.0, whoPercentage / 100) * circumference);

  // Real-time distances to places (only when genuine GPS coordinates exist)
  const currentLat = userCoords?.lat ?? null;
  const currentLon = userCoords?.lon ?? null;

  const placesWithDist = locations.map((loc) => {
    const dist = (currentLat !== null && currentLon !== null)
      ? calculateHaversineDistance(currentLat, currentLon, loc.latitude, loc.longitude)
      : null;
    return {
      ...loc,
      distanceMeters: dist,
    };
  }).sort((a, b) => {
    if (a.distanceMeters === null) return 0;
    if (b.distanceMeters === null) return 0;
    return a.distanceMeters - b.distanceMeters;
  });

  const getPlaceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "home":
        return Home;
      case "office":
        return Building2;
      case "college":
        return GraduationCap;
      default:
        return MapPin;
    }
  };

  const getPlaceBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "home":
        return "bg-emerald-50 text-emerald-600";
      case "office":
        return "bg-blue-50 text-[#0062ff]";
      case "college":
        return "bg-purple-50 text-purple-600";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const manualActivityModes = [
    { label: "Rest", factor: 1.0, Icon: Coffee },
    { label: "Walk", factor: 1.8, Icon: Footprints },
    { label: "Run", factor: 3.5, Icon: Flame },
    { label: "Workout", factor: 5.0, Icon: Zap },
  ];

  const timeAgoText =
    lastUpdateSecondsAgo < 5
      ? "Just now"
      : lastUpdateSecondsAgo < 60
        ? `${lastUpdateSecondsAgo}s ago`
        : `${Math.floor(lastUpdateSecondsAgo / 60)}m ago`;

  return (
    <div className="space-y-4">
      {permissionDenied && (
        <div className="flex items-center gap-2 p-2.5 px-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Location access was denied. Ambient exposure tracking requires location permissions to associate regional air quality stations with your real coordinates. Enable location permissions in your browser for live local tracking.</span>
        </div>
      )}

      {/* Top Controls Header: Live Telemetry Status, Exertion Selector & Commute Simulator CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 pb-1">
        {/* Left: Quick Activity Exertion Selector */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-full border border-slate-200/90 shadow-xs overflow-x-auto max-w-full">

          {/* Auto Mode Button */}
          <button
            type="button"
            onClick={handleToggleAuto}
            aria-pressed={autoModeActive}
            className={`px-3.5 py-1.5 min-h-[34px] shrink-0 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${autoModeActive
              ? "bg-[#0062ff] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            title={
              autoModeActive
                ? `Auto Mode active: adapting between rest, walking, and running based on motion. Current: ${autoDetectedLabel}. Click to test cycle.`
                : "Switch to Auto Mode: automatically adapts activity based on real-time motion"
            }
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Auto</span>
            {autoModeActive ? (
              <span className="text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded-full font-bold">
                {autoDetectedLabel} {selectedBreathingFactor.toFixed(1)}x
              </span>
            ) : (
              <span className="text-[9px] opacity-75 font-mono">GPS</span>
            )}
          </button>

          {/* Manual Modes */}
          {manualActivityModes.map((act) => {
            const isSelected = !autoModeActive && Math.abs(selectedBreathingFactor - act.factor) < 0.1;
            const ActIcon = act.Icon;
            return (
              <button
                key={act.factor}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  setInternalAutoMode(false);
                  onAutoModeChange?.(false);
                  onBreathingFactorChange(act.factor);
                }}
                className={`px-3.5 py-1.5 min-h-[34px] shrink-0 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${isSelected
                  ? "bg-[#0062ff] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
              >
                <ActIcon className="w-3.5 h-3.5" />
                <span>{act.label}</span>
                <span className="text-[9px] opacity-75 font-mono">{act.factor}x</span>
              </button>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Tracking Status Pill */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-xs text-xs font-semibold text-slate-700">
            <span className={`w-2 h-2 rounded-full ${isTracking ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            <span>{isTracking ? "Live Dosimeter" : "Paused"}</span>
          </div>

          {/* Pause / Play Button */}
          <button
            type="button"
            onClick={onToggleTracking}
            className={`px-4 py-2 min-h-[36px] rounded-full text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${isTracking
              ? "bg-slate-900 hover:bg-slate-800 text-white"
              : "bg-[#0062ff] hover:bg-blue-600 text-white shadow-blue-500/25"
              }`}
          >
            {isTracking ? (
              <>
                <Square className="w-3 h-3 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Resume</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid: 3 Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">

        {/* Card 1: Inhaled PM2.5 Dosimeter */}
        <div className="lg:col-span-4 bg-white text-slate-900 rounded-3xl p-6 shadow-soft border border-slate-200/80 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-blue-600" />
                Inhaled PM₂.₅ Mass
              </span>
              <button
                type="button"
                onClick={() => setIsFormulaModalOpen(true)}
                className="text-slate-400 hover:text-slate-700 p-1 transition-colors cursor-pointer"
                title="View inhalation calculation formula"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* Primary Cumulative Exposure Metric */}
            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 font-mono tracking-tight leading-none">
                  {liveDisplayExposure.toFixed(1)}
                </span>
                <span className="text-base sm:text-lg font-bold font-mono text-slate-500">
                  μg PM₂.₅
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">
                Estimated personal inhaled particulate mass today
              </p>
            </div>

            {/* Health Equivalence & WHO Benchmark Group */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">WHO Guideline Ref:</span>
                <span
                  className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full border ${whoPercentage <= 50
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : whoPercentage <= 100
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                >
                  {whoPercentage}% of ref
                </span>
              </div>

              {/* Subordinate Benchmark Progress Indicator */}
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, Math.max(2, whoPercentage))}%` }}
                  className={`h-full rounded-full transition-all duration-700 ${
                    whoPercentage > 100 ? "bg-rose-500" : whoPercentage > 75 ? "bg-amber-500" : "bg-blue-600"
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-600 font-medium">Particulate Equivalence:</span>
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold font-mono px-2 py-0.5 rounded-full">
                  <Cigarette className="w-3 h-3 text-amber-600" />
                  ~{liveCigarettes} cigs
                </span>
              </div>

              <p className="text-[10px] text-slate-400 leading-tight pt-0.5">
                Berkeley Earth reference (20 µg PM₂.₅ ≈ 1 cig). WHO 25 µg is an illustrative daily reference benchmark derived from ambient guidelines.
              </p>
            </div>
          </div>

          {/* Instant Rate Telemetry Footer */}
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 flex items-center gap-1.5 font-sans">
              <span className={`w-2 h-2 rounded-full ${isTracking ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              Inhalation Velocity
            </span>
            <span className="text-slate-900 font-extrabold text-xs">
              {`${activeRate.toFixed(5)} μg/s`}
            </span>
          </div>

          {/* Explain My Exposure with Amazon Bedrock */}
          <div className="pt-2.5 mt-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onOpenAiAdvisor?.("explain")}
              className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>Explain My Exposure with Bedrock AI</span>
            </button>
          </div>
        </div>

        {/* Card 2: Micro-Environment Breakdown & Clean Air Shield */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-400" />
                Micro-Environment Breakdown
              </span>
              <Link
                href="/dashboard/simulate"
                className="text-xs text-[#0062ff] hover:underline font-bold flex items-center gap-0.5"
              >
                <span>Simulate</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3 my-2">
              {categories.map((cat) => {
                const percentage = Math.min(100, Math.round((cat.raw / totalSafe) * 100));
                return (
                  <div key={cat.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                        {cat.label}
                      </span>
                      <span className="text-slate-900 font-bold font-mono">
                        {cat.raw.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">μg</span>
                      </span>
                    </div>

                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                        className={`h-full rounded-full ${cat.color} transition-all duration-700`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clean Air Shield Banner */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Clean Air Shield:</span>
            </span>
            <span className="font-extrabold text-emerald-600 font-mono text-xs bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              {exposureData === null
                ? "Calculating..."
                : `+${Number(shieldSavedUg || 0).toFixed(1)} μg saved`}
            </span>
          </div>
        </div>

        {/* Card 3: Live Kinetic Variables & Geofence Radar */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-50 text-[#0062ff] flex items-center justify-center">
                  <Compass className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Live Kinetic Variables
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsFormulaModalOpen(true)}
                  title="View Formula & Kinetics"
                  className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-[#0062ff] border border-blue-200/60 flex items-center justify-center transition-all shadow-xs"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>

                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Radar
                </span>
              </div>
            </div>

            {/* 4 Variable Grid Tiles */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/90 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                  <span className="flex items-center gap-1 text-slate-700">
                    <Wind className="w-3 h-3 text-[#0062ff]" />
                    PM₂.₅
                  </span>
                  <span className="font-mono text-slate-400">μg/m³</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-sm font-black text-slate-900 font-mono">
                    {pm25Value.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium truncate ml-1">
                    Ambient
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/90 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                  <span className="flex items-center gap-1 text-slate-700">
                    <Layers className="w-3 h-3 text-emerald-600" />
                    I_f (Infil)
                  </span>
                  <span className="font-mono text-slate-400">Factor</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-sm font-black text-emerald-600 font-mono">
                    {infiltrationFactor.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium truncate ml-1">
                    {placeName}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/90 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                  <span className="flex items-center gap-1 text-slate-700">
                    <Activity className="w-3 h-3 text-purple-600" />
                    B_f (Exertion)
                  </span>
                  <span className="font-mono text-slate-400">
                    {autoModeActive ? "Auto" : "Manual"}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-sm font-black text-purple-600 font-mono">
                    {selectedBreathingFactor.toFixed(1)}×
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium truncate ml-1">
                    {autoModeActive ? `Auto (${autoDetectedLabel})` : "Manual Lock"}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/90 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                  <span className="flex items-center gap-1 text-slate-700">
                    <Zap className="w-3 h-3 text-amber-500" />
                    V_E (Tidal)
                  </span>
                  <span className="font-mono text-slate-400">6 L/min</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xs font-black text-amber-600 font-mono">
                    0.0001
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium truncate ml-1">
                    m³/s
                  </span>
                </div>
              </div>
            </div>

            {/* Geofence Proximity List */}
            <div className="space-y-1.5">
              {placesWithDist.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <p className="text-xs text-slate-500 font-medium">No saved places yet</p>
                  <Link
                    href="/dashboard/locations"
                    className="text-[11px] font-bold text-[#0062ff] hover:underline mt-1 inline-block"
                  >
                    + Add Home or Office
                  </Link>
                </div>
              ) : (
                placesWithDist.slice(0, 2).map((place) => {
                  const PlaceIcon = getPlaceIcon(place.location_type);
                  const isInside = place.distanceMeters !== null && place.distanceMeters <= (place.radius_meters || 100);

                  return (
                    <div
                      key={place.id}
                      className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center justify-between ${isInside
                        ? "bg-blue-50/70 border-blue-200/80 shadow-xs"
                        : "bg-slate-50/70 border-slate-100"
                        }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${getPlaceBadgeColor(
                            place.location_type
                          )}`}
                        >
                          <PlaceIcon className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate leading-none">{place.name}</p>
                          <p className="text-[9px] text-slate-400 capitalize font-medium mt-0.5">
                            {place.location_type} • {((1 - (place.indoor_coefficient ?? 0.5)) * 100).toFixed(0)}% shielded
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono ${isInside
                            ? "bg-[#0062ff] text-white shadow-xs"
                            : "bg-white text-slate-600 border border-slate-200"
                            }`}
                        >
                          {place.distanceMeters !== null
                            ? isInside
                              ? `Inside (${formatDistance(place.distanceMeters)})`
                              : formatDistance(place.distanceMeters)
                            : "Awaiting GPS"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer: Cache Status */}
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Pollution:</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {current?.cached_at_display ? `(${current.cached_at_display})` : timeAgoText}
              </span>
            </div>
            <span className="font-bold text-slate-900 font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${current?.is_cached ? "bg-blue-500" : "bg-emerald-500 animate-pulse"}`} />
              {current?.is_cached
                ? `Cached (${Math.max(1, Math.round((current.cache_expires_in_seconds ?? 1800) / 60))}m left)`
                : `Live Fetch`}
            </span>
          </div>
        </div>

      </div>


      {/* Formula & Live Calculation Breakdown Modal */}
      <ExposureFormulaModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
        calculatedLiveRate={calculatedLiveRate}
        activeRate={activeRate}
        pm25Value={pm25Value}
        infiltrationFactor={infiltrationFactor}
        selectedBreathingFactor={selectedBreathingFactor}
      />
    </div>
  );
}
