/**
 * activeScheduleStore
 * Zustand store managing the unified active schedule system.
 * 
 * Core Principles:
 * - One active schedule rule at a time
 * - Manual overrides always take precedence
 * - Deterministic: getTodaysWorkout() is the single source of truth
 * 
 * Storage: Supabase (active_schedule table)
 */
import { create } from 'zustand';

import type {
  ActiveScheduleState,
  ScheduleRule,
  ScheduleOverride,
  TodayWorkoutResult,
  ScheduleSummary,
  WeeklyScheduleRule,
  RotatingScheduleRule,
  PlanDrivenScheduleRule,
  WeekdayKey,
} from '@/types/activeSchedule';
import { supabaseClient } from '@/lib/supabaseClient';

interface ActiveScheduleStore {
  /** Current schedule state */
  state: ActiveScheduleState;
  /** Loading indicator */
  isLoading: boolean;

  /** Set the active schedule rule (replaces any existing rule) */
  setActiveRule: (rule: ScheduleRule | null) => Promise<void>;
  
  /** Add or update a manual override for a specific date */
  addOverride: (override: ScheduleOverride) => Promise<void>;
  
  /** Remove an override for a specific date */
  removeOverride: (date: string) => Promise<void>;
  
  /** Clear all overrides */
  clearOverrides: () => Promise<void>;

  /** Get workout for a specific date (single source of truth) */
  getWorkoutForDate: (date: Date) => TodayWorkoutResult;
  
  /** Convenience: get today's workout */
  getTodaysWorkout: () => TodayWorkoutResult;
  
  /** Get schedule summary for display */
  getScheduleSummary: () => ScheduleSummary;

  /** Advance plan-driven schedule to next workout */
  advancePlanDriven: () => Promise<void>;

  /** Hydrate from Supabase */
  hydrateActiveSchedule: (userId?: string) => Promise<void>;
}

const WEEKDAY_KEYS: WeekdayKey[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
];

const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
};

/** Format date to YYYY-MM-DD for override lookup */
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Get days difference between two dates (ignoring time) */
const getDaysDiff = (from: Date, to: Date): number => {
  const fromMidnight = new Date(from);
  fromMidnight.setHours(0, 0, 0, 0);
  const toMidnight = new Date(to);
  toMidnight.setHours(0, 0, 0, 0);
  return Math.floor((toMidnight.getTime() - fromMidnight.getTime()) / (1000 * 60 * 60 * 24));
};

const createDefaultState = (): ActiveScheduleState => ({
  activeRule: null,
  overrides: [],
  updatedAt: Date.now(),
});

const normalizeRotatingCycle = (cycleWorkouts: (string | null)[]): (string | null)[] => {
  // Remove sparse array holes (undefined) that can cause UI to show Day 1 / Day 5 gaps.
  return cycleWorkouts.filter((id) => id !== undefined);
};

const normalizeRule = (rule: ScheduleRule | null): ScheduleRule | null => {
  if (!rule) return null;
  if (rule.type !== 'rotating') return rule;

  return {
    ...rule,
    cycleWorkouts: normalizeRotatingCycle(rule.cycleWorkouts),
  };
};

