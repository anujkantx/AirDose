"use client";

import React from "react";
import {
  CloudFog,
  Layers,
  Flame,
  Zap,
  Activity,
  Droplets,
} from "lucide-react";
import { AirQualityData, PollutantDetail } from "@/lib/api";

interface PollutantGridProps {
  data: AirQualityData | null;
  loading: boolean;
}

interface PollutantConfig {
  key: string;
  name: string;
  chemical: string;
  description: string;
  safeLimit: number;
  icon: any;
  color: string;
  bgColor: string;
}

const POLLUTANTS_CONFIG: PollutantConfig[] = [
  {
    key: "pm25",
    name: "Fine Particulate",
    chemical: "PM2.5",
    description: "Alveolar particles ≤2.5µm",
    safeLimit: 15.0,
    icon: CloudFog,
    color: "text-amber-400",
    bgColor: "bg-amber-500/15",
  },
  {
    key: "pm10",
    name: "Coarse Dust",
    chemical: "PM10",
    description: "Inhalable dust ≤10µm",
    safeLimit: 45.0,
    icon: Layers,
    color: "text-orange-400",
    bgColor: "bg-orange-500/15",
  },
  {
    key: "no2",
    name: "Nitrogen Dioxide",
    chemical: "NO₂",
    description: "Combustion gas",
    safeLimit: 25.0,
    icon: Flame,
    color: "text-rose-400",
    bgColor: "bg-rose-500/15",
  },
  {
    key: "o3",
    name: "Ground Ozone",
    chemical: "O₃",
    description: "Photochemical oxidant",
    safeLimit: 60.0,
    icon: Zap,
    color: "text-purple-400",
    bgColor: "bg-purple-500/15",
  },
  {
    key: "co",
    name: "Carbon Monoxide",
    chemical: "CO",
    description: "Vehicle emissions",
    safeLimit: 4.0,
    icon: Activity,
    color: "text-blue-400",
    bgColor: "bg-blue-500/15",
  },
  {
    key: "so2",
    name: "Sulfur Dioxide",
    chemical: "SO₂",
    description: "Power plant gas",
    safeLimit: 20.0,
    icon: Droplets,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15",
  },
];

export default function PollutantGrid({ data, loading }: PollutantGridProps) {

  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 bg-white rounded-[24px] border border-slate-200" />
        ))}
      </div>
    );
  }

  const pollutants = data.pollutants || {};

  const getLimitTheme = (percent: number | null) => {
    if (percent === null) {
      return {
        stroke: "stroke-slate-200",
        text: "text-slate-400",
        bg: "bg-slate-50",
        border: "border-slate-200",
        badge: "bg-slate-50 text-slate-500 border-slate-200",
        label: "N/A",
      };
    }
    if (percent <= 50) {
      return {
        stroke: "stroke-emerald-500",
        text: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "Safe",
      };
    }
    if (percent <= 100) {
      return {
        stroke: "stroke-blue-500",
        text: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        label: "Normal",
      };
    }
    if (percent <= 150) {
      return {
        stroke: "stroke-amber-500",
        text: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        label: "Elevated",
      };
    }
    return {
      stroke: "stroke-rose-500",
      text: "text-rose-600",
      bg: "bg-rose-50",
      border: "border-rose-200",
      badge: "bg-rose-50 text-rose-700 border-rose-200",
      label: "Exceeded",
    };
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 px-4 bg-white rounded-2xl border border-slate-200/80 shadow-soft">
        <div className="flex items-center gap-2.5 text-left">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Secondary Criteria Pollutants
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                6 Sensors
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Ground readings for PM₁₀, NO₂, O₃, CO, SO₂ &amp; EPA safe limit utilization
            </p>
          </div>
        </div>

        {/* Time-Bound Spatio-Temporal Cache Info Badge */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-[11px] font-mono font-semibold text-slate-700 bg-slate-50 border border-slate-200/80 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${data.is_cached ? "bg-blue-500" : "bg-emerald-500 animate-pulse"}`} />
            <span>
              {data.is_cached
                ? `Cached (${data.cache_distance_meters ? `${data.cache_distance_meters}m` : "<1km"})`
                : `Live Fetch (${data.fetched_at_display || "Just now"})`}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              TTL: {Math.max(1, Math.round((data.cache_expires_in_seconds ?? 1800) / 60))}m
            </span>
          </span>
        </div>
      </div>

      {/* 6 Sensors Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-0.5">
        {POLLUTANTS_CONFIG.map((item) => {
          const detail: PollutantDetail | undefined = pollutants[item.key];
          const rawValue = detail?.value;
          const hasValue = rawValue !== null && rawValue !== undefined;
          const displayValue = hasValue ? rawValue : "--";
          const unit = detail?.unit || "µg/m³";
          const Icon = item.icon;

          // Calculate Percentage of Safe Limit
          const percentOfLimit = hasValue
            ? Math.round((Number(rawValue) / item.safeLimit) * 100)
            : null;

          const theme = getLimitTheme(percentOfLimit);

          // SVG Circle Gauge Parameters (Enlarged)
          const radius = 20;
          const circumference = 2 * Math.PI * radius;
          const visualPercent = percentOfLimit !== null ? Math.min(100, Math.max(0, percentOfLimit)) : 0;
          const strokeDashoffset = circumference - (visualPercent / 100) * circumference;

          return (
            <div
              key={item.key}
              className="p-4 rounded-[24px] bg-white border border-slate-200/80 shadow-soft hover:border-slate-300 transition-all flex flex-col justify-between relative group"
            >
              {/* Header: Icon & Circular Progress Percentage Ring */}
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-xl ${item.bgColor} ${item.color} border border-slate-100 flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Circular Percentage Ring */}
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                    {/* Background Circle */}
                    <circle
                      cx="24"
                      cy="24"
                      r={radius}
                      className="stroke-slate-100"
                      strokeWidth="3.5"
                      fill="transparent"
                    />
                    {/* Active Progress Circle */}
                    <circle
                      cx="24"
                      cy="24"
                      r={radius}
                      className={`${theme.stroke} transition-all duration-700 ease-out`}
                      strokeWidth="3.5"
                      strokeDasharray={circumference}
                      strokeDashoffset={hasValue ? strokeDashoffset : circumference}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>

                  {/* Percentage in Circle Center */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className={`text-[11px] font-black font-mono leading-none ${theme.text}`}>
                      {percentOfLimit !== null ? `${percentOfLimit}%` : "--"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Measurement Value */}
              <div className="my-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
                    {displayValue}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium truncate">
                    {unit}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-800 mt-0.5">
                  {item.chemical} • <span className="text-slate-500 font-normal">{item.name}</span>
                </div>
              </div>

              {/* Footer: Safe Limit & Status Badge */}
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">
                  Limit <span className="font-mono font-bold text-slate-700">{item.safeLimit}</span>
                </span>

                <span
                  className={`px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono ${theme.badge}`}
                >
                  {theme.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
