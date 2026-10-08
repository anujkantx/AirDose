"use client";

import React from "react";
import { Clock, BarChart2, ArrowUpRight } from "lucide-react";
import { TrendHistoryItem } from "@/lib/api";

interface AirTrendChartProps {
  trendHistory: TrendHistoryItem[];
  currentAqi: number;
}

export default function AirTrendChart({ trendHistory, currentAqi }: AirTrendChartProps) {
  if (!trendHistory || trendHistory.length === 0) return null;

  const maxVal = Math.max(...trendHistory.map((t) => t.aqi), 150);

  const getBarColor = (aqi: number) => {
    if (aqi <= 50) return "bg-emerald-400";
    if (aqi <= 100) return "bg-amber-400";
    if (aqi <= 150) return "bg-orange-400";
    if (aqi <= 200) return "bg-rose-500";
    return "bg-purple-500";
  };

  return (
    <div className="bg-white rounded-[26px] p-6 border border-slate-100 shadow-soft flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              12-Hour AQI Trend
            </h3>
            <p className="text-xs text-slate-400">
              Temporal hourly readings and peaks
            </p>
          </div>
          <button className="text-slate-400 hover:text-slate-900 p-1">
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Rounded Modern Bars */}
        <div className="flex items-end gap-2 sm:gap-3.5 h-44 pt-6 pb-2 px-1 border-b border-slate-100">
          {trendHistory.map((item, idx) => {
            const heightPercent = Math.max(16, Math.round((item.aqi / maxVal) * 100));
            const isCurrent = idx === trendHistory.length - 1;

            return (
              <div key={item.hour} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                {/* Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded-full pointer-events-none z-20 shadow-sm whitespace-nowrap">
                  AQI {item.aqi} ({item.pm25}µg/m³)
                </div>

                {/* Bar */}
                <div
                  className={`w-full rounded-2xl transition-all duration-300 ${
                    isCurrent
                      ? "bg-[#0062ff] shadow-md shadow-blue-500/25"
                      : "bg-[#e8edf5] hover:bg-slate-300"
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />

                {/* Hour Label */}
                <span className={`text-[10px] font-semibold ${isCurrent ? "text-[#0062ff] font-bold" : "text-slate-400"}`}>
                  {item.hour}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend Footer */}
      <div className="mt-4 pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 0-50</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> 51-100</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /> 101-150</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> 151+</span>
        </div>
        <span className="text-[11px] font-medium text-slate-500">Live Calibration OK</span>
      </div>
    </div>
  );
}
