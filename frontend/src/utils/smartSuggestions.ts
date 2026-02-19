/**
 * smartSuggestions
 * Core engine for intelligent weight/rep suggestions based on training patterns.
 * Analyzes historical workout data to detect progressive overload, rep cycling,
 * deload patterns, and provides intra-session adaptation.
 */

import type { SetLog, Workout } from '@/types/workout';
import type { EquipmentType } from '@/types/exercise';
import {
  type ExerciseDataPoint,
  type PatternType,
  type PatternAnalysis,
  type SmartSuggestionResult,
  type WeightIncrement,
  EQUIPMENT_INCREMENTS,
  DEFAULT_INCREMENT,
  SMART_CONFIG,
} from '@/types/smartSuggestions';

// ---------------------------------------------------------------------------
// Utility: Equipment-aware weight rounding
// ---------------------------------------------------------------------------

/**
 * Get the weight increment config for a given equipment list.
 * Uses the first recognized equipment type.
 */
export const getWeightIncrement = (equipment: EquipmentType[]): WeightIncrement => {
  for (const eq of equipment) {
    const config = EQUIPMENT_INCREMENTS[eq];
    if (config) {
      return config;
    }
  }
  return DEFAULT_INCREMENT;
};

/**
 * Round a weight value to the nearest achievable increment.
 * Always rounds DOWN for safety unless the pattern strongly supports rounding up.
 */
export const roundToIncrement = (
  weight: number,
  equipment: EquipmentType[],
  allowRoundUp: boolean = false,
): number => {
  const config = getWeightIncrement(equipment);
  const { increment } = config;

  if (increment <= 0) {
    return Math.max(0, weight);
  }

  if (allowRoundUp) {
    return Math.max(0, Math.round(weight / increment) * increment);
  }

  // Default: round DOWN for safety
  return Math.max(0, Math.floor(weight / increment) * increment);
};

// ---------------------------------------------------------------------------
// Utility: Linear regression
// ---------------------------------------------------------------------------

interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
}

