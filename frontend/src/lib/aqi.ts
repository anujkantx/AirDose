/**
 * Frontend AQI classification, health advisory, and UI presentation engine.
 * Purely handled in the frontend application.
 */

export interface AqiInfo {
  category: string;
  level: string;
  description: string;
  recommendation: string;
  mask_needed: boolean;
  purifier_needed: boolean;
  color: string; // Hex color for canvas / charts
  badgeClass: string; // Tailwind CSS classes for badges
  dotClass: string;
  bgLight: string;
  textColor: string;
}

export function getAqiCategory(aqi: number): AqiInfo {
  if (aqi <= 50) {
    return {
      level: "Good",
      category: "Good",
      description: "Air quality is satisfactory, and air pollution poses little or no risk.",
      recommendation: "Ideal air quality for outdoor workouts, cycling, and opening windows.",
      mask_needed: false,
      purifier_needed: false,
      color: "#10b981",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dotClass: "bg-emerald-500",
      bgLight: "bg-emerald-50",
      textColor: "text-emerald-700",
    };
  } else if (aqi <= 100) {
    return {
      level: "Moderate",
      category: "Moderate",
      description: "Air quality is acceptable. However, sensitive individuals may experience minor symptoms.",
      recommendation: "Unusually sensitive people should consider reducing prolonged outdoor exertion.",
      mask_needed: false,
      purifier_needed: false,
      color: "#eab308",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      dotClass: "bg-amber-500",
      bgLight: "bg-amber-50",
      textColor: "text-amber-700",
    };
  } else if (aqi <= 150) {
    return {
      level: "Unhealthy for Sensitive Groups",
      category: "Unhealthy for Sensitive Groups",
      description: "Members of sensitive groups may experience health effects. The general public is less likely affected.",
      recommendation: "Children, the elderly, and people with respiratory or heart conditions should limit outdoor activity.",
      mask_needed: true,
      purifier_needed: true,
      color: "#f97316",
      badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
      dotClass: "bg-orange-500",
      bgLight: "bg-orange-50",
      textColor: "text-orange-700",
    };
  } else if (aqi <= 200) {
    return {
      level: "Unhealthy",
      category: "Unhealthy",
      description: "Everyone may begin to experience health effects; sensitive groups may experience more serious effects.",
      recommendation: "Wear an N95 mask outdoors. Keep windows closed and run an air purifier indoors.",
      mask_needed: true,
      purifier_needed: true,
      color: "#ef4444",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      dotClass: "bg-rose-500",
      bgLight: "bg-rose-50",
      textColor: "text-rose-700",
    };
  } else if (aqi <= 300) {
    return {
      level: "Very Unhealthy",
      category: "Very Unhealthy",
      description: "Health alert: The risk of health effects is increased for everyone.",
      recommendation: "Avoid outdoor strenuous activities. Keep indoor air clean with HEPA filtration.",
      mask_needed: true,
      purifier_needed: true,
      color: "#a855f7",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
      dotClass: "bg-purple-500",
      bgLight: "bg-purple-50",
      textColor: "text-purple-700",
    };
  } else {
    return {
      level: "Hazardous",
      category: "Hazardous",
      description: "Health warning of emergency conditions: Everyone is more likely to be affected.",
      recommendation: "Remain indoors. Avoid all physical outdoor activities and seal entryways.",
      mask_needed: true,
      purifier_needed: true,
      color: "#7f1d1d",
      badgeClass: "bg-red-950/20 text-red-900 border-red-300",
      dotClass: "bg-red-800",
      bgLight: "bg-red-50",
      textColor: "text-red-900",
    };
}
