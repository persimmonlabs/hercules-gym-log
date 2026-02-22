/**
 * smartSuggestions
 * TypeScript interfaces for the Smart Set Suggestions feature.
 * Pattern detection, suggestion metadata, and intra-session adaptation types.
 */

import type { SetLog } from '@/types/workout';
import type { EquipmentType } from '@/types/exercise';

/** Per-set-position weight and reps from a single session */
export interface SetPositionData {
  weight: number;
  reps: number;
}

/** A single historical data point extracted from a past session for one exercise */
export interface ExerciseDataPoint {
  date: number;
  avgWeight: number;
  avgReps: number;
  topSetWeight: number;
  topSetReps: number;
  totalSets: number;
  totalVolume: number;
  /** Per-set-position data (ordered: set 0, set 1, …) */
  setDetails: SetPositionData[];
}

/** Detected training pattern for an exercise */
export type PatternType =
  | 'progressive_overload'
  | 'rep_cycling'
  | 'deload'
  | 'stable'
  | 'fallback';

/** Rep-range cluster split for dual-progression tracking */
export interface ClusterData {
  heavy: ExerciseDataPoint[];
  light: ExerciseDataPoint[];
  nextIsHeavy: boolean;
}

/** Detected set arrangement across a session */
export type SetArrangement = 'pyramid_up' | 'pyramid_down' | 'straight_across';

/** Result of pattern analysis for a single exercise */
export interface PatternAnalysis {
  pattern: PatternType;
  confidence: number;
  dataPoints: ExerciseDataPoint[];
  slope?: number;
  rSquared?: number;
  /** Rep-cycling cluster data (only present when pattern === 'rep_cycling') */
  clusters?: ClusterData;
  /** Detected set arrangement (pyramid, drop-set, straight) */
  setPattern?: SetArrangement;
}

/** The smart suggestion output for a single exercise */
export interface SmartSuggestionResult {
  sets: SetLog[];
  historySetCount: number;
  pattern: PatternType;
  confidence: number;
  /** Cluster data passed through for intra-session re-targeting */
  clusters?: ClusterData;
  /** Set arrangement for reference */
  setPattern?: SetArrangement;
}

/** Result of intra-session pattern shift detection */
export interface PatternShiftResult {
  shifted: boolean;
  /** Replacement targets for all remaining (uncompleted) sets, indexed from 0 */
  newTargets: { weight: number; reps: number }[];
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
  /** Pattern shift: weight deviation threshold (fraction) */
  PATTERN_SHIFT_WEIGHT_THRESHOLD: 0.15,
  /** Pattern shift: reps deviation threshold (fraction) */
  PATTERN_SHIFT_REPS_THRESHOLD: 0.30,
  /** Pattern shift: max similarity score to accept a historical match */
  PATTERN_SHIFT_MAX_SIMILARITY: 0.30,
  /** Max pattern shifts allowed per session (prevents oscillation) */
  MAX_PATTERN_SHIFTS_PER_SESSION: 1,
  /** Pyramid detection: last set > first set by this fraction → pyramid_up */
  PYRAMID_UP_THRESHOLD: 0.10,
  /** Pyramid detection: first set > last set by this fraction → pyramid_down */
  PYRAMID_DOWN_THRESHOLD: 0.10,
  /** Straight-across: all sets within this fraction → straight */
  STRAIGHT_ACROSS_THRESHOLD: 0.05,
  /** Minimum cluster sessions for trend-line regression */
  MIN_CLUSTER_SESSIONS: 2,
  /** Progression bump for single-session clusters or straight-across rep increment */
  SMALL_BUMP_PERCENT: 0.025,
} as const;
