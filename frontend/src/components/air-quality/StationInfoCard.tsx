"use client";

import React from "react";
import { Radio, ExternalLink, Building, Clock, ShieldCheck, Thermometer, Droplets, ArrowUpRight } from "lucide-react";
import { AirQualityStation, PollutantDetail } from "@/lib/api";

interface StationInfoCardProps {
  station?: AirQualityStation;
  temperature?: PollutantDetail;
  humidity?: PollutantDetail;
}

export default function StationInfoCard({ station, temperature, humidity }: StationInfoCardProps) {
  if (!station) return null;

  return (
    <div className="bg-white rounded-[26px] p-6 shadow-soft border border-slate-100 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0062ff] flex items-center justify-center">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Monitoring Station
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">OpenAQ Sensor Node</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Live
          </span>
        </div>

        <div className="space-y-3">
          {/* Station Name Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">
              Station Identifier
            </span>
            <p className="text-xs font-bold text-slate-800 leading-snug">{station.name}</p>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
              <Building className="w-3 h-3 text-slate-400" />
              {station.provider}
            </p>
          </div>

          {/* Telemetry Matrix Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium block">Distance</span>
              <span className="font-bold text-slate-900 text-sm font-mono mt-0.5 block">{station.distance_km} km</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium block">Precision</span>
              <span className="font-bold text-emerald-600 text-xs flex items-center gap-1 mt-1 font-mono">
                High Latency
              </span>
            </div>

            {temperature?.value !== undefined && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-amber-500" /> Temp
                </span>
                <span className="font-bold text-slate-900 text-sm font-mono mt-0.5 block">{temperature.value}°C</span>
              </div>
            )}

            {humidity?.value !== undefined && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-sky-500" /> Humidity
                </span>
                <span className="font-bold text-slate-900 text-sm font-mono mt-0.5 block">{humidity.value}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
          <Clock className="w-3 h-3" /> {station.last_updated || "Realtime"}
        </span>
        <a
          href={`https://maps.google.com/?q=${station.latitude},${station.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0062ff] hover:text-blue-700 transition-colors"
        >
          View Map <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
