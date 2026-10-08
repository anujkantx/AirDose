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

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
        <p className="text-sm">Loading location points session...</p>
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

        {/* 3. Main Body */}
        <main className="flex-1 p-6 sm:p-8 space-y-8 w-full">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Location Management
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                <Compass className="w-7 h-7 text-emerald-400" />
                Saved Location Points
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Manage Home, Office, College, and custom coordinate points with Haversine distance telemetry.
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
