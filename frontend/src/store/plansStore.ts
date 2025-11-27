/**
 * workoutsStore (formerly plansStore)
 * Zustand store managing user-created workouts.
 * 
 * TERMINOLOGY:
 * - Workout: A collection of exercises (e.g., "Push Day", "Pull Day")
 * - Plan: A collection of workouts (e.g., "PPL", "Bro Split") - see programsStore
 * - Exercise: An individual movement (e.g., "Bench Press", "Squat")
 * 
 * Note: The "Plan" type here is actually a Workout. This naming is legacy.
 * Use the Workout type alias for new code.
 */
import { create } from 'zustand';

import { exercises, type Exercise } from '@/constants/exercises';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { deletePlan, getPlans } from '@/utils/storage';
import { canUseAsyncStorage } from '@/utils/environment';

/**
 * A Workout is a collection of exercises (e.g., "Push Day")
 * @deprecated The name "Plan" is misleading. Use Workout type alias instead.
 */
export interface Plan {
  id: string;
  name: string;
  exercises: Exercise[];
  createdAt: number;
}

/** A Workout is a collection of exercises (e.g., "Push Day", "Pull Day") */
export type Workout = Plan;

/** @deprecated Use WorkoutsState instead */
export interface PlansState {
  plans: Plan[];
  addPlan: (input: { id?: string; name: string; exercises: Exercise[]; createdAt?: number }) => void;
  updatePlan: (plan: Plan) => void;
  removePlan: (id: string) => Promise<void>;
  hydratePlans: () => Promise<void>;
}

export const usePlansStore = create<PlansState>((set) => ({
  plans: [],
  addPlan: ({ id, name, exercises, createdAt }) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    const planId = id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = createdAt ?? Date.now();

    const plan: Plan = {
      id: planId,
      name: trimmedName,
      exercises: [...exercises],
      createdAt: timestamp,
    };

    set((state) => ({
      plans: [plan, ...state.plans.filter((existing) => existing.id !== plan.id)],
    }));
  },
  updatePlan: (updatedPlan) => {
    const trimmedName = updatedPlan.name.trim();

    if (!trimmedName) {
      return;
    }

    const normalizedPlan: Plan = {
      ...updatedPlan,
      name: trimmedName,
      exercises: [...updatedPlan.exercises],
    };

    set((state) => ({
      plans: state.plans.map((plan) => (plan.id === normalizedPlan.id ? normalizedPlan : plan)),
    }));
  },
  removePlan: async (id) => {
    set((state) => ({
      plans: state.plans.filter((plan) => plan.id !== id),
    }));

    try {
      await deletePlan(id);
    } catch (error) {
      console.error('[plansStore] Failed to delete plan', error);
    }
  },
  hydratePlans: async () => {
    try {
      const loadedPlans = await getPlans();
      console.log('[plansStore] HYDRATING PLANS', loadedPlans);

      const exerciseLookup = exercises.reduce<Record<string, Exercise>>((acc, exercise) => {
        acc[exercise.id] = exercise;
        return acc;
      }, {});

      const normalizedPlans: Plan[] = loadedPlans.map((plan) => {
        const normalizedExercises = plan.exercises
          .map((item) => exerciseLookup[item.id])
          .filter((exercise): exercise is Exercise => Boolean(exercise));

        const createdAt = typeof plan.createdAt === 'number'
          ? plan.createdAt
          : new Date(plan.createdAt).getTime() || Date.now();

        return {
          id: plan.id,
          name: plan.name,
          exercises: normalizedExercises,
          createdAt,
        };
      });

      set({ plans: normalizedPlans });
    } catch (error) {
      console.error('[plansStore] Failed to hydrate plans', error);
    }
  },
}));

let hasHydratedWorkouts = false;
let hasHydratedPlans = false;

const hydrateWorkoutsOnStartup = (): void => {
  if (hasHydratedWorkouts) {
    return;
  }

  hasHydratedWorkouts = true;
  console.log('[plansStore] HYDRATING WORKOUTS');
  void useWorkoutSessionsStore.getState().hydrateWorkouts();
};

const hydratePlansOnStartup = (): void => {
  if (hasHydratedPlans) {
    return;
  }

  hasHydratedPlans = true;
  void usePlansStore.getState().hydratePlans();
};

if (canUseAsyncStorage()) {
  hydrateWorkoutsOnStartup();
  hydratePlansOnStartup();
}

// Correctly-named exports (use these for new code)
/** WorkoutsState - the state interface for the workouts store */
export type WorkoutsState = PlansState;
/** useWorkoutsStore - hook to access the workouts store */
export const useWorkoutsStore = usePlansStore;
