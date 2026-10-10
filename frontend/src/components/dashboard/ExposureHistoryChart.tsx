"use client";

import React, { useState, useEffect, useRef } from "react";
import { TrendingUp, Activity, BarChart3, LineChart, AlertCircle, CheckCircle2 } from "lucide-react";
import { ExposureHistoryPoint, fetchExposureHistory } from "@/lib/api";

interface ExposureHistoryChartProps {
  todayExposureUg?: number;
}

interface Point {
  x: number;
  y: number;
}

// Convert data points to a smooth cubic Catmull-Rom Bézier spline
function getSmoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return path;
}

function getAreaPath(points: Point[], baselineY: number): string {
  if (points.length < 2) return "";
  const curve = getSmoothPath(points);
  const firstX = points[0].x;
  const lastX = points[points.length - 1].x;
  return `${curve} L ${lastX.toFixed(1)} ${baselineY.toFixed(1)} L ${firstX.toFixed(1)} ${baselineY.toFixed(1)} Z`;
}

export default function ExposureHistoryChart({ todayExposureUg }: ExposureHistoryChartProps) {
  const [historyData, setHistoryData] = useState<ExposureHistoryPoint[]>([]);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [chartType, setChartType] = useState<"curve" | "bars">("curve");
  const [loading, setLoading] = useState<boolean>(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

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

  const todayStr = new Date().toISOString().split("T")[0];

  // Merge today live value if active
  const data = historyData.map((pt, idx) => {
    const isToday = idx === historyData.length - 1 || pt.date === todayStr;
    const exposure =
      isToday && todayExposureUg !== undefined && todayExposureUg > pt.exposure_ug
        ? todayExposureUg
        : pt.exposure_ug;
    return { ...pt, exposure_ug: exposure, isToday };
  });

  const maxVal = Math.max(...data.map((d) => d.exposure_ug), 35.0);
  const totalSum = data.reduce((acc, curr) => acc + curr.exposure_ug, 0);
  const avgVal = data.length > 0 ? (totalSum / data.length).toFixed(1) : "0.0";
  const avgCigs = (Number(avgVal) / 20.0).toFixed(2);
  const peakVal = data.length > 0 ? Math.max(...data.map((d) => d.exposure_ug)).toFixed(1) : "0.0";

  // SVG coordinate geometry
  const svgWidth = 500;
  const svgHeight = 150;
  const padLeft = 32;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 26;
  const graphW = svgWidth - padLeft - padRight;
  const graphH = svgHeight - padTop - padBottom;
  const baselineY = padTop + graphH;

  const points: Point[] = data.map((d, i) => {
    const x = data.length > 1 ? padLeft + (i / (data.length - 1)) * graphW : padLeft + graphW / 2;
    const y = padTop + graphH - (d.exposure_ug / maxVal) * graphH;
    return { x, y };
  });

  const whoY = padTop + graphH - (25.0 / maxVal) * graphH;
  const curvePath = getSmoothPath(points);
  const areaPath = getAreaPath(points, baselineY);

  const formatAxisDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return `${months[m]} ${d}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Interactive mouse/touch scrub calculation
  const handlePointerMove = (clientX: number) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    const viewBoxX = (relX / rect.width) * svgWidth;

    let nearest = 0;
    let minD = Infinity;
    points.forEach((pt, i) => {
      const d = Math.abs(pt.x - viewBoxX);
      if (d < minD) {
        minD = d;
        nearest = i;
      }
    });
    setActiveIndex(nearest);
  };

  const activePoint = activeIndex !== null ? data[activeIndex] : null;
  const activeCoord = activeIndex !== null ? points[activeIndex] : null;

  return (
    <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-soft flex flex-col justify-between min-w-0 overflow-hidden">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#0062ff]" />
                Inhalation Dose Graph
              </h3>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-[#0062ff] shrink-0">
                Functional Spline
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              Dynamic continuous retention curve (Berkeley Earth calibrated)
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-full text-xs">
              <button
                onClick={() => setChartType("curve")}
                title="Continuous Curve"
                className={`p-1 rounded-full transition-all ${
                  chartType === "curve" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-800"
                }`}
              >
                <LineChart className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setChartType("bars")}
                title="Discrete Histogram"
                className={`p-1 rounded-full transition-all ${
                  chartType === "bars" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-800"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Timeframe Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-full text-xs font-bold">
              <button
                onClick={() => setPeriod("week")}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
                  period === "week"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setPeriod("month")}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
                  period === "month"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                30 Days
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Functional Graph Container */}
        <div className="relative mt-2 w-full select-none">
          {loading ? (
            <div className="h-40 w-full flex items-center justify-center text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>Interpolating retention curve...</span>
              </div>
            </div>
          ) : (
            <div className="relative h-40 w-full">
              {chartType === "curve" ? (
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-full cursor-crosshair overflow-visible"
                  onMouseMove={(e) => handlePointerMove(e.clientX)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onTouchMove={(e) => {
                    if (e.touches[0]) handlePointerMove(e.touches[0].clientX);
                  }}
                  onTouchEnd={() => setActiveIndex(null)}
                >
                  <defs>
                    {/* Glowing Area Gradient */}
                    <linearGradient id="curveFillGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0062ff" stopOpacity="0.32" />
                      <stop offset="50%" stopColor="#0062ff" stopOpacity="0.10" />
                      <stop offset="100%" stopColor="#0062ff" stopOpacity="0.00" />
                    </linearGradient>

                    {/* Gradient for Line Stroke */}
                    <linearGradient id="curveStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="70%" stopColor="#0062ff" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>

                    {/* Ambient Glow Filter */}
                    <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0062ff" floodOpacity="0.25" />
                    </filter>
                  </defs>

                  {/* Horizontal Grid Baseline */}
                  <line
                    x1={padLeft}
                    x2={padLeft + graphW}
                    y1={baselineY}
                    y2={baselineY}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />

                  {/* Y-Axis Guideline (0 ug) */}
                  <text
                    x={padLeft - 6}
                    y={baselineY + 3}
                    textAnchor="end"
                    className="text-[9px] fill-slate-300 font-mono font-medium"
                  >
                    0
                  </text>

                  {/* WHO 25 ug Guideline Dashed Reference */}
                  <line
                    x1={padLeft}
                    x2={padLeft + graphW}
                    y1={whoY}
                    y2={whoY}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth="1.2"
                    opacity="0.65"
                  />
                  <text
                    x={padLeft + graphW}
                    y={whoY - 4}
                    textAnchor="end"
                    className="text-[9px] fill-amber-500 font-mono font-bold"
                  >
                    WHO 25µg Cap
                  </text>
                  <text
                    x={padLeft - 6}
                    y={whoY + 3}
                    textAnchor="end"
                    className="text-[9px] fill-amber-400 font-mono font-medium"
                  >
                    25
                  </text>

                  {/* Area Fill Under Spline */}
                  {areaPath && (
                    <path
                      d={areaPath}
                      fill="url(#curveFillGrad)"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Continuous Spline Stroke */}
                  {curvePath && (
                    <path
                      d={curvePath}
                      fill="none"
                      stroke="url(#curveStrokeGrad)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#glowFilter)"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Discrete Point Dots (on 7-day mode or key points) */}
                  {points.map((pt, i) => {
                    const isToday = i === points.length - 1;
                    const isOverWho = data[i].exposure_ug > 25;
                    const showDot = period === "week" || isToday || isOverWho;
                    if (!showDot) return null;

                    return (
                      <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r={isToday ? 4.5 : 3}
                        fill={isToday ? "#0062ff" : isOverWho ? "#f59e0b" : "#ffffff"}
                        stroke={isToday ? "#ffffff" : isOverWho ? "#d97706" : "#0062ff"}
                        strokeWidth={isToday ? 2.5 : 1.5}
                        className="transition-all duration-200"
                      />
                    );
                  })}

                  {/* Active Crosshair Scrubbing Indicator */}
                  {activeCoord && activePoint && (
                    <g>
                      {/* Vertical tracking dashed line */}
                      <line
                        x1={activeCoord.x}
                        x2={activeCoord.x}
                        y1={padTop}
                        y2={baselineY}
                        stroke="#0062ff"
                        strokeDasharray="3 3"
                        strokeWidth="1.2"
                        opacity="0.75"
                      />

                      {/* Ripple Halo */}
                      <circle
                        cx={activeCoord.x}
                        cy={activeCoord.y}
                        r="9"
                        fill="#0062ff"
                        opacity="0.18"
                        className="animate-ping"
                      />

                      {/* Focused Center Dot */}
                      <circle
                        cx={activeCoord.x}
                        cy={activeCoord.y}
                        r="5.5"
                        fill="#0062ff"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                      />
                    </g>
                  )}
                </svg>
              ) : (
                /* Alternate Discrete Histogram View */
                <div
                  className={`h-full flex items-end justify-between ${
                    period === "month" ? "gap-[2px]" : "gap-2 sm:gap-2.5"
                  } px-1 w-full`}
                >
                  {data.map((point, idx) => {
                    const heightPct = Math.min(100, Math.max(8, (point.exposure_ug / maxVal) * 100));
                    return (
                      <div
                        key={point.date}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onMouseLeave={() => setActiveIndex(null)}
                        className="flex-1 min-w-0 flex flex-col items-center h-full justify-end group cursor-pointer"
                      >
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full transition-all duration-200 ${
                            period === "month" ? "max-w-[8px] rounded-full" : "max-w-[32px] rounded-2xl"
                          } ${
                            point.isToday
                              ? "bg-[#0062ff] shadow-md shadow-blue-500/30 ring-2 ring-blue-300/50"
                              : point.exposure_ug > 25
                              ? "bg-amber-400 hover:bg-amber-500"
                              : "bg-[#e8edf5] hover:bg-blue-200"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Dynamic Interactive Floating Tooltip */}
              {activePoint && (
                <div
                  style={{
                    left: `${Math.min(
                      82,
                      Math.max(18, activeCoord ? (activeCoord.x / svgWidth) * 100 : 50)
                    )}%`,
                    transform: "translateX(-50%)",
                  }}
                  className="absolute -top-3 z-30 pointer-events-none transition-all duration-75"
                >
                  <div className="bg-slate-950/95 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-xl shadow-xl border border-slate-800 text-center whitespace-nowrap">
                    <div className="text-[9px] text-slate-400 font-sans font-medium">
                      {activePoint.label || activePoint.date}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5">
                      <span className="font-extrabold font-mono text-white text-xs">
                        {activePoint.exposure_ug.toFixed(1)} μg
                      </span>
                      <span className="text-[9px] text-amber-300 font-mono">
                        ~{(activePoint.exposure_ug / 20.0).toFixed(2)} cigs
                      </span>
                    </div>
                    <div className="mt-0.5 text-[8px] uppercase font-bold tracking-wider">
                      {activePoint.exposure_ug > 25 ? (
                        <span className="text-amber-400 flex items-center justify-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" /> Exceeds WHO Cap
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Safe Threshold
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* X-Axis Milestone Date Labels */}
          <div className="mt-1 pt-1.5 border-t border-slate-100/70 w-full min-w-0">
            {period === "week" ? (
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-2">
                {data.map((point, idx) => {
                  const isToday = point.isToday;
                  const isActive = activeIndex === idx;
                  return (
                    <span
                      key={point.date}
                      className={`transition-colors ${
                        isActive
                          ? "text-[#0062ff] font-extrabold"
                          : isToday
                          ? "text-[#0062ff] font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      {isToday ? "Today" : point.label.split(" ")[0]}
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-between px-2 text-[10px] font-medium text-slate-400">
                <span>{formatAxisDate(data[0]?.date) || "30d ago"}</span>
                <span>{formatAxisDate(data[Math.floor(data.length * 0.25)]?.date) || "21d"}</span>
                <span>{formatAxisDate(data[Math.floor(data.length * 0.5)]?.date) || "14d"}</span>
                <span>{formatAxisDate(data[Math.floor(data.length * 0.75)]?.date) || "7d"}</span>
                <span className="text-[#0062ff] font-bold">Today</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Metrics Strip */}
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
            ~{avgCigs} cigs
          </span>
          <span className="hidden sm:inline-block text-[10px] text-slate-400 font-mono">
            Peak: {peakVal}μg
          </span>
        </div>
      </div>
    </div>
  );
}