const linearRegression = (points: { x: number; y: number }[]): RegressionResult => {
  const n = points.length;
  if (n < 2) {
    return { slope: 0, intercept: points[0]?.y ?? 0, rSquared: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
    sumYY += p.y * p.y;
  }

  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-10) {
    return { slope: 0, intercept: sumY / n, rSquared: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² calculation
  const meanY = sumY / n;
  let ssRes = 0;
  let ssTot = 0;
  for (const p of points) {
    const predicted = slope * p.x + intercept;
    ssRes += (p.y - predicted) ** 2;
    ssTot += (p.y - meanY) ** 2;
  }

  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, rSquared };
};

// ---------------------------------------------------------------------------
// Utility: Standard deviation
// ---------------------------------------------------------------------------

const stddev = (values: number[]): number => {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

// ---------------------------------------------------------------------------
// Data extraction
// ---------------------------------------------------------------------------

/**
 * Extract historical data points for a specific exercise from workout history.
 * Returns data points sorted chronologically (oldest first).
 */
export const extractDataPoints = (
  exerciseName: string,
  workouts: Workout[],
  currentWorkoutId?: string,
): ExerciseDataPoint[] => {
  const cutoff = Date.now() - SMART_CONFIG.LOOKBACK_MS;

  const points: ExerciseDataPoint[] = [];

  for (const workout of workouts) {
    if (currentWorkoutId && workout.id === currentWorkoutId) continue;

    const workoutDate = new Date(workout.date).getTime();
    if (workoutDate < cutoff) continue;

    const exercise = workout.exercises.find((ex) => ex.name === exerciseName);
    if (!exercise) continue;

    const completedSets = exercise.sets.filter((s) => s.completed);
    if (completedSets.length === 0) continue;

    // Only consider sets with weight data for weight-based analysis
    const weightSets = completedSets.filter((s) => s.weight !== undefined && s.weight > 0);
    if (weightSets.length === 0) continue;

    const weights = weightSets.map((s) => s.weight!);
    const reps = weightSets.map((s) => s.reps ?? 0);

    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const avgReps = reps.reduce((a, b) => a + b, 0) / reps.length;
    const topSetWeight = Math.max(...weights);
    const topSetIdx = weights.indexOf(topSetWeight);
    const topSetReps = reps[topSetIdx] ?? 0;
    const totalVolume = weightSets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);

    points.push({
      date: workoutDate,
      avgWeight,
      avgReps,
      topSetWeight,
      topSetReps,
      totalSets: completedSets.length,
      totalVolume,
    });
  }

  // Sort chronologically (oldest first) for regression
  points.sort((a, b) => a.date - b.date);

  // Limit to most recent N sessions
  if (points.length > SMART_CONFIG.MAX_SESSIONS) {
    return points.slice(points.length - SMART_CONFIG.MAX_SESSIONS);
  }

  return points;
};

// ---------------------------------------------------------------------------
// Pattern detection
// ---------------------------------------------------------------------------

/**
 * Detect if the exercise shows alternating rep ranges (e.g., heavy/light weeks).
 * Requires at least 4 sessions with clear alternating pattern.
 */
const detectRepCycling = (points: ExerciseDataPoint[]): boolean => {
  if (points.length < SMART_CONFIG.MIN_SESSIONS_REP_CYCLING) return false;

  const reps = points.map((p) => p.avgReps);
  const sd = stddev(reps);
  if (sd < SMART_CONFIG.REP_CYCLING_STDDEV) return false;

  // Check for alternating pattern: sign of (reps[i] - median) should alternate
  const median = [...reps].sort((a, b) => a - b)[Math.floor(reps.length / 2)];
  let alternations = 0;
  for (let i = 1; i < reps.length; i++) {
    const prevAbove = reps[i - 1] > median;
    const currAbove = reps[i] > median;
    if (prevAbove !== currAbove) {
      alternations++;
    }
  }

  // At least 60% of transitions should alternate for a clear pattern
  const alternationRate = alternations / (reps.length - 1);
  return alternationRate >= 0.6;
};

/**
 * Detect deload patterns in the training history.
 * Returns true if the user has completed deload cycles.
 */
const detectDeloadHistory = (points: ExerciseDataPoint[]): boolean => {
  if (points.length < 6) return false;

  let deloadCount = 0;
  for (let i = 3; i < points.length; i++) {
    const recentAvgVolume =
      (points[i - 1].totalVolume + points[i - 2].totalVolume + points[i - 3].totalVolume) / 3;
    const drop = 1 - points[i].totalVolume / recentAvgVolume;
    if (drop > SMART_CONFIG.DELOAD_VOLUME_DROP) {
      deloadCount++;
    }
  }

  return deloadCount >= 1;
};

/**
 * Check if the most recent session was a deload.
 */
const isLastSessionDeload = (points: ExerciseDataPoint[]): boolean => {
  if (points.length < 4) return false;

  const last = points[points.length - 1];
  const prevAvg =
    (points[points.length - 2].totalVolume +
      points[points.length - 3].totalVolume +
      points[points.length - 4].totalVolume) /
    3;

  return 1 - last.totalVolume / prevAvg > SMART_CONFIG.DELOAD_VOLUME_DROP;
};

/**
 * Analyze training pattern for an exercise.
 */
export const analyzePattern = (
  points: ExerciseDataPoint[],
  isCompound: boolean,
): PatternAnalysis => {
  if (points.length < SMART_CONFIG.MIN_SESSIONS) {
    return { pattern: 'fallback', confidence: 0, dataPoints: points };
  }

  // Check for staleness (gap > 21 days since last session)
  const lastSessionDate = points[points.length - 1].date;
  const daysSinceLast = (Date.now() - lastSessionDate) / (1000 * 60 * 60 * 24);
  if (daysSinceLast > SMART_CONFIG.STALE_GAP_DAYS) {
    return { pattern: 'fallback', confidence: 0, dataPoints: points };
  }

  // 1. Check for progressive overload (highest priority)
  const rSquaredThreshold = isCompound
    ? SMART_CONFIG.R_SQUARED_COMPOUND
    : SMART_CONFIG.R_SQUARED_ISOLATION;

  const regressionPoints = points.map((p, i) => ({ x: i, y: p.topSetWeight }));
  const regression = linearRegression(regressionPoints);
  const repStddev = stddev(points.map((p) => p.avgReps));

  if (regression.slope > 0 && regression.rSquared >= rSquaredThreshold && repStddev < 2) {
    return {
      pattern: 'progressive_overload',
      confidence: regression.rSquared,
      dataPoints: points,
      slope: regression.slope,
      rSquared: regression.rSquared,
    };
  }

  // 2. Check for rep range cycling
  if (detectRepCycling(points)) {
    return {
      pattern: 'rep_cycling',
      confidence: 0.7,
      dataPoints: points,
    };
  }

  // 3. Check for deload patterns
  if (detectDeloadHistory(points)) {
    // Only auto-suggest deload if ≥12 weeks of history
    const historySpanWeeks =
      (points[points.length - 1].date - points[0].date) / (7 * 24 * 60 * 60 * 1000);

    if (historySpanWeeks >= SMART_CONFIG.MIN_WEEKS_DELOAD_AUTO) {
      return {
        pattern: 'deload',
        confidence: 0.6,
        dataPoints: points,
      };
    }
  }

  // 4. Default: stable/maintenance
  return {
    pattern: 'stable',
    confidence: 0.5,
    dataPoints: points,
  };
};

// ---------------------------------------------------------------------------
// Suggestion generation
// ---------------------------------------------------------------------------

/**
 * Generate suggested weight and reps based on detected pattern.
 */
const generateSuggestion = (
  analysis: PatternAnalysis,
  isCompound: boolean,
  equipment: EquipmentType[],
  lastSets: SetLog[],
): { weight: number; reps: number } => {
  const points = analysis.dataPoints;
  const lastPoint = points[points.length - 1];

  switch (analysis.pattern) {
    case 'progressive_overload': {
      const slope = analysis.slope ?? 0;
      const projectedWeight = lastPoint.topSetWeight + slope;
      const maxIncrease = isCompound
        ? SMART_CONFIG.MAX_INCREASE_COMPOUND
        : SMART_CONFIG.MAX_INCREASE_ISOLATION;
      const maxWeight = lastPoint.topSetWeight * (1 + maxIncrease);
      const clampedWeight = Math.min(projectedWeight, maxWeight);
      // For progressive overload with strong trend, allow rounding up
      const allowRoundUp = (analysis.rSquared ?? 0) >= 0.8;
      const roundedWeight = roundToIncrement(clampedWeight, equipment, allowRoundUp);

      return {
        weight: roundedWeight,
        reps: Math.round(lastPoint.avgReps),
      };
    }

    case 'rep_cycling': {
      // Determine cycle position: even index = same as first session pattern
      const sessionIndex = points.length; // next session
      const isEvenPosition = sessionIndex % 2 === 0;

      // Separate points into two groups based on rep range
      const median = [...points.map((p) => p.avgReps)]
        .sort((a, b) => a - b)[Math.floor(points.length / 2)];

      const highRepPoints = points.filter((p) => p.avgReps >= median);
      const lowRepPoints = points.filter((p) => p.avgReps < median);

      // Determine which group the first session belongs to
      const firstIsHigh = points[0].avgReps >= median;
      const expectedHigh = firstIsHigh ? isEvenPosition : !isEvenPosition;

      const targetGroup = expectedHigh ? highRepPoints : lowRepPoints;
      if (targetGroup.length === 0) {
        return { weight: lastPoint.topSetWeight, reps: Math.round(lastPoint.avgReps) };
      }

      // Use most recent session from the target group
      const targetPoint = targetGroup[targetGroup.length - 1];

      // Apply slight progression within the cycle
      const progressedWeight = roundToIncrement(
        targetPoint.topSetWeight * 1.01,
        equipment,
        false,
      );

      return {
        weight: progressedWeight,
        reps: Math.round(targetPoint.avgReps),
      };
    }

    case 'deload': {
      // If last session was a deload, suggest returning to pre-deload levels
      if (isLastSessionDeload(points)) {
        // Find the average of the 3 sessions before the deload
        const preDeloadPoints = points.slice(-4, -1);
        const avgWeight =
          preDeloadPoints.reduce((sum, p) => sum + p.topSetWeight, 0) / preDeloadPoints.length;
        const avgReps =
          preDeloadPoints.reduce((sum, p) => sum + p.avgReps, 0) / preDeloadPoints.length;

        return {
          weight: roundToIncrement(avgWeight, equipment, false),
          reps: Math.round(avgReps),
        };
      }

      // Otherwise use stable logic (don't auto-suggest deload unless criteria met)
      return generateStableSuggestion(points, equipment);
    }

    case 'stable':
      return generateStableSuggestion(points, equipment);

    case 'fallback':
    default:
      // Use most recent session values directly
      if (lastSets.length > 0) {
        return {
          weight: lastSets[0].weight ?? 0,
          reps: lastSets[0].reps ?? 8,
        };
      }
      return { weight: 0, reps: 8 };
  }
};

/**
 * Weighted average of last 3 sessions for stable/maintenance pattern.
 */
const generateStableSuggestion = (
  points: ExerciseDataPoint[],
  equipment: EquipmentType[],
): { weight: number; reps: number } => {
  const recent = points.slice(-3);
  const weights = [0.5, 0.3, 0.2];

  // If fewer than 3 points, adjust weights
  let totalWeight = 0;
  let weightedSum = 0;
  let weightedReps = 0;

  for (let i = 0; i < recent.length; i++) {
    const w = weights[i] ?? weights[weights.length - 1];
    totalWeight += w;
    weightedSum += recent[recent.length - 1 - i].topSetWeight * w;
    weightedReps += recent[recent.length - 1 - i].avgReps * w;
  }

  return {
    weight: roundToIncrement(weightedSum / totalWeight, equipment, false),
    reps: Math.round(weightedReps / totalWeight),
  };
};

// ---------------------------------------------------------------------------
// Main entry point: create smart suggestion sets
// ---------------------------------------------------------------------------

/**
 * Generate smart set suggestions for an exercise.
 *
 * @param exerciseName - Exercise name
 * @param workouts - All historical workouts
 * @param isCompound - Whether the exercise is a compound movement
 * @param equipment - Equipment types for the exercise
 * @param historySets - The most recent session's sets (fallback data)
 * @param requestedSetCount - Number of sets to generate
 * @param currentWorkoutId - Optional ID to exclude from history
 * @returns SmartSuggestionResult with suggested sets and pattern info
 */
export const createSmartSuggestionSets = (
  exerciseName: string,
  workouts: Workout[],
  isCompound: boolean,
  equipment: EquipmentType[],
  historySets: SetLog[] | null,
  requestedSetCount: number,
  currentWorkoutId?: string,
): SmartSuggestionResult => {
  const dataPoints = extractDataPoints(exerciseName, workouts, currentWorkoutId);
  const analysis = analyzePattern(dataPoints, isCompound);

  // Fallback: not enough data or stale — use most recent history directly
  if (analysis.pattern === 'fallback') {
    return {
      sets: [],
      historySetCount: 0,
      pattern: 'fallback',
      confidence: 0,
    };
  }

  const suggestion = generateSuggestion(
    analysis,
    isCompound,
    equipment,
    historySets ?? [],
  );

  // Clamp reps
  const clampedReps = Math.max(
    SMART_CONFIG.MIN_REPS,
    Math.min(SMART_CONFIG.MAX_REPS, suggestion.reps),
  );

  // Build sets
  const sets: SetLog[] = [];
  for (let i = 0; i < requestedSetCount; i++) {
    sets.push({
      weight: suggestion.weight,
      reps: clampedReps,
      completed: false,
    });
  }

  return {
    sets,
    historySetCount: requestedSetCount,
    pattern: analysis.pattern,
    confidence: analysis.confidence,
  };
};

// ---------------------------------------------------------------------------
// Intra-session adaptation
// ---------------------------------------------------------------------------

/**
 * Calculate adapted weight/reps for the next set based on performance
 * on the just-completed set vs. the original suggestion.
 *
 * @param originalSuggestedWeight - The weight that was originally suggested
 * @param originalSuggestedReps - The reps that were originally suggested
 * @param actualWeight - The weight the user actually used
 * @param actualReps - The reps the user actually completed
 * @param equipment - Equipment types for rounding
 * @param isCompound - Whether the exercise is compound
 * @returns Adapted weight and reps for the next set
 */
export const adaptNextSet = (
  originalSuggestedWeight: number,
  originalSuggestedReps: number,
  actualWeight: number,
  actualReps: number,
  equipment: EquipmentType[],
  isCompound: boolean,
): { weight: number; reps: number } => {
  const targetReps = originalSuggestedReps;

  // If user changed the weight from suggestion, use their weight as baseline
  // but still compare reps against original target
  const baseWeight = actualWeight;

  if (actualReps >= targetReps + SMART_CONFIG.EASY_REPS_ABOVE) {
    // Easy — suggest slight weight increase
    const bumpedWeight = baseWeight * (1 + SMART_CONFIG.EASY_BUMP_PERCENT);
    const maxIncrease = isCompound
      ? SMART_CONFIG.MAX_INCREASE_COMPOUND
      : SMART_CONFIG.MAX_INCREASE_ISOLATION;
    const maxWeight = baseWeight * (1 + maxIncrease);
    const clampedWeight = Math.min(bumpedWeight, maxWeight);

    return {
      weight: roundToIncrement(clampedWeight, equipment, false),
      reps: targetReps,
    };
  }

  if (actualReps >= targetReps) {
    // On target — maintain
    return {
      weight: baseWeight,
      reps: targetReps,
    };
  }

  if (actualReps >= targetReps - SMART_CONFIG.MISS_REPS_BELOW) {
    // Slightly under — maintain weight, accept lower reps
    return {
      weight: baseWeight,
      reps: actualReps,
    };
  }

  // Significant miss — reduce weight
  const reducedWeight = baseWeight * (1 - SMART_CONFIG.MISS_REDUCE_PERCENT);
  return {
    weight: roundToIncrement(reducedWeight, equipment, false),
    reps: targetReps,
  };
};
