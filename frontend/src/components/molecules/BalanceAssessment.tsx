/**
 * BalanceAssessment
 * Shows push/pull and other muscle balance metrics
 * Premium feature for identifying training imbalances
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { colors, spacing, radius } from '@/constants/theme';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import exercisesData from '@/data/exercises.json';

const EXERCISE_MUSCLES = exercisesData.reduce((acc, ex) => {
  if (ex.muscles) {
    acc[ex.name] = ex.muscles as unknown as Record<string, number>;
  }
  return acc;
}, {} as Record<string, Record<string, number>>);

// Muscle categorization for balance analysis
const PUSH_MUSCLES = ['Chest', 'Front Delts', 'Triceps', 'Upper Chest', 'Mid Chest', 'Lower Chest'];
const PULL_MUSCLES = ['Back', 'Lats', 'Rear Delts', 'Biceps', 'Mid Back', 'Upper Back', 'Traps'];
const QUAD_DOMINANT = ['Quads', 'Quad'];
const HIP_DOMINANT = ['Hamstrings', 'Glutes', 'Hams'];

interface BalanceBarProps {
  label: string;
  leftLabel: string;
  rightLabel: string;
  leftValue: number;
  rightValue: number;
}

const BalanceBar: React.FC<BalanceBarProps> = ({
  label,
  leftLabel,
  rightLabel,
  leftValue,
  rightValue,
}) => {
  const total = leftValue + rightValue;
  const leftPercent = total > 0 ? (leftValue / total) * 100 : 50;
  const rightPercent = total > 0 ? (rightValue / total) * 100 : 50;

  const getAssessment = () => {
    if (total === 0) return { text: 'No data', color: colors.text.tertiary, icon: 'remove' as const };
    const diff = Math.abs(leftPercent - 50);
    if (diff < 10) return { text: 'Balanced', color: colors.accent.success, icon: 'checkmark-circle' as const };
    if (diff < 20) return { text: 'Slight imbalance', color: colors.accent.warning, icon: 'alert-circle' as const };
    return { text: 'Imbalanced', color: colors.accent.red, icon: 'warning' as const };
  };

  const assessment = getAssessment();

  return (
    <View style={styles.balanceItem}>
      <View style={styles.balanceHeader}>
        <Text variant="labelMedium" color="primary">{label}</Text>
        <View style={styles.assessmentBadge}>
          <Ionicons name={assessment.icon} size={14} color={assessment.color} />
          <Text variant="captionSmall" style={{ color: assessment.color }}>
            {assessment.text}
          </Text>
        </View>
      </View>

      <View style={styles.barContainer}>
        <View style={[styles.barSegment, styles.leftBar, { flex: leftPercent }]}>
          <Text variant="captionSmall" color="primary" style={styles.barText}>
            {Math.round(leftPercent)}%
          </Text>
        </View>
        <View style={[styles.barSegment, styles.rightBar, { flex: rightPercent }]}>
          <Text variant="captionSmall" color="primary" style={styles.barText}>
            {Math.round(rightPercent)}%
          </Text>
        </View>
      </View>

      <View style={styles.labelRow}>
        <Text variant="caption" color="secondary">{leftLabel}</Text>
        <Text variant="caption" color="secondary">{rightLabel}</Text>
      </View>
    </View>
  );
};

export const BalanceAssessment: React.FC = () => {
  const workouts = useWorkoutSessionsStore((state) => state.workouts);

  const balanceData = useMemo(() => {
    let push = 0;
    let pull = 0;
    let quad = 0;
    let hip = 0;
    let upper = 0;
    let lower = 0;

    // Only consider last 30 days
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    workouts
      .filter((w) => new Date(w.date) >= cutoff)
      .forEach((workout) => {
        workout.exercises.forEach((exercise) => {
          const muscles = EXERCISE_MUSCLES[exercise.name];
          if (!muscles) return;

          const completedSets = exercise.sets.filter((s) => s.completed && (s.weight ?? 0) > 0).length;
          if (completedSets === 0) return;

          Object.keys(muscles).forEach((muscle) => {
            const contribution = completedSets;

            if (PUSH_MUSCLES.some((p) => muscle.includes(p))) push += contribution;
            if (PULL_MUSCLES.some((p) => muscle.includes(p))) pull += contribution;
            if (QUAD_DOMINANT.some((q) => muscle.includes(q))) quad += contribution;
            if (HIP_DOMINANT.some((h) => muscle.includes(h))) hip += contribution;

            // Upper vs Lower
            if ([...PUSH_MUSCLES, ...PULL_MUSCLES, 'Arms', 'Shoulders'].some((u) => muscle.includes(u))) {
              upper += contribution;
            }
            if ([...QUAD_DOMINANT, ...HIP_DOMINANT, 'Calf', 'Hip'].some((l) => muscle.includes(l))) {
              lower += contribution;
            }
          });
        });
      });

    return { push, pull, quad, hip, upper, lower };
  }, [workouts]);

  const hasData = Object.values(balanceData).some((v) => v > 0);

  if (!hasData) {
    return (
      <View style={styles.emptyState}>
        <Text variant="body" color="tertiary" style={styles.emptyText}>
          Complete some workouts to see balance analysis
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="labelMedium" color="secondary" style={styles.sectionLabel}>
        TRAINING BALANCE • LAST 30 DAYS
      </Text>

      <BalanceBar
        label="Push / Pull"
        leftLabel="Push"
        rightLabel="Pull"
        leftValue={balanceData.push}
        rightValue={balanceData.pull}
      />

      <BalanceBar
        label="Upper / Lower"
        leftLabel="Upper"
        rightLabel="Lower"
        leftValue={balanceData.upper}
        rightValue={balanceData.lower}
      />

      <BalanceBar
        label="Quad / Hip Dominant"
        leftLabel="Quads"
        rightLabel="Glutes/Hams"
        leftValue={balanceData.quad}
        rightValue={balanceData.hip}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  sectionLabel: {
    letterSpacing: 1,
  },
  balanceItem: {
    gap: spacing.sm,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assessmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  barContainer: {
    flexDirection: 'row',
    height: 28,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  barSegment: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftBar: {
    backgroundColor: colors.accent.orange,
  },
  rightBar: {
    backgroundColor: colors.accent.info,
  },
  barText: {
    color: colors.text.onAccent,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
  },
});
