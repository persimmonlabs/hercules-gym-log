/**
 * useGpsTracking
 * Hook for GPS-based location tracking with distance calculation.
 * Used for outdoor cardio exercises (Run, Walk, Cycling).
 * Integrates with outdoorSessionStore for coordinate storage and route polylines.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import { useOutdoorSessionStore } from '@/store/outdoorSessionStore';
import { isAccurateEnough } from '@/utils/geo';
import type { GpsCoordinate } from '@/types/outdoor';

export type GpsPermissionStatus = 'undetermined' | 'granted' | 'denied';

interface GpsTrackingResult {
  permissionStatus: GpsPermissionStatus;
  isTracking: boolean;
  currentLocation: GpsCoordinate | null;
  requestPermission: () => Promise<boolean>;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
}

export const useGpsTracking = (): GpsTrackingResult => {
  const [permissionStatus, setPermissionStatus] = useState<GpsPermissionStatus>('undetermined');
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<GpsCoordinate | null>(null);

  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const addCoordinate = useOutdoorSessionStore((s) => s.addCoordinate);

  const cleanupSubscription = useCallback(() => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setPermissionStatus(granted ? 'granted' : 'denied');
      return granted;
    } catch {
      setPermissionStatus('denied');
      return false;
    }
  }, []);

  const startTracking = useCallback(async () => {
    cleanupSubscription();

    const granted = await requestPermission();
    if (!granted) return;

    try {
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 3,
        },
        (location) => {
          const coord: GpsCoordinate = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude ?? undefined,
            accuracy: location.coords.accuracy ?? undefined,
            timestamp: location.timestamp,
          };

          if (!isAccurateEnough(coord, 30)) return;

          setCurrentLocation(coord);
          addCoordinate(coord);
        }
      );

      setIsTracking(true);
    } catch (error) {
      console.error('[useGpsTracking] Failed to start location tracking:', error);
      setIsTracking(false);
    }
  }, [cleanupSubscription, requestPermission, addCoordinate]);

  const stopTracking = useCallback(() => {
    cleanupSubscription();
  }, [cleanupSubscription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupSubscription();
    };
  }, [cleanupSubscription]);

  return {
    permissionStatus,
    isTracking,
    currentLocation,
    requestPermission,
    startTracking,
    stopTracking,
  };
};
