import { create } from 'zustand';

import type { Workout } from '@/types/workout';
import { supabaseClient } from '@/lib/supabaseClient';
import {
  fetchWorkoutSessions,
  createWorkoutSession,
  updateWorkoutSession,
  deleteWorkoutSession,
} from '@/lib/supabaseQueries';

interface WorkoutSessionsState {
  workouts: Workout[];
  isLoading: boolean;
  addWorkout: (workout: Workout) => Promise<void>;
  updateWorkout: (workout: Workout) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  getWorkouts: () => Workout[];
  clearWorkouts: () => Promise<void>;
  hydrateWorkouts: (userId?: string) => Promise<void>;
}

export const useWorkoutSessionsStore = create<WorkoutSessionsState>((set, get) => ({
  workouts: [],
  isLoading: false,

  addWorkout: async (workout) => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        console.error('[workoutSessionsStore] No authenticated user');
        return;
      }

      // Create in Supabase and get the generated UUID
      const newId = await createWorkoutSession(user.id, workout);

      // Update the workout with the Supabase-generated ID
      const workoutWithId = { ...workout, id: newId };

      // Update local state
      const next = [workoutWithId, ...get().workouts];
      set({ workouts: next });

      console.log('[workoutSessionsStore] Workout added to Supabase with ID:', newId);
    } catch (error) {
      console.error('[workoutSessionsStore] Failed to add workout', error);
      // Revert optimistic update on error
      await get().hydrateWorkouts();
    }
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
      set({ workouts, isLoading: false });
      console.log('[workoutSessionsStore] Hydrated', workouts.length, 'workouts from Supabase');
    } catch (error) {
      console.error('[workoutSessionsStore] Failed to hydrate workouts', error);
      set({ workouts: [], isLoading: false });
    }
  },
}));

export type { WorkoutSessionsState };
