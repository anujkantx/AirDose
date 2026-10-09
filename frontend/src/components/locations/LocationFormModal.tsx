"use client";

import React, { useState, useMemo } from "react";
import {
  MapPin,
  Home,
  Building2,
  GraduationCap,
  Pencil,
  Navigation,
  X,
  Sliders,
  Sparkles,
} from "lucide-react";
import type {
  UserLocation,
  UserLocationInput,
  LocationQuestionnaire,
} from "@/types";
import {
  calculateClientInfiltrationFactor,
  addUserLocation,
  updateUserLocation,
} from "@/lib/api";

const DEFAULT_QUESTIONNAIRE: LocationQuestionnaire = {
  enclosure: "fully_enclosed",
  window_opening: "sometimes",
  ventilation_type: "natural",
  ac_usage: "no_ac",
  air_purifier: "no_purifier",
};

interface LocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  userId?: number;
  initialLocation: UserLocation | null;
}

function getInitialFormData(initialLocation: UserLocation | null): UserLocationInput {
  if (initialLocation) {
    const q = initialLocation.questionnaire || {
      ...DEFAULT_QUESTIONNAIRE,
      enclosure:
        (initialLocation.indoor_coefficient ?? 0.5) > 0.7
          ? "mostly_open"
          : "fully_enclosed",
    };
    const coeff =
      initialLocation.infiltration_factor ??
      initialLocation.indoor_coefficient ??
      0.5;

    return {
      location_type: initialLocation.location_type || "home",
      name: initialLocation.name,
      latitude: initialLocation.latitude,
      longitude: initialLocation.longitude,
      address: initialLocation.address || "",
      radius_meters: initialLocation.radius_meters || 50,
      indoor_coefficient: coeff,
      infiltration_factor: coeff,
      questionnaire: q,
    };
  }

  return {
    location_type: "home",
    name: "",
    latitude: 28.6139,
    longitude: 77.2090,
    address: "",
    radius_meters: 50,
    indoor_coefficient: 0.5,
    infiltration_factor: 0.5,
    questionnaire: { ...DEFAULT_QUESTIONNAIRE },
  };
}

