"use client";

import React, { useState, useEffect } from "react";
import { ArrowUpRight, BarChart3, TrendingUp, Cigarette, ShieldCheck } from "lucide-react";
import { ExposureHistoryPoint, fetchExposureHistory } from "@/lib/api";

interface ExposureHistoryChartProps {
  todayExposureUg?: number;
}

export default function ExposureHistoryChart({ todayExposureUg }: ExposureHistoryChartProps) {
  const [historyData, setHistoryData] = useState<ExposureHistoryPoint[]>([]);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [loading, setLoading] = useState<boolean>(true);

  const loadHistory = async (selectedPeriod: "week" | "month" = "week") => {
    try {
      setLoading(true);
      const res = await fetchExposureHistory(selectedPeriod);
      setHistoryData(res.data);
    } catch (err) {
      console.error("Failed to load exposure history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(period);
  }, [todayExposureUg, period]);

  const maxVal = Math.max(...historyData.map((d) => d.exposure_ug), 35.0);
  const totalSum = historyData.reduce((acc, curr) => acc + curr.exposure_ug, 0);
  const avgVal = historyData.length > 0 ? (totalSum / historyData.length).toFixed(1) : "0.0";
  const avgCigs = (Number(avgVal) / 20.0).toFixed(2);

  return (
    <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-soft flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Inhalation Dose History
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-[#0062ff]">
                Contiguous
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Personal particulate retention timeline (Berkeley Earth calibrated)
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-full text-xs font-bold">
            <button
              onClick={() => setPeriod("week")}
              className={`px-3 py-1 rounded-full transition-all ${
                period === "week"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setPeriod("month")}
              className={`px-3 py-1 rounded-full transition-all ${
                period === "month"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              30 Days
            </button>
          </div>
        </div>

        {/* Bar Chart Container */}
        <div className="h-44 mt-4 flex items-end justify-between gap-2 pb-2 px-1 relative">
          {/* Subtle WHO Guideline reference line at 25 µg */}
          <div
            style={{ bottom: `${Math.min(90, (25.0 / maxVal) * 100)}%` }}
            className="absolute left-0 right-0 border-b border-dashed border-amber-400/50 pointer-events-none z-0 flex items-center justify-end pr-2"
          >
            <span className="text-[9px] font-mono font-bold text-amber-500 bg-amber-50/90 px-1 rounded">
              WHO 25µg cap
            </span>
          </div>

          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
              Loading timeline...
            </div>
          ) : (
            historyData.map((point, idx) => {
              const isToday = idx === historyData.length - 1 || point.date === new Date().toISOString().split("T")[0];
              const heightPct = Math.min(100, Math.max(12, (point.exposure_ug / maxVal) * 100));
              const cigs = (point.exposure_ug / 20.0).toFixed(1);

              return (
                <div
                  key={point.date}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end relative group z-10"
                >
                  {/* Floating Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-950 text-white text-[10px] font-mono px-2.5 py-1 rounded-xl whitespace-nowrap z-20 shadow-lg pointer-events-none text-center">
                    <div>{point.exposure_ug.toFixed(1)} μg</div>
                    <div className="text-[9px] text-amber-300">~{cigs} cigs</div>
                  </div>

                  {/* Rounded Capsule Bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[36px] rounded-2xl transition-all duration-500 cursor-pointer ${
                      isToday
                        ? "bg-[#0062ff] shadow-md shadow-blue-500/30 ring-2 ring-blue-300/50"
                        : point.exposure_ug > 25
                        ? "bg-amber-400 hover:bg-amber-500"
                        : "bg-[#e8edf5] hover:bg-blue-200"
                    }`}
                  />

                  {/* Day Label */}
                  <span
                    className={`text-[10px] font-semibold truncate ${
                      isToday ? "text-[#0062ff] font-extrabold" : "text-slate-400"
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
        <span className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
          <span>Average Daily Intake:</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-slate-900 font-mono">
            {avgVal} μg/day
          </span>
          <span className="text-[11px] text-amber-600 font-mono font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
            ~{avgCigs} cigs/day
          </span>
        </div>
      </div>
    </div>
  );
}
