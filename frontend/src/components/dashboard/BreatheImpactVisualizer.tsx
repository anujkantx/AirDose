"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Wind,
  Activity,
  ShieldCheck,
  Sparkles,
  Cigarette,
  HeartPulse,
  Clock,
  Layers,
  Zap,
  Trees,
  TreeDeciduous,
  Leaf,
  AlertTriangle,
  RotateCcw,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { getAqiCategory } from "@/lib/aqi";

interface BreatheImpactVisualizerProps {
  pm25: number;
  aqi?: number | null;
  breathingFactor: number;
  activityLabel: string;
  locationName: string;
  dataSource?: string;
  totalAccumulatedUg?: number;
  isTracking?: boolean;
  onOpenAiAdvisor?: (mode: "chat" | "explain") => void;
}

type MaskType = "none" | "surgical" | "indoor_ac" | "n95";

interface MaskOption {
  key: MaskType;
  label: string;
  filtrationPct: number;
  infiltrationFactor: number;
}

const MASK_OPTIONS: MaskOption[] = [
  { key: "none", label: "No Mask", filtrationPct: 0, infiltrationFactor: 1.0 },
  { key: "surgical", label: "Surgical", filtrationPct: 20, infiltrationFactor: 0.8 },
  { key: "indoor_ac", label: "Indoor HEPA", filtrationPct: 60, infiltrationFactor: 0.4 },
  { key: "n95", label: "N95 / FFP2", filtrationPct: 95, infiltrationFactor: 0.05 },
];

