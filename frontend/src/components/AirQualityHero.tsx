"use client";

import React from "react";
import {
  Wind,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  Gauge,
  Radio,
  Eye,
} from "lucide-react";
import { AirQualityData } from "@/lib/api";

interface AirQualityHeroProps {
  data: AirQualityData | null;
  loading: boolean;
}

export default function AirQualityHero({ data, loading }: AirQualityHeroProps) {
  if (loading || !data) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 animate-pulse">
        <div className="h-6 w-48 bg-slate-800 rounded-lg mb-4" />
        <div className="h-24 w-36 bg-slate-800 rounded-2xl mb-4" />
        <div className="h-4 w-full bg-slate-800 rounded mb-2" />
        <div className="h-4 w-2/3 bg-slate-800 rounded" />
      </div>
    );
  }

  const { aqi, category, color, description, recommendation, mask_needed, purifier_needed, pollutants, station } = data;

  // Compute AQI circle progress percentage (max 500)
  const aqiPercentage = Math.min(100, Math.round((aqi / 350) * 100));

  const getAQIGradient = () => {
    if (aqi <= 50) return "from-emerald-500/20 via-slate-900/90 to-slate-900/80 border-emerald-500/30";
    if (aqi <= 100) return "from-amber-500/20 via-slate-900/90 to-slate-900/80 border-amber-500/30";
    if (aqi <= 150) return "from-orange-500/20 via-slate-900/90 to-slate-900/80 border-orange-500/30";
    if (aqi <= 200) return "from-rose-500/20 via-slate-900/90 to-slate-900/80 border-rose-500/30";
    if (aqi <= 300) return "from-purple-500/20 via-slate-900/90 to-slate-900/80 border-purple-500/30";
    return "from-red-950/40 via-slate-900/90 to-slate-900/80 border-red-800/40";
  };

  const getAqiGlow = () => {
    if (aqi <= 50) return "text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.3)]";
    if (aqi <= 100) return "text-yellow-400 drop-shadow-[0_0_25px_rgba(234,179,8,0.3)]";
    if (aqi <= 150) return "text-orange-400 drop-shadow-[0_0_25px_rgba(249,115,22,0.3)]";
    if (aqi <= 200) return "text-rose-400 drop-shadow-[0_0_25px_rgba(244,63,94,0.3)]";
    if (aqi <= 300) return "text-purple-400 drop-shadow-[0_0_25px_rgba(168,85,247,0.3)]";
    return "text-red-400 drop-shadow-[0_0_25px_rgba(239,68,68,0.3)]";
  };

  return (
    <div
      className={`bg-gradient-to-br ${getAQIGradient()} border rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden transition-all shadow-xl`}
    >
      {/* Background ambient decorative aura */}
      <div
        className="absolute -right-16 -top-16 w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ backgroundColor: color }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Column: Big AQI Gauge & Category */}
        <div className="lg:col-span-5 flex flex-col items-center sm:items-start text-center sm:text-left border-b lg:border-b-0 lg:border-r border-slate-800/80 pb-6 lg:pb-0 lg:pr-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
              OpenAQ Live Telemetry
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
              EPA Standard
            </span>
          </div>

          {/* AQI Score */}
          <div className="flex items-baseline gap-4 my-1">
            <span className={`text-6xl sm:text-7xl font-extrabold font-mono tracking-tighter ${getAqiGlow()}`}>
              {aqi}
            </span>
            <div className="text-left">
              <span className="text-xs uppercase font-bold text-slate-400 block tracking-widest">
                US AQI
              </span>
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full border inline-block mt-1"
                style={{
                  color: color,
                  borderColor: `${color}40`,
                  backgroundColor: `${color}15`,
                }}
              >
                {category}
              </span>
            </div>
          </div>

          {/* AQI Spectrum Range Bar */}
          <div className="w-full mt-4 space-y-1.5 max-w-sm">
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 flex">
              <div className="h-full w-[14%] bg-emerald-400 rounded-l-full" title="Good (0-50)" />
              <div className="h-full w-[14%] bg-yellow-400" title="Moderate (51-100)" />
              <div className="h-full w-[14%] bg-orange-400" title="Sensitive (101-150)" />
              <div className="h-full w-[18%] bg-rose-500" title="Unhealthy (151-200)" />
              <div className="h-full w-[20%] bg-purple-500" title="Very Unhealthy (201-300)" />
              <div className="h-full w-[20%] bg-red-900 rounded-r-full" title="Hazardous (300+)" />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0 (Good)</span>
              <span>100</span>
              <span>200</span>
              <span>300+ (Hazardous)</span>
            </div>
          </div>

          {/* Primary PM2.5 Readout */}
          <div className="mt-4 pt-4 border-t border-slate-800/60 w-full flex items-center justify-between text-xs">
            <span className="text-slate-400">Dominant Pollutant:</span>
            <span className="font-mono font-semibold text-white">
              PM2.5 ({pollutants?.pm25?.value ?? "N/A"} {pollutants?.pm25?.unit || "µg/m³"})
            </span>
          </div>
        </div>

        {/* Right Column: Health Impact & Actionable Advice */}
        <div className="lg:col-span-7 space-y-5">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-base mb-1">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3>Health Impact &amp; Environmental Status</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
          </div>

          {/* Recommendation Box */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-white">Smart Action Recommendation</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{recommendation}</p>
              </div>
            </div>

            {/* Practical Icons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/60 text-[11px]">
              <div className={`p-2 rounded-xl flex items-center gap-2 border ${mask_needed ? "bg-rose-500/10 border-rose-500/20 text-rose-300" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"}`}>
                {mask_needed ? <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> : <ShieldCheck className="w-3.5 h-3.5 shrink-0" />}
                <span>{mask_needed ? "N95 Mask Needed" : "No Mask Needed"}</span>
              </div>

              <div className={`p-2 rounded-xl flex items-center gap-2 border ${purifier_needed ? "bg-rose-500/10 border-rose-500/20 text-rose-300" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"}`}>
                <Wind className="w-3.5 h-3.5 shrink-0" />
                <span>{purifier_needed ? "Run Air Purifier" : "Windows OK"}</span>
              </div>

              <div className="p-2 rounded-xl flex items-center gap-2 border bg-slate-900/80 border-slate-800 text-slate-300 col-span-2 sm:col-span-1">
                <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{station?.distance_km}km from Station</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
