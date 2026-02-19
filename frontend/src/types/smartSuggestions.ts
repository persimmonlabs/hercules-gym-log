/**
 * smartSuggestions
 * TypeScript interfaces for the Smart Set Suggestions feature.
 * Pattern detection, suggestion metadata, and intra-session adaptation types.
 */

import type { SetLog } from '@/types/workout';
import type { EquipmentType } from '@/types/exercise';

/** A single historical data point extracted from a past session for one exercise */
export interface ExerciseDataPoint {
  date: number;
  avgWeight: number;
  avgReps: number;
  topSetWeight: number;
  topSetReps: number;
  totalSets: number;
  totalVolume: number;
}

/** Detected training pattern for an exercise */
export type PatternType =
  | 'progressive_overload'
  | 'rep_cycling'
  | 'deload'
  | 'stable'
  | 'fallback';

/** Result of pattern analysis for a single exercise */
export interface PatternAnalysis {
  pattern: PatternType;
  confidence: number;
  dataPoints: ExerciseDataPoint[];
  slope?: number;
  rSquared?: number;
}

/** The smart suggestion output for a single exercise */
export interface SmartSuggestionResult {
  sets: SetLog[];
  historySetCount: number;
  pattern: PatternType;
  confidence: number;
}

/** Equipment-aware weight increment configuration */
export interface WeightIncrement {
  increment: number;
  roundDirection: 'down' | 'nearest';
}

/** Map of equipment types to their practical weight increments (in lbs) */
export const EQUIPMENT_INCREMENTS: Record<string, WeightIncrement> = {
  Barbell: { increment: 5, roundDirection: 'down' },
  'Smith Machine': { increment: 5, roundDirection: 'down' },
  'Trap Bar': { increment: 5, roundDirection: 'down' },
  Dumbbell: { increment: 5, roundDirection: 'down' },
  Kettlebell: { increment: 5, roundDirection: 'down' },
  Cable: { increment: 5, roundDirection: 'down' },
  Machine: { increment: 5, roundDirection: 'down' },
  Bodyweight: { increment: 1, roundDirection: 'nearest' },
  Bands: { increment: 1, roundDirection: 'nearest' },
  Bench: { increment: 5, roundDirection: 'down' },
  'Cardio Machine': { increment: 1, roundDirection: 'nearest' },
};

/** Default increment when equipment type is unknown */
export const DEFAULT_INCREMENT: WeightIncrement = {
  increment: 5,
  roundDirection: 'down',
};

/** Configuration constants for the smart suggestions engine */
export const SMART_CONFIG = {
  /** Maximum lookback window in milliseconds (8 weeks) */
  LOOKBACK_MS: 8 * 7 * 24 * 60 * 60 * 1000,
  /** Maximum number of sessions to analyze per exercise */
  MAX_SESSIONS: 20,
  /** Minimum sessions required before smart logic activates */
  MIN_SESSIONS: 3,
  /** Minimum sessions required for rep range cycling detection */
  MIN_SESSIONS_REP_CYCLING: 4,
  /** Minimum weeks of history required for auto-deload suggestion */
  MIN_WEEKS_DELOAD_AUTO: 12,
  /** R² threshold for progressive overload — compound exercises */
  R_SQUARED_COMPOUND: 0.6,
  /** R² threshold for progressive overload — isolation exercises */
  R_SQUARED_ISOLATION: 0.5,
  /** Maximum weight increase percentage for compound exercises */
  MAX_INCREASE_COMPOUND: 0.05,
  /** Maximum weight increase percentage for isolation exercises */
  MAX_INCREASE_ISOLATION: 0.10,
  /** Maximum weight decrease percentage (deload) */
  MAX_DECREASE: 0.10,
  /** Gap in days after which we fall back to conservative (most recent) */
  STALE_GAP_DAYS: 21,
  /** Rep standard deviation threshold for rep cycling detection */
  REP_CYCLING_STDDEV: 3,
  /** Volume drop threshold for deload detection */
  DELOAD_VOLUME_DROP: 0.20,
  /** Minimum reps */
  MIN_REPS: 1,
  /** Maximum reps */
  MAX_REPS: 30,
  /** Intra-session: reps above target to consider "easy" */
  EASY_REPS_ABOVE: 2,
  /** Intra-session: reps below target to consider "significant miss" */
  MISS_REPS_BELOW: 2,
  /** Intra-session: weight bump for easy set */
  EASY_BUMP_PERCENT: 0.025,
  /** Intra-session: weight reduction for significant miss */
  MISS_REDUCE_PERCENT: 0.05,
} as const;