export const useActiveScheduleStore = create<ActiveScheduleStore>((set, get) => ({
  state: createDefaultState(),
  isLoading: false,

  setActiveRule: async (rule) => {
    const normalizedRule = normalizeRule(rule);
    const newState: ActiveScheduleState = {
      ...get().state,
      activeRule: normalizedRule,
      updatedAt: Date.now(),
    };
    set({ state: newState });
    await syncToSupabase(newState);
  },

  addOverride: async (override) => {
    const currentState = get().state;
    const existingIndex = currentState.overrides.findIndex(o => o.date === override.date);
    
    let newOverrides: ScheduleOverride[];
    if (existingIndex >= 0) {
      newOverrides = [...currentState.overrides];
      newOverrides[existingIndex] = override;
    } else {
      newOverrides = [...currentState.overrides, override];
    }

    const newState: ActiveScheduleState = {
      ...currentState,
      overrides: newOverrides,
      updatedAt: Date.now(),
    };
    set({ state: newState });
    await syncToSupabase(newState);
  },

  removeOverride: async (date) => {
    const currentState = get().state;
    const newState: ActiveScheduleState = {
      ...currentState,
      overrides: currentState.overrides.filter(o => o.date !== date),
      updatedAt: Date.now(),
    };
    set({ state: newState });
    await syncToSupabase(newState);
  },

  clearOverrides: async () => {
    const newState: ActiveScheduleState = {
      ...get().state,
      overrides: [],
      updatedAt: Date.now(),
    };
    set({ state: newState });
    await syncToSupabase(newState);
  },

  getWorkoutForDate: (date: Date): TodayWorkoutResult => {
    const { state } = get();
    const dateKey = formatDateKey(date);

    // Priority 1: Check for manual override
    const override = state.overrides.find(o => o.date === dateKey);
    if (override) {
      return {
        workoutId: override.workoutId,
        source: 'override',
        label: override.note || (override.workoutId ? 'Override' : 'Rest'),
        context: 'Manual override',
      };
    }

    // Priority 2: Compute from active rule
    const { activeRule } = state;
    if (!activeRule) {
      return {
        workoutId: null,
        source: 'none',
        label: 'No schedule',
        context: 'Set up a schedule to see your workouts',
      };
    }

    switch (activeRule.type) {
      case 'weekly':
        return computeWeeklyWorkout(activeRule, date);
      case 'rotating':
        return computeRotatingWorkout(activeRule, date);
      case 'plan-driven':
        return computePlanDrivenWorkout(activeRule, date);
      default:
        return {
          workoutId: null,
          source: 'none',
          label: 'Unknown schedule type',
        };
    }
  },

  getTodaysWorkout: () => {
    return get().getWorkoutForDate(new Date());
  },

  getScheduleSummary: (): ScheduleSummary => {
    const { activeRule } = get().state;

    if (!activeRule) {
      return {
        typeLabel: 'None',
        description: 'No active schedule',
        isActive: false,
      };
    }

    switch (activeRule.type) {
      case 'weekly': {
        const workoutDays = Object.values(activeRule.days).filter(id => id !== null).length;
        return {
          typeLabel: 'Weekly',
          description: `${workoutDays} workout${workoutDays !== 1 ? 's' : ''} per week`,
          isActive: true,
        };
      }
      case 'rotating': {
        const cycleLength = activeRule.cycleWorkouts.length;
        const workoutCount = activeRule.cycleWorkouts.filter(id => id !== null).length;
        return {
          typeLabel: 'Rotating Cycle',
          description: `${workoutCount} workouts in ${cycleLength}-day cycle`,
          isActive: true,
        };
      }
      case 'plan-driven': {
        const cycleLength = activeRule.cycleWorkouts?.length || 0;
        const workoutCount = activeRule.cycleWorkouts?.filter(id => id !== null).length || 0;
        return {
          typeLabel: 'Plan-Driven',
          description: cycleLength > 0 
            ? `${workoutCount} workouts in ${cycleLength}-day cycle`
            : 'Following saved plan',
          isActive: true,
        };
      }
      default:
        return {
          typeLabel: 'Unknown',
          description: 'Unknown schedule type',
          isActive: false,
        };
    }
  },

  advancePlanDriven: async () => {
    const { activeRule } = get().state;
    if (!activeRule || activeRule.type !== 'plan-driven') return;

    const newRule: PlanDrivenScheduleRule = {
      ...activeRule,
      currentIndex: activeRule.currentIndex + 1,
      lastCompletedAt: Date.now(),
    };

    await get().setActiveRule(newRule);
  },

  hydrateActiveSchedule: async (userId?: string) => {
    try {
      set({ isLoading: true });

      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        uid = user?.id;
      }

      if (!uid) {
        console.log('[activeScheduleStore] No authenticated user, using default state');
        set({ state: createDefaultState(), isLoading: false });
        return;
      }

      const { data, error } = await supabaseClient
        .from('active_schedule')
        .select('schedule_data')
        .eq('user_id', uid)
        .maybeSingle();

      if (error) {
        console.warn('[activeScheduleStore] Error fetching schedule:', error.message);
        set({ state: createDefaultState(), isLoading: false });
        return;
      }

      if (data?.schedule_data) {
        const scheduleData = data.schedule_data as ActiveScheduleState;
        const normalizedState: ActiveScheduleState = {
          ...scheduleData,
          activeRule: normalizeRule(scheduleData.activeRule),
        };
        set({ state: normalizedState, isLoading: false });
        console.log('[activeScheduleStore] Hydrated from Supabase');
      } else {
        set({ state: createDefaultState(), isLoading: false });
        console.log('[activeScheduleStore] No existing schedule, using defaults');
      }
    } catch (error) {
      console.warn('[activeScheduleStore] Hydration failed:', error);
      set({ state: createDefaultState(), isLoading: false });
    }
  },
}));

