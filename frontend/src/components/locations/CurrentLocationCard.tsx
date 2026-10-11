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
  ArrowUpRight,
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
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    timestamp: null,
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
      msg = "Location permission denied by user or browser.";
    } else if (error.code === error.POSITION_UNAVAILABLE) {
      msg = "Position unavailable from GPS sensor.";
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
        name: `GPS Fix (${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
        latitude: location.latitude,
        longitude: location.longitude,
        radius_meters: 100,
        indoor_coefficient: 0.5,
        address: `GPS Accuracy: ±${location.accuracy ? location.accuracy.toFixed(1) : "N/A"}m`,
      });
      setSaveStatus("SAVED!");
      if (onLocationSaved) onLocationSaved();
      setTimeout(() => setSaveStatus(""), 2500);
    } catch (err: any) {
      setSaveStatus("ERROR");
      setTimeout(() => setSaveStatus(""), 2500);
    }
  };

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
    <div className="bg-white rounded-[26px] p-6 sm:p-7 shadow-soft border border-slate-200/80">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Live GPS Geolocation Telemetry
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Real-time browser positioning &amp; spatial vector tracking
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Watch Toggle */}
          <button
            onClick={toggleWatch}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all flex items-center gap-1.5 ${
              isWatching
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isWatching ? "animate-spin text-emerald-600" : "text-slate-400"}`} />
            {isWatching ? "Tracking Active" : "Live Watch"}
          </button>

          {/* Refresh Fix */}
          <button
            onClick={fetchSingleFix}
            disabled={location.status === "locating"}
            className="p-2 text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded-full transition-all"
            title="Refresh GPS Fix"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${location.status === "locating" ? "animate-spin text-blue-600" : ""}`} />
          </button>

          {/* Save Place Button */}
          <button
            onClick={handleQuickSaveCurrent}
            disabled={!location.latitude}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-full shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            {saveStatus || "Save Place"}
          </button>
        </div>
      </div>

      {location.errorMsg && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{location.errorMsg}</span>
        </div>
      )}

      {/* Grid of Geolocation Telemetry Fields */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* Latitude */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Latitude</span>
            <Navigation className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-900">
            {location.latitude !== null ? location.latitude.toFixed(6) : "N/A"}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 font-medium">Decimal Degrees (°N)</span>
        </div>

        {/* Longitude */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Longitude</span>
            <MapPin className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-900">
            {location.longitude !== null ? location.longitude.toFixed(6) : "N/A"}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 font-medium">Decimal Degrees (°E)</span>
        </div>

        {/* Accuracy */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Accuracy</span>
            <Target className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-900">
            ±{location.accuracy !== null ? location.accuracy.toFixed(1) : "N/A"} <span className="text-xs text-slate-400 font-normal">m</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1">
            {location.accuracy && location.accuracy < 20 ? "High Precision" : "Standard Precision"}
          </span>
        </div>

        {/* Speed */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Speed</span>
            <Gauge className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-900">
            {speedKmh} <span className="text-xs text-slate-400 font-normal">km/h</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 font-medium">
            {location.speed !== null ? `${location.speed.toFixed(1)} m/s` : "Stationary"}
          </span>
        </div>

        {/* Altitude */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Altitude</span>
            <Mountain className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-900">
            {location.altitude !== null ? `${location.altitude.toFixed(1)} m` : "N/A"}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 font-medium">Above sea level</span>
        </div>

        {/* Heading */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Heading</span>
            <Compass className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-900">
            {getHeadingCardinal(location.heading)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 font-medium">Vector direction</span>
        </div>

        {/* Timestamp */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Last Fix</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base font-bold font-mono text-slate-900">
            {location.timestamp || "No fix"}
          </div>
          {location.status === "active" ? (
            <span className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3 h-3" /> Realtime Sync
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
              {location.status === "locating" ? "Acquiring..." : "Awaiting Fix"}
            </span>
          )}
        </div>

        {/* Google Maps Anchor */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Map Coordinates</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
          </div>
          {location.latitude && location.longitude ? (
            <a
              href={`https://maps.google.com/?q=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-100 text-blue-600 border border-slate-200 rounded-xl text-xs font-semibold transition-colors mt-auto shadow-sm"
            >
              Open in Maps
            </a>
          ) : (
            <span className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold mt-auto cursor-not-allowed">
              Location Unavailable
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
