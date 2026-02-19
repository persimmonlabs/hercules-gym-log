/**
 * TypeScript interfaces for outdoor exercise GPS tracking sessions.
 */

export interface GpsCoordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  timestamp: number;
}

export type OutdoorSessionStatus = 'idle' | 'active' | 'paused' | 'finished';

export interface OutdoorSessionData {
  exerciseName: string;
  status: OutdoorSessionStatus;
  startTime: number | null;
  /** Total elapsed seconds (excluding paused time) */
  elapsedSeconds: number;
  /** Total distance in miles (storage unit) */
  distanceMiles: number;
  /** Current pace in seconds per mile */
  paceSecondsPerMile: number | null;
  /** Array of GPS coordinates forming the route */
  coordinates: GpsCoordinate[];
  /** Accumulated paused duration in ms */
  pausedDurationMs: number;
  /** Timestamp when pause started (null if not paused) */
  pauseStartTime: number | null;
}
