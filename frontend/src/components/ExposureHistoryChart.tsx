"use client";

import React, { useState, useEffect } from "react";
import { ArrowUpRight, BarChart3, TrendingUp } from "lucide-react";
import { ExposureHistoryPoint, fetchExposureHistory } from "@/lib/api";

interface ExposureHistoryChartProps {
  todayExposureUg?: number;
}

export default function ExposureHistoryChart({ todayExposureUg }: ExposureHistoryChartProps) {
  const [historyData, setHistoryData] = useState<ExposureHistoryPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await fetchExposureHistory("week");
      setHistoryData(res.data);
    } catch (err) {
      console.error("Failed to load exposure history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [todayExposureUg]);

  const maxVal = Math.max(...historyData.map((d) => d.exposure_ug), 20.0);
  const totalSum = historyData.reduce((acc, curr) => acc + curr.exposure_ug, 0);
  const avgVal = historyData.length > 0 ? (totalSum / historyData.length).toFixed(1) : "0.0";

  return (
    <div className="bg-white rounded-[26px] p-6 border border-slate-100 shadow-soft flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Weekly Activity
            </h3>
            <p className="text-xs text-slate-400">
              Daily accumulated PM2.5 inhalation timeline
            </p>
          </div>
          <button className="text-slate-400 hover:text-slate-900 p-1">
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Rounded Modern Bar Chart Matching Image */}
        <div className="h-44 mt-4 flex items-end justify-between gap-2.5 sm:gap-4 pb-2 px-1">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
              Loading timeline...
            </div>
          ) : (
            historyData.map((point, idx) => {
              const isToday = idx === historyData.length - 1 || point.date === new Date().toISOString().split("T")[0];
              const heightPct = Math.min(100, Math.max(16, (point.exposure_ug / maxVal) * 100));

              return (
                <div
                  key={point.date}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end relative group"
                >
                  {/* Floating Pill Tooltip on Active/Hover Day */}
                  {isToday ? (
                    <div className="bg-slate-950 text-white text-[11px] font-black font-mono px-2.5 py-1 rounded-full shadow-md whitespace-nowrap mb-1 z-10 animate-bounce">
                      {point.exposure_ug.toFixed(1)} <span className="font-normal text-[9px] text-slate-300">μg</span>
                    </div>
                  ) : (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded-full whitespace-nowrap z-10 shadow-sm pointer-events-none">
                      {point.exposure_ug.toFixed(1)} μg
                    </div>
                  )}

                  {/* Rounded Capsule Bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[40px] rounded-2xl transition-all duration-500 ${
                      isToday
                        ? "bg-[#0062ff] shadow-md shadow-blue-500/30"
                        : "bg-[#e8edf5] hover:bg-slate-300"
                    }`}
                  />

                  {/* Day Label */}
                  <span
                    className={`text-[11px] font-semibold ${
                      isToday ? "text-[#0062ff] font-bold" : "text-slate-400"
                    }`}
                  >
                    {point.label.split(" ")[0]}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>7-Day Average Dose:</span>
        <span className="font-bold text-slate-900 font-mono">
          {avgVal} μg/day
        </span>
      </div>
    </div>
  );
}
