/**
 * workoutsStore (formerly plansStore)
 * Zustand store managing user-created workout templates.
 * 
 * TERMINOLOGY:
 * - Workout Template: A collection of exercises (e.g., "Push Day", "Pull Day")
 * - Plan/Program: A collection of workouts (e.g., "PPL", "Bro Split") - see programsStore
 * - Exercise: An individual movement (e.g., "Bench Press", "Squat")
 * 
 * Note: The "Plan" type here is actually a Workout Template. This naming is legacy.
 * Use the Workout type alias for new code.
 * 
 * Storage: Supabase (workout_templates table)
 */
import { create } from 'zustand';

import { exercises, type Exercise } from '@/constants/exercises';
import { canAddWorkout, getTotalUniqueWorkoutCount } from '@/utils/premiumLimits';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { supabaseClient } from '@/lib/supabaseClient';
import {
  fetchWorkoutTemplates,
  createWorkoutTemplate,
  updateWorkoutTemplate,
  deleteWorkoutTemplate,
} from '@/lib/supabaseQueries';

/**
 * A Workout is a collection of exercises (e.g., "Push Day")
 * @deprecated The name "Plan" is misleading. Use Workout type alias instead.
 */
export interface Plan {
  id: string;
  name: string;
  exercises: Exercise[];
  createdAt: number;
  source?: 'premade' | 'custom' | 'library' | 'recommended'; // Track workout source
}

/** A Workout is a collection of exercises (e.g., "Push Day", "Pull Day") */
export type Workout = Plan;

/** @deprecated Use WorkoutsState instead */
export interface PlansState {
  plans: Plan[];
  isLoading: boolean;
  addPlan: (input: { id?: string; name: string; exercises: Exercise[]; createdAt?: number; source?: 'premade' | 'custom' | 'library' | 'recommended' }) => Promise<void>;
  updatePlan: (plan: Plan) => Promise<void>;
  removePlan: (id: string) => Promise<void>;
  hydratePlans: (userId?: string) => Promise<void>;
}

export const usePlansStore = create<PlansState>((set, get) => ({
  plans: [],
  isLoading: false,

  addPlan: async ({ id, name, exercises: exerciseList, source }: { id?: string; name: string; exercises: Exercise[]; source?: 'premade' | 'custom' | 'library' | 'recommended' }) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        console.error('[plansStore] No authenticated user');
        return;
      }

      // Free user limit: max 7 workouts (only for new workouts, not edits)
      const isEditing = Boolean(id && get().plans.some(p => p.id === id));
      if (!isEditing) {
        // Count total unique workouts across both custom and program workouts
        // This matches what the user sees in "My Workouts"
        const currentWorkoutCount = getTotalUniqueWorkoutCount();
        console.log('[plansStore] Workout limit check:', { 
          currentWorkoutCount, 
          customWorkouts: get().plans.length,
          canAdd: canAddWorkout(currentWorkoutCount), 
          limit: 7 
        });
        if (!canAddWorkout(currentWorkoutCount)) {
          console.log('[plansStore] Blocking workout creation - limit reached');
          throw new Error('FREE_LIMIT_REACHED');
        }
      }

      // Create in Supabase
      const templateExercises = exerciseList.map(e => ({
        id: e.id,
        name: e.name,
        sets: 3,
      }));

      const newId = await createWorkoutTemplate(user.id, {
        name: trimmedName,
        exercises: templateExercises,
        source: source || 'custom',
      });

      // Update local state
      const plan: Plan = {
        id: newId,
        name: trimmedName,
        exercises: [...exerciseList],
        createdAt: Date.now(),
        source: source || 'custom',
      };

      set((state) => ({
        plans: [plan, ...state.plans],
      }));

      console.log('[plansStore] Workout template added to Supabase with ID:', newId);
    } catch (error: any) {
      // Don't log FREE_LIMIT_REACHED errors - they're handled in the UI
      if (error?.message !== 'FREE_LIMIT_REACHED') {
        console.error('[plansStore] Failed to add workout template', error);
      }
      // Re-throw to let UI handle it
      throw error;
    }
  },

  updatePlan: async (updatedPlan) => {
    const trimmedName = updatedPlan.name.trim();
    if (!trimmedName) return;

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        console.error('[plansStore] No authenticated user');
        return;
      }

      // Optimistic update
      const normalizedPlan: Plan = {
        ...updatedPlan,
        name: trimmedName,
        exercises: [...updatedPlan.exercises],
      };

      set((state) => ({
        plans: state.plans.map((plan) => (plan.id === normalizedPlan.id ? normalizedPlan : plan)),
      }));

      // Sync to Supabase
      await updateWorkoutTemplate(user.id, updatedPlan.id, {
        name: trimmedName,
        exercises: updatedPlan.exercises.map(e => ({
          id: e.id,
          name: e.name,
          sets: 3,
        })),
      });

      console.log('[plansStore] Workout template updated in Supabase');
    } catch (error) {
      console.error('[plansStore] Failed to update workout template', error);
      await get().hydratePlans();
    }
  },

  removePlan: async (id) => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        console.error('[plansStore] No authenticated user');
        return;
      }

      // Optimistic update
      set((state) => ({
        plans: state.plans.filter((plan) => plan.id !== id),
      }));

      // Sync to Supabase
      await deleteWorkoutTemplate(user.id, id);
      console.log('[plansStore] Workout template deleted from Supabase');
    } catch (error) {
      console.error('[plansStore] Failed to delete workout template', error);
      await get().hydratePlans();
    }
  },

  hydratePlans: async (userId?: string) => {
    try {
      set({ isLoading: true });

      // Use provided userId or fetch from auth
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        uid = user?.id;
      }
      
      if (!uid) {
        console.log('[plansStore] No authenticated user, skipping hydration');
        set({ plans: [], isLoading: false });
        return;
      }

      const templates = await fetchWorkoutTemplates(uid);
      console.log('[plansStore] HYDRATING PLANS from Supabase', templates);

      const exerciseLookup = exercises.reduce<Record<string, Exercise>>((acc, exercise) => {
        acc[exercise.id] = exercise;
        return acc;
      }, {});

      const normalizedPlans: Plan[] = templates.map((template) => {
        const normalizedExercises = template.exercises
          .map((item) => exerciseLookup[item.id])
          .filter((exercise): exercise is Exercise => Boolean(exercise));

        return {
          id: template.id,
          name: template.name,
          exercises: normalizedExercises,
          createdAt: new Date(template.created_at).getTime(),
          source: template.source || 'custom',
        };
      });

      set({ plans: normalizedPlans, isLoading: false });
      console.log('[plansStore] Hydrated', normalizedPlans.length, 'workout templates from Supabase');
    } catch (error) {
      // Silently handle hydration failures - network issues are expected during app startup
      console.warn('[plansStore] Hydration failed, using empty state');
      set({ plans: [], isLoading: false });
    }
  },
}));

// Note: Hydration is now triggered by auth state changes, not on module load
// This prevents hydration before the user is authenticated

// Correctly-named exports (use these for new code)
/** WorkoutsState - the state interface for the workouts store */
export type WorkoutsState = PlansState;
/** useWorkoutsStore - hook to access the workouts store */
export const useWorkoutsStore = usePlansStore;
