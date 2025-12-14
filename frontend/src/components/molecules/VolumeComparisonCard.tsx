/**
 * VolumeComparisonCard
 * Shows this week vs last week volume comparison
 * Premium feature for category screens
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { colors, spacing, radius } from '@/constants/theme';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { useSettingsStore } from '@/store/settingsStore';
import exercisesData from '@/data/exercises.json';

const EXERCISE_MUSCLES = exercisesData.reduce((acc, ex) => {
  if (ex.muscles) {
    acc[ex.name] = ex.muscles as unknown as Record<string, number>;
  }
  return acc;
}, {} as Record<string, Record<string, number>>);

interface ComparisonItemProps {
  label: string;
  current: number;
  previous: number;
  formatValue: (lbs: number) => string;
}

const ComparisonItem: React.FC<ComparisonItemProps> = ({ label, current, previous, formatValue }) => {
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const isPositive = change > 0;
  const isNeutral = Math.abs(change) < 1;

  return (
    <View style={styles.comparisonItem}>
      <Text variant="caption" color="secondary" style={styles.itemLabel}>
        {label}
      </Text>
      <View style={styles.itemValues}>
        <Text variant="bodySemibold" color="primary">
          {formatValue(current)}
        </Text>
        {!isNeutral && (
          <View style={[styles.changeBadge, isPositive ? styles.positive : styles.negative]}>
            <Ionicons
              name={isPositive ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={isPositive ? colors.accent.success : colors.accent.warning}
            />
            <Text
              variant="captionSmall"
              style={{ color: isPositive ? colors.accent.success : colors.accent.warning }}
            >
              {Math.abs(Math.round(change))}%
            </Text>
          </View>
        )}
      </View>
      <Text variant="captionSmall" color="tertiary">
        vs {formatValue(previous)} last week
      </Text>
    </View>
  );
};

export const VolumeComparisonCard: React.FC = () => {
  const workouts = useWorkoutSessionsStore((state) => state.workouts);
  const { formatWeight } = useSettingsStore();

  const { thisWeek, lastWeek } = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const calculateVolume = (startDate: Date, endDate: Date) => {
      let total = 0;
      let upper = 0;
      let lower = 0;
      let core = 0;

      workouts
        .filter((w) => {
          const d = new Date(w.date);
          return d >= startDate && d < endDate;
        })
        .forEach((workout) => {
          workout.exercises.forEach((exercise) => {
            const weights = EXERCISE_MUSCLES[exercise.name];
            if (!weights) return;

            exercise.sets.forEach((set) => {
              if (!set.completed || (set.weight ?? 0) <= 0) return;
              const vol = (set.weight ?? 0) * (set.reps ?? 0);
              total += vol;

              // Simplified body part attribution
              const muscleNames = Object.keys(weights);
              const hasUpper = muscleNames.some((m) =>
                ['Chest', 'Back', 'Shoulders', 'Arms', 'Biceps', 'Triceps', 'Lats', 'Traps'].some(
                  (u) => m.includes(u)
                )
              );
              const hasLower = muscleNames.some((m) =>
                ['Quad', 'Ham', 'Glute', 'Calf', 'Hip'].some((l) => m.includes(l))
              );
              const hasCore = muscleNames.some((m) =>
                ['Abs', 'Oblique', 'Core'].some((c) => m.includes(c))
              );

              if (hasUpper) upper += vol;
              if (hasLower) lower += vol;
              if (hasCore) core += vol;
            });
          });
        });

      return { total, upper, lower, core };
    };

    return {
      thisWeek: calculateVolume(oneWeekAgo, now),
      lastWeek: calculateVolume(twoWeeksAgo, oneWeekAgo),
    };
  }, [workouts]);

  const hasData = thisWeek.total > 0 || lastWeek.total > 0;

  if (!hasData) {
    return (
      <SurfaceCard tone="neutral" padding="md">
        <View style={styles.header}>
          <Text variant="heading3" color="primary">This Week vs Last Week</Text>
          <View style={styles.headerStripe} />
        </View>
        <View style={styles.emptyState}>
          <Text variant="body" color="tertiary" style={styles.emptyText}>
            Need at least 2 weeks of data for comparison
          </Text>
        </View>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard tone="neutral" padding="md">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="heading3" color="primary">This Week vs Last Week</Text>
          <View style={styles.headerStripe} />
        </View>
        <View style={styles.grid}>
          <ComparisonItem label="Total Volume" current={thisWeek.total} previous={lastWeek.total} formatValue={formatWeight} />
          <ComparisonItem label="Upper Body" current={thisWeek.upper} previous={lastWeek.upper} formatValue={formatWeight} />
          <ComparisonItem label="Lower Body" current={thisWeek.lower} previous={lastWeek.lower} formatValue={formatWeight} />
          <ComparisonItem label="Core" current={thisWeek.core} previous={lastWeek.core} formatValue={formatWeight} />
        </View>
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  headerStripe: {
    height: 4,
    width: '100%',
    backgroundColor: colors.accent.orange,
    borderRadius: 2,
    marginTop: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  comparisonItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface.subtle,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xxs,
  },
  itemLabel: {
    marginBottom: spacing.xs,
  },
  itemValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
    gap: 2,
  },
  positive: {
    backgroundColor: 'rgba(42, 157, 143, 0.15)',
  },
  negative: {
    backgroundColor: 'rgba(231, 111, 81, 0.15)',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
  },
});
