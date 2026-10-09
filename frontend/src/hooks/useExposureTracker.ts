"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { TodayExposureData } from "@/types";
import {
  fetchTodayExposure,
  trackLocationTick,
  stopExposureTracking,
} from "@/lib/api";
import { calculateHaversineDistance } from "@/lib/haversine";

interface UseExposureTrackerOptions {
  initialCoords?: { lat: number; lon: number };
  onCoordsChange?: (coords: { lat: number; lon: number }) => void;
}

export function useExposureTracker(options?: UseExposureTrackerOptions) {
  const [exposureData, setExposureData] = useState<TodayExposureData | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(true);
  const [breathingFactor, setBreathingFactor] = useState<number>(1.0);
  const [isAutoMode, setIsAutoMode] = useState<boolean>(true);
  const [autoDetectedLabel, setAutoDetectedLabel] = useState<string>("Rest");
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number }>(
    options?.initialCoords ?? { lat: 28.6139, lon: 77.2090 }
  );

  const lastCheckpointRef = useRef<{ lat: number; lon: number; time: number } | null>(null);
  const lastCoordsRef = useRef<{ lat: number; lon: number; timestamp: number } | null>(null);
  const lastSpeedRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);
  const onCoordsChangeRef = useRef(options?.onCoordsChange);

  useEffect(() => {
    onCoordsChangeRef.current = options?.onCoordsChange;
  }, [options?.onCoordsChange]);

  // Load exposure data on mount without resetting on refresh
  const loadExposureSummary = useCallback(async () => {
    try {
      const data = await fetchTodayExposure();
      setExposureData(data);
      if (data.tracking) {
        setIsTracking(true);
      }
    } catch (err) {
      console.warn("Could not load today exposure:", err);
    }
  }, []);

  // Classify physical activity mode based on real-time speed
  const detectAutoActivity = useCallback((speedMps?: number | null): { factor: number; label: string } => {
    if (speedMps === null || speedMps === undefined || isNaN(speedMps) || speedMps < 0.5) {
      return { factor: 1.0, label: "Rest" };
    }
    // High speed (> 6.0 m/s or > 21.6 km/h) -> In Vehicle / Transit
    if (speedMps > 6.0) {
      return { factor: 1.1, label: "Transit" };
    }
    // Moderate-high speed (2.5 to 6.0 m/s, ~9 to 21.6 km/h) -> Running / Jogging
    if (speedMps > 2.5) {
      return { factor: 3.5, label: "Running" };
    }
    // Moderate speed (0.5 to 2.5 m/s, ~1.8 to 9 km/h) -> Walking
    return { factor: 1.8, label: "Walking" };
  }, []);

  // Compute speed from hardware GPS or fallback displacement (meters / second)
  const calculateMotionSpeed = useCallback(
    (
      coords: { latitude: number; longitude: number; speed?: number | null },
      timestamp: number = Date.now()
    ): number => {
      let speed = coords.speed;

      // If browser provides a valid positive speed, use it directly
      if (speed !== null && speed !== undefined && !isNaN(speed) && speed > 0) {
        lastCoordsRef.current = { lat: coords.latitude, lon: coords.longitude, timestamp };
        lastSpeedRef.current = speed;
        return speed;
      }

      // Fallback: calculate displacement speed from Haversine distance
      if (lastCoordsRef.current) {
        const distKm = calculateHaversineDistance(
          coords.latitude,
          coords.longitude,
          lastCoordsRef.current.lat,
          lastCoordsRef.current.lon
        );
        const timeDeltaSec = (timestamp - lastCoordsRef.current.timestamp) / 1000;

        if (timeDeltaSec >= 1) {
          const distMeters = distKm * 1000;
          // Filter minor GPS drift/jitter (< 2 meters)
          if (distMeters >= 2.0) {
            speed = distMeters / timeDeltaSec;
          } else {
            speed = 0;
          }
          lastCoordsRef.current = { lat: coords.latitude, lon: coords.longitude, timestamp };
          lastSpeedRef.current = speed;
          return speed;
        }
        return lastSpeedRef.current;
      }

      lastCoordsRef.current = { lat: coords.latitude, lon: coords.longitude, timestamp };
      lastSpeedRef.current = 0;
      return 0;
    },
    []
  );

  // Send a location tick to backend exposure engine (checkpointed)
  const sendExposureTick = useCallback(
    async (
      lat: number,
      lon: number,
      accuracy?: number,
      speed?: number,
      heading?: number,
      force: boolean = false,
      customBreathingFactor?: number
    ) => {
      const now = Date.now();
      const last = lastCheckpointRef.current;

      // Rate limit checkpoints: require >= 25m movement OR >= 60s elapsed unless force is true
      if (!force && last) {
        const dist = calculateHaversineDistance(lat, lon, last.lat, last.lon);
        const elapsedSec = (now - last.time) / 1000;
        if (dist < 25 && elapsedSec < 60) {
          return; // Skip tick - live counter runs locally on frontend
        }
      }

      try {
        lastCheckpointRef.current = { lat, lon, time: now };
        const factorToUse = customBreathingFactor ?? breathingFactor;
        const res = await trackLocationTick({
          latitude: lat,
          longitude: lon,
          accuracy: accuracy ?? null,
          speed: speed ?? null,
          heading: heading ?? null,
          breathing_factor: factorToUse,
          client_timestamp: now / 1000,
        });

        if (res && res.state) {
          const state = res.state;
          setExposureData((prev) => {
            const currentObj = {
              pm25: state.pm25,
              environment: state.location_type,
              location_id: state.location_id,
              location_name: state.location_name,
              infiltration_factor: state.infiltration_factor,
              breathing_factor: state.breathing_factor,
              base_breathing_rate_m3_s: state.base_breathing_rate_m3_s,
              inhalation_rate_ug_s: state.inhalation_rate_ug_s,
              last_pollution_updated_seconds_ago: 0,
            };

            const updatedContribs = { ...(prev?.contributions || {}) };
            const envKey = state.location_type;
            updatedContribs[envKey] = (updatedContribs[envKey] || 0) + state.accumulated_exposure_ug;

            return {
              date: prev?.date || new Date().toISOString().split("T")[0],
              total_exposure_ug: res.total_exposure_ug,
              current: currentObj,
              contributions: updatedContribs,
              tracking: true,
            };
          });
        }
      } catch (err) {
        console.warn("Error sending exposure tick:", err);
      }
    },
    [breathingFactor]
  );

  // Initial GPS positioning and exposure summary load
  useEffect(() => {
    let isMounted = true;
    fetchTodayExposure()
      .then((data) => {
        if (isMounted) {
          setExposureData(data);
          if (data.tracking) {
            setIsTracking(true);
          }
        }
      })
      .catch((err) => console.warn("Could not load today exposure:", err));

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!isMounted) return;
          const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setUserCoords(coords);
          onCoordsChangeRef.current?.(coords);
          sendExposureTick(
            coords.lat,
            coords.lon,
            pos.coords.accuracy,
            pos.coords.speed || undefined,
            pos.coords.heading || undefined,
            true
          );
        },
        (err) => {
          if (!isMounted) return;
          console.warn("Geolocation fallback to default coords:", err);
          if (err.code === err.PERMISSION_DENIED) {
            setPermissionDenied(true);
          }
          const defaultCoords = { lat: 28.6139, lon: 77.2090 };
          setUserCoords(defaultCoords);
          onCoordsChangeRef.current?.(defaultCoords);
          sendExposureTick(defaultCoords.lat, defaultCoords.lon, 15, undefined, undefined, true);
        },
        { timeout: 8000 }
      );
    } else {
      const defaultCoords = { lat: 28.6139, lon: 77.2090 };
      setUserCoords(defaultCoords);
      onCoordsChangeRef.current?.(defaultCoords);
      sendExposureTick(defaultCoords.lat, defaultCoords.lon, 15, undefined, undefined, true);
    }

    return () => {
      isMounted = false;
    };
  }, [sendExposureTick]);

  // High-accuracy location watcher for continuous exposure tracking
  useEffect(() => {
    if (!isTracking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if ("geolocation" in navigator) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setUserCoords(coords);
          onCoordsChangeRef.current?.(coords);

          const motionSpeed = calculateMotionSpeed(pos.coords, Date.now());

          let currentBf = breathingFactor;
          if (isAutoMode) {
            const detected = detectAutoActivity(motionSpeed);
            setAutoDetectedLabel(detected.label);
            if (Math.abs(detected.factor - breathingFactor) > 0.05) {
              setBreathingFactor(detected.factor);
              currentBf = detected.factor;
            }
          }

          sendExposureTick(
            coords.lat,
            coords.lon,
            pos.coords.accuracy,
            motionSpeed || undefined,
            pos.coords.heading || undefined,
            false,
            currentBf
          );
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setPermissionDenied(true);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
      watchIdRef.current = id;
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isTracking, sendExposureTick, isAutoMode, breathingFactor, detectAutoActivity, calculateMotionSpeed]);

  // Physical motion detection for mobile devices (when GPS is stationary/indoors)
  useEffect(() => {
    if (!isAutoMode) return;

    let motionCount = 0;
    let totalMagnitude = 0;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.acceleration;
      if (acc && acc.x !== null && acc.y !== null && acc.z !== null) {
        const mag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
        totalMagnitude += mag;
        motionCount++;

        // Process batch every ~15 samples
        if (motionCount >= 15) {
          const avgMag = totalMagnitude / motionCount;
          motionCount = 0;
          totalMagnitude = 0;

          // If GPS reports stationary (< 0.5 m/s), check accelerometer
          if (lastSpeedRef.current < 0.5) {
            if (avgMag > 4.5) {
              setAutoDetectedLabel("Running");
              setBreathingFactor(3.5);
            } else if (avgMag > 1.2) {
              setAutoDetectedLabel("Walking");
              setBreathingFactor(1.8);
            }
          }
        }
      }
    };

    if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
      window.addEventListener("devicemotion", handleMotion);
    }
    return () => {
      if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
        window.removeEventListener("devicemotion", handleMotion);
      }
    };
  }, [isAutoMode]);

  const handleToggleTracking = async () => {
    if (isTracking) {
      try {
        await stopExposureTracking();
        setIsTracking(false);
        loadExposureSummary();
      } catch (err) {
        console.error("Failed to stop tracking:", err);
      }
    } else {
      setIsTracking(true);
      sendExposureTick(userCoords.lat, userCoords.lon, 10, undefined, undefined, true);
    }
  };

  const handleAutoModeChange = (auto: boolean, cycleSimulated?: boolean) => {
    setIsAutoMode(auto);
    if (auto) {
      if (cycleSimulated) {
        const cycleOrder: Array<{ label: string; factor: number }> = [
          { label: "Rest", factor: 1.0 },
          { label: "Walking", factor: 1.8 },
          { label: "Running", factor: 3.5 },
          { label: "Transit", factor: 1.1 },
        ];
        const currentIndex = cycleOrder.findIndex((m) => m.label === autoDetectedLabel);
        const nextState = cycleOrder[(currentIndex + 1) % cycleOrder.length];
        setAutoDetectedLabel(nextState.label);
        setBreathingFactor(nextState.factor);
        if (isTracking) {
          sendExposureTick(userCoords.lat, userCoords.lon, 10, undefined, undefined, true, nextState.factor);
        }
      } else {
        const detected = detectAutoActivity(lastSpeedRef.current);
        setAutoDetectedLabel(detected.label);
        setBreathingFactor(detected.factor);
        if (isTracking) {
          sendExposureTick(userCoords.lat, userCoords.lon, 10, undefined, undefined, true, detected.factor);
        }
      }
    }
  };

  const handleBreathingFactorChange = (newFactor: number) => {
    setIsAutoMode(false);
    setBreathingFactor(newFactor);
    if (isTracking) {
      sendExposureTick(userCoords.lat, userCoords.lon, 10, undefined, undefined, true, newFactor);
    }
  };

  const stopTrackingOnExit = () => {
    if (isTracking) {
      stopExposureTracking().catch(() => {});
    }
  };

  const recordCurrentTick = useCallback(() => {
    sendExposureTick(userCoords.lat, userCoords.lon, 10, undefined, undefined, true);
  }, [sendExposureTick, userCoords]);

  return {
    userCoords,
    setUserCoords,
    exposureData,
    setExposureData,
    isTracking,
    breathingFactor,
    isAutoMode,
    autoDetectedLabel,
    permissionDenied,
    loadExposureSummary,
    handleToggleTracking,
    handleAutoModeChange,
    handleBreathingFactorChange,
    recordCurrentTick,
    stopTrackingOnExit,
  };
}
