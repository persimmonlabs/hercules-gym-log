/**
 * useTrainingBalanceMetrics
 * Shared analytics logic for balance ratios so multiple components can reuse it.
 *
 * Single source of truth for:
 * - Push/Pull, Upper/Lower, Compound/Isolated ratios (volume AND sets)
 * - Muscle-group coverage scoring (how many L2 groups are trained)
 * - Movement-pattern diversity scoring
 * - Goal-aware ideal ratios (exported so BalanceScoreCard + useInsightsData share them)
 *
 * Both the Balance Score card and Performance Insights import from here
 * so every balance-related number in the app is coherent.
 */

import { useMemo } from 'react';

import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { useDevToolsStore } from '@/store/devToolsStore';
import { useUserProfileStore } from '@/store/userProfileStore';
import type { PrimaryGoal } from '@/store/userProfileStore';
import exercisesData from '@/data/exercises.json';
import hierarchyData from '@/data/hierarchy.json';
import { exercises as exerciseCatalog } from '@/constants/exercises';
import { computeSetVolume as sharedComputeSetVolume, DEFAULT_BW_MULTIPLIER_BY_TYPE } from '@/utils/volumeCalculation';
import type { TimeRange } from '@/types/analytics';
import type { ExerciseType } from '@/types/exercise';

// ============================================================================
// TYPES
// ============================================================================

export interface BalanceData {
  push: number;
  pull: number;
  upper: number;
  lower: number;
  compound: number;
  isolated: number;
}

export interface MuscleGroupSets {
  [group: string]: number;
}

export interface BalanceMetricsResult {
  volumeData: BalanceData;
  setData: BalanceData;
  muscleGroupSets: MuscleGroupSets;
  muscleGroupVolume: MuscleGroupSets;
  movementPatterns: Set<string>;
  totalSets: number;
  totalVolume: number;
  workoutCount: number;
  hasData: boolean;
}

// ============================================================================
// IDEAL RATIOS (shared by BalanceScoreCard + useInsightsData)
// ============================================================================

export interface IdealRatios {
  pushPull: number;
  upperLower: number;
  compoundIsolated: number;
}

const DEFAULT_IDEAL_RATIOS: IdealRatios = {
  pushPull: 50,
  upperLower: 55,
  compoundIsolated: 60,
};

const GOAL_IDEAL_RATIOS: Record<PrimaryGoal, IdealRatios> = {
  'build-muscle': { pushPull: 50, upperLower: 55, compoundIsolated: 55 },
  'lose-fat': { pushPull: 50, upperLower: 50, compoundIsolated: 65 },
  'gain-strength': { pushPull: 50, upperLower: 55, compoundIsolated: 70 },
  'general-fitness': { pushPull: 50, upperLower: 50, compoundIsolated: 55 },
  'improve-endurance': { pushPull: 50, upperLower: 50, compoundIsolated: 50 },
};

export const getIdealRatios = (goal: PrimaryGoal | null | undefined): IdealRatios =>
  goal ? GOAL_IDEAL_RATIOS[goal] : DEFAULT_IDEAL_RATIOS;

// ============================================================================
// BALANCE THRESHOLD (shared constant for insights)
// ============================================================================

export const BALANCE_DEVIATION_PER_POINT = 2;

export const calculateRatioScore = (
  left: number,
  right: number,
  idealLeftPercent: number,
): number => {
  const total = left + right;
  if (total === 0) return 0;
  const leftPercent = (left / total) * 100;
  const diff = Math.abs(leftPercent - idealLeftPercent);
  return Math.max(0, 100 - diff * BALANCE_DEVIATION_PER_POINT);
};

// ============================================================================
// MUSCLE NAME ALIASES (exercises.json → hierarchy.json)
// ============================================================================

const MUSCLE_NAME_ALIASES: Record<string, string> = {
  'Upper Back': 'Traps',
  'Lateral Delts': 'Side Delts',
  'Biceps - Long Head': 'Biceps',
  'Biceps - Short Head': 'Biceps',
  'Brachialis': 'Biceps',
  'Triceps - Long Head': 'Triceps',
  'Triceps - Lateral Head': 'Triceps',
  'Triceps - Medial Head': 'Triceps',
  'Flexors': 'Forearms',
  'Extensors': 'Forearms',
  'Calves - Medial Head': 'Calves',
  'Calves - Lateral Head': 'Calves',
  'Soleus': 'Calves',
  'Upper Abs': 'Abs',
  'Lower Abs': 'Abs',
  'Hip Adductors': 'Adductors',
};

