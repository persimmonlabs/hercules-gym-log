/**
 * useTrainingBalanceMetrics
 * Shared analytics logic for balance ratios so multiple components can reuse it.
 */

import { useMemo } from 'react';

import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { useDevToolsStore } from '@/store/devToolsStore';
import { useUserProfileStore } from '@/store/userProfileStore';
import exercisesData from '@/data/exercises.json';
import hierarchyData from '@/data/hierarchy.json';
import type { TimeRange } from '@/types/analytics';
import type { ExerciseType } from '@/types/exercise';

export interface BalanceData {
  push: number;
  pull: number;
  quad: number;
  hip: number;
  upper: number;
  lower: number;
  compound: number;
  isolated: number;
}

const EMPTY_BALANCE: BalanceData = {
  push: 0,
  pull: 0,
  quad: 0,
  hip: 0,
  upper: 0,
  lower: 0,
  compound: 0,
  isolated: 0,
};

interface ExerciseMetadata {
  push_pull: 'push' | 'pull' | null;
  upper_lower: 'upper' | 'lower' | null;
  is_compound: boolean;
  exercise_type: ExerciseType;
}

const EXERCISE_METADATA = exercisesData.reduce((acc, ex) => {
  acc[ex.name] = {
    push_pull: ex.push_pull as 'push' | 'pull' | null,
    upper_lower: ex.upper_lower as 'upper' | 'lower' | null,
    is_compound: ex.is_compound ?? false,
    exercise_type: (ex.exercise_type as ExerciseType) || 'weight',
  } satisfies ExerciseMetadata;
  return acc;
}, {} as Record<string, ExerciseMetadata>);

const EXERCISE_MUSCLES = exercisesData.reduce((acc, ex) => {
  if (ex.muscles) {
    acc[ex.name] = ex.muscles as unknown as Record<string, number>;
  }
  return acc;
}, {} as Record<string, Record<string, number>>);

const buildLeafToL1 = (): Record<string, string> => {
  const leafToL1: Record<string, string> = {};
  const hierarchy = hierarchyData.muscle_hierarchy as Record<string, any>;

  Object.entries(hierarchy).forEach(([l1, l1Data]) => {
    if (l1Data?.muscles) {
      Object.entries(l1Data.muscles).forEach(([l2, l2Data]: [string, any]) => {
        leafToL1[l2] = l1;
        if (l2Data?.muscles) {
          Object.entries(l2Data.muscles).forEach(([l3, l3Data]: [string, any]) => {
            leafToL1[l3] = l1;
            if (l3Data?.muscles) {
              Object.keys(l3Data.muscles).forEach((l4) => {
                leafToL1[l4] = l1;
              });
            }
          });
        }
      });
    }
  });

  return leafToL1;
};

const LEAF_TO_L1 = buildLeafToL1();

export const useTrainingBalanceMetrics = (timeRange: TimeRange) => {
  const forceEmptyAnalytics = useDevToolsStore((state) => state.forceEmptyAnalytics);
  const rawWorkouts = useWorkoutSessionsStore((state) => state.workouts);
  const workouts = __DEV__ && forceEmptyAnalytics ? [] : rawWorkouts;
  const userBodyWeight = useUserProfileStore((state) => state.profile?.weightLbs);

  return useMemo(() => {
    if (!workouts.length) {
      return {
        volumeData: { ...EMPTY_BALANCE },
        setData: { ...EMPTY_BALANCE },
        hasData: false,
      };
    }

    const volumeBalance: BalanceData = { ...EMPTY_BALANCE };
    const setBalance: BalanceData = { ...EMPTY_BALANCE };

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

    workouts
      .filter((w) => new Date(w.date) >= cutoff)
      .forEach((workout) => {
        workout.exercises.forEach((exercise: any) => {
          const metadata = EXERCISE_METADATA[exercise.name];
          if (!metadata) return;

          const exerciseType = metadata.exercise_type || 'weight';
          if (exerciseType === 'cardio' || exerciseType === 'duration') {
            return;
          }

          const completedSets = exercise.sets.filter((set: any) => {
            if (!set.completed) return false;
            const reps = set.reps ?? 0;
            const weight = set.weight ?? 0;
            const assistanceWeight = set.assistanceWeight ?? 0;

            switch (exerciseType) {
              case 'weight':
                return reps > 0 && weight > 0;
              case 'bodyweight':
              case 'reps_only':
                return reps > 0;
              case 'assisted':
                return reps > 0 && (weight > 0 || assistanceWeight > 0);
              default:
                return false;
            }
          });

          const setCount = completedSets.length;
          if (setCount === 0) return;

          let totalVolume = 0;
          completedSets.forEach((set: any) => {
            const reps = set.reps ?? 0;
            if (reps <= 0) {
              return;
            }

            let setVolume = 0;
            switch (exerciseType) {
              case 'bodyweight':
                if (userBodyWeight && userBodyWeight > 0) {
                  setVolume = userBodyWeight * reps;
                }
                break;
              case 'assisted': {
                if (!userBodyWeight || userBodyWeight <= 0) {
                  break;
                }
                const assistanceWeight = set.assistanceWeight ?? 0;
                const effectiveWeight = Math.max(0, userBodyWeight - assistanceWeight);
                if (effectiveWeight > 0) {
                  setVolume = effectiveWeight * reps;
                }
                break;
              }
              case 'reps_only':
                setVolume = 0;
                break;
              case 'weight':
              default: {
                const weight = set.weight ?? 0;
                if (weight > 0) {
                  setVolume = weight * reps;
                }
                break;
              }
            }

            if (setVolume > 0) {
              totalVolume += setVolume;
            }
          });

          if (metadata.push_pull === 'push') {
            setBalance.push += setCount;
            volumeBalance.push += totalVolume;
          } else if (metadata.push_pull === 'pull') {
            setBalance.pull += setCount;
            volumeBalance.pull += totalVolume;
          }

          if (metadata.upper_lower === 'upper') {
            setBalance.upper += setCount;
          } else if (metadata.upper_lower === 'lower') {
            setBalance.lower += setCount;
          }

          const muscleWeights = EXERCISE_MUSCLES[exercise.name];
          if (muscleWeights && totalVolume > 0) {
            Object.entries(muscleWeights).forEach(([muscle, weight]) => {
              const muscleVolume = totalVolume * weight;
              const l1Category = LEAF_TO_L1[muscle];
              if (l1Category === 'Upper Body' || l1Category === 'Core') {
                volumeBalance.upper += muscleVolume;
              } else if (l1Category === 'Lower Body') {
                volumeBalance.lower += muscleVolume;
              }
            });
          }

          if (metadata.is_compound) {
            setBalance.compound += setCount;
            volumeBalance.compound += totalVolume;
          } else {
            setBalance.isolated += setCount;
            volumeBalance.isolated += totalVolume;
          }
        });
      });

    const hasVolumeData = Object.values(volumeBalance).some((v) => v > 0);
    const hasSetData = Object.values(setBalance).some((v) => v > 0);

    return {
      volumeData: volumeBalance,
      setData: setBalance,
      hasData: hasVolumeData || hasSetData,
    };
  }, [workouts, timeRange, userBodyWeight]);
};
