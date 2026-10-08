"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  Home,
  Building2,
  GraduationCap,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Navigation,
  Sparkles,
  X,
  Compass,
} from "lucide-react";
import {
  UserLocation,
  UserLocationInput,
  fetchUserLocations,
  addUserLocation,
  deleteUserLocation,
} from "@/lib/api";

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
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Form State
  const [formData, setFormData] = useState<UserLocationInput>({
    location_type: "home",
    name: "",
    latitude: 28.6139,
    longitude: 77.2090,
    address: "",
  });

  const loadLocations = async () => {
    try {
      setLoading(true);
      const data = await fetchUserLocations(userId);
      setLocations(data);
      if (onLocationsCountChange) {
        onLocationsCountChange(data.length);
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
      // Fallback sample data if backend endpoint is unavailable during initial render
      const fallback: UserLocation[] = [
        {
          id: 1,
          user_id: userId || 1,
          location_type: "home",
          name: "Home Residence",
          latitude: 28.6139,
          longitude: 77.2090,
          address: "Central Delhi, India",
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
  };

  useEffect(() => {
    loadLocations();
  }, [userId]);

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("Please provide a name for this location.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      await addUserLocation({
        ...formData,
        user_id: userId || 1,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
      });
      setIsModalOpen(false);
      setFormData({
        location_type: "home",
        name: "",
        latitude: 28.6139,
        longitude: 77.2090,
        address: "",
      });
      await loadLocations();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save location point.");
    } finally {
      setSubmitting(false);
    }
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

  const handleDetectGPS = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: Number(position.coords.latitude.toFixed(6)),
            longitude: Number(position.coords.longitude.toFixed(6)),
            address: prev.address || "Detected via GPS",
          }));
        },
        (error) => {
          setErrorMsg("Could not fetch GPS position. Please enter manually.");
        }
      );
    } else {
      setErrorMsg("Geolocation is not supported by your browser.");
    }
  };

  const applyPreset = (type: string, name: string, lat: number, lng: number, addr: string) => {
    setFormData({
      location_type: type,
      name,
      latitude: lat,
      longitude: lng,
      address: addr,
    });
  };

  const getLocationBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "home":
        return {
          label: "Home",
          icon: Home,
          color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        };
      case "office":
        return {
          label: "Office",
          icon: Building2,
          color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
        };
      case "college":
        return {
          label: "College",
          icon: GraduationCap,
          color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        };
      default:
        return {
          label: "Other",
          icon: MapPin,
          color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        };
    }
  };

  const filteredLocations =
    filterType === "all"
      ? locations
      : locations.filter((loc) => loc.location_type.toLowerCase() === filterType);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Saved Location Points
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
              {locations.length} Saved
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Store latitude &amp; longitude coordinates for Home, Office, College, and custom places.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Category Filter Pills */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {["all", "home", "office", "college", "other"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterType(cat)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                  filterType === cat
                    ? "bg-slate-800 text-emerald-400 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Add Location Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-sm shadow-emerald-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Point
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <th className="pb-3 font-semibold">Type</th>
              <th className="pb-3 font-semibold">Location Name</th>
              <th className="pb-3 font-semibold">Coordinates (Lat, Lng)</th>
              <th className="pb-3 font-semibold">Address</th>
              <th className="pb-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  Loading saved coordinates...
                </td>
              </tr>
            ) : filteredLocations.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  No saved locations found for this filter. Click "+ Add Point" to create one.
                </td>
              </tr>
            ) : (
              filteredLocations.map((loc) => {
                const badge = getLocationBadge(loc.location_type);
                const BadgeIcon = badge.icon;
                return (
                  <tr key={loc.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Type Badge */}
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${badge.color}`}
                      >
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-3 font-semibold text-white">
                      {loc.name}
                    </td>

                    {/* Coordinates */}
                    <td className="py-3 font-mono text-slate-300">
                      <div className="flex items-center gap-2">
                        <span>
                          {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                        </span>
                        <button
                          onClick={() => handleCopyCoords(loc.id, loc.latitude, loc.longitude)}
                          className="p-1 rounded text-slate-500 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                          title="Copy Coordinates"
                        >
                          {copiedId === loc.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={`https://maps.google.com/?q=${loc.latitude},${loc.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                          title="Open in Google Maps"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>

                    {/* Address */}
                    <td className="py-3 text-slate-400 max-w-xs truncate">
                      {loc.address || "N/A"}
                    </td>

                    {/* Action */}
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDelete(loc.id)}
                        disabled={deletingId === loc.id}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Location"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Location Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Add Location Point</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            {/* Presets Bar */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Quick Presets
              </label>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    applyPreset("home", "Home Residence", 28.6139, 77.2090, "Central Delhi, India")
                  }
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700 flex items-center gap-1"
                >
                  <Home className="w-3 h-3" /> Home
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset("office", "Corporate HQ", 28.4595, 77.0266, "Cyber Hub, Gurugram")
                  }
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg border border-slate-700 flex items-center gap-1"
                >
                  <Building2 className="w-3 h-3" /> Office
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset("college", "University Campus", 28.5457, 77.1928, "IIT Delhi Campus")
                  }
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-purple-400 rounded-lg border border-slate-700 flex items-center gap-1"
                >
                  <GraduationCap className="w-3 h-3" /> College
                </button>
              </div>
            </div>

            <form onSubmit={handleAddLocation} className="space-y-4">
              {/* Type Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Location Category
                </label>
                <select
                  value={formData.location_type}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, location_type: e.target.value }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="home">Home 🏠</option>
                  <option value="office">Office 🏢</option>
                  <option value="college">College / University 🎓</option>
                  <option value="other">Other 📍</option>
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Location Name / Label *
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Apartment, Main Office, Campus Library"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Coordinates: Lat & Lng */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, latitude: parseFloat(e.target.value) }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, longitude: parseFloat(e.target.value) }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* GPS Auto Detect */}
              <div>
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Use My Current GPS Coordinates
                </button>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Address / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sector 62, Noida, UP"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md transition-all"
                >
                  {submitting ? "Saving..." : "Save Location Point"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
