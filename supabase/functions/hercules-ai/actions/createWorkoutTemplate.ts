import type { SupabaseClient } from '@supabase/supabase-js';

import type { ActionExecutionResult } from './types.ts';
import { getString, normalizeExercises } from './helpers.ts';

export const createWorkoutTemplate = async (
  supabase: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>
): Promise<ActionExecutionResult> => {
  const name = getString(payload.name);
  if (!name) {
    throw new Error('Workout template name is required.');
  }

  const rawExercises = normalizeExercises(payload.exercises);
  if (rawExercises.length === 0) {
    throw new Error('Workout template requires at least one exercise.');
  }

  const validatedExercises: Array<{ id: string; name: string; sets?: number }> = [];
  
  for (const ex of rawExercises) {
    const exerciseName = getString(ex.name);
    const exerciseId = getString(ex.id);
    
    if (!exerciseName || !exerciseId) continue;
    
    validatedExercises.push({
      id: exerciseId,
      name: exerciseName,
      sets: typeof ex.sets === 'number' ? ex.sets : 3,
    });
  }

  if (validatedExercises.length === 0) {
    throw new Error('No valid exercises provided. Each exercise must have an id and name.');
  }

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
    throw new Error('Failed to create workout template.');
  }

  return {
    summary: `Workout template "${name}" created with ${validatedExercises.length} exercises.`,
    data: { id: data.id },
  };
};
