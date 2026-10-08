/**
 * Frontend AQI calculation and UI presentation utilities.
 * All UI styling, colors, badges, and visual categories are managed here.
 */

export interface AqiUiConfig {
  category: string;
  level: string;
  color: string; // Hex color for canvas / graphs
  badgeClass: string; // Tailwind CSS classes for badges
  dotClass: string;
  bgLight: string;
  textColor: string;
}

export function getAqiUiConfig(aqi: number): AqiUiConfig {
  if (aqi <= 50) {
    return {
      category: "Good",
      level: "Good",
      color: "#10b981",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dotClass: "bg-emerald-500",
      bgLight: "bg-emerald-50",
      textColor: "text-emerald-700",
    };
  } else if (aqi <= 100) {
    return {
      category: "Moderate",
      level: "Moderate",
      color: "#eab308",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      dotClass: "bg-amber-500",
      bgLight: "bg-amber-50",
      textColor: "text-amber-700",
    };
  } else if (aqi <= 150) {
    return {
      category: "Unhealthy for Sensitive Groups",
      level: "Unhealthy for Sensitive Groups",
      color: "#f97316",
      badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
      dotClass: "bg-orange-500",
      bgLight: "bg-orange-50",
      textColor: "text-orange-700",
    };
  } else if (aqi <= 200) {
    return {
      category: "Unhealthy",
      level: "Unhealthy",
      color: "#ef4444",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      dotClass: "bg-rose-500",
      bgLight: "bg-rose-50",
      textColor: "text-rose-700",
    };
  } else if (aqi <= 300) {
    return {
      category: "Very Unhealthy",
      level: "Very Unhealthy",
      color: "#a855f7",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
      dotClass: "bg-purple-500",
      bgLight: "bg-purple-50",
      textColor: "text-purple-700",
    };
  } else {
    return {
      category: "Hazardous",
      level: "Hazardous",
      color: "#7f1d1d",
      badgeClass: "bg-red-950/20 text-red-900 border-red-300",
      dotClass: "bg-red-800",
      bgLight: "bg-red-50",
      textColor: "text-red-900",
    };
  }
}
