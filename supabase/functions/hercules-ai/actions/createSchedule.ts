import type { SupabaseClient } from '@supabase/supabase-js';

import type { ActionExecutionResult } from './types.ts';
import { getString, normalizeScheduleData } from './helpers.ts';

export const createSchedule = async (
  supabase: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>
): Promise<ActionExecutionResult> => {
  const name = getString(payload.name) ?? 'Workout Schedule';
  const scheduleData = normalizeScheduleData(payload.scheduleData ?? payload.schedule);

  if (!scheduleData) {
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
    throw new Error('Failed to create schedule.');
  }

  return {
    summary: `Schedule "${name}" created.`,
    data: { id: data.id },
  };
};
