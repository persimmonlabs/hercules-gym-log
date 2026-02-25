import type { SupabaseClient } from '@supabase/supabase-js';

import type { ActionExecutionResult } from './types.ts';
import {
  getArray,
  getString,
  isRecord,
  buildWorkoutLookup,
  isRestDayRef,
  resolvePlanRef,
} from './helpers.ts';

type WeekdayKey = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
const WEEKDAY_KEYS: WeekdayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const createSchedule = async (
  supabase: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>
): Promise<ActionExecutionResult> => {
  console.log('[HerculesAI] createSchedule called with payload:', JSON.stringify(payload, null, 2));

  // Extract schedule data — accept nested or flat format
  const sd = (isRecord(payload.scheduleData) ? payload.scheduleData : payload) as Record<string, unknown>;
  const type = getString(sd.type) || getString(payload.type);

  if (type !== 'weekly' && type !== 'rotating' && type !== 'plan-driven') {
    throw new Error('Schedule type must be "weekly", "rotating", or "plan-driven".');
  }

  // Pre-load all user workouts for efficient name→ID resolution
  const resolveWorkout = await buildWorkoutLookup(supabase, userId);

  let activeRule: Record<string, unknown>;

  if (type === 'weekly') {
    const days = (isRecord(sd.days) ? sd.days : isRecord(sd.weekly) ? sd.weekly : null) as Record<string, unknown> | null;
    if (!days) {
      throw new Error('Weekly schedule requires a "days" mapping (e.g., { monday: "Push", tuesday: null, ... }).');
    }

    const resolvedDays: Record<string, string | null> = {};
    for (const day of WEEKDAY_KEYS) {
      const ref = days[day];
      if (isRestDayRef(ref)) {
        resolvedDays[day] = null;
      } else {
        const refStr = getString(ref);
        if (!refStr) {
          resolvedDays[day] = null;
          continue;
        }
        const resolvedId = resolveWorkout(refStr);
        if (resolvedId) {
          resolvedDays[day] = resolvedId;
          console.log(`[HerculesAI] createSchedule: resolved ${day}: "${refStr}" → ${resolvedId}`);
        } else {
          console.warn(`[HerculesAI] createSchedule: could not resolve "${refStr}" for ${day} — marking rest`);
          resolvedDays[day] = null;
        }
      }
    }

    const workoutDayCount = Object.values(resolvedDays).filter((id) => id !== null).length;
    if (workoutDayCount === 0) {
      throw new Error('Could not resolve any workout names to existing workouts. Make sure the workouts exist in My Workouts or a Plan first.');
    }

    activeRule = { type: 'weekly', days: resolvedDays };

  } else if (type === 'rotating') {
    const cycleRefs = getArray(sd.cycleWorkouts || sd.workoutOrder || sd.cycle);
    if (cycleRefs.length === 0) {
      throw new Error('Rotating schedule requires a "cycleWorkouts" array (e.g., ["Push", "Pull", "Legs", null]).');
    }

    const resolvedCycle: (string | null)[] = [];
    for (const ref of cycleRefs) {
      if (isRestDayRef(ref)) {
        resolvedCycle.push(null);
      } else {
        const refStr = typeof ref === 'string' ? ref.trim() : null;
        if (!refStr) { resolvedCycle.push(null); continue; }
        const resolvedId = resolveWorkout(refStr);
        if (resolvedId) {
          resolvedCycle.push(resolvedId);
          console.log(`[HerculesAI] createSchedule: resolved cycle entry "${refStr}" → ${resolvedId}`);
        } else {
          console.warn(`[HerculesAI] createSchedule: could not resolve "${refStr}" in cycle — marking rest`);
          resolvedCycle.push(null);
        }
      }
    }

    const workoutCount = resolvedCycle.filter((id) => id !== null).length;
    if (workoutCount === 0) {
      throw new Error('Could not resolve any workout names in the cycle. Make sure the workouts exist first.');
    }

    activeRule = { type: 'rotating', cycleWorkouts: resolvedCycle, startDate: Date.now() };

  } else {
    // plan-driven
    const planRef = getString(sd.planId) || getString(sd.planName) || getString(payload.planId) || getString(payload.planName);
    if (!planRef) {
      throw new Error('Plan-driven schedule requires a "planName" or "planId".');
    }

    const resolvedPlanId = await resolvePlanRef(supabase, userId, planRef);
    if (!resolvedPlanId) {
      throw new Error(`Could not find plan "${planRef}". Please create the plan first.`);
    }

    // Get workouts in this plan
    const { data: planWorkouts } = await supabase
      .from('plan_workouts')
      .select('id, name, order_index')
      .eq('plan_id', resolvedPlanId)
      .eq('user_id', userId)
      .order('order_index', { ascending: true });

    if (!planWorkouts || planWorkouts.length === 0) {
      throw new Error('Plan has no workouts. Cannot create a schedule from an empty plan.');
    }

    // Build cycle: use explicit cycle if provided, otherwise default to plan workouts in order
    const cycleRefs = getArray(sd.cycleWorkouts || sd.cycle);
    let resolvedCycle: (string | null)[];

    if (cycleRefs.length > 0) {
      resolvedCycle = [];
      for (const ref of cycleRefs) {
        if (isRestDayRef(ref)) {
          resolvedCycle.push(null);
        } else {
          const refStr = typeof ref === 'string' ? ref.trim() : null;
          if (!refStr) { resolvedCycle.push(null); continue; }
          // Look up among plan workouts first, then all workouts
          const pwMatch = planWorkouts.find(
            (pw) => (pw.name as string).toLowerCase() === refStr.toLowerCase()
          );
          resolvedCycle.push(pwMatch ? (pwMatch.id as string) : (resolveWorkout(refStr) ?? null));
        }
      }
    } else {
      // Default: plan workouts in order, no rest days
      resolvedCycle = planWorkouts.map((pw) => pw.id as string);
    }

    activeRule = {
      type: 'plan-driven',
      planId: resolvedPlanId,
      startDate: Date.now(),
      cycleWorkouts: resolvedCycle,
      currentIndex: 0,
    };
  }

  // Build ActiveScheduleState and upsert into active_schedule table
  const activeScheduleState = {
    activeRule,
    overrides: [],
    updatedAt: Date.now(),
  };

  const { error } = await supabase
    .from('active_schedule')
    .upsert(
      {
        user_id: userId,
        schedule_data: activeScheduleState,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[HerculesAI] createSchedule: upsert to active_schedule failed', error);
    throw new Error('Failed to set active schedule.');
  }

  const typeLabel = type === 'weekly' ? 'weekly' : type === 'rotating' ? 'rotating cycle' : 'plan-driven';
  console.log('[HerculesAI] createSchedule: SUCCESS — active schedule set (' + typeLabel + ')');
  return {
    summary: `Your ${typeLabel} schedule is now active! Check My Schedule to see it.`,
    data: { type },
  };
};
