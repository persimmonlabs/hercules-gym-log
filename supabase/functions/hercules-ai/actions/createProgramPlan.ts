import type { SupabaseClient } from '@supabase/supabase-js';

import type { ActionExecutionResult } from './types.ts';
import {
  getArray,
  getString,
  isRecord,
  normalizeExercises,
  normalizeScheduleData,
  updateScheduleIds,
} from './helpers.ts';

// CRITICAL: Filter out rest day workouts - rest days are NOT workouts
const isRestDayWorkout = (workoutName: string): boolean => {
  const lowerName = workoutName.toLowerCase().trim();
  return (
    lowerName === 'rest' ||
    lowerName === 'rest day' ||
    lowerName === 'restday' ||
    lowerName.startsWith('rest day') ||
    lowerName === 'off' ||
    lowerName === 'off day' ||
    lowerName === 'recovery' ||
    lowerName === 'recovery day'
  );
};

// CRITICAL: Detect placeholder/invalid exercises that should never be created
const isInvalidExercise = (exerciseName: string): boolean => {
  const lowerName = exerciseName.toLowerCase().trim();
  return (
    lowerName === 'custom exercise' ||
    lowerName === 'custom' ||
    lowerName === 'exercise' ||
    lowerName === 'placeholder' ||
    lowerName === 'rest' ||
    lowerName === 'rest day' ||
    lowerName === '' ||
    lowerName === 'tbd' ||
    lowerName === 'todo'
  );
};

/**
 * CRITICAL: Generate a unique program name to prevent overwrites.
 * Checks against ALL existing plans for this user.
 */
const getUniqueProgramName = async (
  supabase: SupabaseClient,
  userId: string,
  baseName: string
): Promise<string> => {
  // Fetch all existing plan names for this user
  const { data: existing } = await supabase
    .from('plans')
    .select('name')
    .eq('user_id', userId);

  if (!existing || existing.length === 0) {
    return baseName;
  }

  const existingNames = new Set(existing.map((p) => p.name.toLowerCase()));

  // If exact name doesn't exist, use it
  if (!existingNames.has(baseName.toLowerCase())) {
    return baseName;
  }

  // Find the next available number
  let counter = 2;
  while (existingNames.has(`${baseName.toLowerCase()} (${counter})`)) {
    counter++;
  }

  console.log(`[HerculesAI] Program name "${baseName}" already exists, using "${baseName} (${counter})"`);
  return `${baseName} (${counter})`;
};

/**
 * CRITICAL: Generate unique workout names WITHIN a program.
 * Also checks against global workout_templates to prevent confusion.
 * Ensures no two workouts in the same program have the same name.
 */
const getUniqueWorkoutNames = async (
  supabase: SupabaseClient,
  userId: string,
  workoutNames: string[]
): Promise<string[]> => {
  // Fetch all existing workout template names AND plan_workout names for this user
  const [templatesResult, planWorkoutsResult] = await Promise.all([
    supabase.from('workout_templates').select('name').eq('user_id', userId),
    supabase.from('plan_workouts').select('name').eq('user_id', userId),
  ]);

  const existingNames = new Set<string>();
  
  // Add existing workout template names
  if (templatesResult.data) {
    templatesResult.data.forEach((w) => existingNames.add(w.name.toLowerCase()));
  }
  
  // Add existing plan workout names
  if (planWorkoutsResult.data) {
    planWorkoutsResult.data.forEach((w) => existingNames.add(w.name.toLowerCase()));
  }

  // Track names we're assigning in this batch to avoid duplicates within the program
  const assignedNames = new Set<string>();
  const uniqueNames: string[] = [];

  for (const baseName of workoutNames) {
    let finalName = baseName;
    let counter = 2;

    // Check against existing names AND names we're assigning in this batch
    while (
      existingNames.has(finalName.toLowerCase()) ||
      assignedNames.has(finalName.toLowerCase())
    ) {
      finalName = `${baseName} (${counter})`;
      counter++;
    }

    if (finalName !== baseName) {
      console.log(`[HerculesAI] Workout name "${baseName}" already exists or duplicated, using "${finalName}"`);
    }

    assignedNames.add(finalName.toLowerCase());
    uniqueNames.push(finalName);
  }

  return uniqueNames;
};

