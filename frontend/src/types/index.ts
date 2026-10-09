/**
 * AirDose Shared Frontend TypeScript Contracts
 * Centralizes all domain models, API schemas, and UI state types.
 */

// User & Authentication Contracts
export interface User {
  id: number;
  name: string;
  email: string;
  created_at?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

// Location & Questionnaire Contracts
export interface LocationQuestionnaire {
  enclosure?: "fully_enclosed" | "partially_enclosed" | "mostly_open" | "fully_open" | string;
  window_opening?: "almost_never" | "sometimes" | "frequently" | "usually_open" | string;
  ventilation_type?: "mechanical_hvac" | "central_ac" | "mixed" | "exhaust_fan" | "natural" | string;
  ac_usage?: "no_ac" | "recirculation" | "fresh_air_intake" | string;
  air_purifier?: "no_purifier" | "sometimes" | "most_of_time" | "always" | string;
}

export interface UserLocation {
  id: number;
  user_id: number;
  location_type: "home" | "office" | "college" | "other" | string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  radius_meters: number;
  indoor_coefficient: number;
  infiltration_factor?: number;
  questionnaire?: LocationQuestionnaire | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserLocationInput {
  user_id?: number;
  location_type: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  radius_meters?: number;
  indoor_coefficient?: number;
  infiltration_factor?: number;
  questionnaire?: LocationQuestionnaire | null;
}

// Exposure Telemetry Contracts
export interface CurrentExposureInfo {
  pm25: number;
  environment: string;
  location_id?: number | null;
  location_name?: string | null;
  infiltration_factor: number;
  breathing_factor: number;
  base_breathing_rate_m3_s: number;
  inhalation_rate_ug_s: number;
  last_pollution_updated_seconds_ago: number;
  is_cached?: boolean;
  cache_expires_in_seconds?: number;
  cache_distance_meters?: number;
  cached_at?: string;
  cached_at_display?: string;
}

export interface TodayExposureData {
  date: string;
  total_exposure_ug: number;
  current: CurrentExposureInfo | null;
  contributions: Record<string, number>;
  tracking: boolean;
  cigarettes_equivalent?: number;
  who_percentage?: number;
  who_status?: string;
  clean_air_shield_saved_ug?: number;
}

export interface TransitModeSimulation {
  mode: string;
  key: string;
  icon: string;
  infiltration_factor: number;
  breathing_factor: number;
  inhalation_rate_ug_s: number;
  estimated_dose_ug: number;
  cigarettes_equivalent: number;
}

export interface TripSimulationResponse {
  duration_minutes: number;
  ambient_pm25: number;
  options: TransitModeSimulation[];
  safest_mode: string;
  max_dose_savings_ug: number;
}

export interface ExposureHistoryPoint {
  date: string;
  label: string;
  exposure_ug: number;
}

export interface ExposureHistoryResponse {
  period: string;
  start_date: string;
  end_date: string;
  data: ExposureHistoryPoint[];
}

export interface ExposureStateDetail {
  pm25: number;
  location_type: string;
  location_id?: number | null;
  location_name?: string | null;
  infiltration_factor: number;
  breathing_factor: number;
  base_breathing_rate_m3_s: number;
  inhalation_rate_ug_s: number;
  accumulated_exposure_ug: number;
}

export interface ExposureTickResponse {
  total_exposure_ug: number;
  state?: ExposureStateDetail;
}

export interface TrackLocationPayload {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  breathing_factor?: number;
  client_timestamp?: number;
}

// OpenAQ Air Quality Contracts
export interface PollutantDetail {
  value: number | null;
  unit: string;
  label: string;
  status?: string;
  time?: string;
}

export interface AirQualityStation {
  id: number;
  name: string;
  distance_km: number;
  provider: string;
  latitude: number;
  longitude: number;
  last_updated?: string;
}

export interface AirQualityData {
  status: string;
  source: string;
  coordinates: { latitude: number; longitude: number };
  aqi: number;
  category?: string;
  level?: string;
  color?: string;
  badgeClass?: string;
  description?: string;
  recommendation?: string;
  mask_needed?: boolean;
  purifier_needed?: boolean;
  dominant_pollutant: string;
  dominant_pollutant_key?: string;
  pollutant_aqis?: Record<string, number>;
  pollutants: {
    pm25?: PollutantDetail;
    pm10?: PollutantDetail;
    no2?: PollutantDetail;
    o3?: PollutantDetail;
    co?: PollutantDetail;
    so2?: PollutantDetail;
    temperature?: PollutantDetail;
    humidity?: PollutantDetail;
    [key: string]: PollutantDetail | undefined;
  };
  station: AirQualityStation;
  fetched_at: string;
  fetched_at_display?: string;
  is_cached?: boolean;
  cache_age_seconds?: number;
  cache_expires_in_seconds?: number;
  cache_distance_meters?: number;
  cache_anchor_lat?: number;
  cache_anchor_lon?: number;
  cached_at?: string;
  cached_at_display?: string;
}

// Re-export AQI presentation types
export type { AqiInfo } from "@/lib/aqi";

// Activity & Exertion Multiplier Types
export type ExertionActivityMode = "Rest" | "Walking" | "Running" | "Transit" | "Workout";

export interface ActivityModeOption {
  label: ExertionActivityMode;
  factor: number;
  iconName: string;
}
