/**
 * exerciseHistory
 * Utilities for retrieving exercise history from past workouts
 */

import type { SetLog, Workout } from '@/types/workout';
import type { ExerciseType } from '@/types/exercise';
import { exercises as exerciseCatalog, getExerciseTypeByName } from '@/constants/exercises';

const DEFAULT_SET_COUNT = 3;

export interface SetsWithHistoryResult {
    sets: SetLog[];
    historySetCount: number;
}

/**
 * Get the most recent completed sets for a specific exercise
 * @param exerciseName - The name of the exercise to look up
 * @param workouts - All workouts
 * @returns The sets from the most recent completion of this exercise, or null if no history exists
 */
export const getLastCompletedSetsForExercise = (
    exerciseName: string,
    workouts: Workout[],
): SetLog[] | null => {
    // Sort workouts by date (most recent first) to ensure we get the latest data
    const sortedWorkouts = [...workouts].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Find the most recent workout that contains this exercise with at least one completed set
    for (const workout of sortedWorkouts) {
        const exercise = workout.exercises.find((ex) => ex.name === exerciseName);

        if (exercise) {
            const hasCompletedSets = exercise.sets.some((set) => set.completed);

            if (hasCompletedSets) {
                // Return all sets from this exercise (both completed and uncompleted)
                return exercise.sets;
            }
        }
    }

    return null;
};

/**
 * Get default set values based on exercise history
 * If there's history, use those values. Otherwise, use the provided defaults.
 * @param exerciseName - The name of the exercise
 * @param workouts - All workouts
 * @param defaultWeight - Default weight if no history exists
 * @param defaultReps - Default reps if no history exists
 * @returns SetLog with appropriate default values
 */
export const getDefaultSetValues = (
    exerciseName: string,
    workouts: Workout[],
    defaultWeight: number = 0,
    defaultReps: number = 8,
): { weight: number; reps: number } => {
    const lastSets = getLastCompletedSetsForExercise(exerciseName, workouts);

    if (!lastSets || lastSets.length === 0) {
        return { weight: defaultWeight, reps: defaultReps };
    }

    // Use the first set's values as the default
    return {
        weight: lastSets[0].weight ?? defaultWeight,
        reps: lastSets[0].reps ?? defaultReps,
    };
};

/**
 * Creates sets for an exercise with smart history-based pre-population.
 * 
 * Logic:
 * - If history exists: pre-populate from history sets
 * - If more sets needed than history provides: fill extra sets with last history values
 * - If no history: use exercise-type-appropriate defaults
 * 
 * @param exerciseName - The name of the exercise
 * @param workouts - All historical workouts
 * @param currentWorkoutId - Optional ID to exclude current workout from history lookup
 * @param requestedSetCount - Optional number of sets to create (defaults to history count or DEFAULT_SET_COUNT)
 * @returns Object containing the sets and the count of sets that came from actual history
 */
export const createSetsWithHistory = (
    exerciseName: string,
    workouts: Workout[],
    currentWorkoutId?: string,
    requestedSetCount?: number,
    customExercises?: { name: string; exerciseType: ExerciseType }[],
): SetsWithHistoryResult => {
    const exercise = exerciseCatalog.find(e => e.name === exerciseName);
    const exerciseType: ExerciseType = getExerciseTypeByName(exerciseName, customExercises ?? []);
    const supportsGpsTracking = exercise?.supportsGpsTracking ?? false;

    // GPS-enabled exercises should never be pre-populated with history
    // They always start fresh with the GPS tracker
    if (supportsGpsTracking) {
        return { 
            sets: [{ duration: 0, distance: 0, completed: false }], 
            historySetCount: 0 
        };
    }

    // Timed exercises (cardio and duration) should always start at 00:00:00
    // They are not pre-populated with history to make them easier to use
    if (exerciseType === 'cardio') {
        return {
            sets: [{ duration: 0, distance: 0, completed: false }],
            historySetCount: 0
        };
    }

    if (exerciseType === 'duration') {
        return {
            sets: [{ duration: 0, completed: false }],
            historySetCount: 0
        };
    }

    // Filter out current workout to avoid using incomplete data
    const historicalWorkouts = currentWorkoutId
        ? workouts.filter((w) => w.id !== currentWorkoutId)
        : workouts;

    // Get history for this exercise
    const historySets = getLastCompletedSetsForExercise(exerciseName, historicalWorkouts);
    const hasHistory = historySets && historySets.length > 0;

    // Determine how many sets to create
    const historySetCount = hasHistory ? historySets.length : 0;
    const targetSetCount = requestedSetCount ?? (historySetCount || DEFAULT_SET_COUNT);

    if (hasHistory) {
        const sets: SetLog[] = [];

        // Add sets from history (mark as not completed)
        for (let i = 0; i < Math.min(historySetCount, targetSetCount); i++) {
            sets.push({ ...historySets[i], completed: false });
        }

        // If we need more sets than history provides, use the last history set's values
        if (targetSetCount > historySetCount) {
            const lastHistorySet = historySets[historySetCount - 1];
            for (let i = historySetCount; i < targetSetCount; i++) {
                sets.push({ ...lastHistorySet, completed: false });
            }
        }

        return { sets, historySetCount };
    }

    // No history - create type-appropriate default sets
    // Note: 'cardio' and 'duration' types are already handled and returned above
    let defaultSets: SetLog[];
    switch (exerciseType) {
        case 'bodyweight':
        case 'reps_only':
            defaultSets = Array.from({ length: targetSetCount }, () => ({ reps: 10, completed: false }));
            break;
        case 'assisted':
            defaultSets = Array.from({ length: targetSetCount }, () => ({ assistanceWeight: 0, reps: 8, completed: false }));
            break;
        case 'weight':
        default:
            defaultSets = Array.from({ length: targetSetCount }, () => ({ reps: 8, weight: 0, completed: false }));
            break;
    }

    return { sets: defaultSets, historySetCount: 0 };
};
