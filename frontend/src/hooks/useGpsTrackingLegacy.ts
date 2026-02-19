/**
 * useGpsTrackingLegacy
 * Original GPS tracking hook for set-based cardio exercises (GpsActivityTracker).
 * Preserved as-is to avoid breaking the existing outdoor exercise flow.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export type GpsTrackingState = 'idle' | 'running' | 'paused' | 'stopped';

interface GpsTrackingResult {
  state: GpsTrackingState;
  elapsedSeconds: number;
  distanceMiles: number;
  currentPace: number;
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
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const useGpsTrackingLegacy = (): GpsTrackingResult => {
  const [state, setState] = useState<GpsTrackingState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMiles, setDistanceMiles] = useState(0);
  const [currentPace, setCurrentPace] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paceUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const distanceRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearPaceTimer = useCallback(() => {
    if (paceUpdateRef.current) {
      clearInterval(paceUpdateRef.current);
      paceUpdateRef.current = null;
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

  const startPaceTracking = useCallback(() => {
    clearPaceTimer();
    paceUpdateRef.current = setInterval(() => {
      setCurrentPace(() => {
        const distance = distanceRef.current;
        const elapsed = elapsedSeconds;
        
        if (distance > 0 && elapsed > 0) {
          const hours = elapsed / 3600;
          const pace = hours / distance * 60;
          return pace;
        }
        return 0;
      });
    }, 5000);
  }, [clearPaceTimer, elapsedSeconds]);

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
    startPaceTracking();
    await startLocationTracking();
  }, [startTimer, startPaceTracking, startLocationTracking]);

  const pause = useCallback(() => {
    setState('paused');
    clearTimer();
    clearPaceTimer();
    stopLocationTracking();
  }, [clearTimer, clearPaceTimer, stopLocationTracking]);

  const resume = useCallback(async () => {
    setState('running');
    startTimer();
    startPaceTracking();
    await startLocationTracking();
  }, [startTimer, startPaceTracking, startLocationTracking]);

  const stop = useCallback(() => {
    setState('stopped');
    clearTimer();
    clearPaceTimer();
    stopLocationTracking();
  }, [clearTimer, clearPaceTimer, stopLocationTracking]);

  const reset = useCallback(() => {
    setState('idle');
    setElapsedSeconds(0);
    setDistanceMiles(0);
    setCurrentPace(0);
    distanceRef.current = 0;
    lastLocationRef.current = null;
    clearTimer();
    clearPaceTimer();
    stopLocationTracking();
  }, [clearTimer, clearPaceTimer, stopLocationTracking]);

  useEffect(() => {
    return () => {
      clearTimer();
      clearPaceTimer();
      stopLocationTracking();
    };
  }, [clearTimer, clearPaceTimer, stopLocationTracking]);

  return {
    state,
    elapsedSeconds,
    distanceMiles,
    currentPace,
    permissionDenied,
    start,
    pause,
    resume,
    stop,
    reset,
  };
};
