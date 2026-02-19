/**
 * Geographic utility functions for outdoor exercise tracking.
 * Haversine distance calculation and pace computation.
 */

import type { GpsCoordinate } from '@/types/outdoor';

const EARTH_RADIUS_MILES = 3958.8;

/**
 * Calculates the distance between two GPS coordinates using the Haversine formula.
 * @returns Distance in miles.
 */
export const haversineDistance = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number => {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLon = Math.sin(dLon / 2);

  const h =
    sinHalfLat * sinHalfLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinHalfLon * sinHalfLon;

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
};

/**
 * Calculates total route distance from an array of GPS coordinates.
 * @returns Total distance in miles.
 */
export const calculateRouteDistance = (coordinates: GpsCoordinate[]): number => {
  if (coordinates.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    total += haversineDistance(coordinates[i - 1], coordinates[i]);
  }
  return total;
};

/**
 * Calculates pace in seconds per mile.
 * @param distanceMiles - Distance covered in miles.
 * @param elapsedSeconds - Time elapsed in seconds.
 * @returns Pace in seconds per mile, or null if distance is too small.
 */
export const calculatePace = (
  distanceMiles: number,
  elapsedSeconds: number,
): number | null => {
  if (distanceMiles < 0.01 || elapsedSeconds < 1) return null;
  return elapsedSeconds / distanceMiles;
};

/**
 * Formats pace (seconds per mile/km) into MM:SS string.
 */
export const formatPace = (paceSeconds: number | null): string => {
  if (paceSeconds === null || !isFinite(paceSeconds) || paceSeconds <= 0) return '--:--';

  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.floor(paceSeconds % 60);

  if (minutes > 99) return '--:--';

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Formats elapsed seconds into MM:SS or HH:MM:SS string.
 */
export const formatElapsedTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Filters out GPS points with poor accuracy (> threshold meters).
 */
export const isAccurateEnough = (
  coord: GpsCoordinate,
  thresholdMeters: number = 30,
): boolean => {
  if (coord.accuracy === undefined) return true;
  return coord.accuracy <= thresholdMeters;
};

/**
 * Checks if a new coordinate represents meaningful movement (not GPS jitter).
 * Filters out points that are unrealistically close or far from the previous point.
 */
export const isRealisticMovement = (
  prev: GpsCoordinate,
  next: GpsCoordinate,
): boolean => {
  const distance = haversineDistance(prev, next);
  const timeDiffSeconds = (next.timestamp - prev.timestamp) / 1000;

  if (timeDiffSeconds <= 0) return false;

  const speedMph = (distance / timeDiffSeconds) * 3600;

  // Filter out GPS jitter (< 0.5 meters ≈ 0.0003 miles)
  if (distance < 0.0003) return false;

  // Filter out teleportation (> 40 mph for running/cycling)
  if (speedMph > 40) return false;

  return true;
};
