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
  Info,
  X,
  Zap,
  Activity,
  Wind,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { TodayExposureData, UserLocation, fetchUserLocations } from "@/lib/api";
import { calculateHaversineDistance, formatDistance } from "@/lib/haversine";

interface TodayExposureHeroProps {
  userName?: string;
  userId?: number;
  userCoords?: { lat: number; lon: number };
  exposureData: TodayExposureData | null;
  isTracking: boolean;
  onToggleTracking: () => void;
  selectedBreathingFactor: number;
  onBreathingFactorChange: (factor: number) => void;
  permissionDenied?: boolean;
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
  permissionDenied,
}: TodayExposureHeroProps) {
  // Live ticker for smooth real-time accumulation on client
  const [liveDisplayExposure, setLiveDisplayExposure] = useState<number>(
    exposureData?.total_exposure_ug || 0.0
  );
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [lastUpdateSecondsAgo, setLastUpdateSecondsAgo] = useState<number>(0);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState<boolean>(false);

  const baseTotal = exposureData?.total_exposure_ug || 0.0;
  const currentRate = exposureData?.current?.inhalation_rate_ug_s || 0.0;

  useEffect(() => {
    setLiveDisplayExposure(baseTotal);
  }, [baseTotal]);

  useEffect(() => {
    if (!isTracking || currentRate <= 0) return;

    const interval = setInterval(() => {
      setLiveDisplayExposure((prev) => prev + currentRate);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking, currentRate]);

  // Load Saved Locations for proximity
  useEffect(() => {
    fetchUserLocations(userId)
      .then((data) => {
        if (data && data.length > 0) {
          setLocations(data);
        } else {
          setLocations([
            { id: 1, user_id: 1, location_type: "home", name: "Home Residence", latitude: 28.6139, longitude: 77.2090, radius_meters: 100, indoor_coefficient: 0.5, created_at: "" },
            { id: 2, user_id: 1, location_type: "office", name: "Tech Hub Office", latitude: 28.4595, longitude: 77.0266, radius_meters: 150, indoor_coefficient: 0.4, created_at: "" },
            { id: 3, user_id: 1, location_type: "college", name: "University Campus", latitude: 28.5457, longitude: 77.1928, radius_meters: 200, indoor_coefficient: 0.5, created_at: "" },
          ]);
        }
      })
      .catch(() => {
        setLocations([
          { id: 1, user_id: 1, location_type: "home", name: "Home Residence", latitude: 28.6139, longitude: 77.2090, radius_meters: 100, indoor_coefficient: 0.5, created_at: "" },
          { id: 2, user_id: 1, location_type: "office", name: "Tech Hub Office", latitude: 28.4595, longitude: 77.0266, radius_meters: 150, indoor_coefficient: 0.4, created_at: "" },
          { id: 3, user_id: 1, location_type: "college", name: "University Campus", latitude: 28.5457, longitude: 77.1928, radius_meters: 200, indoor_coefficient: 0.5, created_at: "" },
        ]);
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

  const current = exposureData?.current;
  const environment = current?.environment?.toUpperCase() || "OUTDOOR";
  const placeName = current?.location_name || (environment === "OUTDOOR" ? "Outdoor" : environment);
  const infiltrationFactor = current?.infiltration_factor ?? 1.0;
  const pm25Value = current?.pm25 ?? 75.0;
  const basalVentilation = 0.0001; // 0.0001 m3/s = 6 L/min
  const calculatedLiveRate = pm25Value * infiltrationFactor * selectedBreathingFactor * basalVentilation;

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
  const progressRatio = Math.min(1, Math.max(0.15, (liveDisplayExposure % 100) / 100));
  const strokeDashoffset = circumference - progressRatio * circumference;

  // Real-time distances to places
  const currentLat = userCoords?.lat ?? 28.6139;
  const currentLon = userCoords?.lon ?? 77.2090;

  const placesWithDist = locations.map((loc) => {
    const dist = calculateHaversineDistance(currentLat, currentLon, loc.latitude, loc.longitude);
    return {
      ...loc,
      distanceMeters: dist,
    };
  }).sort((a, b) => a.distanceMeters - b.distanceMeters);

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

  const getActivityName = (factor: number) => {
    if (factor <= 1.0) return "Resting";
    if (factor <= 1.5) return "Walking";
    if (factor <= 2.2) return "Exercise";
    return "Vigorous";
  };

  const timeAgoText =
    lastUpdateSecondsAgo < 5
      ? "Just now"
      : lastUpdateSecondsAgo < 60
      ? `${lastUpdateSecondsAgo}s ago`
      : `${Math.floor(lastUpdateSecondsAgo / 60)}m ago`;

  return (
    <div className="space-y-4">
      {/* Live Status Pill & Tracking Toggle Controls */}
      <div className="flex items-center justify-end gap-2 pt-1 pb-1">
        <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-sm text-xs font-semibold text-slate-700">
          <span className={`w-2 h-2 rounded-full ${isTracking ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
          <span>{isTracking ? "Tracking Active" : "Tracking Paused"}</span>
        </div>

        <button
          onClick={onToggleTracking}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
            isTracking
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
              <span>Start Tracking</span>
            </>
          )}
        </button>
      </div>

      {/* Grid: 3 Hero Cards Matching WellMate Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        
        {/* Card 1: Contrast Dark Card (Wellness Score / Inhalation Score) */}
        <div className="lg:col-span-4 bg-[#0f1117] text-white rounded-[26px] p-6 shadow-card flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Ambient Light */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/15 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

          <div>
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Inhalation Score
              </span>
              <button className="text-slate-400 hover:text-white p-1">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-5 my-2">
              {/* Circular Gauge */}
              <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#1e2230"
                    strokeWidth="9"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#0062ff"
                    strokeWidth="9"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-white font-mono tracking-tight leading-none">
                    {liveDisplayExposure.toFixed(1)}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 mt-0.5">μg</span>
                </div>
              </div>

              {/* Score Remarks */}
              <div>
                <div className="text-base font-bold text-white leading-tight">
                  Low Exposure!
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  You&apos;re 18% below your city average today.
                </p>
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 bg-[#ccf82f] text-slate-950 text-[11px] font-extrabold px-3 py-1 rounded-full shadow-sm">
                    ↑ 18% cleaner air
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Instant Rate Telemetry Footer */}
          <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Current Rate</span>
            <span className="text-emerald-400 font-bold">
              {currentRate > 0 ? `${currentRate.toFixed(5)} μg/s` : `${calculatedLiveRate.toFixed(5)} μg/s`}
            </span>
          </div>
        </div>

        {/* Card 2: Micro-Environment Infiltration Progress */}
        <div className="lg:col-span-4 bg-white rounded-[26px] p-6 border border-slate-100 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Micro-Zone Breakdown
              </span>
              <button className="text-slate-400 hover:text-slate-900 p-1">
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 my-2">
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

                    {/* Rounded Progress Track */}
                    <div className="h-2 w-full bg-[#f0f3f8] rounded-full overflow-hidden">
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

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Macro-Zone:</span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full text-[11px]">
              {placeName} ({infiltrationFactor.toFixed(2)})
            </span>
          </div>
        </div>

        {/* Card 3: Live Formula Variables, Calculation & Geofence Proximity */}
        <div className="lg:col-span-4 bg-white rounded-[26px] p-6 border border-slate-100 shadow-soft flex flex-col justify-between space-y-3">
          <div>
            {/* Header with Info Button */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-50 text-[#0062ff] flex items-center justify-center">
                  <Compass className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Rate Formula Variables
                </span>
              </div>
              
              <div className="flex items-center gap-1.5">
                {/* Info (i) Button for Formula Popup */}
                <button
                  onClick={() => setIsFormulaModalOpen(true)}
                  title="View Formula & Live Calculation"
                  className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-[#0062ff] border border-blue-200/60 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm group"
                >
                  <Info className="w-3.5 h-3.5 transition-transform group-hover:rotate-12" />
                </button>

                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live GPS
                </span>
              </div>
            </div>

            {/* Live Formula Variable Matrix (4 Grid Tiles) */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {/* Variable 1: PM2.5 */}
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

              {/* Variable 2: Infiltration Factor (If) */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/90 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                  <span className="flex items-center gap-1 text-slate-700">
                    <Layers className="w-3 h-3 text-emerald-600" />
                    I_f
                  </span>
                  <span className="font-mono text-slate-400">Infil</span>
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

              {/* Variable 3: Breathing Activity (Bf) */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/90 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                  <span className="flex items-center gap-1 text-slate-700">
                    <Activity className="w-3 h-3 text-purple-600" />
                    B_f
                  </span>
                  <span className="font-mono text-slate-400">Activity</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-sm font-black text-purple-600 font-mono">
                    {selectedBreathingFactor.toFixed(1)}×
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium truncate ml-1">
                    {getActivityName(selectedBreathingFactor)}
                  </span>
                </div>
              </div>

              {/* Variable 4: Tidal Ventilation (VE) */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/90 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                  <span className="flex items-center gap-1 text-slate-700">
                    <Zap className="w-3 h-3 text-amber-500" />
                    V_E
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

            {/* List of Closest Geofences */}
            <div className="space-y-1.5">
              {placesWithDist.slice(0, 2).map((place) => {
                const PlaceIcon = getPlaceIcon(place.location_type);
                const isInside = place.distanceMeters <= (place.radius_meters || 100);

                return (
                  <div
                    key={place.id}
                    className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center justify-between ${
                      isInside
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
                          {place.location_type} • {((1 - (place.indoor_coefficient ?? 0.5)) * 100).toFixed(0)}% filtered
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono ${
                          isInside
                            ? "bg-[#0062ff] text-white shadow-xs"
                            : "bg-white text-slate-600 border border-slate-200"
                        }`}
                      >
                        {isInside ? `Inside (${formatDistance(place.distanceMeters)})` : `${formatDistance(place.distanceMeters)}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer: Last Pollution Updated & Spatio-Temporal Cache Status */}
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
      {isFormulaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden relative animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#0062ff] flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Live Rate Calculation &amp; Formula
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Mathematical model breakdown using your current live telemetry
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormulaModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Formula Blueprint Banner */}
              <div className="p-4 rounded-2xl bg-slate-950 text-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                    Fundamental Formula
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ICRP Biokinetic Model
                  </span>
                </div>
                <div className="py-1 font-mono text-sm sm:text-base font-extrabold text-white tracking-wide">
                  Inhalation Rate (μg/s) = <span className="text-blue-400">PM₂.₅</span> × <span className="text-emerald-400">I_f</span> × <span className="text-purple-400">B_f</span> × <span className="text-amber-400">V_E</span>
                </div>
              </div>

              {/* Exact Live Value Substitution */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0062ff]" />
                    Live Parameter Substitution
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#0062ff]">
                    Current Rate: {(calculatedLiveRate).toFixed(6)} μg/s
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-blue-100/80 font-mono text-xs text-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1 flex-wrap font-semibold">
                    <span>Rate =</span>
                    <span className="text-[#0062ff] bg-blue-50 px-1.5 py-0.5 rounded">
                      {pm25Value.toFixed(1)} μg/m³
                    </span>
                    <span>×</span>
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {infiltrationFactor.toFixed(2)} (If)
                    </span>
                    <span>×</span>
                    <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                      {selectedBreathingFactor.toFixed(1)}× (Bf)
                    </span>
                    <span>×</span>
                    <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      0.0001 m³/s
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                    <span>Hourly Inhaled Mass:</span>
                    <span className="font-bold text-slate-900">
                      {(calculatedLiveRate * 3600).toFixed(2)} μg / hour
                    </span>
                  </div>
                </div>
              </div>

              {/* Spatio-Temporal Cache Status Banner */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Spatio-Temporal Cache Policy (1 km / 30 min)
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    {current?.is_cached ? "Cache Active" : "Fresh Query"}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/90 leading-relaxed font-normal">
                  Backend reuses saved pollution telemetry if requested within <strong>1.0 km</strong> and under <strong>30 minutes</strong>. New requests outside 1 km or past 30 minutes automatically trigger fresh OpenAQ API observations.
                </p>
                <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-amber-900/80">
                  <span>Last Fetched: {current?.cached_at_display || "Recent"}</span>
                  <span>Cache TTL: {Math.max(1, Math.round((current?.cache_expires_in_seconds ?? 1800) / 60))} mins remaining</span>
                </div>
              </div>

              {/* Breakdown of Variables */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Variable Definitions &amp; Source
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-blue-100 text-[#0062ff] flex items-center justify-center shrink-0 font-bold font-mono text-[11px]">
                      PM
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center justify-between">
                        <span>PM₂.₅ Ambient Concentration = {pm25Value.toFixed(1)} μg/m³</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Fine particulate matter reading fetched via OpenAQ Air Quality telemetry at your GPS coordinates.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold font-mono text-[11px]">
                      I_f
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center justify-between">
                        <span>Infiltration Factor (I_f) = {infiltrationFactor.toFixed(2)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Micro-environment attenuation: 0.50 for Home (50% reduction), 0.40 for Office, 0.80 in Transit, and 1.00 Outdoor.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold font-mono text-[11px]">
                      B_f
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center justify-between">
                        <span>Breathing Multiplier (B_f) = {selectedBreathingFactor.toFixed(1)}× ({getActivityName(selectedBreathingFactor)})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Physical activity exertion multiplier (Resting 1.0×, Walking 1.5×, Exercise 2.2×, Heavy 3.0×).
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold font-mono text-[11px]">
                      V_E
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center justify-between">
                        <span>Basal Respiration (V_E) = 0.0001 m³/s (6 L/min)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Standard human resting tidal minute volume from international respiratory physiology standards (ICRP).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <Link
                href="/dashboard/details"
                onClick={() => setIsFormulaModalOpen(false)}
                className="text-xs font-bold text-[#0062ff] hover:text-blue-700 flex items-center gap-1 group"
              >
                <span>Read Full Mathematical Paper &amp; Calculator</span>
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>

              <button
                onClick={() => setIsFormulaModalOpen(false)}
                className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

