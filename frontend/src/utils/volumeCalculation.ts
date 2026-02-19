/**
 * volumeCalculation
 * Shared volume calculation logic used by all analytics hooks and workout utils.
 *
 * Formula: volume = (userBodyWeight × effectiveBodyweightMultiplier + addedWeight) × reps
 *
 * - For weight exercises: addedWeight = set.weight; BW multiplier adds a small stabilizer component
 * - For bodyweight exercises: addedWeight = 0; BW multiplier is the sole volume source
 * - For assisted exercises: addedWeight = -(assistanceWeight); net = BW×mult - assistance
 * - For cardio/duration/reps_only: returns 0
 */

import type { ExerciseType } from '@/types/exercise';

/**
 * Computes the volume contribution of a single completed set.
 *
 * @param set - The set log object (must have reps; may have weight, assistanceWeight)
 * @param exerciseType - The exercise type from the catalog
 * @param userBodyWeight - User body weight in lbs (undefined/null if not set)
 * @param bwMultiplier - effectiveBodyweightMultiplier from exercises.json (0–1)
 * @returns Volume in weight-units (lbs), before any unit conversion
 */
export const computeSetVolume = (
  set: any,
  exerciseType: ExerciseType,
  userBodyWeight: number | undefined | null,
  bwMultiplier: number,
): number => {
  const reps = set.reps ?? 0;
  if (reps <= 0) return 0;

  const bw = userBodyWeight && userBodyWeight > 0 ? userBodyWeight : 0;
  const bwComponent = bw * bwMultiplier;

  switch (exerciseType) {
    case 'bodyweight': {
      // Pure bodyweight: volume = BW × multiplier × reps
      return bwComponent > 0 ? bwComponent * reps : 0;
    }
    case 'assisted': {
      // Assisted: volume = max(0, BW×mult - assistance) × reps
      if (bw <= 0) return 0;
      const assistance = set.assistanceWeight ?? 0;
      const effective = Math.max(0, bw - assistance);
      return effective > 0 ? effective * reps : 0;
    }
    case 'weight': {
      // Weighted: volume = (BW×mult + externalWeight) × reps
      const w = set.weight ?? 0;
      const total = bwComponent + w;
      return total > 0 ? total * reps : 0;
    }
    case 'cardio':
    case 'duration':
    case 'reps_only':
    default:
      return 0;
  }
};

/**
 * Default BW multiplier by exercise type (fallback for custom exercises
 * or exercises missing the field).
 */
export const DEFAULT_BW_MULTIPLIER_BY_TYPE: Record<ExerciseType, number> = {
  bodyweight: 0.10,
  weight: 0.02,
  assisted: 0.02,
  cardio: 0,
  duration: 0,
  reps_only: 0,
};
