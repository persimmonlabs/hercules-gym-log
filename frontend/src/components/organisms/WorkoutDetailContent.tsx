/**
 * WorkoutDetailContent
 * Organism that renders the core metrics and exercise list for a workout.
 * For outdoor GPS sessions, shows a route map and Distance/Time/Pace instead.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View, type TextStyle } from 'react-native';
import Animated, { Layout } from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { WorkoutExerciseSummaryCard } from '@/components/molecules/WorkoutExerciseSummaryCard';
import { OutdoorRouteMapCard } from '@/components/molecules/OutdoorRouteMapCard';
import { spacing, typography, colors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Workout } from '@/types/workout';
import { formatDurationLabel, getWorkoutTotals, getWorkoutVolume } from '@/utils/workout';
import { formatElapsedTime, formatPace, calculatePace } from '@/utils/geo';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserProfileStore } from '@/store/userProfileStore';

interface WorkoutDetailContentProps {
  workout: Workout;
}

/**
 * WorkoutDetailContent
 *
 * @param workout - Completed workout session to visualize.
 */
export const WorkoutDetailContent: React.FC<WorkoutDetailContentProps> = ({ workout }) => {
  const { theme } = useTheme();
  // Subscribe to weightUnit to trigger re-renders when units change
  const weightUnit = useSettingsStore((state) => state.weightUnit);
  const distanceUnitPref = useSettingsStore((state) => state.distanceUnit);
  const { formatWeight, formatDistance } = useSettingsStore();

  const isOutdoorSession = useMemo(
    () => !!(workout.routeCoordinates && workout.routeCoordinates.length >= 2),
    [workout.routeCoordinates],
  );

  // ── Standard workout metrics ──
  const durationLabel = useMemo(() => formatDurationLabel(workout.duration), [workout.duration]);
  const { completedSets } = useMemo(() => getWorkoutTotals(workout), [workout]);
  const userBodyWeight = useUserProfileStore((state) => state.profile?.weightLbs);
  const totalVolume = useMemo(() => getWorkoutVolume(workout, userBodyWeight), [workout, userBodyWeight]);
  const volumeLabel = useMemo(() => {
    if (totalVolume === 0) return '—';
    return formatWeight(totalVolume);
  }, [totalVolume, formatWeight, weightUnit]);

  // ── Outdoor session metrics ──
  const outdoorMetrics = useMemo(() => {
    if (!isOutdoorSession) return null;

    const set = (workout.exercises ?? [])[0]?.sets[0];
    const distanceMiles = set?.distance ?? 0;
    const durationSeconds = workout.duration ?? set?.duration ?? 0;

    const distanceLabel = formatDistance(distanceMiles, 2);
    const timeLabel = formatElapsedTime(durationSeconds);

    const paceSecondsPerMile = calculatePace(distanceMiles, durationSeconds);
    const pacePerUnit = distanceUnitPref === 'km' && paceSecondsPerMile
      ? paceSecondsPerMile / 1.60934
      : paceSecondsPerMile;
    const paceLabel = `${formatPace(pacePerUnit)} ${distanceUnitPref === 'km' ? '/km' : '/mi'}`;

    return { distanceLabel, timeLabel, paceLabel };
  }, [isOutdoorSession, workout, formatDistance, distanceUnitPref]);

  // ── Outdoor session layout ──
  if (isOutdoorSession && outdoorMetrics) {
    return (
      <Animated.View layout={Layout.springify()} style={styles.container}>
        <OutdoorRouteMapCard coordinates={workout.routeCoordinates!} />

        <View style={styles.summarySection}>
          <Text style={{ fontSize: 24, fontWeight: '600', color: theme.text.primary }}>
            Summary
          </Text>
          <SurfaceCard tone="card" padding="xl" showAccentStripe={false} style={styles.metricsCard}>
            <View style={styles.metricsColumn}>
              <View style={styles.metricRow}>
                <Text style={{ fontSize: 20, fontWeight: '500', color: theme.text.secondary }}>
                  Distance:
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: theme.accent.orange, textAlign: 'right', flexShrink: 0 }}>
                  {outdoorMetrics.distanceLabel}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={{ fontSize: 20, fontWeight: '500', color: theme.text.secondary }}>
                  Time:
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: theme.accent.orange, textAlign: 'right', flexShrink: 0 }}>
                  {outdoorMetrics.timeLabel}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={{ fontSize: 20, fontWeight: '500', color: theme.text.secondary }}>
                  Pace:
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: theme.accent.orange, textAlign: 'right', flexShrink: 0 }}>
                  {outdoorMetrics.paceLabel}
                </Text>
              </View>
            </View>
          </SurfaceCard>
        </View>
      </Animated.View>
    );
  }

  // ── Standard workout layout ──
  return (
    <Animated.View layout={Layout.springify()} style={styles.container}>
      <View style={styles.summarySection}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: theme.text.primary }}>
          Summary
        </Text>
        <SurfaceCard tone="card" padding="xl" showAccentStripe={false} style={styles.metricsCard}>
          <View style={styles.metricsColumn}>
            <View style={styles.metricRow}>
              <Text style={{ fontSize: 20, fontWeight: '500', color: theme.text.secondary }}>
                Duration:
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.accent.orange, textAlign: 'right', flexShrink: 0 }}>
                {durationLabel}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={{ fontSize: 20, fontWeight: '500', color: theme.text.secondary }}>
                Sets:
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.accent.orange, textAlign: 'right', flexShrink: 0 }}>
                {completedSets}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={{ fontSize: 20, fontWeight: '500', color: theme.text.secondary }}>
                Volume:
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.accent.orange, textAlign: 'right', flexShrink: 0 }}>
                {volumeLabel}
              </Text>
            </View>
          </View>
        </SurfaceCard>
      </View>

      <View style={styles.exerciseSection}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: theme.text.primary }}>
          Exercises
        </Text>
        <View style={styles.exerciseList}>
          {(workout.exercises ?? []).map((exercise, index) => (
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
