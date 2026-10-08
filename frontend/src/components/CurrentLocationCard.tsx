"use client";

import React, { useState, useEffect } from "react";
import {
  Navigation,
  Compass,
  Gauge,
  Target,
  Mountain,
  Clock,
  RefreshCw,
  ExternalLink,
  Plus,
  Radio,
  CheckCircle2,
  AlertCircle,
  MapPin,
} from "lucide-react";
import { addUserLocation } from "@/lib/api";

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: string | null;
  status: "idle" | "locating" | "active" | "error";
  errorMsg: string | null;
}

interface CurrentLocationCardProps {
  userId?: number;
  onLocationSaved?: () => void;
}

export default function CurrentLocationCard({
  userId,
  onLocationSaved,
}: CurrentLocationCardProps) {
  const [location, setLocation] = useState<LocationData>({
    latitude: 28.6139,
    longitude: 77.2090,
    accuracy: 15.0,
    altitude: 216.4,
    altitudeAccuracy: 4.2,
    heading: 180,
    speed: 0.0,
    timestamp: new Date().toLocaleTimeString(),
    status: "idle",
    errorMsg: null,
  });

  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>("");

  const updatePosition = (position: GeolocationPosition) => {
    const coords = position.coords;
    setLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      altitude: coords.altitude,
      altitudeAccuracy: coords.altitudeAccuracy,
      heading: coords.heading,
      speed: coords.speed,
      timestamp: new Date(position.timestamp).toLocaleTimeString(),
      status: "active",
      errorMsg: null,
    });
  };

  const handlePositionError = (error: GeolocationPositionError) => {
    let msg = "Could not fetch GPS coordinates.";
    if (error.code === error.PERMISSION_DENIED) {
      msg = "Location permission denied by user/browser.";
    } else if (error.code === error.POSITION_UNAVAILABLE) {
      msg = "Position unavailable. Showing default coordinates.";
    } else if (error.code === error.TIMEOUT) {
      msg = "Location request timed out.";
    }
    setLocation((prev) => ({
      ...prev,
      status: "error",
      errorMsg: msg,
    }));
  };

  const fetchSingleFix = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocation((prev) => ({
        ...prev,
        status: "error",
        errorMsg: "Geolocation is not supported by your browser.",
      }));
      return;
    }

    setLocation((prev) => ({ ...prev, status: "locating", errorMsg: null }));
    navigator.geolocation.getCurrentPosition(
      updatePosition,
      handlePositionError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const toggleWatch = () => {
    if (isWatching) {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
      setIsWatching(false);
      setLocation((prev) => ({ ...prev, status: "idle" }));
    } else {
      if (!("geolocation" in navigator)) return;
      setLocation((prev) => ({ ...prev, status: "locating" }));
      const id = navigator.geolocation.watchPosition(
        updatePosition,
        handlePositionError,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
      );
      setWatchId(id);
      setIsWatching(true);
    }
  };

  useEffect(() => {
    fetchSingleFix();
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const handleQuickSaveCurrent = async () => {
    if (!location.latitude || !location.longitude) return;
    try {
      setSaveStatus("Saving...");
      await addUserLocation({
        user_id: userId || 1,
        location_type: "other",
        name: `Current Location (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        latitude: location.latitude,
        longitude: location.longitude,
        address: `GPS Accuracy: ±${location.accuracy ? location.accuracy.toFixed(1) : 'N/A'}m`,
      });
      setSaveStatus("Saved!");
      if (onLocationSaved) onLocationSaved();
      setTimeout(() => setSaveStatus(""), 2500);
    } catch (err: any) {
      setSaveStatus("Save failed");
      setTimeout(() => setSaveStatus(""), 2500);
    }
  };

  // Convert speed from m/s to km/h
  const speedKmh =
    location.speed !== null && !isNaN(location.speed)
      ? (location.speed * 3.6).toFixed(1)
      : "0.0";

  const getHeadingCardinal = (deg: number | null) => {
    if (deg === null || isNaN(deg)) return "N/A";
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const idx = Math.round(deg / 45) % 8;
    return `${deg.toFixed(0)}° (${directions[idx]})`;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-slate-700/80 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Live Current Location Data
            </h3>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                location.status === "active"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : location.status === "locating"
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isWatching ? "bg-emerald-400 animate-ping" : "bg-slate-400"}`} />
              {isWatching ? "Live Watching" : location.status === "active" ? "GPS Locked" : "GPS Ready"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry breakdown: Latitude, Longitude, Accuracy, Speed, Altitude, Heading &amp; Timestamp.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Watch toggle */}
          <button
            onClick={toggleWatch}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 ${
              isWatching
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isWatching ? "animate-spin text-emerald-400" : ""}`} />
            {isWatching ? "Stop Tracking" : "Live Watch"}
          </button>

          {/* Refresh fix */}
          <button
            onClick={fetchSingleFix}
            disabled={location.status === "locating"}
            className="p-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
            title="Refresh GPS Fix"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${location.status === "locating" ? "animate-spin text-emerald-400" : ""}`} />
          </button>

          {/* Quick save button */}
          <button
            onClick={handleQuickSaveCurrent}
            disabled={!location.latitude}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            {saveStatus || "Save Place"}
          </button>
        </div>
      </div>

      {location.errorMsg && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{location.errorMsg}</span>
        </div>
      )}

      {/* Grid of Geolocation Telemetry Fields */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* 1. Latitude */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Latitude</span>
            <Navigation className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {location.latitude !== null ? location.latitude.toFixed(6) : "N/A"}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Decimal Degrees (°N)</span>
        </div>

        {/* 2. Longitude */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Longitude</span>
            <MapPin className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {location.longitude !== null ? location.longitude.toFixed(6) : "N/A"}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Decimal Degrees (°E)</span>
        </div>

        {/* 3. Accuracy */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Accuracy</span>
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            ±{location.accuracy !== null ? location.accuracy.toFixed(1) : "N/A"} <span className="text-xs text-slate-400 font-normal">m</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-medium mt-1">
            {location.accuracy && location.accuracy < 20 ? "High Precision" : "Standard Precision"}
          </span>
        </div>

        {/* 4. Speed */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Speed</span>
            <Gauge className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {speedKmh} <span className="text-xs text-slate-400 font-normal">km/h</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">
            {location.speed !== null ? `${location.speed.toFixed(1)} m/s` : "Stationary"}
          </span>
        </div>

        {/* 5. Altitude */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Altitude</span>
            <Mountain className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {location.altitude !== null ? `${location.altitude.toFixed(1)} m` : "N/A"}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">
            {location.altitudeAccuracy !== null ? `±${location.altitudeAccuracy.toFixed(1)}m vertical` : "Above sea level"}
          </span>
        </div>

        {/* 6. Heading */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Heading</span>
            <Compass className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {getHeadingCardinal(location.heading)}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Direction of travel</span>
        </div>

        {/* 7. Timestamp */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Last Fix</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg font-semibold text-white tracking-tight font-mono">
            {location.timestamp || "Just now"}
          </div>
          <span className="text-[10px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Realtime Sync
          </span>
        </div>

        {/* 8. Google Maps Link Card */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Map Navigation</span>
            <ExternalLink className="w-4 h-4 text-cyan-400" />
          </div>
          <a
            href={
              location.latitude && location.longitude
                ? `https://maps.google.com/?q=${location.latitude},${location.longitude}`
                : "#"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-lg text-xs font-semibold transition-colors mt-auto"
          >
            Open Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}
