"use client";

import React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Wind,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Heart,
  Activity,
  Layers,
} from "lucide-react";
import { AirQualityData, TodayExposureData } from "@/lib/api";

interface CleanAirAdvisoryCardProps {
  airData: AirQualityData | null;
  exposureData: TodayExposureData | null;
}

export default function CleanAirAdvisoryCard({
  airData,
  exposureData,
}: CleanAirAdvisoryCardProps) {
  const pm25Val =
    airData?.pollutants?.pm25?.value ??
    exposureData?.current?.pm25 ??
    65.0;

  const currentEnv = exposureData?.current?.environment?.toUpperCase() || "OUTDOOR";
  const infiltration = exposureData?.current?.infiltration_factor ?? 1.0;
  const whoPct = exposureData?.who_percentage || Math.round((((exposureData?.total_exposure_ug || 0) / 25.0) * 100));

  // Determine customized actionable health advisories
  const maskNeeded = pm25Val > 55 || currentEnv === "OUTDOOR" && pm25Val > 35;
  const purifierNeeded = infiltration > 0.45 && pm25Val > 35;
  const windowsAdvice = pm25Val > 50 ? "Keep windows closed" : "Safe to ventilate briefly";
  const exerciseAdvice = pm25Val > 100 ? "Indoor rest only" : pm25Val > 55 ? "Light indoor workout" : "Outdoor exercise permitted";

  return (
    <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-soft flex flex-col justify-between min-w-0">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Clean Air Health Advisory
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h3>
            <p className="text-xs text-slate-400">
              Personalized micro-actions based on current inhalation dose
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0062ff] flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        {/* Advisory List */}
        <div className="space-y-3 my-2">
          {/* Mask Advisory */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100/90">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  maskNeeded
                    ? "bg-rose-100 text-rose-600"
                    : "bg-emerald-100 text-emerald-600"
                }`}
              >
                {maskNeeded ? (
                  <ShieldAlert className="w-4 h-4" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">
                  {maskNeeded ? "N95 / FFP2 Mask Recommended" : "Unmasked Outdoor Safe"}
                </div>
                <div className="text-[10px] text-slate-400">
                  {maskNeeded ? "Ambient particulate above healthy filtration cap" : "Low outdoor ambient risk"}
                </div>
              </div>
            </div>
            <span
              className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                maskNeeded
                  ? "bg-rose-50 text-rose-600 border border-rose-200"
                  : "bg-emerald-50 text-emerald-600 border border-emerald-200"
              }`}
            >
              {maskNeeded ? "Action" : "Clear"}
            </span>
          </div>

          {/* Ventilation / Window Advice */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100/90">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-blue-100 text-[#0062ff] flex items-center justify-center shrink-0">
                <Wind className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">{windowsAdvice}</div>
                <div className="text-[10px] text-slate-400">
                  {currentEnv === "OUTDOOR" ? "Switch car to recirculation" : `Current infiltration at ${(infiltration * 100).toFixed(0)}%`}
                </div>
              </div>
            </div>
            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-[#0062ff] border border-blue-200">
              Indoor
            </span>
          </div>

          {/* Exercise / Exertion Guidance */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100/90">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">{exerciseAdvice}</div>
                <div className="text-[10px] text-slate-400">
                  High exertion increases lung particulate uptake by 3.5×
                </div>
              </div>
            </div>
            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
              Activity
            </span>
          </div>
        </div>
      </div>

      {/* Footer Benchmark */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Current Respiratory Risk:</span>
        <span
          className={`font-extrabold font-mono text-xs px-2.5 py-0.5 rounded-full ${
            whoPct > 100
              ? "bg-rose-100 text-rose-700"
              : whoPct > 60
              ? "bg-amber-100 text-amber-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {whoPct > 100 ? "ELEVATED DOSE" : whoPct > 60 ? "MODERATE DOSE" : "OPTIMAL SHIELD"}
        </span>
      </div>
    </div>
  );
}
