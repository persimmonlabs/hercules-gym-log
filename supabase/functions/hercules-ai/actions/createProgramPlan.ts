import type { SupabaseClient } from '@supabase/supabase-js';

import type { ActionExecutionResult } from './types.ts';
import {
  getArray,
  getString,
  isRecord,
  normalizeExercises,
  normalizeScheduleData,
  resolveExerciseByName,
  stripExerciseAnnotations,
  updateScheduleIds,
  isRestDayRef,
  buildWorkoutLookup,
} from './helpers.ts';

// CRITICAL: Filter out rest day workouts - rest days are NOT workouts
const isRestDayWorkout = (workoutName: string): boolean => {
  const lowerName = workoutName.toLowerCase().trim();
  return (
    lowerName === 'rest' ||
    lowerName === 'rest day' ||
    lowerName === 'restday' ||
    lowerName.startsWith('rest day') ||
    lowerName === 'off' ||
    lowerName === 'off day' ||
    lowerName === 'recovery' ||
    lowerName === 'recovery day'
  );
};

// CRITICAL: Detect placeholder/invalid exercises that should never be created
const isInvalidExercise = (exerciseName: string): boolean => {
  const lowerName = exerciseName.toLowerCase().trim();
  return (
    lowerName === 'custom exercise' ||
    lowerName === 'custom' ||
    lowerName === 'exercise' ||
    lowerName === 'placeholder' ||
    lowerName === 'rest' ||
    lowerName === 'rest day' ||
    lowerName === '' ||
    lowerName === 'tbd' ||
    lowerName === 'todo'
  );
};

/**
 * CRITICAL: Generate a unique program name to prevent overwrites.
 * Checks against ALL existing plans for this user.
 */
const getUniqueProgramName = async (
  supabase: SupabaseClient,
  userId: string,
  baseName: string
): Promise<string> => {
  // Fetch all existing plan names for this user
  const { data: existing } = await supabase
    .from('plans')
    .select('name')
    .eq('user_id', userId);

  if (!existing || existing.length === 0) {
    return baseName;
  }

  const existingNames = new Set(existing.map((p) => p.name.toLowerCase()));

  // If exact name doesn't exist, use it
  if (!existingNames.has(baseName.toLowerCase())) {
    return baseName;
  }

  // Find the next available number
  let counter = 2;
  while (existingNames.has(`${baseName.toLowerCase()} (${counter})`)) {
    counter++;
  }

  console.log(`[HerculesAI] Program name "${baseName}" already exists, using "${baseName} (${counter})"`);
  return `${baseName} (${counter})`;
};

/**
 * CRITICAL: Generate unique workout names WITHIN a program.
 * Also checks against global workout_templates to prevent confusion.
 * Ensures no two workouts in the same program have the same name.
 */
const getUniqueWorkoutNames = async (
  supabase: SupabaseClient,
  userId: string,
  workoutNames: string[]
): Promise<string[]> => {
  // Fetch all existing workout template names AND plan_workout names for this user
  const [templatesResult, planWorkoutsResult] = await Promise.all([
    supabase.from('workout_templates').select('name').eq('user_id', userId),
    supabase.from('plan_workouts').select('name').eq('user_id', userId),
  ]);

  const existingNames = new Set<string>();
  
  // Add existing workout template names
  if (templatesResult.data) {
    templatesResult.data.forEach((w) => existingNames.add(w.name.toLowerCase()));
  }
  
  // Add existing plan workout names
  if (planWorkoutsResult.data) {
    planWorkoutsResult.data.forEach((w) => existingNames.add(w.name.toLowerCase()));
  }

  // Track names we're assigning in this batch to avoid duplicates within the program
  const assignedNames = new Set<string>();
  const uniqueNames: string[] = [];

  for (const baseName of workoutNames) {
    let finalName = baseName;
    let counter = 2;

    // Check against existing names AND names we're assigning in this batch
    while (
      existingNames.has(finalName.toLowerCase()) ||
      assignedNames.has(finalName.toLowerCase())
    ) {
      finalName = `${baseName} (${counter})`;
      counter++;
    }

    if (finalName !== baseName) {
      console.log(`[HerculesAI] Workout name "${baseName}" already exists or duplicated, using "${finalName}"`);
    }

    assignedNames.add(finalName.toLowerCase());
    uniqueNames.push(finalName);
  }

  return uniqueNames;
};

