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

export const createProgramPlan = async (
  supabase: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>
): Promise<ActionExecutionResult> => {
  const name = getString(payload.name);
  if (!name) {
    throw new Error('Program plan name is required.');
  }

  const workouts = getArray(payload.workouts).filter(isRecord);
  if (workouts.length === 0) {
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
    throw new Error('Failed to create program plan.');
  }

  const workoutsToInsert = workouts.map((workout, index) => ({
    plan_id: planData.id,
    user_id: userId,
    name: getString(workout.name) ?? `Workout ${index + 1}`,
    exercises: normalizeExercises(workout.exercises),
    order_index: index,
    source_workout_id: getString(workout.sourceWorkoutId),
  }));

  const { data: insertedWorkouts, error: workoutsError } = await supabase
    .from('plan_workouts')
    .insert(workoutsToInsert)
    .select('id, order_index');

  if (workoutsError) {
    throw new Error('Failed to create program workouts.');
  }

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

  return {
    summary: `Program plan "${name}" created with ${workouts.length} workouts.`,
    data: { id: planData.id },
  };
};