const resolveMuscle = (name: string): string => MUSCLE_NAME_ALIASES[name] ?? name;

// ============================================================================
// STATIC DATA MAPS (built once at module load)
// ============================================================================

interface ExerciseMetadata {
  push_pull: 'push' | 'pull' | null;
  is_compound: boolean;
  exercise_type: ExerciseType;
  movement_pattern: string | null;
}

const EXERCISE_METADATA = exercisesData.reduce((acc, ex) => {
  acc[ex.name] = {
    push_pull: ex.push_pull as 'push' | 'pull' | null,
    is_compound: ex.is_compound ?? false,
    exercise_type: (ex.exercise_type as ExerciseType) || 'weight',
    movement_pattern: (ex as any).movement_pattern ?? null,
  } satisfies ExerciseMetadata;
  return acc;
}, {} as Record<string, ExerciseMetadata>);

const EXERCISE_MUSCLES = exercisesData.reduce((acc, ex) => {
  if (ex.muscles) {
    const resolved: Record<string, number> = {};
    Object.entries(ex.muscles as Record<string, number>).forEach(([m, w]) => {
      const canonical = resolveMuscle(m);
      resolved[canonical] = (resolved[canonical] || 0) + w;
    });
    acc[ex.name] = resolved;
  }
  return acc;
}, {} as Record<string, Record<string, number>>);

const UPPER_BODY_GROUPS = new Set(['Chest', 'Back', 'Shoulders', 'Arms']);
const LOWER_BODY_GROUPS = new Set(['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Hips']);

export const ALL_L2_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Arms',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Hips',
  'Abs', 'Obliques',
] as const;

export const MOVEMENT_PATTERN_TARGETS = [
  'Horizontal Push', 'Horizontal Pull',
  'Vertical Push', 'Vertical Pull',
  'Squat', 'Hinge', 'Lunge',
] as const;

const buildLeafToL2 = (): Record<string, string> => {
  const leafToL2: Record<string, string> = {};
  const hierarchy = hierarchyData.muscle_hierarchy as Record<string, any>;

  Object.entries(hierarchy).forEach(([_l1, l1Data]) => {
    if (l1Data?.muscles) {
      Object.entries(l1Data.muscles).forEach(([l2, l2Data]: [string, any]) => {
        leafToL2[l2] = l2;
        if (l2Data?.muscles) {
          Object.entries(l2Data.muscles).forEach(([l3, l3Data]: [string, any]) => {
            leafToL2[l3] = l2;
            if (l3Data?.muscles) {
              Object.keys(l3Data.muscles).forEach((l4) => {
                leafToL2[l4] = l2;
              });
            }
          });
        }
      });
    }
  });

  return leafToL2;
};

const LEAF_TO_L2 = buildLeafToL2();

// ============================================================================
// BW MULTIPLIER LOOKUP
// ============================================================================

const BW_MULTIPLIER_MAP = exerciseCatalog.reduce((acc, ex) => {
  acc[ex.name] = ex.effectiveBodyweightMultiplier;
  return acc;
}, {} as Record<string, number>);

const isCompletedSet = (set: any): boolean => {
  if (!set?.completed) return false;
  return (set.reps ?? 0) > 0;
};

// ============================================================================
// EMPTY STATE
// ============================================================================

const EMPTY_BALANCE: BalanceData = {
  push: 0, pull: 0,
  upper: 0, lower: 0,
  compound: 0, isolated: 0,
};

const EMPTY_RESULT: BalanceMetricsResult = {
  volumeData: { ...EMPTY_BALANCE },
  setData: { ...EMPTY_BALANCE },
  muscleGroupSets: {},
  muscleGroupVolume: {},
  movementPatterns: new Set(),
  totalSets: 0,
  totalVolume: 0,
  workoutCount: 0,
  hasData: false,
};

// ============================================================================
// HOOK
// ============================================================================

