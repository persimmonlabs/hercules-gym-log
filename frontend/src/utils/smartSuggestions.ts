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
  type SetPositionData,
  type PatternType,
  type PatternAnalysis,
  type SmartSuggestionResult,
  type PatternShiftResult,
  type ClusterData,
  type SetArrangement,
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
 * Now includes per-set-position data for pyramid/pattern detection.
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

    // Per-set-position data (preserves order)
    const setDetails: SetPositionData[] = weightSets.map((s) => ({
      weight: s.weight ?? 0,
      reps: s.reps ?? 0,
    }));

    points.push({
      date: workoutDate,
      avgWeight,
      avgReps,
      topSetWeight,
      topSetReps,
      totalSets: completedSets.length,
      totalVolume,
      setDetails,
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
 * Cluster sessions into heavy (low-rep) and light (high-rep) groups.
 * Returns null if one cluster has fewer than MIN_CLUSTER_SESSIONS entries.
 */
const clusterSessions = (points: ExerciseDataPoint[]): ClusterData | null => {
  if (points.length < SMART_CONFIG.MIN_SESSIONS_REP_CYCLING) return null;

  const reps = points.map((p) => p.avgReps);
  const sorted = [...reps].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  // Use 11 as a floor so that 10-rep sessions always land in "heavy"
  const threshold = Math.max(median, 11);

  const heavy: ExerciseDataPoint[] = [];
  const light: ExerciseDataPoint[] = [];

  for (const p of points) {
    if (p.avgReps < threshold) {
      heavy.push(p);
    } else {
      light.push(p);
    }
  }

  if (heavy.length < SMART_CONFIG.MIN_CLUSTER_SESSIONS ||
      light.length < SMART_CONFIG.MIN_CLUSTER_SESSIONS) {
    return null;
  }

  // Predict next cluster: simple alternation from last session
  const lastSession = points[points.length - 1];
  const lastWasHeavy = lastSession.avgReps < threshold;

  // Validate alternation quality over last 4 sessions
  const last4 = points.slice(-Math.min(4, points.length));
  let alternations = 0;
  for (let i = 1; i < last4.length; i++) {
    const prevHeavy = last4[i - 1].avgReps < threshold;
    const currHeavy = last4[i].avgReps < threshold;
    if (prevHeavy !== currHeavy) alternations++;
  }
  const alternationRate = last4.length > 1 ? alternations / (last4.length - 1) : 0;

  let nextIsHeavy: boolean;
  if (alternationRate >= 0.5) {
    // Good alternation — simply flip
    nextIsHeavy = !lastWasHeavy;
  } else {
    // Irregular — balance by predicting whichever cluster is less frequent recently
    const recentHeavy = last4.filter((p) => p.avgReps < threshold).length;
    nextIsHeavy = recentHeavy <= Math.floor(last4.length / 2);
  }

  return { heavy, light, nextIsHeavy };
};

/**
 * Detect if the exercise shows alternating rep ranges (e.g., heavy/light weeks).
 * Requires at least 4 sessions with clear alternating pattern and high rep stddev.
 */
const detectRepCycling = (points: ExerciseDataPoint[]): boolean => {
  if (points.length < SMART_CONFIG.MIN_SESSIONS_REP_CYCLING) return false;

  const reps = points.map((p) => p.avgReps);
  const sd = stddev(reps);
  if (sd < SMART_CONFIG.REP_CYCLING_STDDEV) return false;

  const sorted = [...reps].sort((a, b) => a - b);
  const median = sorted[Math.floor(reps.length / 2)];
  let alternations = 0;
  for (let i = 1; i < reps.length; i++) {
    const prevAbove = reps[i - 1] > median;
    const currAbove = reps[i] > median;
    if (prevAbove !== currAbove) {
      alternations++;
    }
  }

  const alternationRate = alternations / (reps.length - 1);
  return alternationRate >= 0.6;
};

/**
 * Detect the set arrangement pattern (pyramid_up, pyramid_down, straight_across)
 * by analyzing per-set weight data across recent sessions.
 */
const detectSetPattern = (points: ExerciseDataPoint[]): SetArrangement => {
  const validSessions = points.filter((p) => p.setDetails.length >= 2);
  if (validSessions.length < 2) return 'straight_across';

  // Use up to last 6 sessions for pattern detection
  const recent = validSessions.slice(-6);
  let pyramidUpCount = 0;
  let pyramidDownCount = 0;
  let straightCount = 0;

  for (const session of recent) {
    const sets = session.setDetails;
    const firstWeight = sets[0].weight;
    const lastWeight = sets[sets.length - 1].weight;

    if (firstWeight <= 0) {
      straightCount++;
      continue;
    }

    if (lastWeight > firstWeight * (1 + SMART_CONFIG.PYRAMID_UP_THRESHOLD)) {
      pyramidUpCount++;
    } else if (firstWeight > lastWeight * (1 + SMART_CONFIG.PYRAMID_DOWN_THRESHOLD)) {
      pyramidDownCount++;
    } else {
      straightCount++;
    }
  }

  const total = recent.length;
  if (pyramidUpCount / total >= 0.5) return 'pyramid_up';
  if (pyramidDownCount / total >= 0.5) return 'pyramid_down';
  return 'straight_across';
};

/**
 * Detect deload patterns in the training history.
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
 * Now includes cluster data for rep cycling and set arrangement detection.
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

  // Detect set arrangement (used by all patterns)
  const setPattern = detectSetPattern(points);

  // 1. Check for rep range cycling FIRST (it has its own progressive overload per cluster)
  const clusters = clusterSessions(points);
  if (clusters && detectRepCycling(points)) {
    return {
      pattern: 'rep_cycling',
      confidence: 0.7,
      dataPoints: points,
      clusters,
      setPattern,
    };
  }

  // 2. Check for progressive overload
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
      setPattern,
    };
  }

  // 3. Check for deload patterns
  if (detectDeloadHistory(points)) {
    const historySpanWeeks =
      (points[points.length - 1].date - points[0].date) / (7 * 24 * 60 * 60 * 1000);

    if (historySpanWeeks >= SMART_CONFIG.MIN_WEEKS_DELOAD_AUTO) {
      return {
        pattern: 'deload',
        confidence: 0.6,
        dataPoints: points,
        setPattern,
      };
    }
  }

  // 4. Default: stable/maintenance
  return {
    pattern: 'stable',
    confidence: 0.5,
    dataPoints: points,
    setPattern,
  };
};

// ---------------------------------------------------------------------------
// Suggestion generation (per-set-position)
// ---------------------------------------------------------------------------

/**
 * Generate per-set-position suggestions from a pool of sessions using linear
 * regression on each set position independently.
 *
 * @param sessionPool - Chronologically ordered sessions to derive trend from
 * @param requestedSets - How many sets to generate
 * @param equipment - For rounding
 * @param isCompound - For max-increase clamping
 * @returns Array of per-set { weight, reps } targets
 */
const generatePerSetSuggestions = (
  sessionPool: ExerciseDataPoint[],
  requestedSets: number,
  equipment: EquipmentType[],
  isCompound: boolean,
): { weight: number; reps: number }[] => {
  const maxIncrease = isCompound
    ? SMART_CONFIG.MAX_INCREASE_COMPOUND
    : SMART_CONFIG.MAX_INCREASE_ISOLATION;

  // Determine the max set count seen across the pool
  const maxHistorySets = Math.max(...sessionPool.map((s) => s.setDetails.length), 0);
  const numSetsToAnalyze = Math.max(requestedSets, maxHistorySets);
  const results: { weight: number; reps: number }[] = [];

  for (let setIdx = 0; setIdx < numSetsToAnalyze; setIdx++) {
    // Collect data for this set position across sessions
    const positionData: { x: number; weight: number; reps: number }[] = [];
    let sessionX = 0;
    for (const session of sessionPool) {
      if (session.setDetails.length > setIdx) {
        positionData.push({
          x: sessionX,
          weight: session.setDetails[setIdx].weight,
          reps: session.setDetails[setIdx].reps,
        });
      }
      sessionX++;
    }

    if (positionData.length === 0) {
      // No data at this position — clone the last computed result or use pool avg
      if (results.length > 0) {
        results.push({ ...results[results.length - 1] });
      } else {
        const lastSession = sessionPool[sessionPool.length - 1];
        results.push({
          weight: lastSession.avgWeight,
          reps: Math.round(lastSession.avgReps),
        });
      }
      continue;
    }

    const lastData = positionData[positionData.length - 1];

    if (positionData.length >= 2) {
      // Regression on weight for this set position
      const weightReg = linearRegression(
        positionData.map((d) => ({ x: d.x, y: d.weight })),
      );
      const repsReg = linearRegression(
        positionData.map((d) => ({ x: d.x, y: d.reps })),
      );

      let nextWeight = lastData.weight + weightReg.slope;
      nextWeight = Math.min(nextWeight, lastData.weight * (1 + maxIncrease));
      nextWeight = Math.max(nextWeight, lastData.weight * 0.9); // never drop > 10%
      nextWeight = roundToIncrement(nextWeight, equipment, weightReg.slope > 0);

      // For reps: if weight increased meaningfully, hold reps. Otherwise allow rep bump.
      let nextReps: number;
      if (nextWeight > lastData.weight) {
        nextReps = lastData.reps;
      } else {
        // Allow reps to trend up, but cap at +2 from last
        const projectedReps = lastData.reps + repsReg.slope;
        nextReps = Math.round(Math.min(projectedReps, lastData.reps + 2));
      }

      results.push({ weight: nextWeight, reps: Math.max(nextReps, 1) });
    } else {
      // Single data point — apply small bump
      const bumped = roundToIncrement(
        lastData.weight * (1 + SMART_CONFIG.SMALL_BUMP_PERCENT),
        equipment,
        false,
      );
      results.push({
        weight: bumped > lastData.weight ? bumped : lastData.weight,
        reps: lastData.reps,
      });
    }
  }

  // Trim or extend to requestedSets
  while (results.length < requestedSets) {
    results.push({ ...results[results.length - 1] });
  }

  return results.slice(0, requestedSets);
};

/**
 * For straight_across patterns, apply mild intra-session progression:
 * keep weight constant, increment reps by +1 per set.
 */
const applyStraightAcrossProgression = (
  baseSets: { weight: number; reps: number }[],
): { weight: number; reps: number }[] => {
  if (baseSets.length <= 1) return baseSets;

  // Use the first set as the base; subsequent sets get +1 rep each
  return baseSets.map((s, i) => ({
    weight: s.weight,
    reps: s.reps + i,
  }));
};

/**
 * Generate per-set suggestions for a rep-cycling pattern.
 * Uses the target cluster (heavy or light) for per-set regression.
 */
const generateClusterSuggestion = (
  analysis: PatternAnalysis,
  requestedSets: number,
  equipment: EquipmentType[],
  isCompound: boolean,
): { weight: number; reps: number }[] => {
  const clusters = analysis.clusters;
  if (!clusters) {
    // Shouldn't happen, but fallback
    return generatePerSetSuggestions(
      analysis.dataPoints.slice(-3),
      requestedSets,
      equipment,
      isCompound,
    );
  }

  const targetPool = clusters.nextIsHeavy ? clusters.heavy : clusters.light;

  // Detect set pattern within the target cluster specifically
  const clusterSetPattern = detectSetPattern(targetPool);

  const perSet = generatePerSetSuggestions(
    targetPool,
    requestedSets,
    equipment,
    isCompound,
  );

  // If the cluster historically uses straight-across, add mild progression
  if (clusterSetPattern === 'straight_across') {
    return applyStraightAcrossProgression(perSet);
  }

  return perSet;
};

/**
 * Generate suggested sets based on detected pattern (per-set-position).
 * Returns an array of { weight, reps } — one per requested set.
 */
const generateSuggestionSets = (
  analysis: PatternAnalysis,
  isCompound: boolean,
  equipment: EquipmentType[],
  lastSets: SetLog[],
  requestedSets: number,
): { weight: number; reps: number }[] => {
  const points = analysis.dataPoints;

  switch (analysis.pattern) {
    case 'progressive_overload': {
      const perSet = generatePerSetSuggestions(
        points,
        requestedSets,
        equipment,
        isCompound,
      );

      // For straight_across with progressive overload, add mild rep progression
      if (analysis.setPattern === 'straight_across') {
        return applyStraightAcrossProgression(perSet);
      }
      return perSet;
    }

    case 'rep_cycling':
      return generateClusterSuggestion(analysis, requestedSets, equipment, isCompound);

    case 'deload': {
      if (isLastSessionDeload(points)) {
        // Return to pre-deload levels using per-set analysis of sessions before deload
        const preDeload = points.slice(-4, -1);
        if (preDeload.length > 0) {
          return generatePerSetSuggestions(preDeload, requestedSets, equipment, isCompound);
        }
      }
      // Fall through to stable
      return generateStableSuggestionSets(points, requestedSets, equipment, isCompound);
    }

    case 'stable':
      return generateStableSuggestionSets(points, requestedSets, equipment, isCompound);

    case 'fallback':
    default: {
      if (lastSets.length > 0) {
        return lastSets.slice(0, requestedSets).map((s) => ({
          weight: s.weight ?? 0,
          reps: s.reps ?? 8,
        }));
      }
      return Array.from({ length: requestedSets }, () => ({ weight: 0, reps: 8 }));
    }
  }
};

/**
 * Per-set suggestions for stable/maintenance: use last 3 sessions with
 * per-set-position weighted averaging, then apply mild straight-across progression.
 */
const generateStableSuggestionSets = (
  points: ExerciseDataPoint[],
  requestedSets: number,
  equipment: EquipmentType[],
  isCompound: boolean,
): { weight: number; reps: number }[] => {
  const recent = points.slice(-3);
  const perSet = generatePerSetSuggestions(recent, requestedSets, equipment, isCompound);
  const setPattern = detectSetPattern(points);

  if (setPattern === 'straight_across') {
    return applyStraightAcrossProgression(perSet);
  }

  return perSet;
};

// ---------------------------------------------------------------------------
// Main entry point: create smart suggestion sets
// ---------------------------------------------------------------------------

/**
 * Generate smart set suggestions for an exercise.
 * Now produces per-set differentiated targets based on historical set-position analysis.
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

  const suggestionSets = generateSuggestionSets(
    analysis,
    isCompound,
    equipment,
    historySets ?? [],
    requestedSetCount,
  );

  // Build SetLog[] with clamped reps
  const sets: SetLog[] = suggestionSets.map((s) => ({
    weight: s.weight,
    reps: Math.max(SMART_CONFIG.MIN_REPS, Math.min(SMART_CONFIG.MAX_REPS, s.reps)),
    completed: false,
  }));

  return {
    sets,
    historySetCount: requestedSetCount,
    pattern: analysis.pattern,
    confidence: analysis.confidence,
    clusters: analysis.clusters,
    setPattern: analysis.setPattern,
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

// ---------------------------------------------------------------------------
// Intra-session pattern shift detection
// ---------------------------------------------------------------------------

/**
 * Detect whether the user's completed set represents a significant deviation
 * from the original suggestion (pattern shift). If so, find the closest
 * matching historical session and re-target all remaining sets accordingly.
 *
 * @param completedSetIndex - Index of the just-completed set
 * @param completedWeight - Actual weight used
 * @param completedReps - Actual reps completed
 * @param originalSuggestions - The original smart-suggested sets for this exercise
 * @param dataPoints - Historical data points for this exercise
 * @param remainingSetCount - How many uncompleted sets remain after the completed one
 * @param equipment - Equipment types for rounding
 * @param isCompound - Whether compound
 * @returns PatternShiftResult with shifted flag and new targets for remaining sets
 */
export const detectPatternShift = (
  completedSetIndex: number,
  completedWeight: number,
  completedReps: number,
  originalSuggestions: SetLog[],
  dataPoints: ExerciseDataPoint[],
  remainingSetCount: number,
  equipment: EquipmentType[],
  isCompound: boolean,
): PatternShiftResult => {
  const noShift: PatternShiftResult = { shifted: false, newTargets: [] };

  if (remainingSetCount <= 0 || !originalSuggestions[completedSetIndex]) {
    return noShift;
  }

  const suggested = originalSuggestions[completedSetIndex];
  const suggestedWeight = suggested.weight ?? 0;
  const suggestedReps = suggested.reps ?? 0;

  // Calculate deviation
  const weightDev = suggestedWeight > 0
    ? Math.abs(completedWeight - suggestedWeight) / suggestedWeight
    : 0;
  const repsDev = suggestedReps > 0
    ? Math.abs(completedReps - suggestedReps) / suggestedReps
    : 0;

  const isSignificant =
    weightDev > SMART_CONFIG.PATTERN_SHIFT_WEIGHT_THRESHOLD ||
    repsDev > SMART_CONFIG.PATTERN_SHIFT_REPS_THRESHOLD;

  if (!isSignificant) {
    return noShift;
  }

  // Find the closest matching historical session by comparing Set 1 similarity
  let bestMatch: ExerciseDataPoint | null = null;
  let bestSimilarity = Infinity;

  for (const session of dataPoints) {
    if (session.setDetails.length === 0) continue;
    const sessionSet = session.setDetails[Math.min(completedSetIndex, session.setDetails.length - 1)];

    // Weighted similarity: weight matters more than reps
    const wSim = sessionSet.weight > 0
      ? Math.abs(completedWeight - sessionSet.weight) / sessionSet.weight
      : 1;
    const rSim = sessionSet.reps > 0
      ? Math.abs(completedReps - sessionSet.reps) / sessionSet.reps
      : 1;
    const sim = wSim * 0.6 + rSim * 0.4;

    if (sim < bestSimilarity) {
      bestSimilarity = sim;
      bestMatch = session;
    }
  }

  if (!bestMatch || bestSimilarity > SMART_CONFIG.PATTERN_SHIFT_MAX_SIMILARITY) {
    // No close match — fall back: use completed values as base for remaining sets
    // with mild progression
    const targets: { weight: number; reps: number }[] = [];
    for (let i = 0; i < remainingSetCount; i++) {
      const bump = roundToIncrement(
        completedWeight * (1 + SMART_CONFIG.SMALL_BUMP_PERCENT * (i + 1)),
        equipment,
        false,
      );
      targets.push({
        weight: bump,
        reps: completedReps,
      });
    }
    return { shifted: true, newTargets: targets };
  }

  // Re-target remaining sets using the matched session as a template with progression
  const targets: { weight: number; reps: number }[] = [];
  for (let i = 0; i < remainingSetCount; i++) {
    const templateIdx = completedSetIndex + 1 + i;
    let templateSet: SetPositionData;

    if (templateIdx < bestMatch.setDetails.length) {
      templateSet = bestMatch.setDetails[templateIdx];
    } else {
      // More sets than template — use last template set
      templateSet = bestMatch.setDetails[bestMatch.setDetails.length - 1];
    }

    // Apply small progressive overload from the template
    const progressedWeight = roundToIncrement(
      templateSet.weight * (1 + SMART_CONFIG.SMALL_BUMP_PERCENT),
      equipment,
      false,
    );

    targets.push({
      weight: progressedWeight > templateSet.weight ? progressedWeight : templateSet.weight,
      reps: templateSet.reps,
    });
  }

  return { shifted: true, newTargets: targets };
};
