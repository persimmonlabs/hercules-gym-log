/**
 * useInsightsData Hook (v4)
 * Calculates actionable training insights for the Performance Insights tab.
 *
 * Design goals:
 * - Simple, one-sentence insights with specific data + specific action.
 * - Goal-aware balance detection using the SAME ideal ratios as the Balance Score.
 * - Volume-based balance alerts (not just set-based) for coherence with Balance Score.
 * - Compound/Isolated balance alert (previously missing).
 * - Movement pattern diversity insight.
 * - Rep-range-aware plateau detection (strength / hypertrophy / endurance buckets).
 * - Size-aware volume expectations (quads ≠ obliques).
 * - Bodyweight exercises count as "trained"; suggest weighted alternatives when appropriate.
 * - New-user guard: require minimum workout history before surfacing insights.
 *
 * Shared constants imported from useTrainingBalanceMetrics so every
 * balance-related number in the app is coherent.
 *
 * Insight Types:
 * - Balance Alert: Push/Pull, Upper/Lower, and Compound/Isolated imbalances (7-day).
 * - Plateau Detection: E1RM stall (per rep range) or volume decline per exercise (28-day).
 * - Focus Suggestion: Skipped muscle (7d), low volume share (14d), or never-trained reminder.
 */

import { useMemo } from 'react';

import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { useDevToolsStore } from '@/store/devToolsStore';
import { useUserProfileStore } from '@/store/userProfileStore';
import type { PrimaryGoal } from '@/store/userProfileStore';
import {
  getIdealRatios,
  calculateRatioScore,
  MOVEMENT_PATTERN_TARGETS,
} from '@/hooks/useTrainingBalanceMetrics';
import exercisesData from '@/data/exercises.json';
import hierarchyData from '@/data/hierarchy.json';
import type { ExerciseType } from '@/types/exercise';

// ============================================================================
// TYPES
// ============================================================================

export type InsightType = 'balance' | 'plateau' | 'focus';
export type InsightPriority = 'alert' | 'suggestion' | 'celebration';

export interface Insight {
  type: InsightType;
  priority: InsightPriority;
  title: string;
  message: string;
  icon: string;
  borderColor: string;
  /** For focus suggestions – recommended exercises */
  suggestions?: string[];
}

export type EmptyReason = 'no-workouts' | 'insufficient-data' | 'all-good';

// ============================================================================
// CONSTANTS
// ============================================================================

// Global guards
const MIN_WORKOUTS_FOR_INSIGHTS = 3;
const MAX_INSIGHTS_PER_CATEGORY = 5;

// Time windows (milliseconds helpers)
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// Balance (7-day)
const BALANCE_WINDOW_DAYS = 7;
// Threshold derived from shared BALANCE_DEVIATION_PER_POINT:
// A score below this means the ratio is off enough to warrant an alert.
// 70 = 100 - 15 * 2 → ~15% deviation from ideal triggers an alert.
const BALANCE_SCORE_ALERT_THRESHOLD = 70;
const BALANCE_MIN_TOTAL = 8;

// Plateaus (28-day / 4 weeks)
const PLATEAU_WEEKS = 4;
const PLATEAU_MIN_SESSIONS = 3;
const PLATEAU_MIN_WEEKS_WITH_DATA = 3;
const PLATEAU_MIN_E1RM_IMPROVEMENT_ABS = 2.5;
const PLATEAU_MIN_E1RM_IMPROVEMENT_REL = 0.01; // 1%
const PLATEAU_VOLUME_DECLINE_THRESHOLD = 0.20; // 20%

// Rep-range buckets for plateau grouping
type RepRange = 'strength' | 'hypertrophy' | 'endurance';
const getRepRange = (reps: number): RepRange => {
  if (reps <= 5) return 'strength';
  if (reps <= 12) return 'hypertrophy';
  return 'endurance';
};
const REP_RANGE_LABELS: Record<RepRange, string> = {
  strength: 'heavy (1-5 rep)',
  hypertrophy: 'moderate (6-12 rep)',
  endurance: 'light (13+ rep)',
};

// Focus – skipped / not trained (7-day)
const FOCUS_SKIPPED_WINDOW_DAYS = 7;
// Focus – volume share comparison (14-day)
const FOCUS_VOLUME_WINDOW_DAYS = 14;
const FOCUS_MIN_TOTAL_SETS = 12;

