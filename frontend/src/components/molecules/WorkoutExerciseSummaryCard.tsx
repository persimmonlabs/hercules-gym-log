/**
 * WorkoutExerciseSummaryCard
 * Molecule component that visualizes an exercise with its logged sets.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Layout } from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { colors, radius, spacing, sizing } from '@/constants/theme';
import { exercises as exerciseCatalog, getExerciseTypeByName } from '@/constants/exercises';
import type { WorkoutExercise, SetLog } from '@/types/workout';
import type { ExerciseType } from '@/types/exercise';
import { useSettingsStore } from '@/store/settingsStore';
import { useCustomExerciseStore } from '@/store/customExerciseStore';

interface WorkoutExerciseSummaryCardProps {
  exercise: WorkoutExercise;
  index: number;
}

/**
 * Format duration in seconds to a readable string
 * Uses hr, min, s for clarity (not m which could be confused with meters)
 */
const formatDuration = (seconds: number): string => {
  if (seconds >= 3600) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (mins === 0 && secs === 0) return `${hrs} hr`;
    if (secs === 0) return `${hrs} hr ${mins} min`;
    return `${hrs} hr ${mins} min ${secs} s`;
  }
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins} min ${secs} s` : `${mins} min`;
  }
  return `${seconds} s`;
};

/**
 * Get the effort label for a set based on exercise type
 * For cardio: distance, time, and avg pace
 */
const getSetEffortLabel = (
  set: SetLog,
  exerciseType: ExerciseType,
  formatWeight: (lbs: number) => string,
  formatDistanceForExercise: (miles: number, distanceUnit?: 'miles' | 'meters' | 'floors', decimals?: number) => string,
  distanceUnit?: 'miles' | 'meters' | 'floors',
  distanceUnitPref?: 'mi' | 'km'
): string => {
  switch (exerciseType) {
    case 'cardio':
      const distance = formatDistanceForExercise(set.distance ?? 0, distanceUnit, 2);
      const duration = set.duration ? formatDuration(set.duration) : '0min';
      
      // Calculate pace
      let paceStr = '--:--';
      const distanceMiles = set.distance ?? 0;
      const durationSeconds = set.duration ?? 0;
      if (distanceMiles > 0 && durationSeconds > 0) {
        const hours = durationSeconds / 3600;
        const paceMinPerMile = hours / distanceMiles * 60;
        const pacePerUnit = distanceUnitPref === 'km' ? paceMinPerMile * 1.60934 : paceMinPerMile;
        const mins = Math.floor(pacePerUnit);
        const secs = Math.floor((pacePerUnit - mins) * 60);
        const paceUnit = distanceUnitPref === 'km' ? '/km' : '/mi';
        paceStr = `${mins}:${secs.toString().padStart(2, '0')} ${paceUnit}`;
      }
      
      return `${distance} • ${duration} • ${paceStr}`;
    
    case 'duration':
      return formatDuration(set.duration ?? 0);
    
    case 'bodyweight':
    case 'reps_only':
      return `${set.reps ?? 0} reps`;
    
    case 'assisted':
      return `${formatWeight(set.assistanceWeight ?? 0)} assist • ${set.reps ?? 0} reps`;
    
    case 'weight':
    default:
      return `${formatWeight(set.weight ?? 0)} × ${set.reps ?? 0} reps`;
  }
};

/**
 * WorkoutExerciseSummaryCard
 * Displays an exercise name alongside its logged sets and completion state.
 *
 * @param exercise - The exercise data with sets to render.
 * @param index - Index for display ordering.
 */
export const WorkoutExerciseSummaryCard: React.FC<WorkoutExerciseSummaryCardProps> = ({
  exercise,
  index,
}) => {
  // Subscribe to unit values to trigger re-renders when units change
  const weightUnit = useSettingsStore((state) => state.weightUnit);
  const distanceUnitPref = useSettingsStore((state) => state.distanceUnit);
  const { formatWeight, formatDistanceForExercise } = useSettingsStore();
  const customExercises = useCustomExerciseStore((state) => state.customExercises);
  // Look up exercise type from catalog and custom exercises
  const catalogEntry = exerciseCatalog.find(e => e.name === exercise.name);
  const exerciseType: ExerciseType = getExerciseTypeByName(exercise.name, customExercises);
  const exerciseDistanceUnit = catalogEntry?.distanceUnit;

  // Show completed sets in the summary.
  // For cardio/duration exercises, also include sets with meaningful data
  // (duration > 0 or distance > 0) even if not explicitly marked completed,
  // since users often enter time/distance without pressing "Complete set".
  const isTimedType = exerciseType === 'cardio' || exerciseType === 'duration';
  const completedSets = exercise.sets
    .map((set, originalIndex) => ({ set, originalIndex }))
    .filter(({ set }) => {
      if (set.completed) return true;
      if (isTimedType) {
        return (set.duration ?? 0) > 0 || (set.distance ?? 0) > 0;
      }
      return false;
    });

  // Don't render the card if no sets have data
  if (completedSets.length === 0) {
    return null;
  }

  return (
    <Animated.View layout={Layout.springify()} style={styles.wrapper}>
      <SurfaceCard tone="card" padding="lg" showAccentStripe={false} style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            <Text style={{ fontSize: 18, fontWeight: '500', color: colors.text.primary }}>
              {exercise.name}
            </Text>
          </View>
        </View>

        <View style={styles.setList}>
          {completedSets.map(({ set, originalIndex }, displayIndex) => {
            const effortLabel = getSetEffortLabel(set, exerciseType, formatWeight, formatDistanceForExercise, exerciseDistanceUnit, distanceUnitPref);

            return (
              <View key={`${exercise.name}-${originalIndex}`} style={styles.setRow}>
                <View style={styles.setCircle}>
                  <Text variant="bodySemibold" style={styles.setCircleText}>
                    {displayIndex + 1}
                  </Text>
                </View>
                <Text variant="bodySemibold" color="primary" style={styles.setEffort}>
                  {effortLabel}
                </Text>
              </View>
            );
          })}
        </View>
      </SurfaceCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  card: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flex: 1,
    gap: spacing.xs,
    flexShrink: 1,
  },
  setList: {
    gap: spacing.sm,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
  },
  setCircle: {
    width: sizing.iconLG,
    height: sizing.iconLG,
    borderRadius: radius.full,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.accent.orange,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    display: 'flex',
  },
  setCircleText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
    includeFontPadding: false,
  },
  setEffort: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 32,
    includeFontPadding: false,
  },
});
