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
import { useCustomExerciseStore } from '@/store/customExerciseStore';
import { exercises as exerciseCatalog } from '@/constants/exercises';
import exercisesData from '@/data/exercises.json';
import hierarchyData from '@/data/hierarchy.json';
import { formatLocalDate } from '@/utils/chartUtils';
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

// Build base exercise type lookup map (static catalog)
const BASE_EXERCISE_TYPE_MAP = exerciseCatalog.reduce((acc, ex) => {
  acc[ex.name] = ex.exerciseType;
  return acc;
}, {} as Record<string, ExerciseType>);

// Alias map: translates exercises.json muscle names to new hierarchy names.
// exercises.json still uses old detailed names; this rolls them up for charts.
const MUSCLE_NAME_ALIASES: Record<string, string> = {
  // Renamed muscles
  'Upper Back': 'Traps',
  'Lateral Delts': 'Side Delts',
  // Arms detailed -> L3 parent
  'Biceps - Long Head': 'Biceps',
  'Biceps - Short Head': 'Biceps',
  'Brachialis': 'Biceps',
  'Triceps - Long Head': 'Triceps',
  'Triceps - Lateral Head': 'Triceps',
  'Triceps - Medial Head': 'Triceps',
  'Flexors': 'Forearms',
  'Extensors': 'Forearms',
  // Calves detailed -> L2 parent
  'Calves - Medial Head': 'Calves',
  'Calves - Lateral Head': 'Calves',
  'Soleus': 'Calves',
  // Abs detailed -> L2 parent
  'Upper Abs': 'Abs',
  'Lower Abs': 'Abs',
};

// Resolve a muscle name from exercises.json to its canonical hierarchy name
const resolveMuscle = (name: string): string => MUSCLE_NAME_ALIASES[name] ?? name;

// Build muscle hierarchy maps once at module load
// Maps each muscle (at any level) to its parent at each tier
// L1 = high (Upper Body, Lower Body, Core)
// L2 = mid (Chest, Back, Arms, etc.)
// L3 = low (Upper Chest, Lats, Biceps, Adductors, etc.)
const buildMaps = () => {
  const leafToL1: Record<string, string> = {};
  const leafToL2: Record<string, string> = {};
  const leafToL3: Record<string, string> = {};
  const l2ToL1: Record<string, string> = {};

  const hierarchy = hierarchyData.muscle_hierarchy;

  Object.entries(hierarchy).forEach(([l1, l1Data]) => {
    // L1 level (high): Upper Body, Lower Body, Core
    if (l1Data?.muscles) {
      Object.entries(l1Data.muscles).forEach(([l2, l2Data]: [string, any]) => {
        // L2 level (mid): Chest, Back, Arms, Quads, Abs, etc.
        leafToL1[l2] = l1;
        leafToL2[l2] = l2;
        l2ToL1[l2] = l1;

        if (l2Data?.muscles) {
          Object.entries(l2Data.muscles).forEach(([l3]: [string, any]) => {
            // L3 level (low): Upper Chest, Lats, Biceps, Adductors, etc.
            leafToL1[l3] = l1;
            leafToL2[l3] = l2;
            leafToL3[l3] = l3;
          });
        }
      });
    }
  });

  return { leafToL1, leafToL2, leafToL3, l2ToL1 };
};

