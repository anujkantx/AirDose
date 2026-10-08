"use client";

import React from "react";
import { Radio, ExternalLink, MapPin, Building, Clock, ShieldCheck, Thermometer, Droplets } from "lucide-react";
import { AirQualityStation, PollutantDetail } from "@/lib/api";

interface StationInfoCardProps {
  station?: AirQualityStation;
  temperature?: PollutantDetail;
  humidity?: PollutantDetail;
}

export default function StationInfoCard({ station, temperature, humidity }: StationInfoCardProps) {
  if (!station) return null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Monitoring Station
            </h3>
          </div>
          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            OpenAQ Verified
          </span>
        </div>

        <div className="space-y-3">
          {/* Station Name */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
              Station Name &amp; Network
            </span>
            <p className="text-xs font-bold text-white leading-snug">{station.name}</p>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <Building className="w-3 h-3 text-slate-500" />
              {station.provider}
            </p>
          </div>

          {/* Station Telemetry Matrix */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-[10px] text-slate-500 block">Distance to Station</span>
              <span className="font-mono font-bold text-white text-sm">{station.distance_km} km</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-[10px] text-slate-500 block">Station Status</span>
              <span className="font-semibold text-emerald-400 text-xs flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Online
              </span>
            </div>

            {temperature?.value !== undefined && (
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-amber-400" /> Temperature
                </span>
                <span className="font-mono font-bold text-white text-sm">{temperature.value}°C</span>
              </div>
            )}

            {humidity?.value !== undefined && (
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-cyan-400" /> Humidity
                </span>
                <span className="font-mono font-bold text-white text-sm">{humidity.value}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Google Maps Anchor */}
      <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {station.last_updated || "Live"}
        </span>
        <a
          href={`https://maps.google.com/?q=${station.latitude},${station.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          View Map <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