/** Compute workout for weekly schedule */
function computeWeeklyWorkout(rule: WeeklyScheduleRule, date: Date): TodayWorkoutResult {
  const dayIndex = date.getDay();
  const weekday = WEEKDAY_KEYS[dayIndex];
  const workoutId = rule.days[weekday];

  return {
    workoutId,
    source: 'rule',
    label: WEEKDAY_LABELS[weekday],
    context: workoutId ? undefined : 'Rest day',
  };
}

/** Compute workout for rotating cycle schedule */
function computeRotatingWorkout(rule: RotatingScheduleRule, date: Date): TodayWorkoutResult {
  const startDate = new Date(rule.startDate);
  const daysDiff = getDaysDiff(startDate, date);

  if (daysDiff < 0) {
    return {
      workoutId: null,
      source: 'rule',
      label: 'Not started',
      context: `Cycle starts ${startDate.toLocaleDateString()}`,
    };
  }

  const normalizedCycle = normalizeRotatingCycle(rule.cycleWorkouts);
  const cycleLength = normalizedCycle.length;
  if (cycleLength === 0) {
    return {
      workoutId: null,
      source: 'rule',
      label: 'Empty cycle',
      context: 'Add workouts to your cycle',
    };
  }

  const cycleDay = daysDiff % cycleLength;
  const workoutId = normalizedCycle[cycleDay] ?? null;

  return {
    workoutId,
    source: 'rule',
    label: `Day ${cycleDay + 1} of ${cycleLength}`,
    context: workoutId ? undefined : 'Rest day',
  };
}

/** Compute workout for plan-driven schedule (works like rotating cycle) */
function computePlanDrivenWorkout(rule: PlanDrivenScheduleRule, date: Date): TodayWorkoutResult {
  const startDate = new Date(rule.startDate);
  const daysDiff = getDaysDiff(startDate, date);

  if (daysDiff < 0) {
    return {
      workoutId: null,
      source: 'rule',
      label: 'Not started',
      context: `Plan starts ${startDate.toLocaleDateString()}`,
    };
  }

  // Plan-driven now works like rotating cycle with cycleWorkouts array
  const cycleWorkouts = rule.cycleWorkouts || [];
  const cycleLength = cycleWorkouts.length;
  
  if (cycleLength === 0) {
    return {
      workoutId: null,
      source: 'rule',
      label: 'Empty cycle',
      context: 'Add workouts to your plan schedule',
    };
  }

  const cycleDay = daysDiff % cycleLength;
  const workoutId = cycleWorkouts[cycleDay] ?? null;

  return {
    workoutId,
    source: 'rule',
    label: `Day ${cycleDay + 1} of ${cycleLength}`,
    context: workoutId ? 'Plan-driven schedule' : 'Rest day',
  };
}

/** Sync state to Supabase */
async function syncToSupabase(state: ActiveScheduleState): Promise<void> {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      console.warn('[activeScheduleStore] No user, skipping sync');
      return;
    }

    const { error } = await supabaseClient
      .from('active_schedule')
      .upsert({
        user_id: user.id,
        schedule_data: state,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('[activeScheduleStore] Sync error:', error.message);
    } else {
      console.log('[activeScheduleStore] Synced to Supabase');
    }
  } catch (error) {
    console.error('[activeScheduleStore] Sync failed:', error);
  }
}

export type { ActiveScheduleStore };
