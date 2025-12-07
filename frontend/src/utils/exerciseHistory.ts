/**
 * exerciseHistory
 * Utilities for retrieving exercise history from past workouts
 */

import type { SetLog, Workout } from '@/types/workout';

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
