"use client";

import React from "react";
import Link from "next/link";
import { Zap, X, CheckCircle2, Cigarette, ArrowUpRight } from "lucide-react";

interface ExposureFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculatedLiveRate: number;
  activeRate: number;
  pm25Value: number;
  infiltrationFactor: number;
  selectedBreathingFactor: number;
}

export default function ExposureFormulaModal({
  isOpen,
  onClose,
  calculatedLiveRate,
  activeRate,
  pm25Value,
  infiltrationFactor,
  selectedBreathingFactor,
}: ExposureFormulaModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden relative animate-in zoom-in-95 duration-200">
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#0062ff] flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Live Rate Kinetics &amp; Formula
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Mathematical model breakdown based on ICRP &amp; Berkeley Earth
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="p-4 rounded-2xl bg-slate-950 text-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                Fundamental Equation
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Microgram Kinetics
              </span>
            </div>
            <div className="py-1 font-mono text-sm sm:text-base font-extrabold text-white tracking-wide">
              Inhalation Rate (μg/s) = <span className="text-blue-400">PM₂.₅</span> ×{" "}
              <span className="text-emerald-400">I_f</span> ×{" "}
              <span className="text-purple-400">B_f</span> ×{" "}
              <span className="text-amber-400">V_E</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0062ff]" />
                Current Numerical Substitution
              </span>
              <span className="text-[11px] font-mono font-bold text-[#0062ff]">
                Rate: {calculatedLiveRate.toFixed(6)} μg/s
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-blue-100/80 font-mono text-xs text-slate-800 space-y-1.5">
              <div className="flex items-center gap-1 flex-wrap font-semibold">
                <span>Rate =</span>
                <span className="text-[#0062ff] bg-blue-50 px-1.5 py-0.5 rounded">
                  {pm25Value.toFixed(1)} μg/m³
                </span>
                <span>×</span>
                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {infiltrationFactor.toFixed(2)} (If)
                </span>
                <span>×</span>
                <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                  {selectedBreathingFactor.toFixed(1)}× (Bf)
                </span>
                <span>×</span>
                <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                  0.0001 m³/s
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                <span>Hourly Inhaled Mass:</span>
                <span className="font-bold text-slate-900">
                  {(activeRate * 3600).toFixed(2)} μg / hour
                </span>
              </div>
            </div>
          </div>

          {/* Health Conversion Benchmark */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Cigarette className="w-3.5 h-3.5 text-amber-600" />
                Cigarette Equivalent Methodology
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                Berkeley Earth
              </span>
            </div>
            <p className="text-[11px] text-amber-900/90 leading-relaxed">
              1 cigarette is medically equivalent to inhaling ~20.0 µg of retained PM2.5 deep particulate. AirDose translates your cumulative microgram intake directly into transparent cigarette equivalents so you can make actionable lifestyle changes.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <Link
            href="/dashboard/details"
            onClick={onClose}
            className="text-xs font-bold text-[#0062ff] hover:text-blue-700 flex items-center gap-1"
          >
            <span>Read Full Scientific Methodology</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
