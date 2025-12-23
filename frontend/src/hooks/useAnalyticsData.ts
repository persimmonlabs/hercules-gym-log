/**
 * useAnalyticsData Hook
 * Centralized hook for all muscle volume and analytics calculations
 * Extracts and consolidates logic from FocusDistributionChart and WeeklyVolumeChart
 */

import { useMemo } from 'react';

import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useDevToolsStore } from '@/store/devToolsStore';
import { exercises as exerciseCatalog } from '@/constants/exercises';
import exercisesData from '@/data/exercises.json';
import hierarchyData from '@/data/hierarchy.json';
import { colors } from '@/constants/theme';
import type {
  TieredVolumeData,
  TieredSetData,
  WeeklyVolumeData,
  StreakData,
  CardioStats,
  ChartSlice,
  BarChartData,
  TimeRange,
  HierarchicalSetData,
} from '@/types/analytics';
import type { ExerciseType } from '@/types/exercise';

// Build exercise type lookup map
const EXERCISE_TYPE_MAP = exerciseCatalog.reduce((acc, ex) => {
  acc[ex.name] = ex.exerciseType;
  return acc;
}, {} as Record<string, ExerciseType>);

// Build muscle hierarchy maps once at module load
// Maps each muscle (at any level) to its parent at each tier
// L1 = high (Upper Body, Lower Body, Core)
// L2 = mid (Chest, Back, Arms, etc.)
// L3 = low (Biceps, Triceps, Forearms, Upper Chest, etc.)
// L4 = detailed (Biceps - Long Head, etc.)
const buildMaps = () => {
  const leafToL1: Record<string, string> = {};
  const leafToL2: Record<string, string> = {};
  const leafToL3: Record<string, string> = {};
  const leafToL4: Record<string, string> = {};
  const l2ToL1: Record<string, string> = {};

  const hierarchy = hierarchyData.muscle_hierarchy;

  Object.entries(hierarchy).forEach(([l1, l1Data]) => {
    // L1 level (high): Upper Body, Lower Body, Core
    if (l1Data?.muscles) {
      Object.entries(l1Data.muscles).forEach(([l2, l2Data]: [string, any]) => {
        // L2 level (mid): Chest, Back, Arms, etc.
        leafToL1[l2] = l1;
        leafToL2[l2] = l2;
        l2ToL1[l2] = l1;

        if (l2Data?.muscles) {
          Object.entries(l2Data.muscles).forEach(([l3, l3Data]: [string, any]) => {
            // L3 level (low): Biceps, Triceps, Upper Chest, etc.
            leafToL1[l3] = l1;
            leafToL2[l3] = l2;
            leafToL3[l3] = l3;

            if (l3Data?.muscles) {
              // L4 level (detailed): Biceps - Long Head, etc.
              Object.keys(l3Data.muscles).forEach((l4) => {
                leafToL1[l4] = l1;
                leafToL2[l4] = l2;
                leafToL3[l4] = l3;
                leafToL4[l4] = l4;
              });
            }
          });
        }
      });
    }
  });

  return { leafToL1, leafToL2, leafToL3, leafToL4, l2ToL1 };
};

const { leafToL1, leafToL2, leafToL3, leafToL4, l2ToL1 } = buildMaps();

// Exercise name to muscle weights map
const EXERCISE_MUSCLES = exercisesData.reduce((acc, ex) => {
  if (ex.muscles) {
    acc[ex.name] = ex.muscles as unknown as Record<string, number>;
  }
  return acc;
}, {} as Record<string, Record<string, number>>);

// Filter workouts by time range
const filterByTimeRange = (workouts: any[], range: TimeRange) => {
  if (range === 'all') return workouts;

  const now = new Date();
  let cutoff: Date;

  switch (range) {
    case 'week':
      // Last 7 days
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      // First of current month (inclusive)
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      // First of current year (inclusive)
      cutoff = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return workouts;
  }

  return workouts.filter((w) => new Date(w.date) >= cutoff);
};

