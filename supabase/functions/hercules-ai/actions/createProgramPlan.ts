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

  // ── SAFETY NET: Load existing workouts so we can copy exercises if names match ──
  const [existingTemplatesResult, existingPlanWorkoutsResult] = await Promise.all([
    supabase.from('workout_templates').select('name, exercises').eq('user_id', userId),
    supabase.from('plan_workouts').select('name, exercises').eq('user_id', userId),
  ]);

  // Build a lookup: lowercase name → exercises array (templates take priority)
  const existingWorkoutExercises = new Map<string, Array<{ id: string; name: string }>>();
  if (existingPlanWorkoutsResult.data) {
    for (const w of existingPlanWorkoutsResult.data) {
      const key = (w.name as string).trim().toLowerCase();
      const exercises = Array.isArray(w.exercises) ? w.exercises as Array<{ id: string; name: string }> : [];
      if (exercises.length > 0) existingWorkoutExercises.set(key, exercises);
    }
  }
  if (existingTemplatesResult.data) {
    for (const w of existingTemplatesResult.data) {
      const key = (w.name as string).trim().toLowerCase();
      const exercises = Array.isArray(w.exercises) ? w.exercises as Array<{ id: string; name: string }> : [];
      if (exercises.length > 0) existingWorkoutExercises.set(key, exercises); // overwrites plan_workouts
    }
  }

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
    const useExisting = workout.useExisting === true;
    const existingKey = originalName.trim().toLowerCase();

    // SAFETY NET: Check if this workout should use existing exercises.
    // Triggers when: (1) AI set useExisting: true, OR (2) exact name match, OR (3) fuzzy name match
    let matchedExercises: Array<{ id: string; name: string }> | undefined;

    // Priority 1: Exact name match
    matchedExercises = existingWorkoutExercises.get(existingKey);

    // Priority 2: Fuzzy match — check if an existing workout name is contained in the proposed name or vice versa
    if (!matchedExercises) {
      for (const [existingName, existingEx] of existingWorkoutExercises.entries()) {
        if (existingKey.includes(existingName) || existingName.includes(existingKey)) {
          console.log('[HerculesAI] SAFETY NET (fuzzy): "' + originalName + '" ~ "' + existingName + '"');
          matchedExercises = existingEx;
          break;
        }
      }
    }

    // Use existing exercises when:
    // (A) useExisting flag is set AND any match found (exact or fuzzy), OR
    // (B) exact name match exists (even without useExisting flag — safety net)
    const hasExactMatch = existingWorkoutExercises.has(existingKey);
    const shouldUseExisting = matchedExercises && matchedExercises.length > 0 && (useExisting || hasExactMatch);
    if (shouldUseExisting) {
      console.log('[HerculesAI] SAFETY NET: Workout "' + originalName + '" (useExisting=' + useExisting + ') — using existing exercises (' + matchedExercises.length + ')');
      return {
        plan_id: planData.id,
        user_id: userId,
        name: workoutName,
        exercises: matchedExercises,
        order_index: index,
        source_workout_id: getString(workout.sourceWorkoutId),
      };
    }

    // If useExisting was set but no match found, log a warning (AI referenced a non-existent workout)
    if (useExisting && !matchedExercises) {
      console.warn('[HerculesAI] SAFETY NET WARNING: useExisting=true but no matching workout found for "' + originalName + '" — falling through to AI exercises');
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
      
      if (exId && exName) {
        // AI provided both id and name — use cleaned name
        workoutExercises.push({ id: exId, name: exName });
      } else if (exName) {
        // AI provided name but no valid id — resolve from catalog
        const resolved = resolveExerciseByName(exName);
        if (resolved) {
          console.log('[HerculesAI] Resolved exercise by name:', rawName, '→', resolved.id, resolved.name);
          workoutExercises.push(resolved);
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
        for (const day of WEEKDAY_KEYS_SCHED) {
          const dayRef = days[day];
          if (isRestDayRef(dayRef)) {
            resolvedDays[day] = null;
          } else {
            const refStr = typeof dayRef === 'string' ? dayRef : null;
            resolvedDays[day] = refStr ? resolveRef(refStr) : null;
          }
        }
        const hasWorkout = Object.values(resolvedDays).some((id) => id !== null);
        if (hasWorkout) {
          activeRule = { type: 'weekly', days: resolvedDays };
        }
      }
    } else {
      // rotating or plan-driven — both use cycleWorkouts
      const cycleRefs = getArray(setSchedule.cycleWorkouts || setSchedule.cycle);
      let resolvedCycle: (string | null)[];

      if (cycleRefs.length > 0) {
        resolvedCycle = cycleRefs.map((ref) => {
          if (isRestDayRef(ref)) return null;
          const refStr = typeof ref === 'string' ? ref : null;
          return refStr ? resolveRef(refStr) : null;
        });
      } else {
        // Default: all created workouts in order, no rest days
        resolvedCycle = sortedInserted.map((w) => w.id as string);
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
