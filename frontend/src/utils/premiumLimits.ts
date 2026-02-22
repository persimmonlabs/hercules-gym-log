/**
 * Premium Limits Utility
 * Centralized logic for free tier limits that can be used in stores and components.
 */

import { useDevToolsStore } from '@/store/devToolsStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { UserProgram } from '@/types/premadePlan';

// Free tier limits
export const FREE_LIMITS = {
  MAX_WORKOUTS: 7,
  MAX_PLANS: 1,
} as const;

/**
 * Get the total number of unique workouts across both custom workouts and program workouts.
 * This matches how the "My Workouts" UI displays and counts workouts.
 */
type PlanSummary = {
  name: string;
};

export const getTotalUniqueWorkoutCount = (
  plans: PlanSummary[],
  userPrograms: UserProgram[],
): number => {
  
  const workoutsGroupedByName: Record<string, boolean> = {};

  // 1. Collect all standalone templates (custom workouts)
  plans.forEach(plan => {
    const nameKey = plan.name.trim().toLowerCase();
    workoutsGroupedByName[nameKey] = true;
  });

  // 2. Collect all plan-specific workouts (program workouts)
  userPrograms.forEach(prog => {
    prog.workouts.forEach(w => {
      if (w.exercises.length === 0) return; // Skip empty workouts
      const nameKey = w.name.trim().toLowerCase();
      workoutsGroupedByName[nameKey] = true;
    });
  });

  return Object.keys(workoutsGroupedByName).length;
};

/**
 * Check if user is premium (for use in stores/non-hook contexts)
 * Checks devToolsStore override first, then settingsStore.isPro (synced from Supabase)
 */
export const isPremiumUser = (): boolean => {
  const premiumOverride = useDevToolsStore.getState().premiumOverride;
  
  // Check dev tools override first (highest priority, dev-only)
  if (premiumOverride === 'premium') {
    return true;
  } else if (premiumOverride === 'free') {
    return false;
  }
  
  // Check real Pro status from settings store (synced from Supabase profiles.is_pro)
  const isPro = useSettingsStore.getState().isPro;
  return isPro === true;
};

/**
 * Check if user can add more workouts
 * Allows adding when current count is less than the limit
 * e.g., with MAX_WORKOUTS = 7, allows adding when count is 0-6 (resulting in 1-7 total)
 */
export const canAddWorkout = (currentWorkoutCount: number): boolean => {
  if (isPremiumUser()) {
    return true;
  }
  // Allow adding if the result would be <= MAX_WORKOUTS
  // Current count of 6 means adding would result in 7 (allowed)
  // Current count of 7 means adding would result in 8 (blocked)
  return currentWorkoutCount < FREE_LIMITS.MAX_WORKOUTS;
};

/**
 * Check if user can add more plans
 */
export const canAddPlan = (currentPlanCount: number): boolean => {
  if (isPremiumUser()) {
    return true;
  }
  return currentPlanCount < FREE_LIMITS.MAX_PLANS;
};

/**
 * Check if adding a program would exceed workout limit
 * @param currentWorkoutCount - Current number of workouts in My Workouts
 * @param programWorkoutCount - Number of workouts in the program being added
 */
export const canAddProgramWorkouts = (
  currentWorkoutCount: number,
  programWorkoutCount: number
): boolean => {
  if (isPremiumUser()) {
    return true;
  }
  return (currentWorkoutCount + programWorkoutCount) <= FREE_LIMITS.MAX_WORKOUTS;
};

export type LimitType = 'workout' | 'plan';

/**
 * Determine which limit is being exceeded when adding a program
 */
export const getProgramLimitType = (
  currentPlanCount: number,
  currentWorkoutCount: number,
  programWorkoutCount: number
): LimitType | null => {
  if (isPremiumUser()) {
    return null;
  }
  
  // Check plan limit first (if they already have a plan)
  if (currentPlanCount >= FREE_LIMITS.MAX_PLANS) {
    return 'plan';
  }
  
  // Check if adding program workouts would exceed workout limit
  if ((currentWorkoutCount + programWorkoutCount) > FREE_LIMITS.MAX_WORKOUTS) {
    return 'workout';
  }
  
  return null;
};