// Expected volume share per muscle group (whole-body tonnage %).
// Alert fires if actual share < expected * FOCUS_SHARE_ALERT_FACTOR.
const EXPECTED_VOLUME_SHARE: Record<string, number> = {
  Chest: 0.12,
  Back: 0.15,
  Shoulders: 0.10,
  Arms: 0.08,
  Quads: 0.14,
  Hamstrings: 0.10,
  Glutes: 0.10,
  Calves: 0.04,
  Abs: 0.04,
  Obliques: 0.02,
  Hips: 0.03,
};
const FOCUS_SHARE_ALERT_FACTOR = 0.40;

// Never-trained reminder interval
const NEVER_TRAINED_REMINDER_WEEKS = 4;

// L2 muscle groups (match hierarchy.json)
const TARGET_MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Arms',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Hips',
  'Abs', 'Obliques',
] as const;

// Exercise suggestions keyed to L2 categories
const FOCUS_SUGGESTIONS: Record<string, string[]> = {
  Chest: ['Bench Press', 'Incline Dumbbell Press', 'Cable Flyes'],
  Back: ['Barbell Rows', 'Lat Pulldowns', 'Pull-Ups'],
  Shoulders: ['Overhead Press', 'Lateral Raises', 'Rear Delt Flyes'],
  Arms: ['Bicep Curls', 'Tricep Pushdowns', 'Hammer Curls'],
  Quads: ['Squats', 'Leg Press', 'Leg Extensions'],
  Glutes: ['Hip Thrusts', 'Romanian Deadlifts', 'Cable Kickbacks'],
  Hamstrings: ['Romanian Deadlifts', 'Leg Curls', 'Good Mornings'],
  Calves: ['Standing Calf Raises', 'Seated Calf Raises'],
  Hips: ['Hip Abductions', 'Hip Adductions', 'Lateral Band Walks'],
  Abs: ['Cable Crunches', 'Hanging Knee Raises', 'Weighted Sit-Ups'],
  Obliques: ['Cable Woodchops', 'Pallof Press', 'Landmine Rotations'],
};

// Weighted-exercise suggestions for bodyweight-only edge case
const WEIGHTED_ALTERNATIVES: Record<string, string[]> = {
  Abs: ['Cable Crunches', 'Weighted Sit-Ups'],
  Obliques: ['Cable Woodchops', 'Pallof Press'],
  Quads: ['Leg Extensions', 'Leg Press'],
  Glutes: ['Hip Thrusts', 'Cable Kickbacks'],
  Hamstrings: ['Leg Curls', 'Romanian Deadlifts'],
  Calves: ['Seated Calf Raises', 'Standing Calf Raises'],
  Chest: ['Dumbbell Press', 'Cable Flyes'],
  Back: ['Lat Pulldowns', 'Cable Rows'],
  Arms: ['Bicep Curls', 'Tricep Pushdowns'],
  Shoulders: ['Lateral Raises', 'Face Pulls'],
  Hips: ['Hip Adductions', 'Hip Abductions'],
};

const UPPER_BODY_GROUPS = new Set(['Chest', 'Back', 'Shoulders', 'Arms']);
const LOWER_BODY_GROUPS = new Set(['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Hips']);

