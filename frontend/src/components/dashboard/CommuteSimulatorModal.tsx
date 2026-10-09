"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Compass,
  Footprints,
  Bike,
  Car,
  Train,
  Bus,
  Wind,
  ShieldCheck,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Cigarette,
  Clock,
  Gauge,
} from "lucide-react";
import {
  simulateTripApi,
  TripSimulationResponse,
  TransitModeSimulation,
} from "@/lib/api";

interface CommuteSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmbientPm25?: number;
}

export default function CommuteSimulatorModal({
  isOpen,
  onClose,
  initialAmbientPm25 = 80,
}: CommuteSimulatorModalProps) {
  const [duration, setDuration] = useState<number>(30);
  const [ambientPm25, setAmbientPm25] = useState<number>(initialAmbientPm25 || 80);
  const [simulation, setSimulation] = useState<TripSimulationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (initialAmbientPm25) {
      setAmbientPm25(initialAmbientPm25);
    }
  }, [initialAmbientPm25]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    simulateTripApi(duration, ambientPm25)
      .then((data) => {
        if (isMounted) setSimulation(data);
      })
      .catch((err) => console.error("Failed to run trip simulation:", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, duration, ambientPm25]);

  if (!isOpen) return null;

  const getModeIcon = (iconName: string) => {
    switch (iconName) {
      case "Footprints":
        return <Footprints className="w-5 h-5" />;
      case "Bike":
        return <Bike className="w-5 h-5" />;
      case "Car":
        return <Car className="w-5 h-5" />;
      case "Train":
        return <Train className="w-5 h-5" />;
      case "Bus":
        return <Bus className="w-5 h-5" />;
      default:
        return <Wind className="w-5 h-5" />;
    }
  };

  const safest = simulation?.options[0];
  const mostExposed = simulation?.options[simulation.options.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-2xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0062ff] flex items-center justify-center shadow-sm">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Commute Exposure Simulator
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-[#0062ff]">
                  Clean Route AI
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Compare lung particulate intake across different transit methods
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Trip Duration */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Trip Duration
                </span>
                <span className="text-sm font-extrabold text-[#0062ff] font-mono">
                  {duration} mins
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-[#0062ff] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>15m</span>
                <span>30m</span>
                <span>60m</span>
                <span>90m</span>
                <span>120m</span>
              </div>
            </div>

            {/* Ambient PM2.5 */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-slate-400" />
                  Outdoor PM2.5 Level
                </span>
                <span className="text-sm font-extrabold text-slate-900 font-mono">
                  {ambientPm25} <span className="text-[10px] text-slate-400">µg/m³</span>
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="350"
                step="5"
                value={ambientPm25}
                onChange={(e) => setAmbientPm25(Number(e.target.value))}
                className="w-full accent-[#0062ff] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>25 (Good)</span>
                <span>75 (Moderate)</span>
                <span>150 (Poor)</span>
                <span>300+</span>
              </div>
            </div>
          </div>

          {/* Key Insight Highlight Banner */}
          {simulation && safest && mostExposed && (
            <div className="bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">
                    Smart Route Recommendation
                  </h4>
                  <p className="text-xs text-slate-600">
                    Choosing <strong className="text-emerald-700">{safest.mode}</strong> instead of{" "}
                    <strong className="text-rose-600">{mostExposed.mode}</strong> protects your lungs by{" "}
                    <span className="font-extrabold text-emerald-600">
                      {simulation.max_dose_savings_ug} µg
                    </span>{" "}
                    ({(
                      (1 - safest.estimated_dose_ug / mostExposed.estimated_dose_ug) *
                      100
                    ).toFixed(0)}
                    % reduction).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mode Comparison Cards */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Transit Modes Ranked by Respiratory Exposure
            </h3>

            <div className="space-y-2.5">
              {simulation?.options.map((opt, idx) => {
                const isSafest = idx === 0;
                const isWorst = idx === simulation.options.length - 1;

                return (
                  <div
                    key={opt.key}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      isSafest
                        ? "bg-emerald-50/50 border-emerald-200/80 shadow-soft"
                        : isWorst
                        ? "bg-rose-50/30 border-rose-200/60"
                        : "bg-white border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isSafest
                            ? "bg-emerald-100 text-emerald-700"
                            : isWorst
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {getModeIcon(opt.icon)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {opt.mode}
                          </span>
                          {isSafest && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                              Lowest Dose
                            </span>
                          )}
                          {isWorst && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-500 text-white">
                              Highest Dose
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                          <span>Infiltration: {(opt.infiltration_factor * 100).toFixed(0)}%</span>
                          <span>•</span>
                          <span>Breathing: {opt.breathing_factor}x</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm sm:text-base font-extrabold text-slate-900 font-mono">
                        {opt.estimated_dose_ug} <span className="text-[10px] text-slate-400">µg</span>
                      </div>
                      <div className="text-[10px] font-medium text-slate-500 flex items-center justify-end gap-1">
                        <Cigarette className="w-3 h-3 text-slate-400" />
                        <span>~{opt.cigarettes_equivalent} cigs</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-8 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Based on Berkeley Earth & WHO inhalation kinetics
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full text-xs font-semibold text-white bg-[#0062ff] hover:bg-blue-700 transition-colors shadow-sm"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
}
