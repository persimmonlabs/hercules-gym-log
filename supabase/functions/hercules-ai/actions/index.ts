import type { SupabaseClient } from '@supabase/supabase-js';

import { addWorkoutSession } from './addWorkoutSession.ts';
import { createProgramPlan } from './createProgramPlan.ts';
import { createSchedule } from './createSchedule.ts';
import { createWorkoutTemplate } from './createWorkoutTemplate.ts';
import type { ActionExecutionResult } from './types.ts';
import { updateAIProfile } from './updateAIProfile.ts';

export const executeAction = async (
  supabase: SupabaseClient,
  userId: string,
  actionType: string,
  payload: Record<string, unknown>
): Promise<ActionExecutionResult> => {
  switch (actionType) {
    case 'create_workout_template':
      return createWorkoutTemplate(supabase, userId, payload);
    case 'create_program_plan':
      return createProgramPlan(supabase, userId, payload);
    case 'create_schedule':
      return createSchedule(supabase, userId, payload);
    case 'add_workout_session':
      return addWorkoutSession(supabase, userId, payload);
    case 'update_profile':
      return updateAIProfile(supabase, userId, payload);
    default:
      throw new Error(`Unsupported action type: ${actionType}`);
  }
};
