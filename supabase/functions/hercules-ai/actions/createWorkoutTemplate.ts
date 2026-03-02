import type { SupabaseClient } from '@supabase/supabase-js';

import type { ActionExecutionResult } from './types.ts';
import { getString, normalizeExercises, resolveExerciseByName, stripExerciseAnnotations } from './helpers.ts';

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
 * CRITICAL: Generate a unique workout name to prevent overwrites.
 * Checks against BOTH workout_templates AND plan_workouts tables.
 */
const getUniqueWorkoutName = async (
  supabase: SupabaseClient,
  userId: string,
  baseName: string
): Promise<string> => {
  // Fetch all existing names from BOTH tables
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

  // If no existing names, use the base name
  if (existingNames.size === 0) {
    return baseName;
  }

  // If exact name doesn't exist, use it
  if (!existingNames.has(baseName.toLowerCase())) {
    return baseName;
  }

  // Find the next available number
  let counter = 2;
  while (existingNames.has(`${baseName.toLowerCase()} (${counter})`)) {
    counter++;
  }

  console.log(`[HerculesAI] Workout name "${baseName}" already exists, using "${baseName} (${counter})"`);
  return `${baseName} (${counter})`;
};

export const createWorkoutTemplate = async (
  supabase: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>
): Promise<ActionExecutionResult> => {
  console.log('[HerculesAI] createWorkoutTemplate called with payload:', JSON.stringify(payload, null, 2));
  
  const requestedName = getString(payload.name);
  if (!requestedName) {
    console.error('[HerculesAI] createWorkoutTemplate: name is missing');
    throw new Error('Workout template name is required.');
  }
  
  // CRITICAL: Reject rest day workouts - they should never be created
  if (isRestDayWorkout(requestedName)) {
    console.error('[HerculesAI] createWorkoutTemplate: attempted to create rest day workout:', requestedName);
    throw new Error('Rest days are not workouts. A rest day is simply a day without a workout scheduled.');
  }

  // Get a unique name to avoid overwriting existing workouts
  const name = await getUniqueWorkoutName(supabase, userId, requestedName);

  const rawExercises = normalizeExercises(payload.exercises);
  console.log('[HerculesAI] createWorkoutTemplate: found', rawExercises.length, 'raw exercises');
  
  if (rawExercises.length === 0) {
    console.error('[HerculesAI] createWorkoutTemplate: no exercises in payload');
    throw new Error('Workout template requires at least one exercise.');
  }

  const validatedExercises: Array<{ id: string; name: string }> = [];
  
  for (const ex of rawExercises) {
    // CRITICAL: Strip AI annotations like "(3 sets of 10 reps)" before processing
    const rawName = getString(ex.name) ?? '';
    const exerciseName = stripExerciseAnnotations(rawName);
    const exerciseId = getString(ex.id);
    
    if (!exerciseName) continue;
    
    // CRITICAL: Filter out invalid/placeholder exercises
    if (isInvalidExercise(exerciseName)) {
      console.warn('[HerculesAI] FILTERED OUT invalid exercise:', rawName);
      continue;
    }
    
    // CRITICAL FIX: ALWAYS resolve by name first. The AI can provide stale/wrong IDs
    // from previous proposals in multi-turn conversations. The exercise name is the
    // source of truth (it's what the user sees and approves). Resolving by name
    // guarantees the stored ID matches the actual exercise in the catalog.
    const resolved = resolveExerciseByName(exerciseName);
    if (resolved) {
      if (exerciseId && exerciseId !== resolved.id) {
        console.warn('[HerculesAI] Exercise ID mismatch corrected:', exerciseName,
          '— AI provided ID', exerciseId, 'but catalog says', resolved.id);
      }
      validatedExercises.push(resolved);
    } else if (exerciseId) {
      // Fallback: name resolution failed but AI provided an ID
      console.warn('[HerculesAI] Could not resolve by name:', rawName,
        '(cleaned:', exerciseName, ') — falling back to AI-provided ID:', exerciseId);
      validatedExercises.push({ id: exerciseId, name: exerciseName });
    } else {
      console.warn('[HerculesAI] Could not resolve exercise:', rawName, '(cleaned:', exerciseName, ') — skipping');
    }
  }

  console.log('[HerculesAI] createWorkoutTemplate: validated', validatedExercises.length, 'exercises');
  
  if (validatedExercises.length === 0) {
    console.error('[HerculesAI] createWorkoutTemplate: no valid exercises after validation');
    throw new Error('No valid exercises provided. Each exercise must have an id and name.');
  }

  console.log('[HerculesAI] createWorkoutTemplate: inserting workout template "' + name + '"');
  const { data, error } = await supabase
    .from('workout_templates')
    .insert({
      user_id: userId,
      name,
      exercises: validatedExercises,
      source: getString(payload.source) ?? 'custom',
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[HerculesAI] createWorkoutTemplate: insert failed', error);
    throw new Error('Failed to create workout template.');
  }

  console.log('[HerculesAI] createWorkoutTemplate: SUCCESS - created with ID:', data.id);
  return {
    summary: `Workout template "${name}" created with ${validatedExercises.length} exercises.`,
    data: { id: data.id },
  };
};
