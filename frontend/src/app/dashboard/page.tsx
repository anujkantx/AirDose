"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import DashboardNavbar from "@/components/DashboardNavbar";
import AirQualityHero from "@/components/AirQualityHero";
import PollutantGrid from "@/components/PollutantGrid";
import AirTrendChart from "@/components/AirTrendChart";
import StationInfoCard from "@/components/StationInfoCard";
import CurrentLocationCard from "@/components/CurrentLocationCard";
import {
  getStoredUser,
  clearSession,
  fetchAirQuality,
  getStoredAirQuality,
  User,
  AirQualityData,
} from "@/lib/api";
import {
  Wind,
  RefreshCw,
  Sparkles,
  Radio,
  MapPin,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [airData, setAirData] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number }>({
    lat: 28.6139,
    lon: 77.2090,
  });

  // Authenticate session & load real air quality data (with caching)
  useEffect(() => {
    const currentUser = getStoredUser();
    if (!currentUser) {
      router.push("/signin");
      return;
    }
    setUser(currentUser);

    // 1. Check if we already have fresh cached air quality data (e.g. from tab/page switch)
    const cachedData = getStoredAirQuality();
    if (cachedData) {
      setAirData(cachedData);
      setLoading(false);
      return; // DO NOT make network call on tab or page switch
    }

    // 2. Cold load: detect coordinates and fetch once
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setUserCoords(coords);
          loadAirQuality(coords.lat, coords.lon, false);
        },
        (err) => {
          console.warn("Geolocation fallback to default coords:", err);
          loadAirQuality(28.6139, 77.2090, false);
        },
        { timeout: 6000 }
      );
    } else {
      loadAirQuality(28.6139, 77.2090, false);
    }
  }, [router]);

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

  const handleLogout = () => {
    clearSession();
    router.push("/signin");
  };

  if (loading && !airData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Wind className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <p className="text-sm font-medium">Connecting to OpenAQ Live Telemetry...</p>
        <p className="text-xs text-slate-500 mt-1">Calibrating nearest particulate matter &amp; gas sensors</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
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
        <main className="flex-1 p-6 sm:p-8 space-y-8 w-full">
          {/* Dashboard Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                OpenAQ Telemetry Live
              </span>
              <span className="text-xs text-slate-400 font-mono hidden md:inline">
                GPS: {userCoords.lat.toFixed(4)}, {userCoords.lon.toFixed(4)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => loadAirQuality(undefined, undefined, true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-400" : ""}`} />
                <span>{refreshing ? "Syncing..." : "Refresh Air Data"}</span>
              </button>
            </div>
          </div>


          {/* 1. Hero Air Quality & AQI Matrix */}
          <AirQualityHero data={airData} loading={refreshing && !airData} />

          {/* 2. Real-time Pollutant Matrix (PM2.5, PM10, NO2, O3, CO, SO2) */}
          <PollutantGrid data={airData} loading={refreshing && !airData} />

          {/* 3. Temporal Trend & Monitoring Station Split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AirTrendChart
                trendHistory={airData?.trend_history || []}
                currentAqi={airData?.aqi || 100}
              />
            </div>
            <div className="lg:col-span-1">
              <StationInfoCard
                station={airData?.station}
                temperature={airData?.pollutants?.temperature}
                humidity={airData?.pollutants?.humidity}
              />
            </div>
          </div>

          {/* 4. Live GPS & Telemetry Card */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Live GPS &amp; Sensor Telemetry
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">
                Realtime HTML5 Telemetry
              </span>
            </div>
            <CurrentLocationCard userId={user?.id} />
          </div>
        </main>
      </div>
    </div>
  );
}

