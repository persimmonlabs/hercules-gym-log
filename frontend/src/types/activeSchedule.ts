/**
 * activeSchedule.ts
 * Type definitions for the unified scheduling system.
 * 
 * Design Principles:
 * - One active schedule rule at a time
 * - Rules over calendars (deterministic)
 * - Manual overrides take precedence
 * - Simple, intentional, on-brand for Hercules
 */

/** Schedule rule types */
export type ScheduleRuleType = 'weekly' | 'rotating' | 'plan-driven';

/** Days of the week */
export type WeekdayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

/** Weekly schedule rule - maps day of week to workout or rest */
export interface WeeklyScheduleRule {
  type: 'weekly';
  /** Map of weekday to workout ID (null = rest day) */
  days: Record<WeekdayKey, string | null>;
}

/** Rotating cycle schedule rule */
export interface RotatingScheduleRule {
  type: 'rotating';
  /** Ordered list of workout IDs (null = rest day in cycle) */
  cycleWorkouts: (string | null)[];
  /** Start date timestamp (day 0 of the cycle) */
  startDate: number;
}

/** Plan-driven schedule rule - sequential progress through a plan */
export interface PlanDrivenScheduleRule {
  type: 'plan-driven';
  /** ID of the saved plan to follow */
  planId: string;
  /** Start date timestamp */
  startDate: number;
  /** Current position in the plan (0-indexed) */
  currentIndex: number;
  /** Timestamp of last completed workout (for tracking) */
  lastCompletedAt?: number;
}

/** Union type for all schedule rules */
export type ScheduleRule = WeeklyScheduleRule | RotatingScheduleRule | PlanDrivenScheduleRule;

/** Manual override for a specific date */
export interface ScheduleOverride {
  /** Date string in YYYY-MM-DD format */
  date: string;
  /** Workout ID to schedule, or null for forced rest day */
  workoutId: string | null;
  /** Optional note for the override reason */
  note?: string;
}

/** The complete active schedule state */
export interface ActiveScheduleState {
  /** The current active schedule rule (only one at a time) */
  activeRule: ScheduleRule | null;
  /** Date-specific overrides (take precedence over rules) */
  overrides: ScheduleOverride[];
  /** Last modified timestamp */
  updatedAt: number;
}

/** Result from getTodaysWorkout function */
export interface TodayWorkoutResult {
  /** The workout ID for today, or null if rest day */
  workoutId: string | null;
  /** Whether this is from an override or the active rule */
  source: 'override' | 'rule' | 'none';
  /** Human-readable label (e.g., "Monday", "Day 3 of 5", "Week 2, Day 4") */
  label: string;
  /** Additional context about the schedule */
  context?: string;
}

/** Helper type for schedule summary display */
export interface ScheduleSummary {
  /** Schedule type label */
  typeLabel: string;
  /** Short human-readable description */
  description: string;
  /** Whether there's an active schedule */
  isActive: boolean;
}
