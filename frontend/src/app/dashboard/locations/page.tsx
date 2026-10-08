"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import DashboardNavbar from "@/components/DashboardNavbar";
import SavedLocationsTable from "@/components/SavedLocationsTable";
import { getStoredUser, clearSession, User } from "@/lib/api";
import { RefreshCw, MapPin, Compass } from "lucide-react";

export default function SavedLocationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    const currentUser = getStoredUser();
    if (!currentUser) {
      router.push("/signin");
      return;
    }
    setUser(currentUser);
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push("/signin");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f3f8] flex flex-col items-center justify-center text-slate-500 font-sans">
        <RefreshCw className="w-6 h-6 text-[#0062ff] animate-spin mb-3" />
        <p className="text-xs font-semibold">Loading saved places...</p>
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

        {/* 3. Main Body */}
        <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-[#0062ff] bg-blue-50 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#0062ff]" /> Geofence Configuration
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Saved Places &amp; Geofences
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Configure Home, Office, College, and custom radius boundaries for micro-environment indoor coefficient matching.
              </p>
            </div>
          </div>

          {/* Saved Location Points Table */}
          <SavedLocationsTable key={`loc-table-${refreshKey}`} userId={user?.id} />
        </main>
      </div>
    </div>
  );
}
