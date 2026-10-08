/**
 * AirDose API Client
 * Connects to SQLite FastAPI backend on http://localhost:8000
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("airdose_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

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

export async function checkBackendHealth(): Promise<{ status: string; database: string }> {
  const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
  if (!res.ok) throw new Error("Backend connection failed");
  return res.json();
}

export async function signUpApi(name: string, email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Sign up failed");
  }
  return data;
}

export async function signInApi(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Sign in failed");
  }
  return data;
}

export interface LocationQuestionnaire {
  enclosure?: "fully_enclosed" | "partially_enclosed" | "mostly_open" | "fully_open" | string;
  window_opening?: "almost_never" | "sometimes" | "frequently" | "usually_open" | string;
  ventilation_type?: "mechanical_hvac" | "central_ac" | "mixed" | "exhaust_fan" | "natural" | string;
  ac_usage?: "no_ac" | "recirculation" | "fresh_air_intake" | string;
  air_purifier?: "no_purifier" | "sometimes" | "most_of_time" | "always" | string;
}

export function calculateClientInfiltrationFactor(q: LocationQuestionnaire): number {
  const enclosureMap: Record<string, number> = {
    fully_enclosed: 0.35,
    partially_enclosed: 0.55,
    mostly_open: 0.75,
    fully_open: 0.95,
  };
  const base = enclosureMap[q.enclosure || "fully_enclosed"] ?? 0.35;

  const windowMap: Record<string, number> = {
    almost_never: 0.00,
    sometimes: 0.10,
    frequently: 0.25,
    usually_open: 0.40,
  };
  const wDelta = windowMap[q.window_opening || "sometimes"] ?? 0.10;

  const ventMap: Record<string, number> = {
    mechanical_hvac: -0.10,
    central_ac: -0.05,
    mixed: 0.05,
    exhaust_fan: 0.10,
    natural: 0.15,
  };
  const vDelta = ventMap[q.ventilation_type || "natural"] ?? 0.15;

  const acMap: Record<string, number> = {
    recirculation: -0.05,
    no_ac: 0.00,
    fresh_air_intake: 0.15,
  };
  const acDelta = acMap[q.ac_usage || "no_ac"] ?? 0.00;

  const purifierMap: Record<string, number> = {
    always: 0.35,
    most_of_time: 0.25,
    sometimes: 0.12,
    no_purifier: 0.00,
  };
  const pReduction = purifierMap[q.air_purifier || "no_purifier"] ?? 0.00;

  const total = base + wDelta + vDelta + acDelta - pReduction;
  return Number(Math.max(0.10, Math.min(1.00, total)).toFixed(2));
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

export async function fetchUserLocations(userId?: number): Promise<UserLocation[]> {
  const query = userId ? `?user_id=${userId}` : "";
  const res = await fetch(`${API_BASE}/api/locations${query}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch user locations");
  }
  return res.json();
}

export async function addUserLocation(payload: UserLocationInput): Promise<UserLocation> {
  const res = await fetch(`${API_BASE}/api/locations`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to save location coordinates");
  }
  return data;
}

export async function updateUserLocation(
  locationId: number,
  payload: Partial<UserLocationInput>
): Promise<UserLocation> {
  const res = await fetch(`${API_BASE}/api/locations/${locationId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to update location");
  }
  return data;
}

export async function deleteUserLocation(locationId: number, userId?: number): Promise<void> {
  const query = userId ? `?user_id=${userId}` : "";
  const res = await fetch(`${API_BASE}/api/locations/${locationId}${query}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to delete location");
  }
}

// Exposure Tracking Interfaces & API Endpoints
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

export async function simulateTripApi(
  durationMinutes: number = 30,
  ambientPm25: number = 80
): Promise<TripSimulationResponse> {
  const res = await fetch(`${API_BASE}/api/exposure/simulate-trip`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      duration_minutes: durationMinutes,
      ambient_pm25: ambientPm25,
    }),
  });
  if (!res.ok) {
    throw new Error("Failed to simulate trip exposure");
  }
  return res.json();
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

export interface TrackLocationPayload {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  breathing_factor?: number;
  client_timestamp?: number;
}

export async function fetchTodayExposure(): Promise<TodayExposureData> {
  const res = await fetch(`${API_BASE}/api/exposure/today`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to load today's exposure data");
  }
  return res.json();
}

export async function fetchCurrentExposureState(): Promise<{ tracking: boolean; state: any }> {
  const res = await fetch(`${API_BASE}/api/exposure/current`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    return { tracking: false, state: null };
  }
  return res.json();
}

export async function trackLocationTick(payload: TrackLocationPayload): Promise<any> {
  const res = await fetch(`${API_BASE}/api/exposure/track`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Failed to send location tracking tick");
  }
  return res.json();
}

export async function stopExposureTracking(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/exposure/stop`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to stop exposure tracking");
  }
  return res.json();
}

export async function fetchExposureHistory(
  period: string = "week",
  startDate?: string,
  endDate?: string
): Promise<ExposureHistoryResponse> {
  let url = `${API_BASE}/api/exposure/history?period=${period}`;
  if (startDate) url += `&start_date=${startDate}`;
  if (endDate) url += `&end_date=${endDate}`;

  const res = await fetch(url, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to load exposure history");
  }
  return res.json();
}

// OpenAQ Air Quality Data
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

export async function fetchAirQuality(
  lat: number,
  lon: number,
  forceRefresh: boolean = false
): Promise<AirQualityData> {
  const url = `${API_BASE}/api/air-quality?lat=${lat}&lon=${lon}&force_refresh=${forceRefresh}`;
  const res = await fetch(url, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to load air quality data");
  }
  const data = await res.json();
  return data;
}

// Session management
export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("airdose_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(user: User, token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("airdose_user", JSON.stringify(user));
  localStorage.setItem("airdose_token", token);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("airdose_user");
  localStorage.removeItem("airdose_token");
}