const { leafToL1, leafToL2, leafToL3, l2ToL1 } = buildMaps();

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
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let cutoff: Date;

  switch (range) {
    case 'week': {
      // Last 7 calendar days INCLUDING today (local time)
      cutoff = new Date(todayStart);
      cutoff.setDate(cutoff.getDate() - 6);
      break;
    }
    case 'month':
      // First of current month (inclusive, local)
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      // First of current year (inclusive, local)
      cutoff = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return workouts;
  }

  return workouts.filter((w) => {
    const workoutDate = new Date(w.startTime ?? w.date);
    return workoutDate >= cutoff;
  });
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
  const workouts = useMemo(
    () => (__DEV__ && forceEmptyAnalytics ? [] : rawWorkouts),
    [forceEmptyAnalytics, rawWorkouts],
  );
  const userBodyWeight = useUserProfileStore((state) => state.profile?.weightLbs);
  const { convertWeight, weightUnit } = useSettingsStore();
  const customExercises = useCustomExerciseStore((state) => state.customExercises);

  // Merge custom exercises into exercise type map
  const EXERCISE_TYPE_MAP = useMemo(() => {
    const map = { ...BASE_EXERCISE_TYPE_MAP };
    customExercises.forEach((ce) => { map[ce.name] = ce.exerciseType; });
    return map;
  }, [customExercises]);

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
          // Include sets that are completed OR have meaningful cardio data
          // (users often enter time/distance without pressing "Complete set")
          const hasData = (set.duration ?? 0) > 0 || (set.distance ?? 0) > 0;
          if (!set.completed && !hasData) return;
          totalDuration += set.duration || 0;
          if (set.distance) {
            totalDistanceByType[exercise.name] = (totalDistanceByType[exercise.name] || 0) + set.distance;
          }
        });
      });
      if (hasCardio) sessionCount++;
    });

    return { totalDuration, totalDistanceByType, sessionCount };
  }, [filteredWorkouts, EXERCISE_TYPE_MAP]);

  // Calculate tiered volume data (weight × reps, with body weight for bodyweight/assisted)
  const tieredVolume = useMemo((): TieredVolumeData => {
    void weightUnit;

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

          Object.entries(weights).forEach(([rawMuscle, weight]) => {
            const muscle = resolveMuscle(rawMuscle);
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
  }, [filteredWorkouts, userBodyWeight, convertWeight, weightUnit, EXERCISE_TYPE_MAP]);

  // Calculate tiered volume distribution (volume = weight × reps × muscle_weighting)
  // Only includes weight and assisted exercises
  const tieredVolumeDistribution = useMemo((): TieredSetData => {
    void weightUnit;

    const distL1: Record<string, number> = {};
    const distL2: Record<string, number> = {};
    const distL3: Record<string, number> = {};

    filteredWorkouts.forEach((workout) => {
      workout.exercises.forEach((exercise: any) => {
        const muscleWeights = EXERCISE_MUSCLES[exercise.name];
        if (!muscleWeights) return;

        const exerciseType = EXERCISE_TYPE_MAP[exercise.name] || 'weight';

        // Only include weight and assisted exercises (exclude bodyweight and cardio from distribution)
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
            // Effective weight = body weight - assistance, clamped to avoid negatives
            if (!userBodyWeight) return;
            const assistanceWeight = set.assistanceWeight ?? 0;
            const effectiveWeight = Math.max(0, userBodyWeight - assistanceWeight);
            if (effectiveWeight <= 0) return;
            setVolume = effectiveWeight * reps;
          }

          // Convert volume to user's preferred unit
          setVolume = convertWeight(setVolume);

          if (setVolume <= 0) return;

          // Distribute volume to muscles based on weightings
          Object.entries(muscleWeights).forEach(([rawMuscle, muscleWeight]) => {
            const muscle = resolveMuscle(rawMuscle);
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
  }, [filteredWorkouts, userBodyWeight, convertWeight, weightUnit, EXERCISE_TYPE_MAP]);

  // Calculate hierarchical volume distribution for drill-down navigation
  // Uses same logic as tieredVolumeDistribution but with parent grouping for drill-down
  const hierarchicalVolumeDistribution = useMemo((): HierarchicalSetData => {
    void weightUnit;

    // Build distribution maps at each level with parent tracking
    const distByLevel: Record<string, Record<string, number>> = {};

    filteredWorkouts.forEach((workout) => {
      workout.exercises.forEach((exercise: any) => {
        const muscleWeights = EXERCISE_MUSCLES[exercise.name];
        if (!muscleWeights) return;

        const exerciseType = EXERCISE_TYPE_MAP[exercise.name] || 'weight';

        // Only include weight and assisted exercises (exclude bodyweight and cardio from distribution)
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
            // Effective weight = body weight - assistance, clamped to avoid negatives
            if (!userBodyWeight) return;
            const assistanceWeight = set.assistanceWeight ?? 0;
            const effectiveWeight = Math.max(0, userBodyWeight - assistanceWeight);
            if (effectiveWeight <= 0) return;
            setVolume = effectiveWeight * reps;
          }

          // Convert volume to user's preferred unit
          setVolume = convertWeight(setVolume);

          if (setVolume <= 0) return;

          // Distribute volume to muscles based on weightings
          Object.entries(muscleWeights).forEach(([rawMuscle, muscleWeight]) => {
            const muscle = resolveMuscle(rawMuscle);
            const contribution = setVolume * muscleWeight;

            // Track at each level with its parent context
            const l1 = leafToL1[muscle];
            const l2 = leafToL2[muscle];
            const l3 = leafToL3[muscle];

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
  }, [filteredWorkouts, userBodyWeight, convertWeight, weightUnit, EXERCISE_TYPE_MAP]);

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
        if (m === 'Hamstrings') return 'Hams.';
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

  // Volume trend data over time - returns date-indexed volume data
  const volumeTrendData = useMemo((): Record<string, number> => {
    if (filteredWorkouts.length === 0) return {};

    // Group workouts by date and calculate total volume per day
    const volumeByDate: Record<string, number> = {};

    filteredWorkouts.forEach((workout) => {
      // Bucket by LOCAL calendar day so "today" always shows up on the 7-day chart
      const dateKey = formatLocalDate(new Date(workout.startTime ?? workout.date));
      
      workout.exercises.forEach((exercise: any) => {
        const exerciseType = EXERCISE_TYPE_MAP[exercise.name] || 'weight';
        
        // Skip cardio and pure duration exercises
        if (exerciseType === 'cardio' || exerciseType === 'duration') {
          return;
        }

        exercise.sets.forEach((set: any) => {
          if (!set.completed) return;
          
          const reps = set.reps ?? 0;
          if (reps <= 0) return;

          let setVolume = 0;

          switch (exerciseType) {
            case 'bodyweight':
              if (userBodyWeight && userBodyWeight > 0) {
                setVolume = userBodyWeight * reps;
              }
              break;
            case 'assisted':
              if (userBodyWeight && userBodyWeight > 0) {
                const assistance = set.assistanceWeight ?? 0;
                const effective = Math.max(0, userBodyWeight - assistance);
                if (effective > 0) {
                  setVolume = effective * reps;
                }
              }
              break;
            case 'reps_only':
              // Bands etc – do not contribute to volume
              setVolume = 0;
              break;
            case 'weight':
            default:
              const weight = set.weight ?? 0;
              if (weight > 0) {
                setVolume = weight * reps;
              }
              break;
          }

          if (setVolume > 0) {
            // Convert to user's preferred unit
            const convertedVolume = convertWeight(setVolume);
            volumeByDate[dateKey] = (volumeByDate[dateKey] || 0) + convertedVolume;
          }
        });
      });
    });

    // Return date-indexed volume data (YYYY-MM-DD -> volume)
    return volumeByDate;
  }, [filteredWorkouts, userBodyWeight, convertWeight, EXERCISE_TYPE_MAP]);

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
    volumeTrendData,

    // State
    hasData,
    hasFilteredData,

    // Utilities
    leafToL1,
    leafToL2,
    l2ToL1,
    EXERCISE_MUSCLES,
    resolveMuscle,
  };
};

export type { TieredVolumeData, TieredSetData, HierarchicalSetData, WeeklyVolumeData, StreakData, CardioStats };
