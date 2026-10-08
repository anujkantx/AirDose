"use client";

import React, { useEffect, useState } from "react";
import {
  Menu,
  LogOut,
  Bell,
  Home,
  Building2,
  GraduationCap,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { User, fetchUserLocations, UserLocation } from "@/lib/api";
import { calculateHaversineDistance, formatDistance } from "@/lib/haversine";

interface DashboardNavbarProps {
  user: User | null;
  onLogout: () => void;
  onOpenSidebar: () => void;
}

export default function DashboardNavbar({ user, onLogout, onOpenSidebar }: DashboardNavbarProps) {
  const [locating, setLocating] = useState<boolean>(false);
  const [locationStatus, setLocationStatus] = useState<{
    isMatched: boolean;
    locationType: string;
    displayText: string;
  }>({
    isMatched: false,
    locationType: "other",
    displayText: "Detecting location...",
  });

  const checkProximityToLocations = async (currentLat: number, currentLng: number) => {
    let savedLocs: UserLocation[] = [];

    try {
      savedLocs = await fetchUserLocations(user?.id);
    } catch (err) {
      console.warn("Could not fetch saved locations:", err);
    }

    if (savedLocs.length === 0) {
      savedLocs = [
        { id: 1, user_id: 1, location_type: "home", name: "Home", latitude: 28.6139, longitude: 77.2090, radius_meters: 50, indoor_coefficient: 0.5 },
      ];
    }

    let matchedPlace: UserLocation | null = null;
    let minDistanceToHome = Infinity;
    let homePlaceName = "Home";

    for (const loc of savedLocs) {
      const dist = calculateHaversineDistance(currentLat, currentLng, loc.latitude, loc.longitude);
      const placeRadius = loc.radius_meters || 50;

      if (dist <= placeRadius && !matchedPlace) {
        matchedPlace = loc;
      }

      if (loc.location_type.toLowerCase() === "home") {
        minDistanceToHome = dist;
        homePlaceName = loc.name || "Home";
      }
    }

    if (matchedPlace) {
      setLocationStatus({
        isMatched: true,
        locationType: matchedPlace.location_type.toLowerCase(),
        displayText: matchedPlace.name,
      });
      return;
    }

    if (minDistanceToHome === Infinity && savedLocs.length > 0) {
      const firstLoc = savedLocs[0];
      minDistanceToHome = calculateHaversineDistance(currentLat, currentLng, firstLoc.latitude, firstLoc.longitude);
      homePlaceName = firstLoc.name;
    }

    const formattedDist = formatDistance(minDistanceToHome);
    setLocationStatus({
      isMatched: false,
      locationType: "other",
      displayText: `${formattedDist} from ${homePlaceName}`,
    });
  };

  const detectCurrentLocation = () => {
    if (typeof window === "undefined") return;
    setLocating(true);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          checkProximityToLocations(lat, lng).finally(() => setLocating(false));
        },
        () => {
          checkProximityToLocations(28.6139, 77.2090).finally(() => setLocating(false));
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      checkProximityToLocations(28.6139, 77.2090).finally(() => setLocating(false));
    }
  };

  useEffect(() => {
    detectCurrentLocation();
  }, [user?.id]);

  const getLocationIcon = () => {
    if (!locationStatus.isMatched) {
      return <MapPin className="w-3.5 h-3.5 text-amber-500" />;
    }
    switch (locationStatus.locationType) {
      case "home":
        return <Home className="w-3.5 h-3.5 text-emerald-600" />;
      case "office":
        return <Building2 className="w-3.5 h-3.5 text-blue-600" />;
      case "college":
        return <GraduationCap className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <MapPin className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 px-4 sm:px-8 pt-4 pb-2 bg-[#f0f3f8]/95 backdrop-blur-md">
      <div className="w-full flex items-center justify-between gap-3">
        {/* Left: Mobile Menu & Proximity Pill */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenSidebar}
            className="p-2 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 hover:text-slate-900 lg:hidden"
            title="Open Navigation"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Proximity Pill & Location Badge */}
          <div className="flex items-center gap-1.5">
            <div className="inline-flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-full text-xs font-medium text-slate-700 border border-slate-200/70 shadow-sm">
              {getLocationIcon()}
              <span className="truncate max-w-[160px] sm:max-w-[260px] font-semibold text-slate-800">
                {locationStatus.displayText}
              </span>
              <button
                onClick={detectCurrentLocation}
                disabled={locating}
                className="p-0.5 text-slate-400 hover:text-blue-600 rounded-full transition-all ml-1"
                title="Refresh Proximity"
              >
                <RefreshCw className={`w-3 h-3 ${locating ? "animate-spin text-blue-600" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Notification & Profile */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button
            className="w-9 h-9 rounded-full bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* User Avatar Circle & Signout */}
          <div className="flex items-center gap-1.5 bg-white p-1 pr-2.5 rounded-full border border-slate-200/80 shadow-sm">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 flex items-center justify-center text-white text-xs font-bold">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <span className="text-xs font-bold text-slate-800 hidden sm:inline">
              {user?.name?.split(" ")[0] || "User"}
            </span>
            <button
              onClick={onLogout}
              className="p-1 text-slate-400 hover:text-rose-600 rounded-full transition-colors ml-1"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
