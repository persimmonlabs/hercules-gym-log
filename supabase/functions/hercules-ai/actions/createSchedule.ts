import type { SupabaseClient } from '@supabase/supabase-js';

import type { ActionExecutionResult } from './types.ts';
import { getString, normalizeScheduleData } from './helpers.ts';

export const createSchedule = async (
  supabase: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>
): Promise<ActionExecutionResult> => {
  console.log('[HerculesAI] createSchedule called with payload:', JSON.stringify(payload, null, 2));
  
  const name = getString(payload.name) ?? 'Workout Schedule';
  const scheduleData = normalizeScheduleData(payload.scheduleData ?? payload.schedule);

  console.log('[HerculesAI] createSchedule: name=', name, 'scheduleData=', scheduleData);

  if (!scheduleData) {
    console.error('[HerculesAI] createSchedule: scheduleData is invalid or missing type field');
    throw new Error('Schedule data is required and must include type: weekly|rotating.');
  }

  const { data, error } = await supabase
    .from('schedules')
    .insert({
      user_id: userId,
      name,
      schedule_data: scheduleData,
      is_active: false,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[HerculesAI] createSchedule: insert failed', error);
    throw new Error('Failed to create schedule.');
  }

  console.log('[HerculesAI] createSchedule: SUCCESS - created with ID:', data.id);
  return {
    summary: `Schedule "${name}" created successfully! You can view it in your Schedules.`,
    data: { id: data.id },
  };
};
