/**
 * AirDose MVP API Client
 * Connects to SQLite FastAPI backend on http://localhost:8000
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

export interface StatItem {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
}

export interface ActivityItem {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  status: string;
}

export interface DashboardStats {
  overview: StatItem[];
  recent_activities: ActivityItem[];
  system_health: string;
  registered_users_count: number;
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

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/api/dashboard/stats`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load dashboard metrics");
  }
  return res.json();
}

export interface UserLocation {
  id: number;
  user_id: number;
  location_type: "home" | "office" | "college" | "other" | string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  created_at?: string;
}

export interface UserLocationInput {
  user_id?: number;
  location_type: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export async function fetchUserLocations(userId?: number): Promise<UserLocation[]> {
  const query = userId ? `?user_id=${userId}` : "";
  const res = await fetch(`${API_BASE}/api/locations${query}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch user locations");
  }
  return res.json();
}

export async function addUserLocation(payload: UserLocationInput): Promise<UserLocation> {
  const res = await fetch(`${API_BASE}/api/locations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to save location coordinates");
  }
  return data;
}

export async function deleteUserLocation(locationId: number, userId?: number): Promise<void> {
  const query = userId ? `?user_id=${userId}` : "";
  const res = await fetch(`${API_BASE}/api/locations/${locationId}${query}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to delete location");
  }
}


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

export interface TrendHistoryItem {
  hour: string;
  pm25: number;
  aqi: number;
}

export interface AirQualityData {
  status: string;
  source: string;
  coordinates: { latitude: number; longitude: number };
  aqi: number;
  category: string;
  level: string;
  color: string;
  badgeClass: string;
  description: string;
  recommendation: string;
  mask_needed: boolean;
  purifier_needed: boolean;
  dominant_pollutant: string;
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
  trend_history: TrendHistoryItem[];
  fetched_at: string;
}

export function getStoredAirQuality(): AirQualityData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("airdose_air_quality");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // 15-minute validity check
    if (parsed._savedAt && Date.now() - parsed._savedAt < 15 * 60 * 1000) {
      return parsed.data;
    }
    return parsed.data || null;
  } catch {
    return null;
  }
}

export function saveStoredAirQuality(data: AirQualityData) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      "airdose_air_quality",
      JSON.stringify({ data, _savedAt: Date.now() })
    );
  } catch {}
}

export async function fetchAirQuality(
  lat: number = 28.6139,
  lon: number = 77.2090,
  forceRefresh: boolean = false
): Promise<AirQualityData> {
  // If not a forced refresh, check session storage cache first
  if (!forceRefresh) {
    const cached = getStoredAirQuality();
    if (cached) {
      return cached;
    }
  }

  const res = await fetch(`${API_BASE}/api/air-quality?lat=${lat}&lon=${lon}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to load air quality data");
  }
  const data = await res.json();
  saveStoredAirQuality(data);
  return data;
}



// Local Storage helpers for simple MVP session management
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