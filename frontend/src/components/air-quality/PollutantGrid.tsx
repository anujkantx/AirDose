"use client";

import React from "react";
import {
  CloudFog,
  Layers,
  Flame,
  Zap,
  Activity,
  Droplets,
  ShieldCheck,
  AlertTriangle,
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
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    key: "pm10",
    name: "Coarse Dust",
    chemical: "PM10",
    description: "Inhalable dust ≤10µm",
    safeLimit: 45.0,
    icon: Layers,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    key: "no2",
    name: "Nitrogen Dioxide",
    chemical: "NO₂",
    description: "Combustion gas",
    safeLimit: 25.0,
    icon: Flame,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
  },
  {
    key: "o3",
    name: "Ground Ozone",
    chemical: "O₃",
    description: "Photochemical oxidant",
    safeLimit: 60.0,
    icon: Zap,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    key: "co",
    name: "Carbon Monoxide",
    chemical: "CO",
    description: "Vehicle emissions",
    safeLimit: 4.0,
    icon: Activity,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    key: "so2",
    name: "Sulfur Dioxide",
    chemical: "SO₂",
    description: "Power plant gas",
    safeLimit: 20.0,
    icon: Droplets,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
];

export default function PollutantGrid({ data, loading }: PollutantGridProps) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 bg-white rounded-[24px] border border-slate-100" />
        ))}
      </div>
    );
  }

  const pollutants = data.pollutants || {};

  const getLimitTheme = (percent: number | null) => {
    if (percent === null) {
      return {
        stroke: "stroke-slate-300",
        text: "text-slate-400",
        bg: "bg-slate-50",
        border: "border-slate-100",
        badge: "bg-slate-100 text-slate-500",
        label: "N/A",
      };
    }
    if (percent <= 50) {
      return {
        stroke: "stroke-emerald-500",
        text: "text-emerald-600",
        bg: "bg-emerald-50/70",
        border: "border-emerald-100",
        badge: "bg-emerald-50 text-emerald-600 border-emerald-100",
        label: "Safe",
      };
    }
    if (percent <= 100) {
      return {
        stroke: "stroke-[#0062ff]",
        text: "text-[#0062ff]",
        bg: "bg-blue-50/70",
        border: "border-blue-100",
        badge: "bg-blue-50 text-[#0062ff] border-blue-100",
        label: "Normal",
      };
    }
    if (percent <= 150) {
      return {
        stroke: "stroke-amber-500",
        text: "text-amber-600",
        bg: "bg-amber-50/70",
        border: "border-amber-100",
        badge: "bg-amber-50 text-amber-600 border-amber-100",
        label: "Elevated",
      };
    }
    return {
      stroke: "stroke-rose-500",
      text: "text-rose-600",
      bg: "bg-rose-50/70",
      border: "border-rose-100",
      badge: "bg-rose-50 text-rose-600 border-rose-100",
      label: "Exceeded",
    };
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Pollutant Telemetry Matrix
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Live OpenAQ Sensors &amp; Safe Limit Utilization
          </span>
        </div>

        {/* Time-Bound Spatio-Temporal Cache Info Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-100/90 border border-slate-200/80 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${data.is_cached ? "bg-blue-500" : "bg-emerald-500 animate-pulse"}`} />
            <span>
              {data.is_cached
                ? `Cached (${data.cache_distance_meters ? `${data.cache_distance_meters}m` : "<1km"} • ${data.cached_at_display || "Recent"})`
                : `Live Fetch (${data.fetched_at_display || "Just now"})`}
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">
              TTL: {Math.max(1, Math.round((data.cache_expires_in_seconds ?? 1800) / 60))}m
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
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
              className="p-4 rounded-[24px] bg-white border border-slate-100 shadow-soft hover:shadow-md transition-all flex flex-col justify-between relative group"
            >
              {/* Header: Icon & Circular Progress Percentage Ring */}
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-xl ${item.bgColor} ${item.color} flex items-center justify-center`}>
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
                  <span className="text-[11px] text-slate-400 font-medium truncate">
                    {unit}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                  {item.chemical} • <span className="text-slate-400 font-normal">{item.name}</span>
                </div>
              </div>

              {/* Footer: Safe Limit & Status Badge */}
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">
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
