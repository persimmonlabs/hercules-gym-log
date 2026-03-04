/**
 * useAppStatsForAI
 * Computes pre-computed stats that match the Performance page exactly.
 * These are sent to the Hercules AI edge function so the AI reports
 * the same numbers the user sees in the app's charts and cards.
 */

import { useMemo } from 'react';

import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { AppStats } from '@/types/herculesAI';

export const useAppStatsForAI = (): AppStats => {
  const workouts = useWorkoutSessionsStore((state) => state.workouts);
  const weightUnit = useSettingsStore((state) => state.weightUnit);

  const {
    weeklyVolume: allTimeWeeklyVolume,
    tieredVolume: allTimeTieredVolume,
  } = useAnalyticsData({ timeRange: 'all' });

  const appStats = useMemo((): AppStats => {
    const totalVolume = allTimeWeeklyVolume?.high
      ? allTimeWeeklyVolume.high.reduce((sum, bar) => sum + (bar.value || 0), 0)
      : 0;

    let totalSets = 0;
    let totalReps = 0;

    for (const workout of workouts) {
      for (const exercise of (workout.exercises ?? [])) {
        for (const set of (exercise.sets ?? [])) {
          if (set.completed) {
            totalSets++;
            totalReps += set.reps ?? 0;
          }
        }
      }
    }

    const muscleGroupVolume: Record<string, number> = {};
    if (allTimeTieredVolume?.mid) {
      for (const [muscle, volume] of Object.entries(allTimeTieredVolume.mid)) {
        if (volume > 0) {
          muscleGroupVolume[muscle] = Math.round(volume);
        }
      }
    }

    return {
      totalVolume: Math.round(totalVolume),
      totalWorkouts: workouts.length,
      totalSets,
      totalReps,
      muscleGroupVolume,
      weightUnit: weightUnit || 'lbs',
    };
  }, [workouts, allTimeWeeklyVolume, allTimeTieredVolume, weightUnit]);

  return appStats;
};
