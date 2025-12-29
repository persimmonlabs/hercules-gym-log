/**
 * customExerciseStore
 * Zustand store managing user-created custom exercises.
 * 
 * Custom exercises:
 * - Are created by users when the built-in exercise library doesn't have what they need
 * - Have a name and exercise type (for proper set tracking)
 * - Persist across sessions via Supabase
 * - Do NOT contribute to analytics/statistics
 * - Are user-specific
 * 
 * Storage: Supabase (custom_exercises table)
 */

import { create } from 'zustand';

import { supabaseClient } from '@/lib/supabaseClient';
import {
  fetchCustomExercises,
  createCustomExercise,
  deleteCustomExercise,
} from '@/lib/supabaseQueries';
import type { ExerciseType } from '@/types/exercise';
import { exercises as baseExerciseCatalog } from '@/constants/exercises';

export interface CustomExercise {
  id: string;
  name: string;
  exerciseType: ExerciseType;
  isCustom: true;
  createdAt: number;
}

export interface CustomExerciseState {
  customExercises: CustomExercise[];
  isLoading: boolean;
  addCustomExercise: (input: { name: string; exerciseType: ExerciseType }) => Promise<CustomExercise | null>;
  removeCustomExercise: (id: string) => Promise<void>;
  hydrateCustomExercises: (userId?: string) => Promise<void>;
  getCustomExerciseByName: (name: string) => CustomExercise | undefined;
}

export const useCustomExerciseStore = create<CustomExerciseState>((set, get) => ({
  customExercises: [],
  isLoading: false,

  addCustomExercise: async ({ name, exerciseType }) => {
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    // Check for duplicate names (both custom and built-in)
    const existingCustom = get().customExercises.find(
      (e) => e.name.toLowerCase() === trimmedName.toLowerCase()
    );
    const existingBuiltIn = baseExerciseCatalog.find(
      (e) => e.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existingCustom || existingBuiltIn) {
      console.warn('[customExerciseStore] Exercise with this name already exists');
      return null;
    }

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        console.error('[customExerciseStore] No authenticated user');
        return null;
      }

      const newId = await createCustomExercise(user.id, {
        name: trimmedName,
        exerciseType,
      });

      const customExercise: CustomExercise = {
        id: newId,
        name: trimmedName,
        exerciseType,
        isCustom: true,
        createdAt: Date.now(),
      };

      set((state) => ({
        customExercises: [customExercise, ...state.customExercises],
      }));

      console.log('[customExerciseStore] Custom exercise added with ID:', newId);
      return customExercise;
    } catch (error) {
      console.error('[customExerciseStore] Failed to add custom exercise', error);
      await get().hydrateCustomExercises();
      return null;
    }
  },

  removeCustomExercise: async (id) => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        console.error('[customExerciseStore] No authenticated user');
        return;
      }

      set((state) => ({
        customExercises: state.customExercises.filter((e) => e.id !== id),
      }));

      await deleteCustomExercise(user.id, id);
      console.log('[customExerciseStore] Custom exercise deleted');
    } catch (error) {
      console.error('[customExerciseStore] Failed to delete custom exercise', error);
      await get().hydrateCustomExercises();
    }
  },

  hydrateCustomExercises: async (userId?: string) => {
    try {
      set({ isLoading: true });

      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        uid = user?.id;
      }

      if (!uid) {
        console.log('[customExerciseStore] No authenticated user, skipping hydration');
        set({ customExercises: [], isLoading: false });
        return;
      }

      const exercises = await fetchCustomExercises(uid);

      const normalizedExercises: CustomExercise[] = exercises.map((item) => ({
        id: item.id,
        name: item.name,
        exerciseType: item.exercise_type as ExerciseType,
        isCustom: true,
        createdAt: new Date(item.created_at).getTime(),
      }));

      set({ customExercises: normalizedExercises, isLoading: false });
      console.log('[customExerciseStore] Hydrated', normalizedExercises.length, 'custom exercises');
    } catch (error) {
      console.warn('[customExerciseStore] Hydration failed, using empty state');
      set({ customExercises: [], isLoading: false });
    }
  },

  getCustomExerciseByName: (name: string) => {
    return get().customExercises.find(
      (e) => e.name.toLowerCase() === name.toLowerCase()
    );
  },
}));
