/**
 * useInsightsData Hook
 * Calculates actionable training insights for the Performance Insights tab
 * 
 * Insight Types:
 * - Balance Alert: Push/Pull or Upper/Lower ratio >15% off ideal
 * - Plateau Detection: No improvement in max weight for 4 weeks (min 3 sessions)
 * - Streak Milestone: New personal streak record achieved
 * - Focus Suggestion: Muscle group <5% of total weekly volume
 */

import { useMemo } from 'react';

import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { useDevToolsStore } from '@/store/devToolsStore';
import { useUserProfileStore } from '@/store/userProfileStore';
import exercisesData from '@/data/exercises.json';
import hierarchyData from '@/data/hierarchy.json';
import type { ExerciseType } from '@/types/exercise';

// ============================================================================
// TYPES
// ============================================================================

export type InsightType = 'balance' | 'plateau' | 'streak' | 'focus';
export type InsightPriority = 'alert' | 'suggestion' | 'celebration';

export interface Insight {
  type: InsightType;
  priority: InsightPriority;
  title: string;
  message: string;
  icon: string;
  borderColor: string;
  /** For focus suggestions - recommended exercises */
  suggestions?: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BALANCE_THRESHOLD = 0.15; // 15% imbalance triggers alert
const PLATEAU_WEEKS = 4;
const PLATEAU_MIN_SESSIONS = 3;
const PLATEAU_MIN_IMPROVEMENT_LBS = 2.5;
const FOCUS_VOLUME_THRESHOLD = 0.05; // 5% minimum

// Hardcoded exercise suggestions per muscle group for v1
const FOCUS_SUGGESTIONS: Record<string, string[]> = {
  'Core': ['Planks', 'Dead Bugs', 'Cable Crunches'],
  'Chest': ['Bench Press', 'Incline Dumbbell Press', 'Cable Flyes'],
  'Back': ['Barbell Rows', 'Lat Pulldowns', 'Face Pulls'],
  'Shoulders': ['Lateral Raises', 'Overhead Press', 'Rear Delt Flyes'],
  'Arms': ['Bicep Curls', 'Tricep Pushdowns', 'Hammer Curls'],
  'Quads': ['Squats', 'Leg Press', 'Leg Extensions'],
  'Glutes': ['Hip Thrusts', 'Romanian Deadlifts', 'Cable Kickbacks'],
  'Hamstrings': ['Romanian Deadlifts', 'Leg Curls', 'Good Mornings'],
  'Calves': ['Calf Raises', 'Seated Calf Raises'],
  'Hip Stabilizers': ['Hip Abductions', 'Clamshells', 'Lateral Band Walks'],
};

// Border colors for each insight type
const INSIGHT_COLORS = {
  alert: '#EF4444', // Red - plateaus
  warning: '#F59E0B', // Amber - balance issues
  info: '#3B82F6', // Blue - focus suggestions
  success: '#22C55E', // Green - streak milestones
};

// ============================================================================
// DATA MAPS
// ============================================================================

interface ExerciseMetadata {
  push_pull: 'push' | 'pull' | null;
  upper_lower: 'upper' | 'lower' | null;
  is_compound: boolean;
  exercise_type: ExerciseType;
}

const EXERCISE_METADATA = exercisesData.reduce((acc, ex) => {
  acc[ex.name] = {
    push_pull: ex.push_pull as 'push' | 'pull' | null,
    upper_lower: ex.upper_lower as 'upper' | 'lower' | null,
    is_compound: ex.is_compound ?? false,
    exercise_type: (ex.exercise_type as ExerciseType) || 'weight',
  } satisfies ExerciseMetadata;
  return acc;
}, {} as Record<string, ExerciseMetadata>);

const EXERCISE_MUSCLES = exercisesData.reduce((acc, ex) => {
  if (ex.muscles) {
    acc[ex.name] = ex.muscles as unknown as Record<string, number>;
  }
  return acc;
}, {} as Record<string, Record<string, number>>);

// Build muscle hierarchy maps
const buildLeafToL2 = (): Record<string, string> => {
  const leafToL2: Record<string, string> = {};
  const hierarchy = hierarchyData.muscle_hierarchy as Record<string, any>;

  Object.entries(hierarchy).forEach(([l1, l1Data]) => {
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
  const workouts = __DEV__ && forceEmptyAnalytics ? [] : rawWorkouts;
  const userBodyWeight = useUserProfileStore((state) => state.profile?.weightLbs);

  return useMemo(() => {
    const insights: Insight[] = [];
    const emptyGrouped: Record<InsightType, Insight[]> = {
      plateau: [],
      balance: [],
      focus: [],
      streak: [],
    };

    if (!workouts.length) {
      return { insights, groupedInsights: emptyGrouped, orderedTypes: [], hasData: false };
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    // Filter workouts for different time ranges
    const weekWorkouts = workouts.filter((w) => new Date(w.date) >= weekAgo);
    const fourWeekWorkouts = workouts.filter((w) => new Date(w.date) >= fourWeeksAgo);

    // ========================================================================
    // 1. BALANCE ALERT
    // ========================================================================
    const balanceData = { push: 0, pull: 0, upper: 0, lower: 0 };

    weekWorkouts.forEach((workout) => {
      workout.exercises.forEach((exercise: any) => {
        const metadata = EXERCISE_METADATA[exercise.name];
        if (!metadata) return;

        const exerciseType = metadata.exercise_type || 'weight';
        if (exerciseType === 'cardio' || exerciseType === 'duration') return;

        const completedSets = exercise.sets.filter((set: any) => {
          if (!set.completed) return false;
          const reps = set.reps ?? 0;
          const weight = set.weight ?? 0;
          
          switch (exerciseType) {
            case 'weight':
              return reps > 0 && weight > 0;
            case 'bodyweight':
            case 'reps_only':
              return reps > 0;
            case 'assisted':
              return reps > 0;
            default:
              return false;
          }
        });

        let totalVolume = 0;
        completedSets.forEach((set: any) => {
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
                const assistanceWeight = set.assistanceWeight ?? 0;
                const effectiveWeight = Math.max(0, userBodyWeight - assistanceWeight);
                if (effectiveWeight > 0) {
                  setVolume = effectiveWeight * reps;
                }
              }
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
            totalVolume += setVolume;
          }
        });

        if (totalVolume <= 0) return;

        if (metadata.push_pull === 'push') {
          balanceData.push += totalVolume;
        } else if (metadata.push_pull === 'pull') {
          balanceData.pull += totalVolume;
        }

        // Calculate upper/lower from muscle data
        const muscleWeights = EXERCISE_MUSCLES[exercise.name];
        if (muscleWeights) {
          Object.entries(muscleWeights).forEach(([muscle, weight]) => {
            const muscleVolume = totalVolume * weight;
            const l2Category = LEAF_TO_L2[muscle];
            // Upper body muscle groups
            if (['Chest', 'Back', 'Shoulders', 'Arms'].includes(l2Category)) {
              balanceData.upper += muscleVolume;
            }
            // Lower body muscle groups
            if (['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Hip Stabilizers'].includes(l2Category)) {
              balanceData.lower += muscleVolume;
            }
          });
        }
      });
    });

    // Check push/pull balance
    const pushPullTotal = balanceData.push + balanceData.pull;
    if (pushPullTotal > 0) {
      const pushRatio = balanceData.push / pushPullTotal;
      const imbalance = Math.abs(pushRatio - 0.5) * 2; // 0 = perfect, 1 = 100% imbalanced
      
      if (imbalance > BALANCE_THRESHOLD) {
        const percentage = Math.round(imbalance * 100);
        const dominant = pushRatio > 0.5 ? 'Push' : 'Pull';
        const weak = pushRatio > 0.5 ? 'pull' : 'push';
        const suggestion = pushRatio > 0.5 
          ? 'Try adding a row or lat pulldown session this week.'
          : 'Try adding a press or push-up session this week.';

        insights.push({
          type: 'balance',
          priority: 'suggestion',
          title: 'Balance Alert',
          message: `${dominant} volume is ${percentage}% higher than ${weak}. ${suggestion}`,
          icon: '⚖️',
          borderColor: INSIGHT_COLORS.warning,
        });
      }
    }

    // Check upper/lower balance
    const upperLowerTotal = balanceData.upper + balanceData.lower;
    if (upperLowerTotal > 0) {
      const upperRatio = balanceData.upper / upperLowerTotal;
      const imbalance = Math.abs(upperRatio - 0.5) * 2;
      
      if (imbalance > BALANCE_THRESHOLD) {
        const percentage = Math.round(imbalance * 100);
        const dominant = upperRatio > 0.5 ? 'Upper body' : 'Lower body';
        const weak = upperRatio > 0.5 ? 'lower body' : 'upper body';
        const suggestion = upperRatio > 0.5 
          ? 'Try adding a squat or leg press session.'
          : 'Try adding a bench or row session.';

        insights.push({
          type: 'balance',
          priority: 'suggestion',
          title: 'Balance Alert',
          message: `${dominant} volume is ${percentage}% higher than ${weak}. ${suggestion}`,
          icon: '⚖️',
          borderColor: INSIGHT_COLORS.warning,
        });
      }
    }

    // ========================================================================
    // 2. PLATEAU DETECTION
    // ========================================================================
    // Track max weight per exercise per week over last 4 weeks
    const exerciseMaxByWeek: Record<string, number[]> = {};
    const exerciseSessionCount: Record<string, number> = {};

    fourWeekWorkouts.forEach((workout) => {
      const workoutDate = new Date(workout.date);
      const weekIndex = Math.floor((now.getTime() - workoutDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (weekIndex >= PLATEAU_WEEKS) return;

      workout.exercises.forEach((exercise: any) => {
        const metadata = EXERCISE_METADATA[exercise.name];
        if (!metadata) return;
        
        // Only track weight exercises for plateaus
        if (metadata.exercise_type !== 'weight') return;

        let maxWeight = 0;
        exercise.sets.forEach((set: any) => {
          if (set.completed && set.weight > 0 && set.reps > 0) {
            maxWeight = Math.max(maxWeight, set.weight);
          }
        });

        if (maxWeight > 0) {
          if (!exerciseMaxByWeek[exercise.name]) {
            exerciseMaxByWeek[exercise.name] = Array(PLATEAU_WEEKS).fill(0);
            exerciseSessionCount[exercise.name] = 0;
          }
          exerciseMaxByWeek[exercise.name][weekIndex] = Math.max(
            exerciseMaxByWeek[exercise.name][weekIndex],
            maxWeight
          );
          exerciseSessionCount[exercise.name]++;
        }
      });
    });

    // Find plateaued exercises
    Object.entries(exerciseMaxByWeek).forEach(([exerciseName, weekMaxes]) => {
      // Need at least 3 sessions to detect plateau
      if (exerciseSessionCount[exerciseName] < PLATEAU_MIN_SESSIONS) return;

      // Get non-zero max weights
      const validMaxes = weekMaxes.filter((m) => m > 0);
      if (validMaxes.length < 2) return;

      // Check if there's been improvement
      const oldestMax = validMaxes[validMaxes.length - 1];
      const newestMax = validMaxes[0];
      const improvement = newestMax - oldestMax;

      if (improvement < PLATEAU_MIN_IMPROVEMENT_LBS) {
        const weeksStalled = validMaxes.length;
        insights.push({
          type: 'plateau',
          priority: 'alert',
          title: 'Plateau Detected',
          message: `${exerciseName} hasn't improved in ${weeksStalled} weeks. Consider a deload or form check.`,
          icon: '📈',
          borderColor: INSIGHT_COLORS.alert,
        });
      }
    });

    // ========================================================================
    // 3. STREAK MILESTONE
    // ========================================================================
    const today = now.toISOString().split('T')[0];
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

    // Calculate longest streak (all time)
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;
    const sortedDatesAsc = [...sortedDates].reverse();

    for (const date of sortedDatesAsc) {
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

    // If current streak equals or exceeds longest streak (and is at least 3 days), celebrate!
    if (currentStreak >= 3 && currentStreak >= longestStreak) {
      insights.push({
        type: 'streak',
        priority: 'celebration',
        title: 'Streak Milestone!',
        message: `${currentStreak}-day training streak! ${currentStreak === longestStreak ? 'Your longest ever!' : 'Your longest this month.'}`,
        icon: '🔥',
        borderColor: INSIGHT_COLORS.success,
      });
    }

    // ========================================================================
    // 4. FOCUS SUGGESTION
    // ========================================================================
    const muscleGroupVolume: Record<string, number> = {};
    let totalWeekVolume = 0;

    weekWorkouts.forEach((workout) => {
      workout.exercises.forEach((exercise: any) => {
        const metadata = EXERCISE_METADATA[exercise.name];
        if (!metadata) return;

        const exerciseType = metadata.exercise_type || 'weight';
        if (exerciseType === 'cardio' || exerciseType === 'duration' || exerciseType === 'reps_only') return;

        const muscleWeights = EXERCISE_MUSCLES[exercise.name];
        if (!muscleWeights) return;

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
                const assistanceWeight = set.assistanceWeight ?? 0;
                const effectiveWeight = Math.max(0, userBodyWeight - assistanceWeight);
                if (effectiveWeight > 0) {
                  setVolume = effectiveWeight * reps;
                }
              }
              break;
            case 'weight':
            default:
              const weight = set.weight ?? 0;
              if (weight > 0) {
                setVolume = weight * reps;
              }
              break;
          }

          if (setVolume <= 0) return;

          Object.entries(muscleWeights).forEach(([muscle, muscleWeight]) => {
            const contribution = setVolume * muscleWeight;
            const l2Category = LEAF_TO_L2[muscle];
            if (l2Category) {
              muscleGroupVolume[l2Category] = (muscleGroupVolume[l2Category] || 0) + contribution;
              totalWeekVolume += contribution;
            }
          });
        });
      });
    });

    // Find underrepresented muscle groups
    if (totalWeekVolume > 0) {
      Object.entries(muscleGroupVolume).forEach(([muscleGroup, volume]) => {
        const percentage = volume / totalWeekVolume;
        if (percentage < FOCUS_VOLUME_THRESHOLD && percentage > 0) {
          const displayPercentage = Math.round(percentage * 100);
          const suggestions = FOCUS_SUGGESTIONS[muscleGroup] || [];
          const suggestionText = suggestions.length > 0 
            ? ` Try adding ${suggestions.slice(0, 2).join(' or ')}.`
            : '';

          insights.push({
            type: 'focus',
            priority: 'suggestion',
            title: 'Focus Suggestion',
            message: `${muscleGroup} volume is only ${displayPercentage}% of your total.${suggestionText}`,
            icon: '🎯',
            borderColor: INSIGHT_COLORS.info,
            suggestions,
          });
        }
      });
    }

    // ========================================================================
    // GROUP BY TYPE AND SORT BY PRIORITY
    // ========================================================================
    // Group insights by type for expandable cards
    const groupedInsights: Record<InsightType, Insight[]> = {
      plateau: [],
      balance: [],
      focus: [],
      streak: [],
    };

    insights.forEach((insight) => {
      groupedInsights[insight.type].push(insight);
    });

    // Priority order for card types: alerts (plateau) > suggestions (balance, focus) > celebrations (streak)
    const typeOrder: InsightType[] = ['plateau', 'balance', 'focus', 'streak'];

    // Filter to only types that have insights and order by priority
    const orderedTypes = typeOrder.filter((type) => groupedInsights[type].length > 0);

    return {
      insights,
      groupedInsights,
      orderedTypes,
      hasData: true,
    };
  }, [workouts, userBodyWeight]);
};
