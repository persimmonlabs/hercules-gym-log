/**
 * Exercise Name Migration Utility
 * 
 * This utility handles updating exercise names throughout the app when they change in exercises.json.
 * It updates workout sessions, plans, and any other data that stores exercise names.
 */

import { supabaseClient } from '@/lib/supabaseClient';
import type { Workout, WorkoutExercise } from '@/types/workout';
import type { UserPlan } from '@/types/premadePlan';

/**
 * Map of old exercise names to new exercise names.
 * Add entries here whenever you rename an exercise in exercises.json.
 */
const EXERCISE_NAME_MIGRATIONS: Record<string, string> = {
  // Format: 'Old Name': 'New Name'
  'Thigh Adductor': 'Hip Adductor',
  'Thigh Abductor': 'Hip Abductor',
};

/**
 * Gets the current exercise name, handling legacy names.
 * Returns the new name if a migration exists, otherwise returns the original name.
 */
export function migrateExerciseName(exerciseName: string): string {
  return EXERCISE_NAME_MIGRATIONS[exerciseName] ?? exerciseName;
}

/**
 * Migrates exercise names in a workout's exercises array.
 */
export function migrateWorkoutExercises(exercises: WorkoutExercise[]): WorkoutExercise[] {
  return exercises.map(exercise => ({
    ...exercise,
    name: migrateExerciseName(exercise.name),
  }));
}

/**
 * Migrates exercise names in a single workout session.
 */
export function migrateWorkout(workout: Workout): Workout {
  return {
    ...workout,
    exercises: migrateWorkoutExercises(workout.exercises),
  };
}

/**
 * Updates all workout sessions in the database for a user, migrating old exercise names.
 */
export async function migrateUserWorkoutSessions(userId: string): Promise<number> {
  console.log('[Migration] Starting workout session migration for user:', userId);
  
  try {
    // Fetch all workout sessions
    const { data: sessions, error: fetchError } = await supabaseClient
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('[Migration] Error fetching workout sessions:', fetchError);
      throw fetchError;
    }

    if (!sessions || sessions.length === 0) {
      console.log('[Migration] No workout sessions to migrate');
      return 0;
    }

    let updateCount = 0;

    // Process each session
    for (const session of sessions) {
      const exercises = session.exercises as WorkoutExercise[];
      if (!exercises || exercises.length === 0) continue;

      // Check if any exercise needs migration
      const needsMigration = exercises.some(
        exercise => EXERCISE_NAME_MIGRATIONS[exercise.name] !== undefined
      );

      if (!needsMigration) continue;

      // Migrate exercise names
      const migratedExercises = migrateWorkoutExercises(exercises);

      // Update in database
      const { error: updateError } = await supabaseClient
        .from('workout_sessions')
        .update({ exercises: migratedExercises })
        .eq('id', session.id);

      if (updateError) {
        console.error('[Migration] Error updating workout session:', session.id, updateError);
        continue;
      }

      updateCount++;
    }

    console.log('[Migration] Successfully migrated', updateCount, 'workout sessions');
    return updateCount;
  } catch (error) {
    console.error('[Migration] Unexpected error during workout migration:', error);
    throw error;
  }
}

/**
 * Updates all plans in the database for a user, migrating old exercise names.
 */
export async function migrateUserPlans(userId: string): Promise<number> {
  console.log('[Migration] Starting plan migration for user:', userId);
  
  try {
    // Fetch all plans
    const { data: plans, error: fetchError } = await supabaseClient
      .from('plans')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('[Migration] Error fetching plans:', fetchError);
      throw fetchError;
    }

    if (!plans || plans.length === 0) {
      console.log('[Migration] No plans to migrate');
      return 0;
    }

    let updateCount = 0;

    // Process each plan
    for (const plan of plans) {
      const exercises = plan.exercises as { id: string; name: string; sets: number }[];
      if (!exercises || exercises.length === 0) continue;

      // Check if any exercise needs migration
      const needsMigration = exercises.some(
        exercise => EXERCISE_NAME_MIGRATIONS[exercise.name] !== undefined
      );

      if (!needsMigration) continue;

      // Migrate exercise names
      const migratedExercises = exercises.map(exercise => ({
        ...exercise,
        name: migrateExerciseName(exercise.name),
      }));

      // Update in database
      const { error: updateError } = await supabaseClient
        .from('plans')
        .update({ exercises: migratedExercises })
        .eq('id', plan.id);

      if (updateError) {
        console.error('[Migration] Error updating plan:', plan.id, updateError);
        continue;
      }

      updateCount++;
    }

    console.log('[Migration] Successfully migrated', updateCount, 'plans');
    return updateCount;
  } catch (error) {
    console.error('[Migration] Unexpected error during plan migration:', error);
    throw error;
  }
}

/**
 * Runs all exercise name migrations for a user.
 * Call this function when the user logs in or when you need to ensure all data is up to date.
 */
export async function runExerciseMigrations(userId: string): Promise<{
  workoutSessions: number;
  plans: number;
}> {
  console.log('[Migration] Running all exercise migrations for user:', userId);
  
  const results = {
    workoutSessions: await migrateUserWorkoutSessions(userId),
    plans: await migrateUserPlans(userId),
  };

  console.log('[Migration] Migration complete:', results);
  return results;
}

/**
 * Checks if there are any pending migrations that haven't been run.
 * This is useful for showing a migration status to the user.
 */
export function hasPendingMigrations(): boolean {
  return Object.keys(EXERCISE_NAME_MIGRATIONS).length > 0;
}