// Generate orange color with opacity based on index
const generateSliceColor = (index: number, total: number): string => {
  if (total <= 1) return `rgba(255, 107, 74, 1.0)`;
  const ratio = index / (total - 1);
  const opacity = 1.0 - ratio * 0.7;
  return `rgba(255, 107, 74, ${opacity})`;
};

interface UseAnalyticsDataOptions {
  timeRange?: TimeRange;
}

export const useAnalyticsData = (options: UseAnalyticsDataOptions = {}) => {
  const { timeRange = 'week' } = options;
  const forceEmptyAnalytics = useDevToolsStore((state) => state.forceEmptyAnalytics);
  const rawWorkouts = useWorkoutSessionsStore((state) => state.workouts);
  const workouts = __DEV__ && forceEmptyAnalytics ? [] : rawWorkouts;
  const userBodyWeight = useUserProfileStore((state) => state.profile?.weightLbs);
  const { convertWeight, weightUnit } = useSettingsStore();

  // Filter workouts based on time range
  const filteredWorkouts = useMemo(() => {
    return filterByTimeRange(workouts, timeRange);
  }, [workouts, timeRange]);

  // Calculate cardio statistics
  const cardioStats = useMemo((): CardioStats => {
    let totalDuration = 0;
    const totalDistanceByType: Record<string, number> = {};
    let sessionCount = 0;

    filteredWorkouts.forEach((workout) => {
      let hasCardio = false;
      workout.exercises.forEach((exercise: any) => {
        const exerciseType = EXERCISE_TYPE_MAP[exercise.name];
        if (exerciseType !== 'cardio') return;

        hasCardio = true;
        exercise.sets.forEach((set: any) => {
          if (!set.completed) return;
          totalDuration += set.duration || 0;
          if (set.distance) {
            totalDistanceByType[exercise.name] = (totalDistanceByType[exercise.name] || 0) + set.distance;
          }
        });
      });
      if (hasCardio) sessionCount++;
    });

    return { totalDuration, totalDistanceByType, sessionCount };
  }, [filteredWorkouts]);

  // Calculate tiered volume data (weight × reps, with body weight for bodyweight/assisted)
  const tieredVolume = useMemo((): TieredVolumeData => {
    const high: Record<string, number> = { 'Upper Body': 0, 'Lower Body': 0, 'Core': 0 };
    const mid: Record<string, number> = {};
    const low: Record<string, number> = {};

    filteredWorkouts.forEach((workout) => {
      workout.exercises.forEach((exercise: any) => {
        const weights = EXERCISE_MUSCLES[exercise.name];
        if (!weights) return;

        const exerciseType = EXERCISE_TYPE_MAP[exercise.name] || 'weight';

        // Skip cardio and duration exercises for volume calculations
        if (exerciseType === 'cardio' || exerciseType === 'duration') return;

        exercise.sets.forEach((set: any) => {
          if (!set.completed) return;

          // Calculate set volume based on exercise type
          let setVolume = 0;
          const reps = set.reps ?? 0;

          switch (exerciseType) {
            case 'bodyweight':
              // Use body weight if available, otherwise skip
              if (userBodyWeight && reps > 0) {
                setVolume = userBodyWeight * reps;
              }
              break;
            case 'assisted':
              // Effective weight = body weight - assistance weight
              if (userBodyWeight && reps > 0) {
                const effectiveWeight = Math.max(0, userBodyWeight - (set.assistanceWeight ?? 0));
                setVolume = effectiveWeight * reps;
              }
              break;
            case 'reps_only':
              // Resistance bands - just count reps (no weight volume)
              // Skip for volume calculations
              return;
            case 'weight':
            default:
              // Standard weight × reps
              if ((set.weight ?? 0) > 0 && reps > 0) {
                setVolume = set.weight * reps;
              }
              break;
          }

          // Convert volume to user's preferred unit (LBS -> User Unit)
          setVolume = convertWeight(setVolume);

          if (setVolume <= 0) return;

          Object.entries(weights).forEach(([muscle, weight]) => {
            const contribution = setVolume * weight;

            const cat1 = leafToL1[muscle];
            if (cat1 && high[cat1] !== undefined) {
              high[cat1] += contribution;
            }

            const cat2 = leafToL2[muscle];
            if (cat2) {
              mid[cat2] = (mid[cat2] || 0) + contribution;
            }

            const cat3 = leafToL3[muscle];
            if (cat3) {
              low[cat3] = (low[cat3] || 0) + contribution;
            }
          });
        });
      });
    });

    return { high, mid, low };
  }, [filteredWorkouts, userBodyWeight, convertWeight, weightUnit]);

  // Calculate tiered volume distribution (volume = weight × reps × muscle_weighting)
  // Only includes weight and assisted exercises
  const tieredVolumeDistribution = useMemo((): TieredSetData => {
    const distL1: Record<string, number> = {};
    const distL2: Record<string, number> = {};
    const distL3: Record<string, number> = {};

    filteredWorkouts.forEach((workout) => {
      workout.exercises.forEach((exercise: any) => {
        const muscleWeights = EXERCISE_MUSCLES[exercise.name];
        if (!muscleWeights) return;

        const exerciseType = EXERCISE_TYPE_MAP[exercise.name] || 'weight';

        // Only include weight and assisted exercises
        if (exerciseType !== 'weight' && exerciseType !== 'assisted') return;

        exercise.sets.forEach((set: any) => {
          if (!set.completed) return;

          const reps = set.reps ?? 0;
          if (reps <= 0) return;

          let setVolume = 0;

          if (exerciseType === 'weight') {
            const weight = set.weight ?? 0;
            if (weight <= 0) return;
            setVolume = weight * reps;
          } else if (exerciseType === 'assisted') {
            // Safety check: skip if no body weight stored
            if (!userBodyWeight) return;
            const assistanceWeight = set.assistanceWeight ?? 0;
            // Safety check: skip if assistance >= body weight (would be zero or negative)
            if (assistanceWeight >= userBodyWeight) return;
            const effectiveWeight = userBodyWeight - assistanceWeight;
            setVolume = effectiveWeight * reps;
          }

          // Convert volume to user's preferred unit
          setVolume = convertWeight(setVolume);

          if (setVolume <= 0) return;

          // Distribute volume to muscles based on weightings
          Object.entries(muscleWeights).forEach(([muscle, muscleWeight]) => {
            const contribution = setVolume * muscleWeight;

            const cat1 = leafToL1[muscle];
            if (cat1) distL1[cat1] = (distL1[cat1] || 0) + contribution;

            const cat2 = leafToL2[muscle];
            if (cat2) distL2[cat2] = (distL2[cat2] || 0) + contribution;

            const cat3 = leafToL3[muscle];
            if (cat3) distL3[cat3] = (distL3[cat3] || 0) + contribution;
          });
        });
      });
    });

    // Format slices with percentages summing to 100% at each level
    const formatSlices = (dist: Record<string, number>): ChartSlice[] => {
      const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
      const total = Object.values(dist).reduce((sum, val) => sum + val, 0);
      if (total === 0) return [];

      const threshold = total * 0.01; // 1% threshold
      const filtered = sorted.filter(([, value]) => value >= threshold);
      const filteredTotal = filtered.reduce((sum, [, val]) => sum + val, 0);

      return filtered.map(([name, value], index) => ({
        name,
        value,
        percentage: filteredTotal > 0 ? (value / filteredTotal) * 100 : 0,
        color: generateSliceColor(index, filtered.length),
      }));
    };

    return {
      high: formatSlices(distL1),
      mid: formatSlices(distL2),
      low: formatSlices(distL3),
    };
  }, [filteredWorkouts, userBodyWeight, convertWeight, weightUnit]);

  // Calculate hierarchical volume distribution for drill-down navigation
  // Uses same logic as tieredVolumeDistribution but with parent grouping for drill-down
  const hierarchicalVolumeDistribution = useMemo((): HierarchicalSetData => {
    // Build distribution maps at each level with parent tracking
    const distByLevel: Record<string, Record<string, number>> = {};

    filteredWorkouts.forEach((workout) => {
      workout.exercises.forEach((exercise: any) => {
        const muscleWeights = EXERCISE_MUSCLES[exercise.name];
        if (!muscleWeights) return;

        const exerciseType = EXERCISE_TYPE_MAP[exercise.name] || 'weight';

        // Only include weight and assisted exercises
        if (exerciseType !== 'weight' && exerciseType !== 'assisted') return;

        exercise.sets.forEach((set: any) => {
          if (!set.completed) return;

          const reps = set.reps ?? 0;
          if (reps <= 0) return;

          let setVolume = 0;

          if (exerciseType === 'weight') {
            const weight = set.weight ?? 0;
            if (weight <= 0) return;
            setVolume = weight * reps;
          } else if (exerciseType === 'assisted') {
            // Safety check: skip if no body weight stored
            if (!userBodyWeight) return;
            const assistanceWeight = set.assistanceWeight ?? 0;
            // Safety check: skip if assistance >= body weight (would be zero or negative)
            if (assistanceWeight >= userBodyWeight) return;
            const effectiveWeight = userBodyWeight - assistanceWeight;
            setVolume = effectiveWeight * reps;
          }

          // Convert volume to user's preferred unit
          setVolume = convertWeight(setVolume);

          if (setVolume <= 0) return;

          // Distribute volume to muscles based on weightings
          Object.entries(muscleWeights).forEach(([muscle, muscleWeight]) => {
            const contribution = setVolume * muscleWeight;

            // Track at each level with its parent context
            const l1 = leafToL1[muscle];
            const l2 = leafToL2[muscle];
            const l3 = leafToL3[muscle];
            const l4 = leafToL4[muscle];

            // Root level (L1): Upper Body, Lower Body, Core
            if (l1) {
              distByLevel['root'] = distByLevel['root'] || {};
              distByLevel['root'][l1] = (distByLevel['root'][l1] || 0) + contribution;
            }

            // L2 grouped by L1 parent (e.g., "Upper Body" -> Chest, Back, Arms, etc.)
            if (l1 && l2) {
              const key = `L1:${l1}`;
              distByLevel[key] = distByLevel[key] || {};
              distByLevel[key][l2] = (distByLevel[key][l2] || 0) + contribution;
            }

            // L3 grouped by L2 parent (e.g., "Arms" -> Biceps, Triceps, Forearms)
            // Only add if L3 exists and is different from L2
            if (l2 && l3 && l2 !== l3) {
              const key = `L2:${l2}`;
              distByLevel[key] = distByLevel[key] || {};
              distByLevel[key][l3] = (distByLevel[key][l3] || 0) + contribution;
            }

            // L4 grouped by L3 parent (e.g., "Biceps" -> Long Head, Short Head, Brachialis)
            // Only add if L4 exists (detailed level muscles)
            if (l3 && l4 && l3 !== l4) {
              const key = `L3:${l3}`;
              distByLevel[key] = distByLevel[key] || {};
              distByLevel[key][l4] = (distByLevel[key][l4] || 0) + contribution;
            }

            // Special case: when L2 and L3 have the same name (e.g., Calves -> Calves),
            // show L4 children directly under L2 to avoid redundant drill-down
            if (l2 && l3 && l2 === l3 && l4) {
              const key = `L2:${l2}`;
              distByLevel[key] = distByLevel[key] || {};
              distByLevel[key][l4] = (distByLevel[key][l4] || 0) + contribution;
            }
          });
        });
      });
    });

    // Format slices with percentages summing to 100% at each level
    const formatSlicesForLevel = (dist: Record<string, number>): ChartSlice[] => {
      const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
      const total = Object.values(dist).reduce((sum, val) => sum + val, 0);
      if (total === 0) return [];

      const threshold = total * 0.01; // 1% threshold
      const filtered = sorted.filter(([, value]) => value >= threshold);
      const filteredTotal = filtered.reduce((sum, [, val]) => sum + val, 0);

      return filtered.map(([name, value], index) => ({
        name,
        value,
        percentage: filteredTotal > 0 ? (value / filteredTotal) * 100 : 0,
        color: generateSliceColor(index, filtered.length),
      }));
    };

    // Build the result
    const byParent: Record<string, ChartSlice[]> = {};
    Object.entries(distByLevel).forEach(([key, dist]) => {
      if (key !== 'root') {
        byParent[key] = formatSlicesForLevel(dist);
      }
    });

    return {
      root: formatSlicesForLevel(distByLevel['root'] || {}),
      byParent,
    };
  }, [filteredWorkouts, userBodyWeight, convertWeight, weightUnit]);

  // Weekly volume bar chart data
  const weeklyVolume = useMemo((): WeeklyVolumeData => {
    const formatBarData = (labels: string[], values: number[]): BarChartData[] =>
      labels.map((label, i) => ({
        label,
        value: Math.round(values[i] || 0),
      }));

    const getL2Data = (parentL1: string): BarChartData[] => {
      const muscles = Object.keys(
        (hierarchyData.muscle_hierarchy as any)[parentL1]?.muscles || {}
      );
      const values = muscles.map((m) => tieredVolume.mid[m] || 0);
      const labels = muscles.map((m) => {
        if (m === 'Hip Stabilizers') return 'Hips';
        if (m === 'Hamstrings') return 'Hams';
        return m;
      });
      return formatBarData(labels, values);
    };

    return {
      high: formatBarData(
        ['Upper\nBody', 'Lower\nBody', 'Core'],
        [tieredVolume.high['Upper Body'], tieredVolume.high['Lower Body'], tieredVolume.high['Core']]
      ),
      byBodyPart: {
        upper: getL2Data('Upper Body'),
        lower: getL2Data('Lower Body'),
        core: getL2Data('Core'),
      },
    };
  }, [tieredVolume]);

  // Streak and consistency data
  const streakData = useMemo((): StreakData => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Sort workouts by date descending
    const sortedDates = [...new Set(workouts.map((w) => w.date.split('T')[0]))]
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // Calculate current streak
    let currentStreak = 0;
    let checkDate = new Date(today);

    for (const date of sortedDates) {
      const workoutDate = new Date(date);
      const diffDays = Math.floor(
        (checkDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays <= 1) {
        currentStreak++;
        checkDate = workoutDate;
      } else {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;

    for (const date of sortedDates.reverse()) {
      const workoutDate = new Date(date);
      if (prevDate) {
        const diff = Math.floor(
          (workoutDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diff <= 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      prevDate = workoutDate;
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Workouts this week
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const workoutsThisWeek = workouts.filter(
      (w) => new Date(w.date) >= weekAgo
    ).length;

    // Workouts this month
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const workoutsThisMonth = workouts.filter(
      (w) => new Date(w.date) >= monthAgo
    ).length;

    // Average per week (last 4 weeks)
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const recentWorkouts = workouts.filter((w) => new Date(w.date) >= fourWeeksAgo);
    const averagePerWeek = recentWorkouts.length / 4;

    return {
      currentStreak,
      longestStreak,
      workoutsThisWeek,
      workoutsThisMonth,
      averagePerWeek: Math.round(averagePerWeek * 10) / 10,
    };
  }, [workouts]);

  // Check if there's any data
  const hasData = workouts.length > 0;
  const hasFilteredData = filteredWorkouts.length > 0;

  return {
    // Raw data
    workouts,
    filteredWorkouts,

    // Processed data
    tieredVolume,
    tieredVolumeDistribution,
    hierarchicalVolumeDistribution,
    weeklyVolume,
    streakData,
    cardioStats,

    // State
    hasData,
    hasFilteredData,

    // Utilities
    leafToL1,
    leafToL2,
    leafToL3,
    l2ToL1,
    EXERCISE_MUSCLES,
  };
};

export type { TieredVolumeData, TieredSetData, HierarchicalSetData, WeeklyVolumeData, StreakData, CardioStats };
