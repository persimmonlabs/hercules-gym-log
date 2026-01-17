import type { SupabaseClient } from '@supabase/supabase-js';

import type { ActionExecutionResult } from './types.ts';
import { ensurePlanId, getNumber, getString, normalizeExercises } from './helpers.ts';

export const addWorkoutSession = async (
  supabase: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>
): Promise<ActionExecutionResult> => {
  const date = getString(payload.date);
  if (!date) {
    throw new Error('Workout session date is required.');
  }

  const planId = await ensurePlanId(supabase, userId, payload.planId);
  const exercises = normalizeExercises(payload.exercises);

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: userId,
      plan_id: planId,
      name: getString(payload.name),
      date,
      start_time: getNumber(payload.startTime) ?? payload.startTime ?? null,
      end_time: getNumber(payload.endTime) ?? payload.endTime ?? null,
      duration: getNumber(payload.duration) ?? payload.duration ?? null,
      exercises,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Failed to add workout session.');
  }

  return {
    summary: 'Workout session added.',
    data: { id: data.id },
  };
};