export const createProgramPlan = async (
  supabase: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>
): Promise<ActionExecutionResult> => {
  console.log('[HerculesAI] createProgramPlan called with payload:', JSON.stringify(payload, null, 2));
  
  const requestedName = getString(payload.name);
  if (!requestedName) {
    console.error('[HerculesAI] createProgramPlan: name is missing');
    throw new Error('Program plan name is required.');
  }
  
  // CRITICAL: Get a unique program name to prevent overwrites
  const name = await getUniqueProgramName(supabase, userId, requestedName);

  const rawWorkouts = getArray(payload.workouts).filter(isRecord);
  
  // CRITICAL: Filter out rest day workouts - they should never exist as workouts
  const workouts = rawWorkouts.filter((workout) => {
    const workoutName = getString(workout.name) ?? '';
    if (isRestDayWorkout(workoutName)) {
      console.warn('[HerculesAI] FILTERED OUT rest day workout:', workoutName);
      return false;
    }
    return true;
  });
  console.log('[HerculesAI] createProgramPlan: found', workouts.length, 'workouts');
  
  if (workouts.length === 0) {
    console.error('[HerculesAI] createProgramPlan: no valid workouts in payload');
    throw new Error('Program plan requires at least one workout.');
  }

  const schedule = normalizeScheduleData(payload.schedule) ?? null;
  const scheduleType = getString(payload.scheduleType ?? schedule?.type);
  const metadata = isRecord(payload.metadata) ? payload.metadata : {};

  const { data: planData, error: planError } = await supabase
    .from('plans')
    .insert({
      user_id: userId,
      name,
      metadata,
      schedule_type: scheduleType ?? null,
      schedule_config: schedule,
      is_active: false,
      source_id: getString(payload.sourceId),
    })
    .select('id')
    .single();

  if (planError || !planData) {
    console.error('[HerculesAI] createProgramPlan: plan insert failed', planError);
    throw new Error('Failed to create program plan.');
  }

  console.log('[HerculesAI] createProgramPlan: plan created with ID:', planData.id);

  // Extract all workout names first
  const rawWorkoutNames = workouts.map((workout, index) => 
    getString(workout.name) ?? `Workout ${index + 1}`
  );
  
  // CRITICAL: Get unique names for ALL workouts in this program
  const uniqueWorkoutNames = await getUniqueWorkoutNames(supabase, userId, rawWorkoutNames);

  const workoutsToInsert = workouts.map((workout, index) => {
    const workoutName = uniqueWorkoutNames[index];
    const rawWorkoutExercises = normalizeExercises(workout.exercises);
    
    // CRITICAL: Filter out invalid/placeholder exercises
    const workoutExercises = rawWorkoutExercises.filter((ex) => {
      const exName = getString(ex.name) ?? '';
      if (isInvalidExercise(exName)) {
        console.warn('[HerculesAI] FILTERED OUT invalid exercise:', exName, 'from workout:', workoutName);
        return false;
      }
      return true;
    });
    
    console.log('[HerculesAI] Preparing workout:', workoutName);
    console.log('[HerculesAI] Raw exercises from payload:', JSON.stringify(workout.exercises));
    console.log('[HerculesAI] After filtering invalid exercises:', workoutExercises.length);
    console.log('[HerculesAI] Filtered exercises:', JSON.stringify(workoutExercises));
    
    return {
      plan_id: planData.id,
      user_id: userId,
      name: workoutName,
      exercises: workoutExercises,
      order_index: index,
      source_workout_id: getString(workout.sourceWorkoutId),
    };
  });
  
  // CRITICAL: Check if all workouts were filtered out (e.g., all were rest days)
  if (workoutsToInsert.length === 0) {
    console.error('[HerculesAI] createProgramPlan: all workouts were invalid (rest days or no valid exercises)');
    throw new Error('Cannot create a program with only rest days. Please specify actual workout days with exercises.');
  }
  
  // CRITICAL: Check if any workout has no valid exercises
  const emptyWorkouts = workoutsToInsert.filter(w => w.exercises.length === 0);
  if (emptyWorkouts.length > 0) {
    console.error('[HerculesAI] createProgramPlan: workouts with no valid exercises:', emptyWorkouts.map(w => w.name));
    throw new Error(`Workout(s) "${emptyWorkouts.map(w => w.name).join(', ')}" have no valid exercises. Cannot create workouts without exercises.`);
  }

  const { data: insertedWorkouts, error: workoutsError } = await supabase
    .from('plan_workouts')
    .insert(workoutsToInsert)
    .select('id, order_index');

  if (workoutsError) {
    console.error('[HerculesAI] createProgramPlan: workouts insert failed', workoutsError);
    throw new Error('Failed to create program workouts.');
  }

  console.log('[HerculesAI] createProgramPlan: inserted', insertedWorkouts?.length ?? 0, 'workouts');

  const idMap = new Map<string, string>();
  const sortedInserted = (insertedWorkouts || []).sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );

  sortedInserted.forEach((row, index) => {
    const originalId = getString(workouts[index]?.id);
    if (originalId) {
      idMap.set(originalId, row.id as string);
    }
  });

  if (schedule && idMap.size > 0) {
    const { schedule: updatedSchedule, updated } = updateScheduleIds(schedule, idMap);
    if (updated) {
      await supabase
        .from('plans')
        .update({ schedule_config: updatedSchedule })
        .eq('id', planData.id)
        .eq('user_id', userId);
    }
  }

  console.log('[HerculesAI] createProgramPlan: SUCCESS - plan ID:', planData.id);
  return {
    summary: `Program "${name}" created with ${workouts.length} workouts! You can find it in My Plans.`,
    data: { id: planData.id },
  };
};
