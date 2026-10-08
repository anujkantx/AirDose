"use client";

import React, { useEffect, useState } from "react";
import { Menu, LogOut, RefreshCw, Home, Building2, GraduationCap, MapPin, Navigation } from "lucide-react";
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
      console.warn("Could not fetch saved locations for Haversine check:", err);
    }

    if (savedLocs.length === 0) {
      savedLocs = [
        { id: 1, user_id: 1, location_type: "home", name: "Home", latitude: 28.6139, longitude: 77.2090 },
      ];
    }

    // 1. Check if user is within 100m of ANY saved location
    let matchedPlace: UserLocation | null = null;
    let minDistanceToHome = Infinity;
    let homePlaceName = "Home";

    for (const loc of savedLocs) {
      const dist = calculateHaversineDistance(currentLat, currentLng, loc.latitude, loc.longitude);
      
      if (dist <= 100 && !matchedPlace) {
        matchedPlace = loc;
      }

      if (loc.location_type.toLowerCase() === "home") {
        minDistanceToHome = dist;
        homePlaceName = loc.name || "Home";
      }
    }

    // 2. If matched within 100m, show JUST the location name
    if (matchedPlace) {
      setLocationStatus({
        isMatched: true,
        locationType: matchedPlace.location_type.toLowerCase(),
        displayText: matchedPlace.name,
      });
      return;
    }

    // 3. Else, calculate distance from Home (or the first saved place)
    if (minDistanceToHome === Infinity && savedLocs.length > 0) {
      const firstLoc = savedLocs[0];
      minDistanceToHome = calculateHaversineDistance(currentLat, currentLng, firstLoc.latitude, firstLoc.longitude);
      homePlaceName = firstLoc.name;
    }

    const formattedDist = formatDistance(minDistanceToHome);
    setLocationStatus({
      isMatched: false,
      locationType: "other",
      displayText: `${formattedDist} away from ${homePlaceName}`,
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
        (err) => {
          console.warn("Geolocation fallback:", err);
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
      return <MapPin className="w-3.5 h-3.5 text-amber-400" />;
    }
    switch (locationStatus.locationType) {
      case "home":
        return <Home className="w-3.5 h-3.5 text-emerald-400" />;
      case "office":
        return <Building2 className="w-3.5 h-3.5 text-emerald-400" />;
      case "college":
        return <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <MapPin className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <header className="min-h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 py-3">
      {/* Left: Mobile trigger & User greeting with clean proximity badge below */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
            Welcome back, <span className="text-emerald-400">{user?.name || "User"}</span> 👋
          </h1>
          <div className="flex items-center gap-2 text-xs mt-1">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition-all shadow-sm ${
                locationStatus.isMatched
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-amber-500/10"
              }`}
            >
              {getLocationIcon()}
              <span>{locationStatus.displayText}</span>
            </span>

            <button
              onClick={detectCurrentLocation}
              disabled={locating}
              className="p-1 hover:text-emerald-400 text-slate-500 hover:bg-slate-800/60 rounded-lg transition-all"
              title="Recalculate Proximity"
            >
              <RefreshCw className={`w-3 h-3 ${locating ? "animate-spin text-emerald-400" : ""}`} />
            </button>
          </div>
        </div>
      </div>


      {/* Right: Actions & User status */}
      <div className="flex items-center gap-3">

        {/* Divider */}
        <div className="h-5 w-px bg-slate-800 mx-1" />

        {/* Logout Button */}
        <button
          onClick={onLogout}
          id="dashboard-logout-btn"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}


