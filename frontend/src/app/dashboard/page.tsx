"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import DashboardNavbar from "@/components/layout/DashboardNavbar";
import TodayExposureHero from "@/components/dashboard/TodayExposureHero";
import ExposureHistoryChart from "@/components/dashboard/ExposureHistoryChart";
import { AiAdvisorModal } from "@/components/dashboard";
import AirQualityHero from "@/components/air-quality/AirQualityHero";
import PollutantGrid from "@/components/air-quality/PollutantGrid";
import StationInfoCard from "@/components/air-quality/StationInfoCard";
import { useExposureTracker } from "@/hooks";
import {
  getStoredUser,
  clearSession,
  fetchAirQuality,
  User,
  AirQualityData,
} from "@/lib/api";
import type { ExposureContext } from "@/types";
import { RefreshCw } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [airData, setAirData] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [aiAdvisorOpen, setAiAdvisorOpen] = useState<boolean>(false);
  const [aiAdvisorMode, setAiAdvisorMode] = useState<"chat" | "explain">("chat");

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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-slate-600 font-sans">
        <div className="w-10 h-10 rounded-2xl bg-[#0062ff] text-white flex items-center justify-center font-bold text-base mb-4 shadow-lg shadow-blue-500/20 animate-pulse">
          AD
        </div>
        <p className="text-sm font-bold text-slate-900">Initializing Health &amp; Inhalation Engine...</p>
        <p className="text-xs text-slate-400 mt-1">Connecting to OpenAQ particulate telemetry matrix</p>
      </div>
    );
  }

  const aiExposureContext: ExposureContext = {
    location: airData?.station?.name || "Current Location",
    latitude: userCoords.lat,
    longitude: userCoords.lon,
    pollutant: "pm25",
    concentration: airData?.pollutants?.pm25?.value ?? (exposureData?.current?.pm25 ?? 75.0),
    unit: "µg/m³",
    aqi: airData?.aqi ?? 85,
    activity: isAutoMode
      ? autoDetectedLabel
      : breathingFactor >= 3.0
      ? "Running"
      : breathingFactor >= 1.5
      ? "Walking"
      : "Rest",
    duration_minutes: 30.0,
    breathing_factor: breathingFactor,
    infiltration_factor: exposureData?.current?.infiltration_factor ?? 1.0,
    total_exposure_ug: exposureData?.total_exposure_ug ?? 0.0,
    inhalation_rate_ug_s: exposureData?.current?.inhalation_rate_ug_s,
    cigarettes_equivalent: exposureData?.cigarettes_equivalent,
    who_percentage: exposureData?.who_percentage,
    who_status: exposureData?.who_status,
    clean_air_shield_saved_ug: exposureData?.clean_air_shield_saved_ug,
    data_source: airData?.is_cached
      ? "cached"
      : airData?.status === "LIVE"
      ? "live"
      : "demo",
    observed_at: airData?.fetched_at,
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans">
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
          onOpenAiAdvisor={() => {
            setAiAdvisorMode("chat");
            setAiAdvisorOpen(true);
          }}
        />

        {/* 3. Main Dashboard Body */}
        <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 space-y-4">
          {/* Dashboard Header Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-full border border-slate-200/80 shadow-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sensor Telemetry
              </span>
              <span className="text-xs text-slate-500 font-medium hidden md:inline">
                GPS: {userCoords.lat.toFixed(4)}°N, {userCoords.lon.toFixed(4)}°E
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  loadAirQuality(userCoords.lat, userCoords.lon, true);
                  loadExposureSummary();
                }}
                disabled={refreshing}
                aria-label="Refresh air quality and exposure data"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-full transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
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
            onOpenAiAdvisor={(mode = "chat") => {
              setAiAdvisorMode(mode);
              setAiAdvisorOpen(true);
            }}
          />

          {/* TIER 2: Current Air Quality & Actionable Protection (Questions 2 & 3) */}
          {/* US-EPA Air Quality Index, Dominant Pollutant, Standardized Action Pills, and Route Simulation CTA */}
          <AirQualityHero data={airData} loading={refreshing && !airData} />

          {/* TIER 3: History & Scientific Grounding (Question 4 & Environmental Ground Truth) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 7-Day Inhalation History Analytics (Spacious 2/3 width) */}
            <div className="lg:col-span-2">
              <ExposureHistoryChart todayExposureUg={exposureData?.total_exposure_ug} />
            </div>

            {/* Monitoring Station Context (1/3 width) */}
            <div className="lg:col-span-1">
              <StationInfoCard
                station={airData?.station}
                temperature={airData?.pollutants?.temperature}
                humidity={airData?.pollutants?.humidity}
              />
            </div>
          </div>

          {/* TIER 3 Extension: Secondary Criteria Pollutants Matrix (6-Sensor Telemetry Matrix) */}
          <PollutantGrid data={airData} loading={refreshing && !airData} />
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-500 font-medium">
          AirDose — Personal PM2.5 Inhalation Monitor • Mathematical Inhalation Model v1.0
        </footer>
      </div>

      {/* Amazon Bedrock AI Exposure Advisor Modal */}
      <AiAdvisorModal
        isOpen={aiAdvisorOpen}
        onClose={() => setAiAdvisorOpen(false)}
        context={aiExposureContext}
        initialMode={aiAdvisorMode}
      />
    </div>
  );
}