export default function LocationFormModal({
  isOpen,
  onClose,
  onSaved,
  userId,
  initialLocation,
}: LocationFormModalProps) {
  const [activeTab, setActiveTab] = useState<"basics" | "questions">("basics");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [formData, setFormData] = useState<UserLocationInput>(() =>
    getInitialFormData(initialLocation)
  );

  const liveInfiltration = useMemo(() => {
    if (formData.questionnaire) {
      return calculateClientInfiltrationFactor(formData.questionnaire);
    }
    return formData.infiltration_factor ?? formData.indoor_coefficient ?? 0.5;
  }, [formData.questionnaire, formData.infiltration_factor, formData.indoor_coefficient]);

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
        () => {
          setErrorMsg("Could not fetch GPS position. Please enter coordinates manually.");
        }
      );
    } else {
      setErrorMsg("Geolocation is not supported by your browser.");
    }
  };

  const applyPreset = (
    type: string,
    name: string,
    lat: number,
    lng: number,
    addr: string,
    q: LocationQuestionnaire
  ) => {
    const factor = calculateClientInfiltrationFactor(q);
    setFormData({
      location_type: type,
      name,
      latitude: lat,
      longitude: lng,
      address: addr,
      radius_meters: 50,
      indoor_coefficient: factor,
      infiltration_factor: factor,
      questionnaire: q,
    });
  };

  const updateQuestion = (key: keyof LocationQuestionnaire, value: string) => {
    setFormData((prev) => {
      const updatedQ: LocationQuestionnaire = {
        ...(prev.questionnaire || DEFAULT_QUESTIONNAIRE),
        [key]: value,
      };
      const factor = calculateClientInfiltrationFactor(updatedQ);
      return {
        ...prev,
        indoor_coefficient: factor,
        infiltration_factor: factor,
        questionnaire: updatedQ,
      };
    });
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("Please provide a name for this location.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      const calculatedFactor = formData.questionnaire
        ? calculateClientInfiltrationFactor(formData.questionnaire)
        : 0.5;

      const rawRadius = Number(formData.radius_meters) || 50;
      const clampedRadius = Math.min(500, Math.max(50, rawRadius));

      const payload: UserLocationInput = {
        ...formData,
        user_id: userId || 1,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        radius_meters: clampedRadius,
        indoor_coefficient: calculatedFactor,
        infiltration_factor: calculatedFactor,
      };

      if (initialLocation?.id) {
        await updateUserLocation(initialLocation.id, payload);
      } else {
        await addUserLocation(payload);
      }

      await onSaved();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save location point.";
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0062ff] flex items-center justify-center">
              {initialLocation ? <Pencil className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-bold text-slate-900">
                {initialLocation ? "Update Geofenced Place" : "Add Geofenced Place"}
              </h4>
              <p className="text-xs text-slate-400 font-medium">
                Default 50m geofence radius • Simple form setup with optional infiltration questions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Place Presets */}
        <div className="bg-slate-50/90 border-b border-slate-100 px-5 sm:px-6 py-2.5 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-[#0062ff]" />
            Quick Presets:
          </span>
          <button
            type="button"
            onClick={() =>
              applyPreset("home", "Home Residence", 28.6139, 77.2090, "Central Delhi, India", {
                enclosure: "fully_enclosed",
                window_opening: "almost_never",
                ventilation_type: "mixed",
                ac_usage: "recirculation",
                air_purifier: "most_of_time",
              })
            }
            className="shrink-0 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-xs"
          >
            <Home className="w-3.5 h-3.5 text-emerald-600" /> Home (Sealed + Purifier)
          </button>
          <button
            type="button"
            onClick={() =>
              applyPreset("office", "Corporate Office", 28.4595, 77.0266, "Cyber Hub, Gurugram", {
                enclosure: "fully_enclosed",
                window_opening: "almost_never",
                ventilation_type: "mechanical_hvac",
                ac_usage: "recirculation",
                air_purifier: "always",
              })
            }
            className="shrink-0 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0062ff] rounded-full border border-blue-200 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-xs"
          >
            <Building2 className="w-3.5 h-3.5 text-[#0062ff]" /> Office (Central HVAC)
          </button>
          <button
            type="button"
            onClick={() =>
              applyPreset("college", "University Campus", 28.5457, 77.1928, "IIT Delhi Campus", {
                enclosure: "partially_enclosed",
                window_opening: "frequently",
                ventilation_type: "natural",
                ac_usage: "no_ac",
                air_purifier: "no_purifier",
              })
            }
            className="shrink-0 px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full border border-purple-200 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-xs"
          >
            <GraduationCap className="w-3.5 h-3.5 text-purple-600" /> Campus (Open Classrooms)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab("basics")}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === "basics"
                  ? "border-[#0062ff] text-[#0062ff]"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              1. Location Details &amp; GPS
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("questions")}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === "questions"
                  ? "border-[#0062ff] text-[#0062ff]"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              2. Customize Infiltration ({Math.round((1 - liveInfiltration) * 100)}% Filtered)
            </button>
          </div>

          <form onSubmit={handleSaveLocation} className="space-y-4">
            {activeTab === "basics" ? (
              <div className="space-y-4">
                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Location Category
                  </label>
                  <select
                    value={formData.location_type}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, location_type: e.target.value }))
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0062ff] font-medium"
                  >
                    <option value="home">Home (HOME)</option>
                    <option value="office">Office (OFFICE)</option>
                    <option value="college">College (COLLEGE)</option>
                    <option value="other">Other (OTHER)</option>
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Place Name / Label *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. My Apartment, Main Office, Campus Library"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0062ff] font-medium"
                    required
                  />
                </div>

                {/* Radius & Infiltration Readout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Geofence Radius (meters)
                    </label>
                    <input
                      type="number"
                      step="10"
                      min="50"
                      max="500"
                      placeholder="50"
                      value={formData.radius_meters}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          radius_meters: parseFloat(e.target.value) || 50,
                        }))
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0062ff] font-mono"
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Min: 50m • Max: 500m (Default: 50m)
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Infiltration Factor
                      </label>
                      <button
                        type="button"
                        onClick={() => setActiveTab("questions")}
                        className="text-[11px] font-semibold text-[#0062ff] hover:underline flex items-center gap-1"
                      >
                        <Sliders className="w-3.5 h-3.5" /> Edit Questions
                      </button>
                    </div>
                    {(() => {
                      const liveBadge = getInfiltrationBadge(liveInfiltration);
                      return (
                        <div
                          className={`w-full border rounded-xl px-3.5 py-2 text-xs font-mono font-bold flex items-center justify-between ${liveBadge.color}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${liveBadge.dotColor}`} />
                            <span>{liveInfiltration.toFixed(2)}</span>
                          </div>
                          <span className="text-[11px] font-medium font-sans">
                            {liveBadge.filteredPercent}% filtered • {liveBadge.label}
                          </span>
                        </div>
                      );
                    })()}
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Click &quot;Edit Questions&quot; above to customize indoor physical parameters.
                    </span>
                  </div>
                </div>

                {/* Coordinates: Lat & Lng */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, latitude: parseFloat(e.target.value) }))
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0062ff] font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, longitude: parseFloat(e.target.value) }))
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0062ff] font-mono"
                      required
                    />
                  </div>
                </div>

                {/* GPS Auto Detect */}
                <div>
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-[#0062ff] bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-100 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Auto Detect Current GPS
                  </button>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Address / Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sector 62, Noida, UP"
                    value={formData.address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0062ff] font-medium"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Infiltration Live Metric Banner */}
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 p-3.5 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#0062ff]" />
                    <span className="text-xs font-semibold text-slate-700">
                      Calculated Infiltration Factor:
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-[#0062ff] font-mono bg-white px-3 py-0.5 rounded-full border border-blue-200 shadow-xs">
                      {liveInfiltration.toFixed(2)}
                    </span>
                    <span className="text-xs text-emerald-700 font-semibold bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                      {Math.round((1 - liveInfiltration) * 100)}% Filtered
                    </span>
                  </div>
                </div>

                {/* Q1: Enclosure */}
                <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-100">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    1. How enclosed is this place?
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Strongest baseline for outdoor pollutant penetration.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "fully_enclosed", label: "Fully enclosed" },
                      { id: "partially_enclosed", label: "Partially enclosed" },
                      { id: "mostly_open", label: "Mostly open" },
                      { id: "fully_open", label: "Fully open" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateQuestion("enclosure", opt.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all ${
                          formData.questionnaire?.enclosure === opt.id
                            ? "bg-[#0062ff] text-white shadow-xs"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q2: Windows & Doors */}
                <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-100">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    2. How often are windows/doors open?
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Directly affects outdoor air infiltration rate.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "almost_never", label: "Almost never" },
                      { id: "sometimes", label: "Sometimes" },
                      { id: "frequently", label: "Frequently" },
                      { id: "usually_open", label: "Usually open" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateQuestion("window_opening", opt.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all ${
                          formData.questionnaire?.window_opening === opt.id
                            ? "bg-[#0062ff] text-white shadow-xs"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q3: Ventilation Type */}
                <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-100">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    3. What type of ventilation does this place mainly use?
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Determines structural air exchange mode.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {[
                      { id: "mechanical_hvac", label: "Mechanical HVAC" },
                      { id: "central_ac", label: "Central AC" },
                      { id: "mixed", label: "Mixed mode" },
                      { id: "exhaust_fan", label: "Exhaust fan" },
                      { id: "natural", label: "Natural ventilation" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateQuestion("ventilation_type", opt.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all ${
                          formData.questionnaire?.ventilation_type === opt.id
                            ? "bg-[#0062ff] text-white shadow-xs"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q4: AC Usage */}
                <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-100">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    4. Do you use AC?
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    AC mode significantly alters fresh outdoor intake.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: "recirculation", label: "Yes, Recirculation" },
                      { id: "no_ac", label: "No AC" },
                      { id: "fresh_air_intake", label: "Yes, Fresh intake" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateQuestion("ac_usage", opt.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all ${
                          formData.questionnaire?.ac_usage === opt.id
                            ? "bg-[#0062ff] text-white shadow-xs"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q5: Air Purifier */}
                <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-100">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    5. Do you use an air purifier?
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Removes indoor particulate PM2.5 concentrations.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "always", label: "Always (HEPA)" },
                      { id: "most_of_time", label: "Most of time" },
                      { id: "sometimes", label: "Sometimes" },
                      { id: "no_purifier", label: "No purifier" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateQuestion("air_purifier", opt.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all ${
                          formData.questionnaire?.air_purifier === opt.id
                            ? "bg-[#0062ff] text-white shadow-xs"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-start">
                  <button
                    type="button"
                    onClick={() => setActiveTab("basics")}
                    className="px-5 py-2.5 bg-blue-50 text-[#0062ff] hover:bg-blue-100 rounded-full text-xs font-bold transition-all"
                  >
                    &larr; Back to Location Details
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-[#0062ff] hover:bg-blue-700 rounded-full shadow-sm transition-all"
              >
                {submitting
                  ? "Saving..."
                  : initialLocation
                    ? "Update Place"
                    : "Save Place"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
