/**
 * outdoorSessionStore
 * Manages the in-progress outdoor exercise session with AsyncStorage persistence.
 * Tracks GPS coordinates, distance, elapsed time, and pace.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GpsCoordinate, OutdoorSessionStatus } from '@/types/outdoor';
import { haversineDistance, calculatePace, isRealisticMovement } from '@/utils/geo';

interface OutdoorSessionState {
  exerciseName: string | null;
  status: OutdoorSessionStatus;
  startTime: number | null;
  elapsedSeconds: number;
  distanceMiles: number;
  paceSecondsPerMile: number | null;
  coordinates: GpsCoordinate[];
  pausedDurationMs: number;
  pauseStartTime: number | null;

  startSession: (exerciseName: string) => void;
  beginTracking: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  addCoordinate: (coord: GpsCoordinate) => void;
  updateElapsed: (seconds: number) => void;
  endSession: () => OutdoorSessionResult | null;
  clearSession: () => void;

  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export interface OutdoorSessionResult {
  exerciseName: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  distanceMiles: number;
  paceSecondsPerMile: number | null;
  coordinates: GpsCoordinate[];
}

const INITIAL_STATE = {
  exerciseName: null,
  status: 'idle' as OutdoorSessionStatus,
  startTime: null,
  elapsedSeconds: 0,
  distanceMiles: 0,
  paceSecondsPerMile: null,
  coordinates: [] as GpsCoordinate[],
  pausedDurationMs: 0,
  pauseStartTime: null,
};

export const useOutdoorSessionStore = create<OutdoorSessionState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,
      _hasHydrated: false,

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      startSession: (exerciseName: string) => {
        set({
          ...INITIAL_STATE,
          exerciseName,
          status: 'idle',
        });
      },

      beginTracking: () => {
        const { status } = get();
        if (status !== 'idle') return;

        set({
          status: 'active',
          startTime: Date.now(),
          elapsedSeconds: 0,
          distanceMiles: 0,
          coordinates: [],
          pausedDurationMs: 0,
          pauseStartTime: null,
        });
      },

      pauseSession: () => {
        const { status } = get();
        if (status !== 'active') return;

        set({
          status: 'paused',
          pauseStartTime: Date.now(),
        });
      },

      resumeSession: () => {
        const { status, pauseStartTime, pausedDurationMs } = get();
        if (status !== 'paused' || !pauseStartTime) return;

        const additionalPause = Date.now() - pauseStartTime;

        set({
          status: 'active',
          pausedDurationMs: pausedDurationMs + additionalPause,
          pauseStartTime: null,
        });
      },

      addCoordinate: (coord: GpsCoordinate) => {
        const { status, coordinates, distanceMiles, elapsedSeconds } = get();
        if (status !== 'active') return;

        const prevCoord = coordinates.length > 0 ? coordinates[coordinates.length - 1] : null;

        // Filter unrealistic movement
        if (prevCoord && !isRealisticMovement(prevCoord, coord)) {
          return;
        }

        let newDistance = distanceMiles;
        if (prevCoord) {
          newDistance += haversineDistance(prevCoord, coord);
        }

        const newPace = calculatePace(newDistance, elapsedSeconds);

        set({
          coordinates: [...coordinates, coord],
          distanceMiles: newDistance,
          paceSecondsPerMile: newPace,
        });
      },

      updateElapsed: (seconds: number) => {
        const { distanceMiles } = get();
        const newPace = calculatePace(distanceMiles, seconds);

        set({
          elapsedSeconds: seconds,
          paceSecondsPerMile: newPace,
        });
      },

      endSession: () => {
        const { exerciseName, startTime, elapsedSeconds, distanceMiles, paceSecondsPerMile, coordinates, status, pauseStartTime, pausedDurationMs } = get();

        if (!exerciseName || !startTime) return null;

        // Account for any current pause
        let finalPausedMs = pausedDurationMs;
        if (status === 'paused' && pauseStartTime) {
          finalPausedMs += Date.now() - pauseStartTime;
        }

        const endTime = Date.now();
        const totalMs = endTime - startTime - finalPausedMs;
        const durationSeconds = Math.max(Math.floor(totalMs / 1000), elapsedSeconds);

        const result: OutdoorSessionResult = {
          exerciseName,
          startTime,
          endTime,
          durationSeconds,
          distanceMiles,
          paceSecondsPerMile,
          coordinates,
        };

        set({ ...INITIAL_STATE });

        return result;
      },

      clearSession: () => {
        set({ ...INITIAL_STATE });
      },
    }),
    {
      name: 'hercules-outdoor-session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        exerciseName: state.exerciseName,
        status: state.status,
        startTime: state.startTime,
        elapsedSeconds: state.elapsedSeconds,
        distanceMiles: state.distanceMiles,
        paceSecondsPerMile: state.paceSecondsPerMile,
        coordinates: state.coordinates,
        pausedDurationMs: state.pausedDurationMs,
        pauseStartTime: state.pauseStartTime,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
