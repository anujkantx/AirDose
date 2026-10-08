"use client";

import React from "react";
import { TrendingUp, Clock, BarChart2 } from "lucide-react";
import { TrendHistoryItem } from "@/lib/api";

interface AirTrendChartProps {
  trendHistory: TrendHistoryItem[];
  currentAqi: number;
}

export default function AirTrendChart({ trendHistory, currentAqi }: AirTrendChartProps) {
  if (!trendHistory || trendHistory.length === 0) return null;

  const maxVal = Math.max(...trendHistory.map((t) => t.aqi), 150);

  const getBarColor = (aqi: number) => {
    if (aqi <= 50) return "bg-emerald-400 hover:bg-emerald-300";
    if (aqi <= 100) return "bg-yellow-400 hover:bg-yellow-300";
    if (aqi <= 150) return "bg-orange-400 hover:bg-orange-300";
    if (aqi <= 200) return "bg-rose-500 hover:bg-rose-400";
    if (aqi <= 300) return "bg-purple-500 hover:bg-purple-400";
    return "bg-red-800 hover:bg-red-700";
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            12-Hour Air Quality Index Progression
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Temporal trend analysis showing historical exposure peaks and dips.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Hourly Readings</span>
        </div>
      </div>

      {/* Bar Chart Visualization */}
      <div className="flex items-end gap-2 sm:gap-3 h-44 pt-6 pb-2 px-2 border-b border-slate-800/80">
        {trendHistory.map((item, idx) => {
          const heightPercent = Math.max(12, Math.round((item.aqi / maxVal) * 100));
          const isCurrent = idx === trendHistory.length - 1;

          return (
            <div key={item.hour} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-9 bg-slate-950 border border-slate-700 px-2 py-1 rounded text-[10px] font-mono text-white pointer-events-none z-20 shadow-lg whitespace-nowrap">
                AQI {item.aqi} ({item.pm25}µg/m³)
              </div>

              {/* Bar */}
              <div
                className={`w-full rounded-t-lg transition-all duration-300 ${getBarColor(item.aqi)} ${
                  isCurrent ? "ring-2 ring-emerald-400 shadow-md shadow-emerald-500/20" : "opacity-80 group-hover:opacity-100"
                }`}
                style={{ height: `${heightPercent}%` }}
              />

              {/* Hour Label */}
              <span className={`text-[10px] font-mono ${isCurrent ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                {item.hour}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> 0-50 Good</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> 51-100 Moderate</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> 101-150 Sensitive</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> 151-200 Unhealthy</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> 200+ Very Unhealthy</span>
        </div>
        <span className="font-mono text-slate-500">Live Calibration OK</span>
      </div>
    </div>
  );
}
