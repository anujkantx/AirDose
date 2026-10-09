"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  Home,
  Building2,
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import type { UserLocation } from "@/types";
import { fetchUserLocations, deleteUserLocation } from "@/lib/api";
import LocationFormModal from "./LocationFormModal";

interface SavedLocationsTableProps {
  userId?: number;
  onLocationsCountChange?: (count: number) => void;
}

export default function SavedLocationsTable({
  userId,
  onLocationsCountChange,
}: SavedLocationsTableProps) {
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingLocation, setEditingLocation] = useState<UserLocation | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadLocations = React.useCallback(async () => {
    try {
      const data = await fetchUserLocations(userId);
      setLocations(data);
      if (onLocationsCountChange) {
        onLocationsCountChange(data.length);
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
      const fallback: UserLocation[] = [
        {
          id: 1,
          user_id: userId || 1,
          location_type: "home",
          name: "Home Residence",
          latitude: 28.6139,
          longitude: 77.2090,
          address: "Central Delhi, India",
          radius_meters: 50,
          indoor_coefficient: 0.45,
          infiltration_factor: 0.45,
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          user_id: userId || 1,
          location_type: "office",
          name: "Tech Hub Office",
          latitude: 28.4595,
          longitude: 77.0266,
          address: "Cyber Hub, Gurugram, India",
          radius_meters: 50,
          indoor_coefficient: 0.35,
          infiltration_factor: 0.35,
          created_at: new Date().toISOString(),
        },
        {
          id: 3,
          user_id: userId || 1,
          location_type: "college",
          name: "University Campus",
          latitude: 28.5457,
          longitude: 77.1928,
          address: "IIT Delhi Campus, New Delhi",
          radius_meters: 50,
          indoor_coefficient: 0.55,
          infiltration_factor: 0.55,
          created_at: new Date().toISOString(),
        },
      ];
      setLocations(fallback);
      if (onLocationsCountChange) {
        onLocationsCountChange(fallback.length);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, onLocationsCountChange]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const handleOpenAddModal = () => {
    setEditingLocation(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (loc: UserLocation) => {
    setEditingLocation(loc);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      await deleteUserLocation(id, userId);
      await loadLocations();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyCoords = (id: number, lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getLocationBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "home":
        return {
          label: "Home",
          icon: Home,
          color: "bg-emerald-50 text-emerald-600 border-emerald-100",
        };
      case "office":
        return {
          label: "Office",
          icon: Building2,
          color: "bg-blue-50 text-[#0062ff] border-blue-100",
        };
      case "college":
        return {
          label: "College",
          icon: GraduationCap,
          color: "bg-purple-50 text-purple-600 border-purple-100",
        };
      default:
        return {
          label: "Other",
          icon: MapPin,
          color: "bg-slate-50 text-slate-600 border-slate-200",
        };
    }
  };

  const getInfiltrationBadge = (coeff: number) => {
    const filteredPercent = Math.max(0, Math.min(100, Math.round((1 - coeff) * 100)));
    if (filteredPercent >= 60) {
      return {
        filteredPercent,
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dotColor: "bg-emerald-500",
        label: "High filtration",
      };
    } else if (filteredPercent >= 40) {
      return {
        filteredPercent,
        color: "bg-amber-50 text-amber-700 border-amber-200",
        dotColor: "bg-amber-500",
        label: "Moderate filtration",
      };
    } else {
      return {
        filteredPercent,
        color: "bg-rose-50 text-rose-700 border-rose-200",
        dotColor: "bg-rose-500",
        label: "Low filtration",
      };
    }
  };

  const filteredLocations = locations.filter((loc) => {
    if (filterType === "all") return true;
    return loc.location_type.toLowerCase() === filterType.toLowerCase();
  });

  return (
    <div className="bg-white rounded-[26px] p-6 sm:p-7 shadow-soft border border-slate-100">
      {/* Category Filters and Add Place */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[#f0f3f8] p-1 rounded-full text-xs font-semibold overflow-x-auto">
          {[
            { id: "all", label: "All Places" },
            { id: "home", label: "Home" },
            { id: "office", label: "Office" },
            { id: "college", label: "College" },
            { id: "other", label: "Other" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${
                filterType === tab.id
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Add Place Trigger */}
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0062ff] hover:bg-blue-600 rounded-full shadow-sm hover:shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Geofenced Place</span>
        </button>
      </div>

      {/* Table of Geofenced Places */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="pb-3 pl-2">Location Name</th>
              <th className="pb-3 px-3">Type</th>
              <th className="pb-3 px-3">Coordinates &amp; Radius</th>
              <th className="pb-3 px-3">Infiltration Factor</th>
              <th className="pb-3 pr-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  Loading saved places...
                </td>
              </tr>
            ) : filteredLocations.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No places found for the selected filter.
                </td>
              </tr>
            ) : (
              filteredLocations.map((loc) => {
                const badge = getLocationBadge(loc.location_type);
                const BadgeIcon = badge.icon;
                const coeff = loc.infiltration_factor ?? loc.indoor_coefficient ?? 0.5;
                const infilBadge = getInfiltrationBadge(coeff);

                return (
                  <tr key={loc.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Name & Address */}
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${badge.color}`}
                        >
                          <BadgeIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            {loc.name}
                          </div>
                          {loc.address && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">
                              {loc.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category Badge */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </td>

                    {/* Lat / Long & Radius */}
                    <td className="py-3.5 px-3 font-mono text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700">
                          {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                        </span>
                        <button
                          onClick={() => handleCopyCoords(loc.id, loc.latitude, loc.longitude)}
                          className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                          title="Copy Coordinates"
                        >
                          {copiedId === loc.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                        Radius: {loc.radius_meters || 50}m
                      </div>
                    </td>

                    {/* Infiltration Factor Badge */}
                    <td className="py-3.5 px-3">
                      <div className="inline-flex flex-col">
                        <div
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${infilBadge.color}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${infilBadge.dotColor}`} />
                          <span className="font-mono">{coeff.toFixed(2)}</span>
                          <span className="font-normal text-[10px]">
                            ({infilBadge.filteredPercent}% filtered)
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {infilBadge.label}
                        </span>
                      </div>
                    </td>

                    {/* Action buttons: Edit & Delete */}
                    <td className="py-3.5 pr-2 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleOpenEditModal(loc)}
                          className="p-1.5 rounded-full text-slate-400 hover:text-[#0062ff] hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit / Update Place"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(loc.id)}
                          disabled={deletingId === loc.id}
                          className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Place"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Add or Update Saved Place */}
      <LocationFormModal
        key={editingLocation ? `edit-${editingLocation.id}` : `add-${isModalOpen}`}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadLocations}
        userId={userId}
        initialLocation={editingLocation}
      />
    </div>
  );
}
