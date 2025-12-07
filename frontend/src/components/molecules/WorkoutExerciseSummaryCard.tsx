/**
 * WorkoutExerciseSummaryCard
 * Molecule component that visualizes an exercise with its logged sets.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Layout } from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { colors, radius, spacing } from '@/constants/theme';
import { exercises as exerciseCatalog } from '@/constants/exercises';
import type { WorkoutExercise, SetLog } from '@/types/workout';
import type { ExerciseType } from '@/types/exercise';

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
 * For cardio: distance on left, time on right
 */
const getSetEffortLabel = (set: SetLog, exerciseType: ExerciseType): string => {
  switch (exerciseType) {
    case 'cardio':
      const distance = set.distance ? `${set.distance.toFixed(1)} mi` : '0 mi';
      const duration = set.duration ? formatDuration(set.duration) : '0min';
      return `${distance} • ${duration}`;
    
    case 'duration':
      return formatDuration(set.duration ?? 0);
    
    case 'bodyweight':
    case 'reps_only':
      return `${set.reps ?? 0} reps`;
    
    case 'assisted':
      const assistance = set.assistanceWeight ?? 0;
      return `${assistance} lbs assist • ${set.reps ?? 0} reps`;
    
    case 'weight':
    default:
      return `${set.weight ?? 0} lbs × ${set.reps ?? 0} reps`;
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
  // Look up exercise type from catalog
  const catalogEntry = exerciseCatalog.find(e => e.name === exercise.name);
  const exerciseType: ExerciseType = catalogEntry?.exerciseType || 'weight';

  return (
    <Animated.View layout={Layout.springify()} style={styles.wrapper}>
      <SurfaceCard tone="card" padding="lg" style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            <Text variant="bodySemibold" color="primary">
              {exercise.name}
            </Text>
          </View>
        </View>

        <View style={styles.setList}>
          {exercise.sets.map((set, setIndex) => {
            const effortLabel = getSetEffortLabel(set, exerciseType);

            return (
              <View key={`${exercise.name}-${setIndex}`} style={styles.setRow}>
                <View style={styles.setMeta}>
                  <Text variant="bodySemibold" color="primary">
                    {`Set ${setIndex + 1}`}
                  </Text>
                  <Text variant="body" color="secondary">
                    {effortLabel}
                  </Text>
                </View>
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
  },
  setList: {
    gap: spacing.sm,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.mdCompact,
    backgroundColor: colors.surface.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent.orangeLight,
  },
  setMeta: {
    flex: 1,
    gap: spacing.xxxs,
  },
});
