/**
 * useWeeklyCardioProgress Hook
 * Calculates cardio progress for the current calendar week (Sunday-Saturday)
 */

import { useMemo } from 'react';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { useDevToolsStore } from '@/store/devToolsStore';
import { exercises as exerciseCatalog } from '@/constants/exercises';
import type { ExerciseType } from '@/types/exercise';

// Build exercise type lookup map
const EXERCISE_TYPE_MAP = exerciseCatalog.reduce((acc, ex) => {
  acc[ex.name] = ex.exerciseType;
  return acc;
}, {} as Record<string, ExerciseType>);

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
        const exerciseType = EXERCISE_TYPE_MAP[exercise.name];
        if (exerciseType !== 'cardio') return;

        exercise.sets.forEach((set: any) => {
          if (!set.completed) return;

          // Accumulate time
          if (set.duration && set.duration > 0) {
            weeklyTime += set.duration;
          }

          // Accumulate distance
          if (set.distance && set.distance > 0) {
            weeklyDistance += set.distance;
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
  }, [workouts]);

  return progress;
};

export type { WeeklyCardioProgress };
