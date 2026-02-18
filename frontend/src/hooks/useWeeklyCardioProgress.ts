/**
 * useWeeklyCardioProgress Hook
 * Calculates cardio progress for the current calendar week (Sunday-Saturday)
 */

import { useMemo } from 'react';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { useDevToolsStore } from '@/store/devToolsStore';
import { useCustomExerciseStore } from '@/store/customExerciseStore';
import { exercises as exerciseCatalog } from '@/constants/exercises';
import type { ExerciseType } from '@/types/exercise';

// Build base exercise type lookup map (static catalog)
const BASE_EXERCISE_TYPE_MAP = exerciseCatalog.reduce((acc, ex) => {
  acc[ex.name] = ex.exerciseType;
  return acc;
}, {} as Record<string, ExerciseType>);

// Distance unit lookup for cardio exercises (static catalog)
const BASE_EXERCISE_DISTANCE_UNIT_MAP = exerciseCatalog.reduce((acc, ex) => {
  acc[ex.name] = ex.distanceUnit;
  return acc;
}, {} as Record<string, 'miles' | 'meters' | 'floors' | undefined>);

interface WeeklyCardioProgress {
  /** Total cardio time in seconds for the current calendar week */
  weeklyTime: number;
  /** Total cardio distance in miles for the current calendar week */
  weeklyDistance: number;
  /** Distance broken down by exercise type */
  weeklyDistanceByType: Record<string, number>;
  /** Start of the current calendar week (Sunday at midnight) */
  weekStart: Date;
  /** End of the current calendar week (Saturday at 23:59:59) */
  weekEnd: Date;
  /** Whether there's any cardio data for this week */
  hasWeeklyData: boolean;
}

/**
 * Get the start of the current calendar week (Sunday at midnight local time)
 */
const getCalendarWeekStart = (): Date => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

/**
 * Get the end of the current calendar week (Saturday at 23:59:59 local time)
 */
const getCalendarWeekEnd = (): Date => {
  const weekStart = getCalendarWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
};

export const useWeeklyCardioProgress = (): WeeklyCardioProgress => {
  const forceEmptyAnalytics = useDevToolsStore((state) => state.forceEmptyAnalytics);
  const rawWorkouts = useWorkoutSessionsStore((state) => state.workouts);
  const workouts = __DEV__ && forceEmptyAnalytics ? [] : rawWorkouts;
  const customExercises = useCustomExerciseStore((state) => state.customExercises);

  // Merge custom exercises into type maps
  const exerciseTypeMap = useMemo(() => {
    const map = { ...BASE_EXERCISE_TYPE_MAP };
    customExercises.forEach((ce) => { map[ce.name] = ce.exerciseType; });
    return map;
  }, [customExercises]);

  const progress = useMemo(() => {
    const weekStart = getCalendarWeekStart();
    const weekEnd = getCalendarWeekEnd();

    let weeklyTime = 0;
    let weeklyDistance = 0;
    const weeklyDistanceByType: Record<string, number> = {};

    // Filter workouts to current calendar week
    const weeklyWorkouts = workouts.filter((w) => {
      const workoutDate = new Date(w.date);
      return workoutDate >= weekStart && workoutDate <= weekEnd;
    });

    weeklyWorkouts.forEach((workout) => {
      workout.exercises.forEach((exercise: any) => {
        const exerciseType = exerciseTypeMap[exercise.name];
        if (exerciseType !== 'cardio') return;

        exercise.sets.forEach((set: any) => {
          // Include sets that are completed OR have meaningful cardio data
          // (users often enter time/distance without pressing "Complete set")
          const hasData = (set.duration ?? 0) > 0 || (set.distance ?? 0) > 0;
          if (!set.completed && !hasData) return;

          // Accumulate time
          if (set.duration && set.duration > 0) {
            weeklyTime += set.duration;
          }

          // Accumulate distance
          if (set.distance && set.distance > 0) {
            const distanceUnit = BASE_EXERCISE_DISTANCE_UNIT_MAP[exercise.name];

            // Only count real distance units towards weeklyDistance (mi/km goals).
            // Floor-based activities are tracked in the per-activity breakdown only.
            // Custom cardio exercises default to miles (no distanceUnit), so they count.
            if (distanceUnit !== 'floors') {
              weeklyDistance += set.distance;
            }

            weeklyDistanceByType[exercise.name] =
              (weeklyDistanceByType[exercise.name] || 0) + set.distance;
          }
        });
      });
    });

    return {
      weeklyTime,
      weeklyDistance,
      weeklyDistanceByType,
      weekStart,
      weekEnd,
      hasWeeklyData: weeklyTime > 0 || weeklyDistance > 0,
    };
  }, [workouts, exerciseTypeMap]);

  return progress;
};

export type { WeeklyCardioProgress };
