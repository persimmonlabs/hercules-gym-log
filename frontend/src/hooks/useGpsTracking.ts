/**
 * useGpsTracking
 * Hook for GPS-based location tracking with distance calculation.
 * Used for outdoor cardio exercises (Run, Walk, Cycling).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export type GpsTrackingState = 'idle' | 'running' | 'paused' | 'stopped';

interface GpsTrackingResult {
  state: GpsTrackingState;
  elapsedSeconds: number;
  distanceMiles: number;
  permissionDenied: boolean;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
}

const METERS_TO_MILES = 0.000621371;

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const useGpsTracking = (): GpsTrackingResult => {
  const [state, setState] = useState<GpsTrackingState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMiles, setDistanceMiles] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const distanceRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopLocationTracking = useCallback(() => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, [clearTimer]);

  const startLocationTracking = useCallback(async () => {
    stopLocationTracking();

    locationSubscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 5,
      },
      (location) => {
        const { latitude, longitude } = location.coords;

        if (lastLocationRef.current) {
          const distance = calculateDistance(
            lastLocationRef.current.latitude,
            lastLocationRef.current.longitude,
            latitude,
            longitude
          );

          if (distance > 2 && distance < 100) {
            distanceRef.current += distance * METERS_TO_MILES;
            setDistanceMiles(distanceRef.current);
          }
        }

        lastLocationRef.current = { latitude, longitude };
      }
    );
  }, [stopLocationTracking]);

  const start = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      setPermissionDenied(true);
      return;
    }

    setPermissionDenied(false);
    setState('running');
    startTimer();
    await startLocationTracking();
  }, [startTimer, startLocationTracking]);

  const pause = useCallback(() => {
    setState('paused');
    clearTimer();
    stopLocationTracking();
  }, [clearTimer, stopLocationTracking]);

  const resume = useCallback(async () => {
    setState('running');
    startTimer();
    await startLocationTracking();
  }, [startTimer, startLocationTracking]);

  const stop = useCallback(() => {
    setState('stopped');
    clearTimer();
    stopLocationTracking();
  }, [clearTimer, stopLocationTracking]);

  const reset = useCallback(() => {
    setState('idle');
    setElapsedSeconds(0);
    setDistanceMiles(0);
    distanceRef.current = 0;
    lastLocationRef.current = null;
    clearTimer();
    stopLocationTracking();
  }, [clearTimer, stopLocationTracking]);

  useEffect(() => {
    return () => {
      clearTimer();
      stopLocationTracking();
    };
  }, [clearTimer, stopLocationTracking]);

  return {
    state,
    elapsedSeconds,
    distanceMiles,
    permissionDenied,
    start,
    pause,
    resume,
    stop,
    reset,
  };
};
