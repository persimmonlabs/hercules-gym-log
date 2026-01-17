import type { SupabaseClient } from '@supabase/supabase-js';

import type { ActionExecutionResult } from './types.ts';
import { ensurePlanId, getNumber, getString, normalizeExercises } from './helpers.ts';

export const editWorkoutSession = async (
  supabase: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>
): Promise<ActionExecutionResult> => {
  const sessionId = getString(payload.sessionId ?? payload.id);
  if (!sessionId) {
    throw new Error('Workout session id is required.');
  }

  const updateData: Record<string, unknown> = {};

  if (payload.planId !== undefined) {
    updateData.plan_id = await ensurePlanId(supabase, userId, payload.planId);
  }

  if (payload.name !== undefined) updateData.name = getString(payload.name);
  if (payload.date !== undefined) updateData.date = getString(payload.date);
  if (payload.startTime !== undefined) {
    updateData.start_time = getNumber(payload.startTime) ?? payload.startTime;
  }
  if (payload.endTime !== undefined) {
    updateData.end_time = getNumber(payload.endTime) ?? payload.endTime;
  }
  if (payload.duration !== undefined) {
    updateData.duration = getNumber(payload.duration) ?? payload.duration;
  }
  if (payload.exercises !== undefined) {
    updateData.exercises = normalizeExercises(payload.exercises);
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error('No workout session fields provided to update.');
  }

  const { error } = await supabase
    .from('workout_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) {
    throw new Error('Failed to update workout session.');
  }

  return {
    summary: 'Workout session updated.',
    data: { id: sessionId },
  };
};
