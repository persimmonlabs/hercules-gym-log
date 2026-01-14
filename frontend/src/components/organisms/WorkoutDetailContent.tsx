/**
 * WorkoutDetailContent
 * Organism that renders the core metrics and exercise list for a workout.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View, type TextStyle } from 'react-native';
import Animated, { Layout } from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { WorkoutExerciseSummaryCard } from '@/components/molecules/WorkoutExerciseSummaryCard';
import { spacing, typography, colors } from '@/constants/theme';
import type { Workout } from '@/types/workout';
import { formatDurationLabel, getWorkoutTotals, getWorkoutVolume } from '@/utils/workout';
import { useSettingsStore } from '@/store/settingsStore';

interface WorkoutDetailContentProps {
  workout: Workout;
}

/**
 * WorkoutDetailContent
 *
 * @param workout - Completed workout session to visualize.
 */
export const WorkoutDetailContent: React.FC<WorkoutDetailContentProps> = ({ workout }) => {
  // Subscribe to weightUnit to trigger re-renders when units change
  const weightUnit = useSettingsStore((state) => state.weightUnit);
  const { formatWeight } = useSettingsStore();
  const durationLabel = useMemo(() => formatDurationLabel(workout.duration), [workout.duration]);
  const { completedSets } = useMemo(() => getWorkoutTotals(workout), [workout]);
  const totalVolume = useMemo(() => getWorkoutVolume(workout), [workout]);
  const volumeLabel = useMemo(() => {
    if (totalVolume === 0) return '—';
    return formatWeight(totalVolume);
  }, [totalVolume, formatWeight, weightUnit]);

  return (
    <Animated.View layout={Layout.springify()} style={styles.container}>
      <View style={styles.summarySection}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: colors.text.primary }}>
          Summary
        </Text>
        <SurfaceCard tone="card" padding="xl" showAccentStripe={false} style={styles.metricsCard}>
          <View style={styles.metricsColumn}>
            <View style={styles.metricRow}>
              <Text style={{ fontSize: 20, fontWeight: '500', color: colors.text.primary }}>
                Duration:
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.accent.orange, textAlign: 'right', flexShrink: 0 }}>
                {durationLabel}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={{ fontSize: 20, fontWeight: '500', color: colors.text.primary }}>
                Sets:
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.accent.orange, textAlign: 'right', flexShrink: 0 }}>
                {completedSets}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={{ fontSize: 20, fontWeight: '500', color: colors.text.primary }}>
                Volume:
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.accent.orange, textAlign: 'right', flexShrink: 0 }}>
                {volumeLabel}
              </Text>
            </View>
          </View>
        </SurfaceCard>
      </View>

      <View style={styles.exerciseSection}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: colors.text.primary }}>
          Exercises
        </Text>
        <View style={styles.exerciseList}>
          {workout.exercises.map((exercise, index) => (
            <WorkoutExerciseSummaryCard key={`${exercise.name}-${index}`} exercise={exercise} index={index} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing['2xl'],
  },
  metricsCard: {
    gap: spacing.lg,
    overflow: 'hidden',
  },
  metricsColumn: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    ...typography.heading3,
    lineHeight: typography.heading3.lineHeight,
  } as TextStyle,
  summarySection: {
    gap: spacing.md,
  },
  exerciseSection: {
    gap: spacing.md,
  },
  exerciseList: {
    gap: spacing.md,
  },
  metricValue: {
    ...typography.heading2,
    lineHeight: typography.heading2.lineHeight,
    textAlign: 'right',
    flexShrink: 0,
  } as TextStyle,
});
