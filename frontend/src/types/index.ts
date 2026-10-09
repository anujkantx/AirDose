/**
 * AirDose Shared Frontend TypeScript Contracts
 * Centralizes all data models, API schemas, and UI state types.
 */

export type {
  User,
  AuthResponse,
  LocationQuestionnaire,
  UserLocation,
  UserLocationInput,
  CurrentExposureInfo,
  TodayExposureData,
  TransitModeSimulation,
  TripSimulationResponse,
  ExposureHistoryPoint,
  ExposureHistoryResponse,
  TrackLocationPayload,
  PollutantDetail,
  AirQualityStation,
  AirQualityData,
} from "@/lib/api";

export type {
  AqiInfo,
} from "@/lib/aqi";

// Activity & Exertion Multiplier Types
export type ExertionActivityMode = "Rest" | "Walking" | "Running" | "Transit" | "Workout";

export interface ActivityModeOption {
  label: ExertionActivityMode;
  factor: number;
  iconName: string;
}