export const useTrainingBalanceMetrics = (timeRange: TimeRange): BalanceMetricsResult => {
  const forceEmptyAnalytics = useDevToolsStore((state) => state.forceEmptyAnalytics);
  const rawWorkouts = useWorkoutSessionsStore((state) => state.workouts);
  const workouts = __DEV__ && forceEmptyAnalytics ? [] : rawWorkouts;
  const userBodyWeight = useUserProfileStore((state) => state.profile?.weightLbs);

  return useMemo(() => {
    if (!workouts.length) return { ...EMPTY_RESULT };

    const volumeBalance: BalanceData = { ...EMPTY_BALANCE };
    const setBalance: BalanceData = { ...EMPTY_BALANCE };
    const muscleGroupSets: MuscleGroupSets = {};
    const muscleGroupVolume: MuscleGroupSets = {};
    const movementPatterns = new Set<string>();
    let totalSets = 0;
    let totalVolume = 0;

    const now = new Date();
    let cutoff: Date;

    switch (timeRange) {
      case 'week':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        cutoff = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
      default:
        cutoff = new Date(0);
        break;
    }

    const filtered = workouts.filter((w) => new Date(w.date) >= cutoff);

    filtered.forEach((workout) => {
      workout.exercises.forEach((exercise: any) => {
        const meta = EXERCISE_METADATA[exercise.name];
        if (!meta) return;

        const et = meta.exercise_type || 'weight';
        if (et === 'cardio' || et === 'duration') return;

        const muscleWeights = EXERCISE_MUSCLES[exercise.name];
        const bwMult = BW_MULTIPLIER_MAP[exercise.name] ?? DEFAULT_BW_MULTIPLIER_BY_TYPE[et] ?? 0;

        exercise.sets.forEach((set: any) => {
          if (!isCompletedSet(set)) return;

          const vol = sharedComputeSetVolume(set, et, userBodyWeight, bwMult);
          totalSets += 1;
          totalVolume += vol;

          // Push / Pull (set-based AND volume-based)
          if (meta.push_pull === 'push') {
            setBalance.push += 1;
            volumeBalance.push += vol;
          } else if (meta.push_pull === 'pull') {
            setBalance.pull += 1;
            volumeBalance.pull += vol;
          }

          // Compound / Isolated (set-based AND volume-based)
          if (meta.is_compound) {
            setBalance.compound += 1;
            volumeBalance.compound += vol;
          } else {
            setBalance.isolated += 1;
            volumeBalance.isolated += vol;
          }

          // Upper / Lower — muscle-weight-based distribution (consistent everywhere)
          if (muscleWeights) {
            let uW = 0;
            let lW = 0;
            Object.entries(muscleWeights).forEach(([m, w]) => {
              const l2 = LEAF_TO_L2[m];
              if (!l2) return;
              if (UPPER_BODY_GROUPS.has(l2)) uW += w;
              if (LOWER_BODY_GROUPS.has(l2)) lW += w;
            });
            const t = uW + lW;
            if (t > 0) {
              setBalance.upper += uW / t;
              setBalance.lower += lW / t;
              if (vol > 0) {
                volumeBalance.upper += vol * (uW / t);
                volumeBalance.lower += vol * (lW / t);
              }
            }

            // Per-L2 muscle group tracking
            let wSum = 0;
            Object.entries(muscleWeights).forEach(([m, w]) => {
              if (LEAF_TO_L2[m]) wSum += w;
            });
            if (wSum > 0) {
              Object.entries(muscleWeights).forEach(([m, w]) => {
                const l2 = LEAF_TO_L2[m];
                if (!l2) return;
                const frac = w / wSum;
                muscleGroupSets[l2] = (muscleGroupSets[l2] || 0) + frac;
                if (vol > 0) {
                  muscleGroupVolume[l2] = (muscleGroupVolume[l2] || 0) + vol * frac;
                }
              });
            }
          }

          // Movement pattern tracking
          if (meta.movement_pattern) {
            movementPatterns.add(meta.movement_pattern);
          }
        });
      });
    });

    const hasData = totalSets > 0;

    return {
      volumeData: volumeBalance,
      setData: setBalance,
      muscleGroupSets,
      muscleGroupVolume,
      movementPatterns,
      totalSets,
      totalVolume,
      workoutCount: filtered.length,
      hasData,
    };
  }, [workouts, timeRange, userBodyWeight]);
};
