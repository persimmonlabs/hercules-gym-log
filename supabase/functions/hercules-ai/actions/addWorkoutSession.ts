import type { SupabaseClient } from '@supabase/supabase-js';

import type { ActionExecutionResult } from './types.ts';
import { ensurePlanId, getArray, getNumber, getString, isRecord, normalizeExercises } from './helpers.ts';

/**
 * Normalizes a single exercise object from the AI payload into the format
 * the frontend expects: { name: string, sets: SetLog[] }.
 *
 * The AI might send exercises in different formats:
 * - Correct: { name: "Bench Press", sets: [{ weight: 135, reps: 10, completed: true }] }
 * - Template-style: { id: "bench_press", name: "Bench Press" } (missing sets)
 * - Partial: { name: "Bench Press", sets: 3, reps: 10, weight: 135 } (flat format)
 *
 * This function handles all cases and ensures a valid exercise with sets.
 */
const normalizeSessionExercise = (raw: Record<string, unknown>): Record<string, unknown> | null => {
  const name = getString(raw.name);
  if (!name) return null;

  // Case 1: Already has a proper sets array
  const rawSets = raw.sets;
  if (Array.isArray(rawSets) && rawSets.length > 0 && isRecord(rawSets[0])) {
    // Validate each set has at least completed flag
    const validSets = rawSets.filter(isRecord).map(set => ({
      weight: getNumber(set.weight) ?? 0,
      reps: getNumber(set.reps) ?? 0,
      completed: set.completed !== false, // default to true for logged workouts
      ...(getNumber(set.duration) != null ? { duration: getNumber(set.duration) } : {}),
      ...(getNumber(set.distance) != null ? { distance: getNumber(set.distance) } : {}),
      ...(getNumber(set.assistanceWeight) != null ? { assistanceWeight: getNumber(set.assistanceWeight) } : {}),
    }));
    if (validSets.length > 0) {
      return { name, sets: validSets };
    }
  }

  // Case 2: Flat format — sets is a number (e.g. { name, sets: 3, reps: 10, weight: 135 })
  // or no set data at all (exercise name only). Use stat-neutral defaults (0 weight, 0 reps)
  // so the workout is recorded but doesn't inflate volume/rep statistics.
  const setCount = getNumber(rawSets) ?? getNumber(raw.numSets) ?? 3;
  const reps = getNumber(raw.reps) ?? 0;
  const weight = getNumber(raw.weight) ?? 0;
  const duration = getNumber(raw.duration) ?? undefined;
  const distance = getNumber(raw.distance) ?? undefined;

  const generatedSets = [];
  for (let i = 0; i < setCount; i++) {
    generatedSets.push({
      weight,
      reps,
      completed: true,
      ...(duration != null ? { duration } : {}),
      ...(distance != null ? { distance } : {}),
    });
  }

  return { name, sets: generatedSets };
};

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

  // Normalize exercises — handle both proper session format and template-style format
  const rawExercises = normalizeExercises(payload.exercises);
  const exercises = rawExercises
    .map(normalizeSessionExercise)
    .filter((ex): ex is Record<string, unknown> => ex !== null);

  if (exercises.length === 0) {
    console.warn('[addWorkoutSession] No valid exercises after normalization. Raw payload.exercises:', JSON.stringify(payload.exercises));
  }

  // Calculate startTime: use provided value, or derive from date
  let startTime = getNumber(payload.startTime) ?? null;
  if (startTime === null && payload.startTime && typeof payload.startTime === 'string') {
    const parsed = new Date(payload.startTime as string).getTime();
    if (Number.isFinite(parsed)) startTime = parsed;
  }
  // If still no startTime, create one from the date (assume workout started 1 hour ago)
  if (startTime === null) {
    const dateObj = new Date(date + 'T12:00:00');
    if (Number.isFinite(dateObj.getTime())) {
      startTime = dateObj.getTime();
    } else {
      startTime = Date.now() - 3600_000; // fallback: 1 hour ago
    }
  }

  // Calculate duration in seconds
  let duration = getNumber(payload.duration) ?? null;
  if (duration === null) {
    // Estimate: ~3 min per set across all exercises
    const totalSets = exercises.reduce((sum, ex) => {
      const sets = Array.isArray(ex.sets) ? ex.sets.length : 0;
      return sum + sets;
    }, 0);
    duration = Math.max(totalSets * 180, 1800); // minimum 30 min
  }

  // Calculate endTime from startTime + duration
  const endTime = getNumber(payload.endTime) ?? (startTime + duration * 1000);

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: userId,
      plan_id: planId,
      name: getString(payload.name),
      date,
      start_time: startTime,
      end_time: endTime,
      duration,
      exercises,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[addWorkoutSession] Insert failed:', error);
    throw new Error('Failed to add workout session.');
  }

  const exerciseCount = exercises.length;
  const totalSets = exercises.reduce((sum, ex) => {
    const sets = Array.isArray(ex.sets) ? ex.sets.length : 0;
    return sum + sets;
  }, 0);

  return {
    summary: `Workout session logged: ${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}, ${totalSets} total sets.`,
    data: { id: data.id },
  };
};
