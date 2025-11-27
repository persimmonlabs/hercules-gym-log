/**
 * workoutsStore
 * Zustand store managing user-created workouts.
 * 
 * TERMINOLOGY:
 * - Workout: A collection of exercises (e.g., "Push Day", "Pull Day")
 * - Plan: A collection of workouts (e.g., "PPL", "Bro Split") - see programsStore
 * - Exercise: An individual movement (e.g., "Bench Press", "Squat")
 * 
 * This file provides the correctly-named exports.
 * For backward compatibility, plansStore.ts still exists with legacy names.
 */

// Re-export with correct names
export { 
  usePlansStore as useWorkoutsStore,
  type Plan as Workout,
  type PlansState as WorkoutsState,
} from './plansStore';

// Also re-export legacy names for backward compatibility
export { 
  usePlansStore,
  type Plan,
  type PlansState,
} from './plansStore';