export default function BreatheImpactVisualizer({
  pm25 = 75,
  aqi,
  breathingFactor = 1.0,
  activityLabel = "Rest",
  locationName = "Current Location",
  dataSource = "demo",
  totalAccumulatedUg = 0,
  isTracking = true,
  onOpenAiAdvisor,
}: BreatheImpactVisualizerProps) {
  // Environmental Greenery & Plant Canopy Shield: 0% (Concrete Smog Zone) -> 100% (Dense Urban Forest Sanctuary)
  const [plantCoverPct, setPlantCoverPct] = useState<number>(45);
  const [selectedActivityFactor, setSelectedActivityFactor] = useState<number>(breathingFactor);
  const [simDurationMinutes, setSimDurationMinutes] = useState<number>(30);
  const [selectedMask, setSelectedMask] = useState<MaskType>("none");
  const [isBreathingInhale, setIsBreathingInhale] = useState<boolean>(true);

  // Synchronize with external activity multiplier
  useEffect(() => {
    setSelectedActivityFactor(breathingFactor);
  }, [breathingFactor]);

  // Mask filtration
  const activeMaskConfig = useMemo(() => {
    return MASK_OPTIONS.find((m) => m.key === selectedMask) || MASK_OPTIONS[0];
  }, [selectedMask]);

  // Environmental Plant Bio-Filter Factor:
  // High plant cover absorbs up to 75% of particulate soot from the micro-environment!
  const plantBioFiltration = (plantCoverPct / 100) * 0.75;
  const effectivePm25 = Math.max(5, Math.round(pm25 * (1 - plantBioFiltration)));

  // Breathing rhythm oscillation
  const breathCycleSeconds = useMemo(() => {
    if (selectedActivityFactor >= 4.0) return 1.4;
    if (selectedActivityFactor >= 3.0) return 1.9;
    if (selectedActivityFactor >= 1.5) return 2.8;
    return 4.2;
  }, [selectedActivityFactor]);

  useEffect(() => {
    const halfCycleMs = (breathCycleSeconds * 1000) / 2;
    const interval = setInterval(() => {
      setIsBreathingInhale((prev) => !prev);
    }, halfCycleMs);
    return () => clearInterval(interval);
  }, [breathCycleSeconds]);

  // Real physical dosimetry calculations
  const basalVentilationM3s = 0.0001; // 6 L/min
  const effectiveInfiltration = activeMaskConfig.infiltrationFactor;
  const simulatedRateUgPerSec = effectivePm25 * effectiveInfiltration * selectedActivityFactor * basalVentilationM3s;
  const simulatedDoseUg = simulatedRateUgPerSec * (simDurationMinutes * 60);

  // Micro-anchors
  const cigaretteEquiv = +(simulatedDoseUg / 20.0).toFixed(2);
  const totalLitersInhaled = Math.round(6.0 * selectedActivityFactor * simDurationMinutes);
  const particleCountMillions = +((simulatedDoseUg * 0.2).toFixed(1));
  const alveolarDoseUg = +(simulatedDoseUg * 0.65).toFixed(2);

  // Environmental Tar / Smog Staining factor (0 healthy pink -> 1 dark tar soot)
  // Inverse with plant cover, direct with PM2.5 and inhaled mass
  const stainingFactor = useMemo(() => {
    const pollutionLoad = Math.min(1.0, effectivePm25 / 180);
    const doseAccumulation = Math.min(1.0, simulatedDoseUg / 70);
    const rawStain = pollutionLoad * 0.55 + doseAccumulation * 0.45;
    return Math.max(0.02, Math.min(0.95, rawStain));
  }, [effectivePm25, simulatedDoseUg]);

  // AQI information
  const aqiInfo = useMemo(() => getAqiCategory(aqi ?? Math.round(effectivePm25 * 1.5)), [aqi, effectivePm25]);

  // Particle color: fresh emerald oxygen droplets when high plant cover, toxic amber/rose soot when polluted
  const particleColor = useMemo(() => {
    if (plantCoverPct >= 70 && effectivePm25 <= 25) return "#34d399"; // pure oxygen emerald
    if (effectivePm25 <= 35) return "#38bdf8"; // clean blue
    if (effectivePm25 <= 75) return "#fbbf24"; // elevated amber
    if (effectivePm25 <= 150) return "#fb923c"; // orange smog
    return "#f43f5e"; // toxic red/charcoal
  }, [plantCoverPct, effectivePm25]);

  const isLive = dataSource.toLowerCase() === "live";
  const isCached = dataSource.toLowerCase() === "cached";

  return (
    <div className="bg-white text-slate-900 rounded-[32px] p-5 sm:p-7 shadow-soft border border-slate-200/80 relative overflow-hidden transition-all font-sans">
      
      {/* Dynamic Ambient Environmental Backdrops */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-20 transition-all duration-1000"
        style={{
          background: plantCoverPct > 60
            ? "radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, rgba(255, 255, 255, 0) 70%)"
            : "radial-gradient(circle, rgba(244, 63, 94, 0.25) 0%, rgba(255, 255, 255, 0) 70%)",
        }}
      />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20 bg-blue-600/5" />

      {/* 1. Header Bar: Title, Environmental Provenance & AI Interpretation Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 relative z-10">
        <div className="flex items-center gap-3">
          <span className={`p-2.5 rounded-2xl border transition-all ${
            plantCoverPct > 60
              ? "bg-emerald-50 border-emerald-200 text-emerald-600"
              : "bg-blue-50 border-blue-200 text-[#0062ff]"
          }`}>
            {plantCoverPct > 60 ? (
              <Trees className="w-5 h-5 text-emerald-600 animate-pulse" />
            ) : (
              <HeartPulse className="w-5 h-5 text-[#0062ff] animate-pulse" />
            )}
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                BREATHE IMPACT
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                  plantCoverPct > 60
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}>
                  {plantCoverPct > 60 ? "Living Botanical Bio-Shield Active" : "Pulmonary Dosimetry Visualizer"}
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Visualizing how urban green cover &amp; clean air protect lungs vs toxic particulate soot in {locationName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Data Provenance Badge */}
          <span
            className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-full flex items-center gap-1.5 border ${
              isLive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : isCached
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : isCached ? "bg-blue-500" : "bg-amber-500"}`} />
            <span>{isLive ? "Live Sensor" : isCached ? "Cached Telemetry" : "Demonstration Scenario"}</span>
          </span>

          {/* Ask Bedrock AI Button */}
          {onOpenAiAdvisor && (
            <button
              type="button"
              onClick={() => onOpenAiAdvisor("chat")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/25 transition-all cursor-pointer"
              title="Consult Bedrock AI on environmental lung protection"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Interpret with Bedrock</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive Environmental Greenery Scrubber Banner (Plant Shield vs Concrete Smog) */}
      <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 relative z-10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TreeDeciduous className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800">
              Surrounding Plant &amp; Greenery Canopy Shield:
            </span>
            <span className={`font-mono text-xs font-black px-2 py-0.5 rounded-full border ${
              plantCoverPct >= 70
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : plantCoverPct >= 30
                ? "bg-blue-100 text-blue-800 border-blue-300"
                : "bg-rose-100 text-rose-800 border-rose-300"
            }`}>
              {plantCoverPct}% Green Cover
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
            <span>Air Filtration:</span>
            <span className="text-emerald-600 font-bold">
              -{Math.round(plantBioFiltration * 100)}% Soot Blocked
            </span>
            <span className="text-slate-300">|</span>
            <span>Effective PM2.5:</span>
            <span className="text-blue-600 font-bold">{effectivePm25} µg/m³</span>
          </div>
        </div>

        {/* Environmental Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={plantCoverPct}
            onChange={(e) => setPlantCoverPct(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 focus:outline-none"
          />
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span className="flex items-center gap-1 text-rose-600">
              🏭 0% Barren Urban Smog (Heavy Silt &amp; Soot)
            </span>
            <span className="text-slate-400">
              🌿 50% Tree-Lined Avenues
            </span>
            <span className="flex items-center gap-1 text-emerald-600">
              🌳 100% Forest Canopy Sanctuary (Pristine O₂)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Split Grid: Realistic Lung Visualization (Left) + Biological Dosimetry Metrics (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5 relative z-10">

        {/* Left: Anatomical Respiratory Tree with Environmental Plant & Smog Animation (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl bg-[#080d19] border border-slate-800/90 p-5 relative overflow-hidden">
          
          {/* Top Status Bar: Breathing Inhale/Exhale & Cellular Vitality */}
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                isBreathingInhale
                  ? plantCoverPct > 60 ? "bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" : "bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse"
                  : "bg-blue-600"
              }`} />
              <span className="text-slate-300 font-semibold tracking-wide">
                {isBreathingInhale ? "INHALING (Airway Intake)" : "EXHALING (Gas Exchange & Deposition)"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Breath Cycle:</span>
              <span className="text-cyan-400 font-bold">{breathCycleSeconds}s</span>
              <span className="text-slate-500 text-[10px]">({Math.round(60 / breathCycleSeconds)} bpm)</span>
            </div>
          </div>

          {/* Anatomical SVG with Dynamic Cellular Health / Tar Deposition & Botanical Oxygen Flow */}
          <div className="relative w-full h-[330px] sm:h-[360px] flex items-center justify-center my-1 select-none">
            
            {/* Ambient Plant Foliage Canopy around the intake when Greenery is High */}
            {plantCoverPct > 35 && (
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-700 flex items-center justify-between px-2"
                style={{ opacity: plantCoverPct / 100 }}
              >
                {/* Left Botanical Bio-Shield */}
                <div className="flex flex-col items-center gap-4 text-emerald-500/60">
                  <Leaf className="w-8 h-8 -rotate-45 animate-pulse" />
                  <TreeDeciduous className="w-10 h-10 text-emerald-400/50" />
                  <Leaf className="w-6 h-6 rotate-12" />
                </div>
                {/* Right Botanical Bio-Shield */}
                <div className="flex flex-col items-center gap-4 text-emerald-500/60">
                  <Leaf className="w-8 h-8 rotate-45 animate-pulse" />
                  <TreeDeciduous className="w-10 h-10 text-emerald-400/50" />
                  <Leaf className="w-6 h-6 -rotate-12" />
                </div>
              </div>
            )}

            {/* SVG Respiratory Tract Structure */}
            <svg
              viewBox="0 0 400 360"
              className="w-full h-full max-h-[350px] drop-shadow-2xl transition-transform duration-700 ease-in-out"
              style={{
                transform: isBreathingInhale ? "scale(1.035)" : "scale(0.975)",
                transformOrigin: "center center",
              }}
            >
              <defs>
                {/* Healthy Alveolar Tissue Gradient (Rosy Cellular Pink) */}
                <linearGradient id="healthyTissueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fb7185" stopOpacity="0.9" />
                  <stop offset="60%" stopColor="#f43f5e" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#be123c" stopOpacity="1.0" />
                </linearGradient>

                {/* Toxic PM2.5 Carbon Soot Staining Gradient (Blended over tissue) */}
                <radialGradient id="tarSmogStainGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#1e293b" stopOpacity={0.15 + stainingFactor * 0.8} />
                  <stop offset="65%" stopColor="#0f172a" stopOpacity={0.35 + stainingFactor * 0.6} />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0.9" />
                </radialGradient>

                {/* Trachea Windpipe Gradient */}
                <linearGradient id="tracheaWindpipeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.95" />
                </linearGradient>

                {/* Particle Glow Filter */}
                <filter id="partGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 1. Trachea (Windpipe) with Cartilage Rings */}
              <g className="trachea-group">
                <path
                  d="M 188 20 L 212 20 L 212 110 L 188 110 Z"
                  fill="url(#tracheaWindpipeGrad)"
                  stroke="#93c5fd"
                  strokeWidth="1.5"
                />

                {/* Cartilage rings */}
                {[32, 44, 56, 68, 80, 92, 104].map((y) => (
                  <line
                    key={y}
                    x1="189"
                    y1={y}
                    x2="211"
                    y2={y}
                    stroke="#dbeafe"
                    strokeWidth="1.5"
                    strokeOpacity="0.75"
                  />
                ))}

                {/* Protective Mask Mesh Indicator at Trachea Inlet */}
                {selectedMask !== "none" && (
                  <g className="mask-mesh-indicator animate-pulse">
                    <rect
                      x="178"
                      y="16"
                      width="44"
                      height="12"
                      rx="4"
                      fill="#0284c7"
                      fillOpacity="0.9"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                    />
                    <text
                      x="200"
                      y="25"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="7"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {activeMaskConfig.label.toUpperCase()}
                    </text>
                  </g>
                )}
              </g>

              {/* 2. Primary & Secondary Bronchial Tree */}
              <g className="bronchi-tree" stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" fill="none">
                <path d="M 194 110 Q 170 135 130 160" />
                <path d="M 130 160 Q 105 185 85 220" strokeWidth="2.5" />
                <path d="M 130 160 Q 140 195 135 240" strokeWidth="2.5" />
                <path d="M 85 220 Q 70 245 75 275" strokeWidth="1.5" />
                <path d="M 135 240 Q 140 265 130 290" strokeWidth="1.5" />

                <path d="M 206 110 Q 230 135 270 160" />
                <path d="M 270 160 Q 295 185 315 220" strokeWidth="2.5" />
                <path d="M 270 160 Q 260 195 265 240" strokeWidth="2.5" />
                <path d="M 315 220 Q 330 245 325 275" strokeWidth="1.5" />
                <path d="M 265 240 Q 260 265 270 290" strokeWidth="1.5" />
              </g>

              {/* 3. Left Anatomical Lung Lobes */}
              <g className="left-lung-lobe">
                <path
                  d="M 175 115 C 145 105, 95 125, 75 160 C 50 205, 45 270, 75 315 C 105 345, 145 340, 165 315 C 175 295, 175 260, 168 220 C 160 180, 175 140, 175 115 Z"
                  fill="url(#healthyTissueGrad)"
                  stroke="#fda4af"
                  strokeWidth="1.5"
                  className="transition-all duration-700"
                />

                {/* Tar Soot Deposition Staining Overlay */}
                <path
                  d="M 175 115 C 145 105, 95 125, 75 160 C 50 205, 45 270, 75 315 C 105 345, 145 340, 165 315 C 175 295, 175 260, 168 220 C 160 180, 175 140, 175 115 Z"
                  fill="url(#tarSmogStainGrad)"
                  className="transition-opacity duration-1000"
                />
              </g>

              {/* 4. Right Anatomical Lung Lobes (with Cardiac Notch) */}
              <g className="right-lung-lobe">
                <path
                  d="M 225 115 C 255 105, 305 125, 325 160 C 350 205, 355 270, 325 315 C 295 345, 255 340, 235 315 C 220 290, 222 250, 230 215 C 240 175, 225 140, 225 115 Z"
                  fill="url(#healthyTissueGrad)"
                  stroke="#fda4af"
                  strokeWidth="1.5"
                  className="transition-all duration-700"
                />

                {/* Tar Soot Deposition Staining Overlay */}
                <path
                  d="M 225 115 C 255 105, 305 125, 325 160 C 350 205, 355 270, 325 315 C 295 345, 255 340, 235 315 C 220 290, 222 250, 230 215 C 240 175, 225 140, 225 115 Z"
                  fill="url(#tarSmogStainGrad)"
                  className="transition-opacity duration-1000"
                />
              </g>

              {/* 5. Alveolar Capillary Micro-Clusters */}
              <g className="alveoli-clusters" opacity={0.75}>
                {[
                  { cx: 90, cy: 220, r: 6 },
                  { cx: 80, cy: 260, r: 8 },
                  { cx: 120, cy: 280, r: 7 },
                  { cx: 140, cy: 240, r: 6 },
                  { cx: 310, cy: 220, r: 6 },
                  { cx: 320, cy: 260, r: 8 },
                  { cx: 280, cy: 280, r: 7 },
                  { cx: 260, cy: 240, r: 6 },
                ].map((node, nIdx) => (
                  <circle
                    key={nIdx}
                    cx={node.cx}
                    cy={node.cy}
                    r={node.r}
                    fill={stainingFactor > 0.45 ? "#334155" : plantCoverPct > 60 ? "#f43f5e" : "#fda4af"}
                    stroke={stainingFactor > 0.45 ? "#1e293b" : "#fb7185"}
                    strokeWidth="1"
                    className="transition-colors duration-700"
                  />
                ))}
              </g>

              {/* 6. Dynamic Inhalation Particle Stream */}
              {isBreathingInhale && (
                <g className="particle-stream" filter="url(#partGlowFilter)">
                  {/* Trachea Inlet */}
                  <circle cx="200" cy="38" r="2.2" fill={particleColor} className="animate-ping" />
                  <circle cx="196" cy="62" r="2.4" fill={particleColor} />
                  <circle cx="204" cy="84" r="2.1" fill={particleColor} />
                  <circle cx="200" cy="106" r="2.6" fill={particleColor} />

                  {/* Left Lobes */}
                  <circle cx="162" cy="138" r="2.2" fill={particleColor} />
                  <circle cx="122" cy="178" r="2.0" fill={particleColor} />
                  <circle cx="94" cy="232" r="2.3" fill={particleColor} />
                  <circle cx="124" cy="264" r="2.0" fill={particleColor} />

                  {/* Right Lobes */}
                  <circle cx="238" cy="138" r="2.2" fill={particleColor} />
                  <circle cx="278" cy="178" r="2.0" fill={particleColor} />
                  <circle cx="306" cy="232" r="2.3" fill={particleColor} />
                  <circle cx="274" cy="264" r="2.0" fill={particleColor} />
                </g>
              )}
            </svg>

            {/* Environmental Micro-Badge Overlay */}
            <div className="absolute bottom-2 left-3 right-3 bg-[#0c1322]/90 backdrop-blur-md rounded-xl p-2.5 border border-slate-800 text-[11px] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: particleColor }} />
                <span className="text-slate-300 font-medium">Inhaled Air Quality:</span>
                <span className="font-mono font-bold text-white">{effectivePm25} µg/m³</span>
                <span className="text-slate-400 font-mono text-[10px]">({aqiInfo.category})</span>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                {plantCoverPct > 60 ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Clean Botanical Bio-Shield
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    High Soot Penetration
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Visualizer Annotation */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className={stainingFactor > 0.5 ? "text-amber-400 font-semibold" : "text-emerald-400 font-semibold"}>
              {stainingFactor > 0.5 ? "⚠️ Alveolar Soot Staining: Elevated Carbon Retained" : "🌿 Tissue State: Optimal Cellular Vitality & O₂ Exchange"}
            </span>
            <span className="text-cyan-400 font-semibold">{totalLitersInhaled} Liters Processed</span>
          </div>
        </div>

        {/* Right: Real-Time Dosimetry & Environmental Controls Console (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          
          {/* Card: 4 Impact Telemetry Micro-Tiles */}
          <div className="grid grid-cols-2 gap-2.5">
            
            {/* Tile 1: Calculated Inhaled PM2.5 Mass */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-[10px] font-semibold">
                <span className="flex items-center gap-1 text-slate-700">
                  <Wind className="w-3.5 h-3.5 text-[#0062ff]" />
                  Inhaled Mass
                </span>
                <span className="font-mono text-slate-400">µg PM₂.₅</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-black font-mono text-slate-900 tracking-tight">
                  {simulatedDoseUg.toFixed(1)}
                </span>
                <span className="text-[10px] font-mono text-emerald-600 font-bold">
                  {alveolarDoseUg} µg deep
                </span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1">Inhaled over {simDurationMinutes} min</span>
            </div>

            {/* Tile 2: Berkeley Earth Cigarette Equivalence */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-[10px] font-semibold">
                <span className="flex items-center gap-1 text-amber-700">
                  <Cigarette className="w-3.5 h-3.5 text-amber-600" />
                  Cigarette Impact
                </span>
                <span className="font-mono text-slate-400">20µg cap</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-black font-mono text-amber-700 tracking-tight">
                  ~{cigaretteEquiv}
                </span>
                <span className="text-[10px] text-amber-600 font-mono font-bold">cigs</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1">Berkeley Earth metric</span>
            </div>

            {/* Tile 3: Total Inhaled Air Volume */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-[10px] font-semibold">
                <span className="flex items-center gap-1 text-slate-700">
                  <Activity className="w-3.5 h-3.5 text-purple-600" />
                  Ventilation
                </span>
                <span className="font-mono text-slate-400">Liters</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-black font-mono text-purple-700 tracking-tight">
                  {totalLitersInhaled}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">L pumped</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1">At {selectedActivityFactor.toFixed(1)}× exertion</span>
            </div>

            {/* Tile 4: Fine Micro-Particulate Particle Count */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-[10px] font-semibold">
                <span className="flex items-center gap-1 text-slate-700">
                  <Zap className="w-3.5 h-3.5 text-rose-500" />
                  Particle Count
                </span>
                <span className="font-mono text-slate-400">Estimated</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-black font-mono text-rose-700 tracking-tight">
                  {particleCountMillions}M
                </span>
                <span className="text-[10px] text-slate-400 font-mono">particles</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1">≤2.5µm deep alveolar</span>
            </div>
          </div>

          {/* Protective Mask / Barrier Filter Selector */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Respiratory Shield Filtration
              </span>
              <span className="font-mono text-[11px] text-blue-600 font-bold">
                {activeMaskConfig.filtrationPct}% Particle Block
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {MASK_OPTIONS.map((mask) => {
                const isSelected = selectedMask === mask.key;
                return (
                  <button
                    key={mask.key}
                    type="button"
                    onClick={() => setSelectedMask(mask.key)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between cursor-pointer border ${
                      isSelected
                        ? "bg-[#0062ff] text-white border-blue-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <span className="truncate">{mask.label}</span>
                    <span className="text-[10px] font-mono opacity-80 shrink-0 ml-1">
                      {mask.filtrationPct > 0 ? `-${mask.filtrationPct}%` : "0%"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exertion & Time Scrubber */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            {/* Exertion Activity Multiplier */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-800 font-bold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-purple-600" />
                  Physical Respiration Exertion:
                </span>
                <span className="font-mono text-purple-700 font-bold">
                  {selectedActivityFactor.toFixed(1)}× Basal Breathing
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: "Rest", factor: 1.0 },
                  { label: "Walk", factor: 1.8 },
                  { label: "Run", factor: 3.5 },
                  { label: "Workout", factor: 5.0 },
                ].map((act) => {
                  const isAct = Math.abs(selectedActivityFactor - act.factor) < 0.1;
                  return (
                    <button
                      key={act.factor}
                      type="button"
                      onClick={() => setSelectedActivityFactor(act.factor)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer border ${
                        isAct
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      {act.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Duration Scrubber */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-800 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#0062ff]" />
                  Exposure Time:
                </span>
                <span className="font-mono text-[#0062ff] font-bold">
                  {simDurationMinutes} Minutes
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1">
                {[15, 30, 45, 60, 120].map((mins) => {
                  const isSelected = simDurationMinutes === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSimDurationMinutes(mins)}
                      className={`py-1 rounded-xl text-[11px] font-bold font-mono transition-all text-center cursor-pointer border ${
                        isSelected
                          ? "bg-[#0062ff] text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      {mins}m
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AI Explanation Action Strip */}
          {onOpenAiAdvisor && (
            <button
              type="button"
              onClick={() => onOpenAiAdvisor("chat")}
              className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Ask Bedrock AI: "How do trees &amp; clean air protect my lungs?"</span>
            </button>
          )}

        </div>
      </div>

    </div>
  );
}
