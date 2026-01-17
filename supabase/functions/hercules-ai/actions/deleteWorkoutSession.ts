import type { SupabaseClient } from '@supabase/supabase-js';

import type { ActionExecutionResult } from './types.ts';
import { getString } from './helpers.ts';

export const deleteWorkoutSession = async (
  supabase: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>
): Promise<ActionExecutionResult> => {
  const sessionId = getString(payload.sessionId ?? payload.id);
  if (!sessionId) {
    throw new Error('Workout session id is required.');
  }

  const { error } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) {
    throw new Error('Failed to delete workout session.');
  }

  return {
    summary: 'Workout session deleted.',
    data: { id: sessionId },
  };
};
