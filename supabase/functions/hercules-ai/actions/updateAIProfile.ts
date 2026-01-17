import type { SupabaseClient } from '@supabase/supabase-js';

import type { ActionExecutionResult } from './types.ts';

export const updateAIProfile = async (
  supabase: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>
): Promise<ActionExecutionResult> => {
  const updateData: Record<string, unknown> = { user_id: userId };

  if (payload.goals !== undefined) updateData.goals = payload.goals;
  if (payload.experienceLevel !== undefined) {
    updateData.experience_level = payload.experienceLevel;
  }
  if (payload.equipment !== undefined) updateData.equipment = payload.equipment;
  if (payload.timeAvailability !== undefined) {
    updateData.time_availability = payload.timeAvailability;
  }
  if (payload.injuries !== undefined) updateData.injuries = payload.injuries;
  if (payload.units !== undefined) updateData.units = payload.units;
  if (payload.preferences !== undefined) updateData.preferences = payload.preferences;

  if (Object.keys(updateData).length === 1) {
    throw new Error('No AI profile updates provided.');
  }

  const { error } = await supabase
    .from('ai_profile')
    .upsert(updateData)
    .eq('user_id', userId);

  if (error) {
    throw new Error('Failed to update AI profile.');
  }

  return {
    summary: 'AI profile updated.',
    data: null,
  };
};
