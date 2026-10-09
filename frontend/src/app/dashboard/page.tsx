"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import DashboardNavbar from "@/components/layout/DashboardNavbar";
import TodayExposureHero from "@/components/dashboard/TodayExposureHero";
import ExposureContributionCard from "@/components/dashboard/ExposureContributionCard";
import ExposureHistoryChart from "@/components/dashboard/ExposureHistoryChart";
import AirQualityHero from "@/components/air-quality/AirQualityHero";
import PollutantGrid from "@/components/air-quality/PollutantGrid";
import StationInfoCard from "@/components/air-quality/StationInfoCard";
import CleanAirAdvisoryCard from "@/components/air-quality/CleanAirAdvisoryCard";
import CurrentLocationCard from "@/components/locations/CurrentLocationCard";
import { useExposureTracker } from "@/hooks";
import {
  getStoredUser,
  clearSession,
  fetchAirQuality,
  User,
  AirQualityData,
} from "@/lib/api";
import { RefreshCw } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [airData, setAirData] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const loadAirQuality = useCallback(async (lat: number, lon: number, forceRefresh: boolean = false) => {
    try {
      setRefreshing(true);
      const data = await fetchAirQuality(lat, lon, forceRefresh);
      setAirData(data);
    } catch (err) {
      console.error("Error loading OpenAQ air quality data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const {
    userCoords,
    exposureData,
    isTracking,
    breathingFactor,
    isAutoMode,
    autoDetectedLabel,
    permissionDenied,
    loadExposureSummary,
    handleToggleTracking,
    handleAutoModeChange,
    handleBreathingFactorChange,
    recordCurrentTick,
    stopTrackingOnExit,
  } = useExposureTracker({
    initialCoords: { lat: 28.6139, lon: 77.2090 },
    onCoordsChange: (coords) => {
      loadAirQuality(coords.lat, coords.lon, false);
    },
  });

  // Authenticate session & load initial air quality
  useEffect(() => {
    const currentUser = getStoredUser();
    if (!currentUser) {
      router.push("/signin");
      return;
    }
    setUser(currentUser);
    loadAirQuality(userCoords.lat, userCoords.lon, false);
  }, [router, loadAirQuality, userCoords.lat, userCoords.lon]);

  const handleLogout = () => {
    stopTrackingOnExit();
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
                  loadAirQuality(userCoords.lat, userCoords.lon, true);
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

          {/* 1. Personal Exposure Tracking Hero */}
          <TodayExposureHero
            userName={user?.name}
            userId={user?.id}
            userCoords={userCoords}
            exposureData={exposureData}
            isTracking={isTracking}
            onToggleTracking={handleToggleTracking}
            selectedBreathingFactor={breathingFactor}
            onBreathingFactorChange={handleBreathingFactorChange}
            isAutoMode={isAutoMode}
            onAutoModeChange={handleAutoModeChange}
            autoDetectedLabel={autoDetectedLabel}
            permissionDenied={permissionDenied}
          />

          {/* 2. Exposure Insights: Micro-Environment Breakdown, Historical Inhalation Log & Health Advisory */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ExposureContributionCard
              contributions={exposureData?.contributions || {}}
              totalExposureUg={exposureData?.total_exposure_ug || 0}
            />
            <ExposureHistoryChart todayExposureUg={exposureData?.total_exposure_ug} />
            <CleanAirAdvisoryCard airData={airData} exposureData={exposureData} />
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
                onLocationSaved={recordCurrentTick}
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
