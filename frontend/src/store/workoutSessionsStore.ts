import { create } from 'zustand';

import type { Workout } from '@/types/workout';
import { supabaseClient } from '@/lib/supabaseClient';
import {
  fetchWorkoutSessions,
  createWorkoutSession,
  updateWorkoutSession,
  deleteWorkoutSession,
} from '@/lib/supabaseQueries';

const SYNC_TIMEOUT_MS = 15_000;

/**
 * Wraps a promise with a timeout. Rejects with a timeout error if the
 * promise doesn't settle within the given duration.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`[${label}] timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

interface WorkoutSessionsState {
  workouts: Workout[];
  isLoading: boolean;
  /** Original add (optimistic insert + Supabase sync). Kept for backward compat. */
  addWorkout: (workout: Workout) => Promise<void>;
  /** Instantly add a workout to local state only (no network). */
  addWorkoutLocally: (workout: Workout) => void;
  /**
   * Attempt to sync a workout to Supabase with a timeout.
   * Returns true on success, false on failure. NEVER rolls back local state.
   */
  syncWorkoutToSupabase: (workout: Workout) => Promise<boolean>;
  updateWorkout: (workout: Workout) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  getWorkouts: () => Workout[];
  clearWorkouts: () => Promise<void>;
  hydrateWorkouts: (userId?: string) => Promise<void>;
}

export const useWorkoutSessionsStore = create<WorkoutSessionsState>((set, get) => ({
  workouts: [],
  isLoading: false,

  addWorkoutLocally: (workout) => {
    const exists = get().workouts.some((w) => w.id === workout.id);
    if (!exists) {
      set({ workouts: [workout, ...get().workouts] });
    }
  },

  syncWorkoutToSupabase: async (workout) => {
    try {
      const { data: { user } } = await withTimeout(
        supabaseClient.auth.getUser(),
        SYNC_TIMEOUT_MS,
        'auth.getUser',
      );

      if (!user) {
        console.warn('[workoutSessionsStore] No authenticated user — sync skipped');
        return false;
      }

      const newId = await withTimeout(
        createWorkoutSession(user.id, workout),
        SYNC_TIMEOUT_MS,
        'createWorkoutSession',
      );

      // Replace optimistic ID with Supabase UUID in local state
      set({
        workouts: get().workouts.map((existing) =>
          existing.id === workout.id ? { ...existing, id: newId } : existing
        ),
      });

      console.log('[workoutSessionsStore] Workout synced to Supabase:', newId);
      return true;
    } catch (error) {
      console.warn('[workoutSessionsStore] Supabase sync failed (workout kept locally):', error);
      return false;
    }
  },

  addWorkout: async (workout) => {
    // Optimistic insert so Performance/PRs update immediately (even on slow networks)
    get().addWorkoutLocally(workout);

    // Attempt Supabase sync — never rolls back on failure
    await get().syncWorkoutToSupabase(workout);
  },

  updateWorkout: async (workout) => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        console.error('[workoutSessionsStore] No authenticated user');
        return;
      }

      // Optimistic update
      const next = get().workouts.map((existing) => (existing.id === workout.id ? workout : existing));
      set({ workouts: next });

      // Sync to Supabase
      await updateWorkoutSession(user.id, workout);
      console.log('[workoutSessionsStore] Workout updated in Supabase');
    } catch (error) {
      console.error('[workoutSessionsStore] Failed to update workout', error);
      // Revert optimistic update on error
      await get().hydrateWorkouts();
    }
  },

  deleteWorkout: async (id) => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        console.error('[workoutSessionsStore] No authenticated user');
        return;
      }

      // Optimistic update
      const next = get().workouts.filter((workout) => workout.id !== id);
      set({ workouts: next });

      // Sync to Supabase
      await deleteWorkoutSession(user.id, id);
      console.log('[workoutSessionsStore] Workout deleted from Supabase');
    } catch (error) {
      console.error('[workoutSessionsStore] Failed to delete workout', error);
      // Revert optimistic update on error
      await get().hydrateWorkouts();
    }
  },

  getWorkouts: () => {
    return get().workouts;
  },

  clearWorkouts: async () => {
    set({ workouts: [] });
  },

  hydrateWorkouts: async (userId?: string) => {
    try {
      set({ isLoading: true });
      
      // Use provided userId or fetch from auth
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        uid = user?.id;
      }

      if (!uid) {
        console.log('[workoutSessionsStore] No authenticated user, skipping hydration');
        set({ workouts: [], isLoading: false });
        return;
      }

      const workouts = await fetchWorkoutSessions(uid);

      // Protect unsynced pending workout from being overwritten by hydration.
      // If there is a pendingWorkoutSave in sessionStore (AsyncStorage), ensure
      // it appears in the hydrated list so the user's data is never lost.
      try {
        const { useSessionStore } = require('@/store/sessionStore');
        const pending: Workout | null = useSessionStore.getState().pendingWorkoutSave;
        if (pending) {
          const alreadySynced = workouts.some(
            (w: Workout) => w.id === pending.id || (w.startTime === pending.startTime && w.name === pending.name),
          );
          if (!alreadySynced) {
            workouts.unshift(pending);
            console.log('[workoutSessionsStore] Merged pending workout into hydrated list');
          }
        }
      } catch {
        // Non-critical — if sessionStore isn't available, skip merge
      }

      set({ workouts, isLoading: false });
      console.log('[workoutSessionsStore] Hydrated', workouts.length, 'workouts from Supabase');
    } catch {
      // Silently handle hydration failures - network issues are expected during app startup
      // Keep existing local state if any, instead of wiping to empty
      const current = get().workouts;
      if (current.length === 0) {
        set({ isLoading: false });
      } else {
        console.warn('[workoutSessionsStore] Hydration failed, keeping', current.length, 'local workouts');
        set({ isLoading: false });
      }
    }
  },
}));

export type { WorkoutSessionsState };