export const createProgramPlan = async (
  supabase: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>
): Promise<ActionExecutionResult> => {
  console.log('[HerculesAI] createProgramPlan called with payload:', JSON.stringify(payload, null, 2));
  
  const requestedName = getString(payload.name);
  if (!requestedName) {
    console.error('[HerculesAI] createProgramPlan: name is missing');
    throw new Error('Program plan name is required.');
  }
  
  // CRITICAL: Get a unique program name to prevent overwrites
  const name = await getUniqueProgramName(supabase, userId, requestedName);

  const rawWorkouts = getArray(payload.workouts).filter(isRecord);
  
  // CRITICAL: Filter out rest day workouts - they should never exist as workouts
  const workouts = rawWorkouts.filter((workout) => {
    const workoutName = getString(workout.name) ?? '';
    if (isRestDayWorkout(workoutName)) {
      console.warn('[HerculesAI] FILTERED OUT rest day workout:', workoutName);
      return false;
    }
    return true;
  });
  console.log('[HerculesAI] createProgramPlan: found', workouts.length, 'workouts');
  
  if (workouts.length === 0) {
    console.error('[HerculesAI] createProgramPlan: no valid workouts in payload');
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
    console.error('[HerculesAI] createProgramPlan: plan insert failed', planError);
    throw new Error('Failed to create program plan.');
  }

  console.log('[HerculesAI] createProgramPlan: plan created with ID:', planData.id);

  // Extract all workout names first, stripping parenthetical annotations the AI sometimes adds
  // e.g. "Full Body (Optional)" → "Full Body", "Arms (Advanced)" → "Arms"
  const rawWorkoutNames = workouts.map((workout, index) => {
    const name = getString(workout.name) ?? `Workout ${index + 1}`;
    return name.replace(/\s*\([^)]*\)\s*$/, '').trim() || name;
  });
  
  // CRITICAL: Get unique names for ALL workouts in this program
  const uniqueWorkoutNames = await getUniqueWorkoutNames(supabase, userId, rawWorkoutNames);

  const workoutsToInsert = workouts.map((workout, index) => {
    const workoutName = uniqueWorkoutNames[index];
    const originalName = rawWorkoutNames[index];

    // CRITICAL: Always use the exercises from the AI payload — these are what the user
    // approved in the proposal. Never silently replace them with existing workout exercises
    // based on name matching. The AI is instructed to copy exact {id, name} pairs from
    // context when useExisting is true, so the payload exercises ARE the correct ones
    // regardless of whether the workout is new or references an existing one.
    //
    // Previous "safety net" code here would replace AI-proposed exercises with existing
    // workout exercises on name match, causing the created workouts to differ from the
    // approved proposal. This was the root cause of the bug.

    if (workout.useExisting === true) {
      console.log('[HerculesAI] Workout "' + originalName + '" marked useExisting=true — using exercises from AI payload (should match existing)');
    }

    const rawWorkoutExercises = normalizeExercises(workout.exercises);
    
    // CRITICAL: Resolve exercises — if AI provided name but no valid id, look up from catalog
    const workoutExercises: Array<{ id: string; name: string }> = [];
    for (const ex of rawWorkoutExercises) {
      // CRITICAL: Strip AI annotations like "(from existing Push Day)" before processing
      const rawName = getString(ex.name) ?? '';
      const exName = stripExerciseAnnotations(rawName);
      const exId = getString(ex.id);
      
      if (isInvalidExercise(exName)) {
        console.warn('[HerculesAI] FILTERED OUT invalid exercise:', rawName, 'from workout:', workoutName);
        continue;
      }
      
      if (exName) {
        // CRITICAL FIX: ALWAYS resolve by name first. The AI can provide stale/wrong IDs
        // from previous proposals in multi-turn conversations. The exercise name is the
        // source of truth (it's what the user sees and approves).
        const resolved = resolveExerciseByName(exName);
        if (resolved) {
          if (exId && exId !== resolved.id) {
            console.warn('[HerculesAI] Exercise ID mismatch corrected:', exName,
              '— AI provided ID', exId, 'but catalog says', resolved.id);
          }
          workoutExercises.push(resolved);
        } else if (exId) {
          // Fallback: name resolution failed but AI provided an ID
          console.warn('[HerculesAI] Could not resolve by name:', rawName,
            '(cleaned:', exName, ') — falling back to AI-provided ID:', exId);
          workoutExercises.push({ id: exId, name: exName });
        } else {
          console.warn('[HerculesAI] Could not resolve exercise:', rawName, '(cleaned:', exName, ') — skipping');
        }
      }
    }
    
    console.log('[HerculesAI] Preparing workout:', workoutName, '- exercises:', workoutExercises.length);
    
    return {
      plan_id: planData.id,
      user_id: userId,
      name: workoutName,
      exercises: workoutExercises,
      order_index: index,
      source_workout_id: getString(workout.sourceWorkoutId),
    };
  });
  
  // CRITICAL: Check if all workouts were filtered out (e.g., all were rest days)
  if (workoutsToInsert.length === 0) {
    console.error('[HerculesAI] createProgramPlan: all workouts were invalid (rest days or no valid exercises)');
    throw new Error('Cannot create a program with only rest days. Please specify actual workout days with exercises.');
  }
  
  // CRITICAL: Check if any workout has no valid exercises
  const emptyWorkouts = workoutsToInsert.filter(w => w.exercises.length === 0);
  if (emptyWorkouts.length > 0) {
    console.error('[HerculesAI] createProgramPlan: workouts with no valid exercises:', emptyWorkouts.map(w => w.name));
    throw new Error(`Workout(s) "${emptyWorkouts.map(w => w.name).join(', ')}" have no valid exercises. Cannot create workouts without exercises.`);
  }

  const { data: insertedWorkouts, error: workoutsError } = await supabase
    .from('plan_workouts')
    .insert(workoutsToInsert)
    .select('id, order_index');

  if (workoutsError) {
    console.error('[HerculesAI] createProgramPlan: workouts insert failed', workoutsError);
    throw new Error('Failed to create program workouts.');
  }

  console.log('[HerculesAI] createProgramPlan: inserted', insertedWorkouts?.length ?? 0, 'workouts');

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

  // ── Optional: set active schedule ──────────────────────────────────────────
  const setSchedule = isRecord(payload.setActiveSchedule) ? payload.setActiveSchedule as Record<string, unknown> : null;
  let scheduleSummary = '';

  if (setSchedule) {
    console.log('[HerculesAI] createProgramPlan: setActiveSchedule requested:', JSON.stringify(setSchedule));

    // Build name → created-ID map from the workouts we just inserted
    const createdNameMap = new Map<string, string>();
    workoutsToInsert.forEach((w, i) => {
      const insertedId = sortedInserted[i]?.id as string | undefined;
      if (insertedId) {
        createdNameMap.set(w.name.toLowerCase(), insertedId);
      }
    });

    // Also load existing workouts so schedule can reference them
    const resolveExisting = await buildWorkoutLookup(supabase, userId);

    const resolveRef = (ref: string): string | null => {
      return createdNameMap.get(ref.trim().toLowerCase()) ?? resolveExisting(ref) ?? null;
    };

    const schedType = getString(setSchedule.type) || 'rotating';
    let activeRule: Record<string, unknown> | null = null;

    const WEEKDAY_KEYS_SCHED: string[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    if (schedType === 'weekly') {
      const days = (isRecord(setSchedule.days) ? setSchedule.days : null) as Record<string, unknown> | null;
      if (days) {
        const resolvedDays: Record<string, string | null> = {};
        const unresolvedEntries: string[] = [];
        for (const day of WEEKDAY_KEYS_SCHED) {
          const dayRef = days[day];
          if (isRestDayRef(dayRef)) {
            resolvedDays[day] = null;
          } else {
            const refStr = typeof dayRef === 'string' ? dayRef : null;
            if (!refStr) {
              resolvedDays[day] = null;
              continue;
            }
            const resolvedId = resolveRef(refStr);
            if (resolvedId) {
              resolvedDays[day] = resolvedId;
              console.log(`[HerculesAI] setActiveSchedule: resolved ${day}: "${refStr}" → ${resolvedId}`);
            } else {
              console.error(`[HerculesAI] setActiveSchedule: FAILED to resolve "${refStr}" for ${day}`);
              unresolvedEntries.push(`${day}: "${refStr}"`);
            }
          }
        }
        if (unresolvedEntries.length > 0) {
          console.error('[HerculesAI] setActiveSchedule: unresolved workout names:', unresolvedEntries);
          scheduleSummary = ` Schedule could not be set — could not resolve: ${unresolvedEntries.join(', ')}.`;
        } else {
          const hasWorkout = Object.values(resolvedDays).some((id) => id !== null);
          if (hasWorkout) {
            activeRule = { type: 'weekly', days: resolvedDays };
          }
        }
      }
    } else {
      // rotating or plan-driven — both use cycleWorkouts
      const cycleRefs = getArray(setSchedule.cycleWorkouts || setSchedule.cycle);
      let resolvedCycle: (string | null)[];

      if (cycleRefs.length > 0) {
        const unresolvedEntries: string[] = [];
        resolvedCycle = [];
        for (let i = 0; i < cycleRefs.length; i++) {
          const ref = cycleRefs[i];
          if (isRestDayRef(ref)) {
            resolvedCycle.push(null);
          } else {
            const refStr = typeof ref === 'string' ? ref : null;
            if (!refStr) { resolvedCycle.push(null); continue; }
            const resolvedId = resolveRef(refStr);
            if (resolvedId) {
              resolvedCycle.push(resolvedId);
              console.log(`[HerculesAI] setActiveSchedule: resolved cycle entry "${refStr}" → ${resolvedId}`);
            } else {
              console.error(`[HerculesAI] setActiveSchedule: FAILED to resolve "${refStr}" at position ${i + 1}`);
              unresolvedEntries.push(`Day ${i + 1}: "${refStr}"`);
            }
          }
        }
        if (unresolvedEntries.length > 0) {
          console.error('[HerculesAI] setActiveSchedule: unresolved workout names:', unresolvedEntries);
          scheduleSummary = ` Schedule could not be set — could not resolve: ${unresolvedEntries.join(', ')}.`;
          resolvedCycle = []; // prevent schedule creation
        }
      } else {
        // Default: all created workouts in order + a rest day
        resolvedCycle = sortedInserted.map((w) => w.id as string);
        resolvedCycle.push(null); // auto-append rest day
        console.log('[HerculesAI] setActiveSchedule: default cycle — added rest day to', resolvedCycle.length - 1, 'workouts');
      }

      // Safety net: if the AI forgot to include rest days, auto-append one
      const hasRestDay = resolvedCycle.some((id) => id === null);
      if (!hasRestDay && resolvedCycle.length > 0) {
        console.warn('[HerculesAI] setActiveSchedule: rotating cycle has 0 rest days — auto-appending a rest day');
        resolvedCycle.push(null);
      }

      const hasWorkout = resolvedCycle.some((id) => id !== null);
      if (hasWorkout) {
        if (schedType === 'plan-driven') {
          activeRule = {
            type: 'plan-driven',
            planId: planData.id,
            startDate: Date.now(),
            cycleWorkouts: resolvedCycle,
            currentIndex: 0,
          };
        } else {
          activeRule = {
            type: 'rotating',
            cycleWorkouts: resolvedCycle,
            startDate: Date.now(),
          };
        }
      }
    }

    if (activeRule) {
      const activeScheduleState = {
        activeRule,
        overrides: [],
        updatedAt: Date.now(),
      };

      const { error: schedError } = await supabase
        .from('active_schedule')
        .upsert(
          {
            user_id: userId,
            schedule_data: activeScheduleState,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (schedError) {
        console.error('[HerculesAI] createProgramPlan: schedule upsert failed', schedError);
        scheduleSummary = ' Schedule could not be set — you can set it up manually in My Schedule.';
      } else {
        const label = schedType === 'weekly' ? 'weekly' : schedType === 'plan-driven' ? 'plan-driven' : 'rotating';
        scheduleSummary = ` Your ${label} schedule is now active!`;
        console.log('[HerculesAI] createProgramPlan: active schedule set (' + label + ')');
      }
    } else {
      console.warn('[HerculesAI] createProgramPlan: could not build valid schedule rule');
      scheduleSummary = ' Schedule could not be set — no valid workouts resolved for the schedule.';
    }
  }

  console.log('[HerculesAI] createProgramPlan: SUCCESS - plan ID:', planData.id);
  return {
    summary: `Program "${name}" created with ${workouts.length} workouts!${scheduleSummary} You can find it in My Plans.`,
    data: { id: planData.id, scheduleSet: scheduleSummary.includes('now active') },
  };
};
