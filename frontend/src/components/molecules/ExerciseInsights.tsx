/**
 * ExerciseInsights
 * Shows most-used and potentially neglected exercises
 * Premium feature for training optimization
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { colors, spacing, radius } from '@/constants/theme';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';

interface ExerciseStats {
  name: string;
  count: number;
  lastPerformed: string;
  totalSets: number;
}

interface ExerciseRowProps {
  exercise: ExerciseStats;
  rank: number;
  type: 'top' | 'recent';
}

const ExerciseRow: React.FC<ExerciseRowProps> = ({ exercise, rank, type }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  return (
    <View style={styles.exerciseRow}>
      <View style={[styles.rankBadge, type === 'top' ? styles.topRank : styles.recentRank]}>
        <Text variant="captionSmall" style={styles.rankText}>
          {rank}
        </Text>
      </View>
      <View style={styles.exerciseInfo}>
        <Text variant="body" color="primary" numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text variant="captionSmall" color="tertiary">
          {exercise.count}× performed • {exercise.totalSets} total sets
        </Text>
      </View>
      <Text variant="caption" color="secondary">
        {formatDate(exercise.lastPerformed)}
      </Text>
    </View>
  );
};

export const ExerciseInsights: React.FC = () => {
  const workouts = useWorkoutSessionsStore((state) => state.workouts);

  const { topExercises, recentExercises } = useMemo(() => {
    const exerciseMap = new Map<string, ExerciseStats>();

    workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        const existing = exerciseMap.get(exercise.name);
        const completedSets = exercise.sets.filter((s) => s.completed).length;

        if (existing) {
          existing.count += 1;
          existing.totalSets += completedSets;
          if (new Date(workout.date) > new Date(existing.lastPerformed)) {
            existing.lastPerformed = workout.date;
          }
        } else {
          exerciseMap.set(exercise.name, {
            name: exercise.name,
            count: 1,
            lastPerformed: workout.date,
            totalSets: completedSets,
          });
        }
      });
    });

    const allExercises = Array.from(exerciseMap.values());

    // Top exercises by frequency
    const topExercises = [...allExercises]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Most recently performed (unique exercises)
    const recentExercises = [...allExercises]
      .sort((a, b) => new Date(b.lastPerformed).getTime() - new Date(a.lastPerformed).getTime())
      .slice(0, 5);

    return { topExercises, recentExercises };
  }, [workouts]);

  const hasData = topExercises.length > 0;

  if (!hasData) {
    return (
      <View style={styles.emptyState}>
        <Text variant="body" color="tertiary" style={styles.emptyText}>
          Complete some workouts to see exercise insights
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Most Performed */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trophy" size={18} color={colors.accent.orange} />
          <Text variant="labelMedium" color="secondary" style={styles.sectionLabel}>
            MOST PERFORMED
          </Text>
        </View>
        {topExercises.map((exercise, index) => (
          <ExerciseRow
            key={exercise.name}
            exercise={exercise}
            rank={index + 1}
            type="top"
          />
        ))}
      </View>

      {/* Recently Performed */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time" size={18} color={colors.accent.info} />
          <Text variant="labelMedium" color="secondary" style={styles.sectionLabel}>
            RECENTLY PERFORMED
          </Text>
        </View>
        {recentExercises.map((exercise, index) => (
          <ExerciseRow
            key={`recent-${exercise.name}`}
            exercise={exercise}
            rank={index + 1}
            type="recent"
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    letterSpacing: 1,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.subtle,
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRank: {
    backgroundColor: colors.accent.orange,
  },
  recentRank: {
    backgroundColor: colors.accent.info,
  },
  rankText: {
    color: colors.text.onAccent,
    fontWeight: '700',
  },
  exerciseInfo: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
  },
});
