"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import DashboardNavbar from "@/components/DashboardNavbar";
import TodayExposureHero from "@/components/TodayExposureHero";
import ExposureContributionCard from "@/components/ExposureContributionCard";
import ExposureHistoryChart from "@/components/ExposureHistoryChart";
import AirQualityHero from "@/components/AirQualityHero";
import PollutantGrid from "@/components/PollutantGrid";
import StationInfoCard from "@/components/StationInfoCard";
import CurrentLocationCard from "@/components/CurrentLocationCard";
import {
  getStoredUser,
  clearSession,
  fetchAirQuality,
  fetchTodayExposure,
  trackLocationTick,
  stopExposureTracking,
  User,
  AirQualityData,
  TodayExposureData,
} from "@/lib/api";
import { calculateHaversineDistance } from "@/lib/haversine";
import {
  RefreshCw,
  Radio,
  MapPin,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [airData, setAirData] = useState<AirQualityData | null>(null);
  const [exposureData, setExposureData] = useState<TodayExposureData | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(true);
  const [breathingFactor, setBreathingFactor] = useState<number>(1.0);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number }>({
    lat: 28.6139,
    lon: 77.2090,
  });

  const lastCheckpointRef = useRef<{ lat: number; lon: number; time: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Load exposure data on mount without resetting on refresh
  const loadExposureSummary = useCallback(async () => {
    try {
      const data = await fetchTodayExposure();
      setExposureData(data);
      if (data.tracking) {
        setIsTracking(true);
      }
    } catch (err) {
      console.warn("Could not load today exposure:", err);
    }
  }, []);

  // Send a location tick to backend exposure engine (checkpointed)
  const sendExposureTick = useCallback(
    async (lat: number, lon: number, accuracy?: number, speed?: number, heading?: number, force: boolean = false) => {
      const now = Date.now();
      const last = lastCheckpointRef.current;

      // Rate limit checkpoints: require >= 25m movement OR >= 60s elapsed unless force is true
      if (!force && last) {
        const dist = calculateHaversineDistance(lat, lon, last.lat, last.lon);
        const elapsedSec = (now - last.time) / 1000;
        if (dist < 25 && elapsedSec < 60) {
          return; // Skip tick - live counter runs locally on frontend!
        }
      }

      try {
        lastCheckpointRef.current = { lat, lon, time: now };
        const res = await trackLocationTick({
          latitude: lat,
          longitude: lon,
          accuracy: accuracy ?? null,
          speed: speed ?? null,
          heading: heading ?? null,
          breathing_factor: breathingFactor,
          client_timestamp: now / 1000,
        });

        if (res && res.state) {
          setExposureData((prev) => {
            const currentObj = {
              pm25: res.state.pm25,
              environment: res.state.location_type,
              location_id: res.state.location_id,
              location_name: res.state.location_name,
              infiltration_factor: res.state.infiltration_factor,
              breathing_factor: res.state.breathing_factor,
              base_breathing_rate_m3_s: res.state.base_breathing_rate_m3_s,
              inhalation_rate_ug_s: res.state.inhalation_rate_ug_s,
              last_pollution_updated_seconds_ago: 0,
            };

            const updatedContribs = { ...(prev?.contributions || {}) };
            const envKey = res.state.location_type;
            updatedContribs[envKey] = (updatedContribs[envKey] || 0) + res.state.accumulated_exposure_ug;

            return {
              date: prev?.date || new Date().toISOString().split("T")[0],
              total_exposure_ug: res.total_exposure_ug,
              current: currentObj,
              contributions: updatedContribs,
              tracking: true,
            };
          });
        }
      } catch (err) {
        console.warn("Error sending exposure tick:", err);
      }
    },
    [breathingFactor]
  );

  // Authenticate session & load initial data
  useEffect(() => {
    const currentUser = getStoredUser();
    if (!currentUser) {
      router.push("/signin");
      return;
    }
    setUser(currentUser);

    // 1. Load today's exposure summary and active tracking status
    loadExposureSummary();

    // 2. Fetch air quality via backend spatio-temporal cache
    loadAirQuality(userCoords.lat, userCoords.lon, false);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setUserCoords(coords);
          loadAirQuality(coords.lat, coords.lon, false);
          // Initial exposure tracking tick
          sendExposureTick(
            coords.lat,
            coords.lon,
            pos.coords.accuracy,
            pos.coords.speed || undefined,
            pos.coords.heading || undefined,
            true
          );
        },
        (err) => {
          console.warn("Geolocation fallback to default coords:", err);
          if (err.code === err.PERMISSION_DENIED) {
            setPermissionDenied(true);
          }
          loadAirQuality(28.6139, 77.2090, false);
          sendExposureTick(28.6139, 77.2090, 15, undefined, undefined, true);
        },
        { timeout: 8000 }
      );
    } else {
      loadAirQuality(28.6139, 77.2090, false);
      sendExposureTick(28.6139, 77.2090, 15, undefined, undefined, true);
    }
  }, [router, loadExposureSummary, sendExposureTick]);

  // High-accuracy location watcher for continuous exposure tracking
  useEffect(() => {
    if (!isTracking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if ("geolocation" in navigator) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setUserCoords(coords);
          sendExposureTick(
            coords.lat,
            coords.lon,
            pos.coords.accuracy,
            pos.coords.speed || undefined,
            pos.coords.heading || undefined,
            false
          );
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setPermissionDenied(true);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
      watchIdRef.current = id;
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isTracking, sendExposureTick]);

  const loadAirQuality = async (lat?: number, lon?: number, forceRefresh: boolean = false) => {
    const targetLat = lat ?? userCoords.lat;
    const targetLon = lon ?? userCoords.lon;
    try {
      setRefreshing(true);
      const data = await fetchAirQuality(targetLat, targetLon, forceRefresh);
      setAirData(data);
    } catch (err) {
      console.error("Error loading OpenAQ air quality data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleTracking = async () => {
    if (isTracking) {
      // Pause / Stop tracking
      try {
        await stopExposureTracking();
        setIsTracking(false);
        loadExposureSummary();
      } catch (err) {
        console.error("Failed to stop tracking:", err);
      }
    } else {
      // Start tracking
      setIsTracking(true);
      sendExposureTick(userCoords.lat, userCoords.lon, 10, undefined, undefined, true);
    }
  };

  const handleBreathingFactorChange = (newFactor: number) => {
    setBreathingFactor(newFactor);
    if (isTracking) {
      sendExposureTick(userCoords.lat, userCoords.lon, 10, undefined, undefined, true);
    }
  };

  const handleLogout = () => {
    if (isTracking) {
      stopExposureTracking().catch(() => {});
    }
    clearSession();
    router.push("/signin");
  };

  if (loading && !airData) {
    return (
      <div className="min-h-screen bg-[#f0f3f8] flex flex-col items-center justify-center text-slate-500 font-sans">
        <div className="w-10 h-10 rounded-2xl bg-[#0062ff] text-white flex items-center justify-center font-bold text-base mb-4 shadow-lg shadow-blue-500/20 animate-pulse">
          AD
        </div>
        <p className="text-sm font-bold text-slate-800">Initializing Health &amp; Inhalation Engine...</p>
        <p className="text-xs text-slate-400 mt-1">Connecting to OpenAQ particulate telemetry matrix</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f3f8] text-slate-900 flex font-sans">
      {/* 1. Sidebar */}
      <Sidebar
        user={user}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* 2. Top Dashboard Navbar */}
        <DashboardNavbar
          user={user}
          onLogout={handleLogout}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        {/* 3. Main Dashboard Body */}
        <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 space-y-4">
          {/* Dashboard Header Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-[#0062ff] bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-soft flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sensor Telemetry
              </span>
              <span className="text-xs text-slate-400 font-medium hidden md:inline">
                GPS: {userCoords.lat.toFixed(4)}°N, {userCoords.lon.toFixed(4)}°E
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  loadAirQuality(undefined, undefined, true);
                  loadExposureSummary();
                }}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-full transition-all shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#0062ff]" : ""}`} />
                <span>{refreshing ? "Syncing..." : "Refresh Matrix"}</span>
              </button>
            </div>
          </div>

          {/* 1. Personal Exposure Tracking Hero (Matches Reference) */}
          <TodayExposureHero
            userName={user?.name}
            userId={user?.id}
            userCoords={userCoords}
            exposureData={exposureData}
            isTracking={isTracking}
            onToggleTracking={handleToggleTracking}
            selectedBreathingFactor={breathingFactor}
            onBreathingFactorChange={handleBreathingFactorChange}
            permissionDenied={permissionDenied}
          />

          {/* 2. Exposure Insights: Micro-Environment Doughnut & Historical Inhalation Log */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ExposureContributionCard
              contributions={exposureData?.contributions || {}}
              totalExposureUg={exposureData?.total_exposure_ug || 0}
            />
            <ExposureHistoryChart todayExposureUg={exposureData?.total_exposure_ug} />
          </div>

          {/* 3. Hero Air Quality & AQI Matrix */}
          <AirQualityHero data={airData} loading={refreshing && !airData} />

          {/* 4. Real-time Pollutant Matrix (PM2.5, PM10, NO2, O3, CO, SO2) */}
          <PollutantGrid data={airData} loading={refreshing && !airData} />

          {/* 5. Monitoring Station & Live GPS Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <StationInfoCard
                station={airData?.station}
                temperature={airData?.pollutants?.temperature}
                humidity={airData?.pollutants?.humidity}
              />
            </div>
            <div className="lg:col-span-2">
              <CurrentLocationCard
                userId={user?.id}
                onLocationSaved={() => {
                  sendExposureTick(userCoords.lat, userCoords.lon, 10, undefined, undefined, true);
                }}
              />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200/60 py-5 text-center text-xs text-slate-400 font-medium">
          AirDose — Personal PM2.5 Inhalation Monitor • Mathematical Inhalation Model v1.0
        </footer>
      </div>
    </div>
  );
}
