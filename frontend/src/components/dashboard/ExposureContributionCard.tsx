"use client";

import React from "react";
import {
  MoreHorizontal,
  Home,
  Building2,
  Trees,
  Car,
  CheckCircle2,
  GraduationCap,
  Sparkles,
} from "lucide-react";

interface ExposureContributionCardProps {
  contributions: Record<string, number>;
  totalExposureUg: number;
}

export default function ExposureContributionCard({
  contributions,
  totalExposureUg,
}: ExposureContributionCardProps) {
  const safeTotal =
    totalExposureUg > 0
      ? totalExposureUg
      : Object.values(contributions).reduce((a, b) => a + b, 0);

  const items = [
    {
      key: "HOME",
      label: "Home Residence",
      detail: "Indoor HEPA / 50% Filter",
      icon: Home,
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-50",
      ug: Number(contributions["HOME"] || 0),
      ratio: "6/7",
    },
    {
      key: "OFFICE",
      label: "Office Workplace",
      detail: "Commercial HVAC / 60% Filter",
      icon: Building2,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-50",
      ug: Number(contributions["OFFICE"] || 0),
      ratio: "5/7",
    },
    {
      key: "OUTDOOR",
      label: "Outdoor Environment",
      detail: "Direct Ambient Exposure (1.0)",
      icon: Trees,
      iconColor: "text-purple-500",
      bgColor: "bg-purple-50",
      ug: Number(contributions["OUTDOOR"] || 0),
      ratio: "7/7",
    },
    {
      key: "TRANSIT",
      label: "Transit & Commute",
      detail: "Roadside / Cabin Exposure",
      icon: Car,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-50",
      ug: Number(contributions["TRANSIT"] || 0),
      ratio: "4/7",
    },
  ];

  return (
    <div className="bg-white rounded-[26px] p-6 border border-slate-100 shadow-soft flex flex-col justify-between min-w-0">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Micro-Environment Doses
            </h3>
            <p className="text-xs text-slate-400">
              Accumulated inhaled mass by zone today
            </p>
          </div>
          <button className="text-slate-400 hover:text-slate-900 p-1">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Rows with round badges matching image */}
        <div className="space-y-3 my-2">
          {items.map((item) => {
            const Icon = item.icon;
            const pct = safeTotal > 0 ? Math.round((item.ug / safeTotal) * 100) : 0;

            return (
              <div
                key={item.key}
                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>

                  <div className={`w-8 h-8 rounded-xl ${item.bgColor} ${item.iconColor} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {item.detail}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black font-mono text-slate-900">
                    {item.ug.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">μg</span>
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400">
                    {pct}% share
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Total Day Dose:</span>
        <span className="font-extrabold text-[#0062ff] font-mono text-sm">
          {safeTotal.toFixed(2)} μg
        </span>
      </div>
    </div>
  );
}
