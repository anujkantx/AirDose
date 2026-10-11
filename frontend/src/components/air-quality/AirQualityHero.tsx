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
import Link from "next/link";
import { AirQualityData } from "@/lib/api";
import { getAqiCategory } from "@/lib/aqi";

interface AirQualityHeroProps {
  data: AirQualityData | null;
  loading: boolean;
}

export default function AirQualityHero({ data, loading }: AirQualityHeroProps) {
  if (loading || !data) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft animate-pulse">
        <div className="h-5 w-48 bg-slate-100 rounded-full mb-4" />
        <div className="h-16 w-36 bg-slate-100 rounded-2xl mb-4" />
        <div className="h-4 w-full bg-slate-100 rounded-full mb-2" />
      </div>
    );
  }

  const { aqi } = data;
  const aqiInfo = getAqiCategory(aqi);
  const aqiDisplay = typeof aqi === "number" && !isNaN(aqi) ? aqi : "--";
  const dominantName = data.dominant_pollutant || "PM2.5 particles";

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-soft">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: AQI Number & Category */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-100 pb-5 lg:pb-0 lg:pr-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Live Air Quality Index
            </span>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
              US-EPA Standard
            </span>
          </div>

          <div className="flex items-baseline gap-4 my-2">
            <div className="text-5xl sm:text-6xl font-black text-slate-900 font-mono tracking-tight">
              {aqiDisplay}
            </div>
            <div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${aqiInfo.badgeClass}`}>
                <span className={`w-2 h-2 rounded-full ${aqiInfo.dotClass}`} />
                {aqiInfo.category}
              </span>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Dominant: {dominantName}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 mt-3 leading-relaxed">
            {aqiInfo.description}
          </p>
        </div>

        {/* Right: Health Recommendation Pills */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Recommendation Box */}
          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-blue-900">HEALTH RECOMMENDATION</h4>
              <p className="text-xs text-slate-700 mt-0.5">{aqiInfo.recommendation}</p>
            </div>
          </div>

          {/* Action Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className={`p-3 rounded-2xl border flex flex-col justify-between ${aqiInfo.mask_needed ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
              <span className="text-[10px] font-bold uppercase text-slate-500">N95 Mask</span>
              <span className="font-bold text-xs mt-1">{aqiInfo.mask_needed ? "Required Outside" : "Optional"}</span>
            </div>

            <div className={`p-3 rounded-2xl border flex flex-col justify-between ${aqiInfo.purifier_needed ? "bg-blue-50 border-blue-200 text-blue-900" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
              <span className="text-[10px] font-bold uppercase text-slate-500">Air Purifier</span>
              <span className="font-bold text-xs mt-1">{aqiInfo.purifier_needed ? "Run HEPA Filter" : "Standby"}</span>
            </div>

            <div className={`p-3 rounded-2xl border flex flex-col justify-between ${aqiInfo.cardio_warning ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
              <span className="text-[10px] font-bold uppercase text-slate-500">Outdoor Cardio</span>
              <span className={`font-bold text-xs mt-1 ${aqiInfo.cardio_warning ? "text-rose-600" : "text-emerald-700"}`}>{aqiInfo.cardio_advice}</span>
            </div>

            <div className={`p-3 rounded-2xl border flex flex-col justify-between ${aqiInfo.windows_warning ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
              <span className="text-[10px] font-bold uppercase text-slate-500">Windows</span>
              <span className={`font-bold text-xs mt-1 ${aqiInfo.windows_warning ? "text-amber-800" : "text-emerald-700"}`}>{aqiInfo.windows_advice}</span>
            </div>
          </div>

          {/* Quick Commute / Route Simulator Action */}
          <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-100">
            <span className="text-slate-500 font-medium">Planning outdoor transit or a commute in current air?</span>
            <Link
              href="/dashboard/simulate"
              className="inline-flex items-center gap-1 font-bold text-[#0062ff] hover:text-blue-700 hover:underline transition-colors shrink-0"
            >
              Simulate Route Exposure <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
