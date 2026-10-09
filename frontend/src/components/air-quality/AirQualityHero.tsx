"use client";

import React from "react";
import {
  Wind,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ArrowUpRight,
} from "lucide-react";
import { AirQualityData } from "@/lib/api";
import { getAqiCategory } from "@/lib/aqi";

interface AirQualityHeroProps {
  data: AirQualityData | null;
  loading: boolean;
}

export default function AirQualityHero({ data, loading }: AirQualityHeroProps) {
  if (loading || !data) {
    return (
      <div className="bg-white rounded-[26px] p-6 border border-slate-100 shadow-soft animate-pulse">
        <div className="h-5 w-48 bg-slate-100 rounded-full mb-4" />
        <div className="h-16 w-36 bg-slate-100 rounded-2xl mb-4" />
        <div className="h-4 w-full bg-slate-100 rounded-full mb-2" />
      </div>
    );
  }

  const { aqi } = data;
  const aqiInfo = getAqiCategory(aqi);

  return (
    <div className="bg-white rounded-[26px] p-6 sm:p-7 border border-slate-100 shadow-soft">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: AQI Number & Category */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-100 pb-5 lg:pb-0 lg:pr-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Live Air Quality Index
            </span>
            <span className="text-[11px] font-semibold text-slate-500 bg-[#f0f3f8] px-3 py-1 rounded-full">
              US-EPA Standard
            </span>
          </div>

          <div className="flex items-baseline gap-4 my-2">
            <div className="text-5xl sm:text-6xl font-black text-slate-900 font-mono tracking-tight">
              {aqi}
            </div>
            <div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${aqiInfo.badgeClass}`}>
                <span className={`w-2 h-2 rounded-full ${aqiInfo.dotClass}`} />
                {aqiInfo.category}
              </span>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Dominant: PM2.5 particles
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            {aqiInfo.description}
          </p>
        </div>

        {/* Right: Health Recommendation Pills */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Recommendation Box */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#0062ff] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-900">HEALTH RECOMMENDATION</h4>
              <p className="text-xs text-slate-600 mt-0.5">{aqiInfo.recommendation}</p>
            </div>
          </div>

          {/* Action Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className={`p-3 rounded-2xl border flex flex-col justify-between ${aqiInfo.mask_needed ? "bg-amber-50/70 border-amber-200 text-amber-900" : "bg-[#f0f3f8] border-slate-200 text-slate-600"}`}>
              <span className="text-[10px] font-bold uppercase text-slate-400">N95 Mask</span>
              <span className="font-bold text-xs mt-1">{aqiInfo.mask_needed ? "Required Outside" : "Optional"}</span>
            </div>

            <div className={`p-3 rounded-2xl border flex flex-col justify-between ${aqiInfo.purifier_needed ? "bg-blue-50/70 border-blue-200 text-blue-900" : "bg-[#f0f3f8] border-slate-200 text-slate-600"}`}>
              <span className="text-[10px] font-bold uppercase text-slate-400">Air Purifier</span>
              <span className="font-bold text-xs mt-1">{aqiInfo.purifier_needed ? "Run HEPA Filter" : "Standby"}</span>
            </div>

            <div className="p-3 rounded-2xl bg-[#f0f3f8] border border-slate-200 flex flex-col justify-between text-slate-700">
              <span className="text-[10px] font-bold uppercase text-slate-400">Outdoor Cardio</span>
              <span className="font-bold text-xs mt-1 text-rose-600">Avoid Exertion</span>
            </div>

            <div className="p-3 rounded-2xl bg-[#f0f3f8] border border-slate-200 flex flex-col justify-between text-slate-700">
              <span className="text-[10px] font-bold uppercase text-slate-400">Windows</span>
              <span className="font-bold text-xs mt-1 text-slate-900">Keep Sealed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