// Border colors
const INSIGHT_COLORS = {
  alert: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

// ============================================================================
// HELPERS
// ============================================================================

const isCompletedSet = (set: any): boolean => {
  if (!set?.completed) return false;
  return (set.reps ?? 0) > 0;
};

const estimateE1RM = (weight: number, reps: number): number =>
  weight * (1 + reps / 30);

const safeDivide = (a: number, b: number): number => (b === 0 ? 0 : a / b);

const pick = (arr: string[], n: number): string => arr.slice(0, n).join(' or ');

const fmtLbs = (n: number): string => {
  if (n >= 10) return Math.round(n).toString();
  return n.toFixed(1);
};

const computeSetVolume = (
  set: any,
  exerciseType: ExerciseType,
  userBodyWeight: number | undefined | null,
): number => {
  const reps = set.reps ?? 0;
  if (reps <= 0) return 0;

  switch (exerciseType) {
    case 'bodyweight': {
      if (!userBodyWeight || userBodyWeight <= 0) return 0;
      return userBodyWeight * reps;
    }
    case 'assisted': {
      if (!userBodyWeight || userBodyWeight <= 0) return 0;
      const effective = Math.max(0, userBodyWeight - (set.assistanceWeight ?? 0));
      return effective > 0 ? effective * reps : 0;
    }
    case 'weight': {
      const w = set.weight ?? 0;
      return w > 0 ? w * reps : 0;
    }
    default:
      return 0;
  }
};

// ============================================================================
// MUSCLE NAME ALIASES (exercises.json -> hierarchy.json)
// ============================================================================

const MUSCLE_NAME_ALIASES: Record<string, string> = {
  'Upper Back': 'Traps',
  'Lateral Delts': 'Side Delts',
  'Biceps - Long Head': 'Biceps',
  'Biceps - Short Head': 'Biceps',
  'Brachialis': 'Biceps',
  'Triceps - Long Head': 'Triceps',
  'Triceps - Lateral Head': 'Triceps',
  'Triceps - Medial Head': 'Triceps',
  'Flexors': 'Forearms',
  'Extensors': 'Forearms',
  'Calves - Medial Head': 'Calves',
  'Calves - Lateral Head': 'Calves',
  'Soleus': 'Calves',
  'Upper Abs': 'Abs',
  'Lower Abs': 'Abs',
  'Hip Adductors': 'Adductors',
};

const resolveMuscle = (name: string): string => MUSCLE_NAME_ALIASES[name] ?? name;

// ============================================================================
// DATA MAPS
// ============================================================================

interface ExerciseMetadata {
  push_pull: 'push' | 'pull' | null;
  is_compound: boolean;
  exercise_type: ExerciseType;
  movement_pattern: string | null;
}

const EXERCISE_METADATA = exercisesData.reduce((acc, ex) => {
  acc[ex.name] = {
    push_pull: ex.push_pull as 'push' | 'pull' | null,
    is_compound: ex.is_compound ?? false,
    exercise_type: (ex.exercise_type as ExerciseType) || 'weight',
    movement_pattern: (ex as any).movement_pattern ?? null,
  } satisfies ExerciseMetadata;
  return acc;
}, {} as Record<string, ExerciseMetadata>);

const EXERCISE_MUSCLES = exercisesData.reduce((acc, ex) => {
  if (ex.muscles) {
    // Resolve aliases: merge weights for muscles that map to the same canonical name
    const resolved: Record<string, number> = {};
    Object.entries(ex.muscles as Record<string, number>).forEach(([m, w]) => {
      const canonical = resolveMuscle(m);
      resolved[canonical] = (resolved[canonical] || 0) + w;
    });
    acc[ex.name] = resolved;
  }
  return acc;
}, {} as Record<string, Record<string, number>>);

const buildLeafToL2 = (): Record<string, string> => {
  const leafToL2: Record<string, string> = {};
  const hierarchy = hierarchyData.muscle_hierarchy as Record<string, any>;

  Object.entries(hierarchy).forEach(([_l1, l1Data]) => {
    if (l1Data?.muscles) {
      Object.entries(l1Data.muscles).forEach(([l2, l2Data]: [string, any]) => {
        leafToL2[l2] = l2;
        if (l2Data?.muscles) {
          Object.entries(l2Data.muscles).forEach(([l3, l3Data]: [string, any]) => {
            leafToL2[l3] = l2;
            if (l3Data?.muscles) {
              Object.keys(l3Data.muscles).forEach((l4) => {
                leafToL2[l4] = l2;
              });
            }
          });
        }
      });
    }
  });

  return leafToL2;
};

const LEAF_TO_L2 = buildLeafToL2();

// ============================================================================
// HOOK
// ============================================================================

export const useInsightsData = () => {
  const forceEmptyAnalytics = useDevToolsStore((state) => state.forceEmptyAnalytics);
  const rawWorkouts = useWorkoutSessionsStore((state) => state.workouts);
  const userBodyWeight = useUserProfileStore((state) => state.profile?.weightLbs);

  return useMemo(() => {
    const workouts = __DEV__ && forceEmptyAnalytics ? [] : rawWorkouts;

    const emptyGrouped: Record<InsightType, Insight[]> = {
      plateau: [],
      balance: [],
      focus: [],
    };
    const emptyReturn = (reason: EmptyReason) => ({
      insights: [] as Insight[],
      groupedInsights: emptyGrouped,
      orderedTypes: [] as InsightType[],
      hasData: reason !== 'no-workouts',
      emptyReason: reason,
    });

    if (!workouts.length) return emptyReturn('no-workouts');
    if (workouts.length < MIN_WORKOUTS_FOR_INSIGHTS) return emptyReturn('insufficient-data');

    const now = new Date();
    const nowMs = now.getTime();

    // Time cutoffs
    const weekAgoCutoff = new Date(nowMs - BALANCE_WINDOW_DAYS * DAY_MS);
    const twoWeekAgoCutoff = new Date(nowMs - FOCUS_VOLUME_WINDOW_DAYS * DAY_MS);
    const fourWeekAgoCutoff = new Date(nowMs - PLATEAU_WEEKS * WEEK_MS);

    const weekWorkouts = workouts.filter((w) => new Date(w.date) >= weekAgoCutoff);
    const twoWeekWorkouts = workouts.filter((w) => new Date(w.date) >= twoWeekAgoCutoff);
    const fourWeekWorkouts = workouts.filter((w) => new Date(w.date) >= fourWeekAgoCutoff);

    const insights: Insight[] = [];

    // ========================================================================
    // 1. BALANCE ALERTS (volume-based, 7-day, goal-aware)
    //    Uses the SAME calculateRatioScore + getIdealRatios as BalanceScoreCard
    //    so alerts are coherent with the displayed balance score.
    // ========================================================================
    const primaryGoal = useUserProfileStore.getState().profile?.primaryGoal;
    const ideals = getIdealRatios(primaryGoal);

    const bal = { pushVol: 0, pullVol: 0, upperVol: 0, lowerVol: 0, compoundVol: 0, isolatedVol: 0 };
    const balSets = { push: 0, pull: 0, upper: 0, lower: 0, compound: 0, isolated: 0 };
    const weekMovementPatterns = new Set<string>();

    weekWorkouts.forEach((workout) => {
      workout.exercises.forEach((exercise: any) => {
        const meta = EXERCISE_METADATA[exercise.name];
        if (!meta) return;
        const et = meta.exercise_type || 'weight';
        if (et === 'cardio' || et === 'duration') return;

        const muscleWeights = EXERCISE_MUSCLES[exercise.name];

        exercise.sets.forEach((set: any) => {
          if (!isCompletedSet(set)) return;
          const vol = computeSetVolume(set, et, userBodyWeight);

          // Push / Pull
          if (meta.push_pull === 'push') { balSets.push += 1; bal.pushVol += vol; }
          if (meta.push_pull === 'pull') { balSets.pull += 1; bal.pullVol += vol; }

          // Compound / Isolated
          if (meta.is_compound) { balSets.compound += 1; bal.compoundVol += vol; }
          else { balSets.isolated += 1; bal.isolatedVol += vol; }

          // Upper / Lower (muscle-weight-based, matching balance score exactly)
          if (muscleWeights) {
            let uW = 0;
            let lW = 0;
            Object.entries(muscleWeights).forEach(([m, w]) => {
              const l2 = LEAF_TO_L2[m];
              if (!l2) return;
              if (UPPER_BODY_GROUPS.has(l2)) uW += w;
              if (LOWER_BODY_GROUPS.has(l2)) lW += w;
            });
            const t = uW + lW;
            if (t > 0) {
              balSets.upper += uW / t;
              balSets.lower += lW / t;
              if (vol > 0) {
                bal.upperVol += vol * (uW / t);
                bal.lowerVol += vol * (lW / t);
              }
            }
          }

          // Movement pattern tracking
          if (meta.movement_pattern) weekMovementPatterns.add(meta.movement_pattern);
        });
      });
    });

    // Helper: generate a balance insight using the shared scoring function
    const addBalanceInsight = (
      label: string,
      leftVol: number,
      rightVol: number,
      leftSets: number,
      rightSets: number,
      idealLeftPct: number,
      weakLeftDesc: string,
      weakLeftEx: string,
      weakRightDesc: string,
      weakRightEx: string,
    ) => {
      const totalVol = leftVol + rightVol;
      const totalSets = leftSets + rightSets;
      if (totalSets < BALANCE_MIN_TOTAL) return;

      // Use volume-based score (primary) — same as balance score card
      const volScore = calculateRatioScore(leftVol, rightVol, idealLeftPct);
      // Use set-based score as secondary confirmation
      const setScore = calculateRatioScore(leftSets, rightSets, idealLeftPct);
      // Average both for the alert decision
      const avgScore = totalVol > 0 ? (volScore * 0.7 + setScore * 0.3) : setScore;

      if (avgScore >= BALANCE_SCORE_ALERT_THRESHOLD) return;

      const leftPct = totalVol > 0
        ? Math.round((leftVol / totalVol) * 100)
        : Math.round((leftSets / totalSets) * 100);
      const rightPct = 100 - leftPct;
      const [aLabel, bLabel] = label.split('/').map((s) => s.trim());
      const weakIsRight = leftPct >= idealLeftPct;
      const weakLabel = weakIsRight ? bLabel.toLowerCase() : aLabel.toLowerCase();
      const weakDesc = weakIsRight ? weakRightDesc : weakLeftDesc;
      const weakEx = weakIsRight ? weakRightEx : weakLeftEx;

      insights.push({
        type: 'balance',
        priority: 'suggestion',
        title: 'Balance Alert',
        message: `Your ${label} split is ${leftPct}/${rightPct} this week (ideal ~${idealLeftPct}/${100 - idealLeftPct}). Try adding ${weakDesc} like ${weakEx} to strengthen your ${weakLabel} training.`,
        icon: '⚖️',
        borderColor: INSIGHT_COLORS.warning,
      });
    };

    addBalanceInsight(
      'Push / Pull', bal.pushVol, bal.pullVol, balSets.push, balSets.pull, ideals.pushPull,
      'push exercises', 'Bench Press or Overhead Press',
      'pull exercises', 'Barbell Rows or Lat Pulldowns',
    );
    addBalanceInsight(
      'Upper / Lower', bal.upperVol, bal.lowerVol, balSets.upper, balSets.lower, ideals.upperLower,
      'upper body exercises', 'Bench Press or Barbell Rows',
      'lower body exercises', 'Squats or Romanian Deadlifts',
    );
    addBalanceInsight(
      'Compound / Isolated', bal.compoundVol, bal.isolatedVol, balSets.compound, balSets.isolated, ideals.compoundIsolated,
      'compound movements', 'Squats or Bench Press',
      'isolation exercises', 'Curls or Lateral Raises',
    );

    // Movement pattern diversity insight
    const missingPatterns = MOVEMENT_PATTERN_TARGETS.filter((p) => !weekMovementPatterns.has(p));
    if (weekWorkouts.length >= 2 && missingPatterns.length >= 3) {
      const missing = missingPatterns.slice(0, 3).join(', ');
      insights.push({
        type: 'balance',
        priority: 'suggestion',
        title: 'Movement Diversity',
        message: `You're missing ${missingPatterns.length} key movement patterns this week: ${missing}. Varying patterns reduces injury risk and improves overall strength.`,
        icon: '🔄',
        borderColor: INSIGHT_COLORS.info,
      });
    }

    // ========================================================================
    // 2. PLATEAU DETECTION (rep-range grouped E1RM + volume decline, 4 weeks)
    // ========================================================================

    // --- 2a: E1RM stall per exercise per rep range ---
    const exerciseRangeE1RM: Record<string, Record<RepRange, number[]>> = {};
    const exerciseRangeSessions: Record<string, Record<RepRange, number>> = {};
    const exerciseWeeklyVolume: Record<string, number[]> = {};

    fourWeekWorkouts.forEach((workout) => {
      const wDate = new Date(workout.date);
      const weekIdx = Math.floor((nowMs - wDate.getTime()) / WEEK_MS);
      if (weekIdx >= PLATEAU_WEEKS) return;

      workout.exercises.forEach((exercise: any) => {
        const meta = EXERCISE_METADATA[exercise.name];
        if (!meta) return;
        if (meta.exercise_type !== 'weight') return;

        if (!exerciseRangeE1RM[exercise.name]) {
          exerciseRangeE1RM[exercise.name] = {
            strength: Array(PLATEAU_WEEKS).fill(0),
            hypertrophy: Array(PLATEAU_WEEKS).fill(0),
            endurance: Array(PLATEAU_WEEKS).fill(0),
          };
          exerciseRangeSessions[exercise.name] = { strength: 0, hypertrophy: 0, endurance: 0 };
          exerciseWeeklyVolume[exercise.name] = Array(PLATEAU_WEEKS).fill(0);
        }

        let sessionHasData = false;
        const rangesUsed = new Set<RepRange>();

        exercise.sets.forEach((set: any) => {
          if (!isCompletedSet(set)) return;
          const w = set.weight ?? 0;
          const r = set.reps ?? 0;
          if (w <= 0 || r <= 0) return;

          sessionHasData = true;
          const range = getRepRange(r);
          rangesUsed.add(range);
          const e1rm = estimateE1RM(w, r);

          exerciseRangeE1RM[exercise.name][range][weekIdx] = Math.max(
            exerciseRangeE1RM[exercise.name][range][weekIdx],
            e1rm,
          );
          exerciseWeeklyVolume[exercise.name][weekIdx] += w * r;
        });

        if (sessionHasData) {
          rangesUsed.forEach((range) => {
            exerciseRangeSessions[exercise.name][range] += 1;
          });
        }
      });
    });

    type PlateauCandidate = { message: string; severity: number; isDecline: boolean };
    const plateauCandidates: PlateauCandidate[] = [];

    // E1RM stall detection (per rep range)
    Object.entries(exerciseRangeE1RM).forEach(([exName, ranges]) => {
      (['strength', 'hypertrophy', 'endurance'] as RepRange[]).forEach((range) => {
        const weekBest = ranges[range];
        const sessions = exerciseRangeSessions[exName]?.[range] ?? 0;
        if (sessions < PLATEAU_MIN_SESSIONS) return;

        const weeksWithData = weekBest.filter((v) => v > 0).length;
        if (weeksWithData < PLATEAU_MIN_WEEKS_WITH_DATA) return;

        const newest = weekBest[0];
        const oldest = [...weekBest].reverse().find((v) => v > 0) ?? 0;
        if (newest <= 0 || oldest <= 0) return;

        const improvement = newest - oldest;
        const minMeaningful = Math.max(PLATEAU_MIN_E1RM_IMPROVEMENT_ABS, oldest * PLATEAU_MIN_E1RM_IMPROVEMENT_REL);

        if (improvement < minMeaningful) {
          const improveLbs = fmtLbs(Math.max(0, improvement));
          plateauCandidates.push({
            severity: minMeaningful - improvement,
            isDecline: improvement < 0,
            message: improvement <= 0
              ? `Your ${exName} ${REP_RANGE_LABELS[range]} progress has been flat in the last 4 weeks.`
              : `Your ${exName} ${REP_RANGE_LABELS[range]} top set only improved ${improveLbs} lbs in 4 weeks.`,
          });
        }
      });
    });

    // Volume decline detection (per exercise, all rep ranges combined)
    Object.entries(exerciseWeeklyVolume).forEach(([exName, weekVols]) => {
      const recentWeeks = weekVols.slice(0, 2).filter((v) => v > 0);
      const baselineWeeks = weekVols.slice(2, 4).filter((v) => v > 0);
      if (recentWeeks.length === 0 || baselineWeeks.length === 0) return;

      const recentAvg = recentWeeks.reduce((a, b) => a + b, 0) / recentWeeks.length;
      const baselineAvg = baselineWeeks.reduce((a, b) => a + b, 0) / baselineWeeks.length;
      if (baselineAvg <= 0) return;

      const changePercent = (recentAvg - baselineAvg) / baselineAvg;
      if (changePercent < -PLATEAU_VOLUME_DECLINE_THRESHOLD) {
        const dropPct = Math.round(Math.abs(changePercent) * 100);
        plateauCandidates.push({
          severity: Math.abs(changePercent) * 100,
          isDecline: true,
          message: `Your ${exName} volume dropped ${dropPct}% over the last 4 weeks.`,
        });
      }
    });

    // Sort: declines first, then stalls, both by severity descending
    plateauCandidates
      .sort((a, b) => {
        if (a.isDecline !== b.isDecline) return a.isDecline ? -1 : 1;
        return b.severity - a.severity;
      })
      .slice(0, MAX_INSIGHTS_PER_CATEGORY)
      .forEach(({ message }) => {
        insights.push({
          type: 'plateau',
          priority: 'alert',
          title: 'Plateau Detected',
          message,
          icon: '📈',
          borderColor: INSIGHT_COLORS.alert,
        });
      });

    // ========================================================================
    // 3. FOCUS SUGGESTIONS
    // ========================================================================

    // --- 3a: Build per-group tracking data ---
    const weekSets: Record<string, number> = {};
    const weekVolume: Record<string, number> = {};

    const twoWeekVolume: Record<string, number> = {};
    let twoWeekTotalVolume = 0;
    let twoWeekTotalSets = 0;

    const fourWeekTrained = new Set<string>();
    const allTimeTrained = new Set<string>();

    TARGET_MUSCLE_GROUPS.forEach((g) => {
      weekSets[g] = 0;
      weekVolume[g] = 0;
      twoWeekVolume[g] = 0;
    });

    const distributeSets = (
      exercise: any,
      meta: ExerciseMetadata,
      set: any,
      targets: { sets?: Record<string, number>; volume?: Record<string, number> },
      addToTotalVolume?: { ref: { v: number } },
    ) => {
      const muscleWeights = EXERCISE_MUSCLES[exercise.name];
      if (!muscleWeights) return;

      const et = meta.exercise_type || 'weight';
      const vol = computeSetVolume(set, et, userBodyWeight);

      let wSum = 0;
      Object.entries(muscleWeights).forEach(([m, w]) => {
        if (LEAF_TO_L2[m]) wSum += w;
      });
      if (wSum <= 0) return;

      Object.entries(muscleWeights).forEach(([m, w]) => {
        const l2 = LEAF_TO_L2[m];
        if (!l2) return;
        const frac = w / wSum;
        if (targets.sets) targets.sets[l2] = (targets.sets[l2] || 0) + frac;
        if (targets.volume && vol > 0) {
          const contrib = vol * frac;
          targets.volume[l2] = (targets.volume[l2] || 0) + contrib;
          if (addToTotalVolume) addToTotalVolume.ref.v += contrib;
        }
      });
    };

    // 7-day window
    weekWorkouts.forEach((workout) => {
      workout.exercises.forEach((exercise: any) => {
        const meta = EXERCISE_METADATA[exercise.name];
        if (!meta) return;
        const et = meta.exercise_type || 'weight';
        if (et === 'cardio' || et === 'duration') return;

        exercise.sets.forEach((set: any) => {
          if (!isCompletedSet(set)) return;
          distributeSets(exercise, meta, set, { sets: weekSets, volume: weekVolume });
        });
      });
    });

    // 14-day window
    const twoWeekVolRef = { v: 0 };
    twoWeekWorkouts.forEach((workout) => {
      workout.exercises.forEach((exercise: any) => {
        const meta = EXERCISE_METADATA[exercise.name];
        if (!meta) return;
        const et = meta.exercise_type || 'weight';
        if (et === 'cardio' || et === 'duration') return;

        exercise.sets.forEach((set: any) => {
          if (!isCompletedSet(set)) return;
          twoWeekTotalSets += 1;
          distributeSets(exercise, meta, set, { volume: twoWeekVolume }, { ref: twoWeekVolRef });
        });
      });
    });
    twoWeekTotalVolume = twoWeekVolRef.v;

    // 4-week trained check
    fourWeekWorkouts.forEach((workout) => {
      workout.exercises.forEach((exercise: any) => {
        const meta = EXERCISE_METADATA[exercise.name];
        if (!meta) return;
        const et = meta.exercise_type || 'weight';
        if (et === 'cardio' || et === 'duration') return;
        const muscleWeights = EXERCISE_MUSCLES[exercise.name];
        if (!muscleWeights) return;

        const hasCompleted = exercise.sets.some(isCompletedSet);
        if (hasCompleted) {
          Object.keys(muscleWeights).forEach((m) => {
            const l2 = LEAF_TO_L2[m];
            if (l2) fourWeekTrained.add(l2);
          });
        }
      });
    });

    // All-time trained check
    workouts.forEach((workout) => {
      workout.exercises.forEach((exercise: any) => {
        const meta = EXERCISE_METADATA[exercise.name];
        if (!meta) return;
        const muscleWeights = EXERCISE_MUSCLES[exercise.name];
        if (!muscleWeights) return;

        const hasCompleted = exercise.sets.some(isCompletedSet);
        if (hasCompleted) {
          Object.keys(muscleWeights).forEach((m) => {
            const l2 = LEAF_TO_L2[m];
            if (l2) allTimeTrained.add(l2);
          });
        }
      });
    });

    // --- 3b: Generate focus insights ---
    type FocusCandidate = { insight: Insight; severity: number };
    const focusCandidates: FocusCandidate[] = [];

    const currentWeekNum = Math.floor(nowMs / WEEK_MS);
    const isReminderWeek = currentWeekNum % NEVER_TRAINED_REMINDER_WEEKS === 0;

    TARGET_MUSCLE_GROUPS.forEach((group) => {
      const setsThisWeek = weekSets[group] ?? 0;
      const volumeThisWeek = weekVolume[group] ?? 0;
      const trainedIn4Weeks = fourWeekTrained.has(group);
      const everTrained = allTimeTrained.has(group);
      const suggestions = FOCUS_SUGGESTIONS[group] || [];
      const weightedAlts = WEIGHTED_ALTERNATIVES[group] || [];

      // 1) Skipped entirely this week (0 sets, but user has trained this before)
      if (setsThisWeek === 0 && trainedIn4Weeks) {
        const exSugg = pick(suggestions, 2);
        focusCandidates.push({
          severity: 100,
          insight: {
            type: 'focus',
            priority: 'suggestion',
            title: 'Focus Suggestion',
            message: `${group} hasn't been trained in the last ${FOCUS_SKIPPED_WINDOW_DAYS} days. Try adding ${exSugg}.`,
            icon: '🎯',
            borderColor: INSIGHT_COLORS.info,
            suggestions,
          },
        });
        return;
      }

      // 2) Trained with bodyweight only (sets > 0 but 0 weighted volume)
      if (setsThisWeek > 0 && volumeThisWeek === 0 && trainedIn4Weeks) {
        const alts = pick(weightedAlts, 2);
        if (alts) {
          focusCandidates.push({
            severity: 30,
            insight: {
              type: 'focus',
              priority: 'suggestion',
              title: 'Focus Suggestion',
              message: `${group} was only trained with bodyweight this week. Try adding weighted exercises like ${alts}.`,
              icon: '🎯',
              borderColor: INSIGHT_COLORS.info,
              suggestions: weightedAlts,
            },
          });
        }
        return;
      }

      // 3) Volume share too low (14-day window)
      if (twoWeekTotalSets >= FOCUS_MIN_TOTAL_SETS && twoWeekTotalVolume > 0) {
        const actualShare = safeDivide(twoWeekVolume[group] ?? 0, twoWeekTotalVolume);
        const expectedShare = EXPECTED_VOLUME_SHARE[group] ?? 0;
        const threshold = expectedShare * FOCUS_SHARE_ALERT_FACTOR;

        if (actualShare < threshold && actualShare > 0 && trainedIn4Weeks) {
          const actualPct = Math.round(actualShare * 100);
          const exSugg = pick(suggestions, 1);
          focusCandidates.push({
            severity: 50 * (1 - actualShare / expectedShare),
            insight: {
              type: 'focus',
              priority: 'suggestion',
              title: 'Focus Suggestion',
              message: `${group} volume is only ${actualPct}% of your total in the last 2 weeks. Try adding ${exSugg}.`,
              icon: '🎯',
              borderColor: INSIGHT_COLORS.info,
              suggestions,
            },
          });
          return;
        }
      }

      // 4) Never trained – periodic reminder
      if (!everTrained && isReminderWeek) {
        const exSugg = pick(suggestions, 2);
        focusCandidates.push({
          severity: 5,
          insight: {
            type: 'focus',
            priority: 'suggestion',
            title: 'Focus Suggestion',
            message: `You haven't trained ${group} yet. Try adding ${exSugg} for more balanced development.`,
            icon: '🎯',
            borderColor: INSIGHT_COLORS.info,
            suggestions,
          },
        });
      }
    });

    focusCandidates
      .sort((a, b) => b.severity - a.severity)
      .slice(0, MAX_INSIGHTS_PER_CATEGORY)
      .forEach(({ insight }) => insights.push(insight));

    // ========================================================================
    // GROUP BY TYPE AND SORT
    // ========================================================================
    const groupedInsights: Record<InsightType, Insight[]> = {
      plateau: [],
      balance: [],
      focus: [],
    };

    insights.forEach((ins) => groupedInsights[ins.type].push(ins));

    const typeOrder: InsightType[] = ['plateau', 'balance', 'focus'];
    const orderedTypes = typeOrder.filter((t) => groupedInsights[t].length > 0);

    return {
      insights,
      groupedInsights,
      orderedTypes,
      hasData: true,
      emptyReason: orderedTypes.length === 0 ? ('all-good' as EmptyReason) : undefined,
    };
  }, [rawWorkouts, forceEmptyAnalytics, userBodyWeight]);
};
