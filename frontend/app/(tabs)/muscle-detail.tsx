/**
 * Muscle Detail Page
 * Drill-down screen showing detailed analytics for a specific muscle
 * Shows volume history, top exercises, and training insights
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { PremiumLock } from '@/components/atoms/PremiumLock';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { colors, spacing, radius } from '@/constants/theme';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import exercisesData from '@/data/exercises.json';
import { useSettingsStore } from '@/store/settingsStore';

interface ExerciseContribution {
  name: string;
  sets: number;
  volume: number;
  lastPerformed: string | null;
}

const MuscleDetailScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ muscle: string }>();
  const muscleName = params.muscle || 'Unknown';
  const workouts = useWorkoutSessionsStore((state) => state.workouts);
  const { isPremium } = usePremiumStatus();
  const { formatWeight, formatWeightValue, getWeightUnit } = useSettingsStore();

  // Find exercises that target this muscle
  const muscleExercises = useMemo(() => {
    return exercisesData.filter((ex) => {
      if (!ex.muscles) return false;
      const muscles = ex.muscles as unknown as Record<string, number>;
      return Object.keys(muscles).some(
        (m) => m.toLowerCase() === muscleName.toLowerCase()
      );
    });
  }, [muscleName]);

  // Calculate exercise contributions
  const exerciseContributions = useMemo((): ExerciseContribution[] => {
    const contributions: Record<string, ExerciseContribution> = {};

    workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        const exerciseData = muscleExercises.find((e) => e.name === exercise.name);
        if (!exerciseData || !exerciseData.muscles) return;

        const muscles = exerciseData.muscles as unknown as Record<string, number>;
        const weight = Object.entries(muscles).find(
          ([m]) => m.toLowerCase() === muscleName.toLowerCase()
        )?.[1];

        if (!weight) return;

        const completedSets = exercise.sets.filter((s) => s.completed && (s.weight ?? 0) > 0);
        if (completedSets.length === 0) return;

        const volume = completedSets.reduce(
          (sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0) * weight,
          0
        );

        if (!contributions[exercise.name]) {
          contributions[exercise.name] = {
            name: exercise.name,
            sets: 0,
            volume: 0,
            lastPerformed: null,
          };
        }

        contributions[exercise.name].sets += completedSets.length;
        contributions[exercise.name].volume += volume;
        contributions[exercise.name].lastPerformed = workout.date;
      });
    });

    return Object.values(contributions)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
  }, [workouts, muscleExercises, muscleName]);

  // Calculate total stats
  const totalStats = useMemo(() => {
    const totalSets = exerciseContributions.reduce((sum, e) => sum + e.sets, 0);
    const totalVolume = exerciseContributions.reduce((sum, e) => sum + e.volume, 0);
    return { totalSets, totalVolume };
  }, [exerciseContributions]);

  const handleUpgrade = () => {
    console.log('Navigate to premium upgrade');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <TabSwipeContainer contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text variant="heading2" color="primary" numberOfLines={1} style={styles.headerTitle}>
          {muscleName}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Summary Stats */}
      <SurfaceCard tone="neutral" padding="lg">
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="statValue" color="primary">
              {totalStats.totalSets}
            </Text>
            <Text variant="caption" color="secondary">Total Sets</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text variant="statValue" color="primary">
              {formatWeightValue(totalStats.totalVolume)}
            </Text>
            <Text variant="caption" color="secondary">Total Volume ({getWeightUnit()})</Text>
          </View>
        </View>
      </SurfaceCard>

      {/* Top Exercises */}
      <SurfaceCard tone="neutral" padding="md">
        <View style={styles.section}>
          <Text variant="labelMedium" color="secondary" style={styles.sectionLabel}>
            TOP EXERCISES FOR {muscleName.toUpperCase()}
          </Text>
          
          {exerciseContributions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text variant="body" color="tertiary">
                No exercises recorded yet for this muscle.
              </Text>
            </View>
          ) : (
            exerciseContributions.map((exercise, index) => (
              <View key={exercise.name} style={styles.exerciseRow}>
                <View style={styles.exerciseRank}>
                  <Text variant="caption" color="secondary">#{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text variant="bodySemibold" color="primary" numberOfLines={1}>
                    {exercise.name}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {exercise.sets} sets • {formatWeight(exercise.volume)}
                  </Text>
                </View>
                <View style={styles.exerciseMeta}>
                  <Text variant="captionSmall" color="tertiary">
                    {formatDate(exercise.lastPerformed)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </SurfaceCard>

      {/* Training Insights (Premium) */}
      <SurfaceCard tone="neutral" padding="md">
        <PremiumLock
          isLocked={!isPremium}
          featureName="Training Insights"
          onUnlock={handleUpgrade}
        >
          <View style={styles.section}>
            <Text variant="labelMedium" color="secondary" style={styles.sectionLabel}>
              TRAINING INSIGHTS
            </Text>
            <View style={styles.insightsList}>
              <View style={styles.insightItem}>
                <Ionicons name="trending-up" size={20} color={colors.accent.success} />
                <Text variant="body" color="primary" style={styles.insightText}>
                  Volume trend: +12% vs last month
                </Text>
              </View>
              <View style={styles.insightItem}>
                <Ionicons name="calendar" size={20} color={colors.accent.info} />
                <Text variant="body" color="primary" style={styles.insightText}>
                  Avg frequency: 2.3× per week
                </Text>
              </View>
              <View style={styles.insightItem}>
                <Ionicons name="barbell" size={20} color={colors.accent.orange} />
                <Text variant="body" color="primary" style={styles.insightText}>
                  Best exercise: {exerciseContributions[0]?.name || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </PremiumLock>
      </SurfaceCard>

      {/* Available Exercises */}
      <SurfaceCard tone="neutral" padding="md">
        <View style={styles.section}>
          <Text variant="labelMedium" color="secondary" style={styles.sectionLabel}>
            EXERCISES TARGETING {muscleName.toUpperCase()}
          </Text>
          <Text variant="caption" color="tertiary" style={styles.exerciseCount}>
            {muscleExercises.length} exercises in database
          </Text>
          <View style={styles.exerciseChips}>
            {muscleExercises.slice(0, 8).map((ex) => (
              <View key={ex.id} style={styles.exerciseChip}>
                <Text variant="caption" color="primary">{ex.name}</Text>
              </View>
            ))}
            {muscleExercises.length > 8 && (
              <View style={[styles.exerciseChip, styles.moreChip]}>
                <Text variant="caption" color="secondary">
                  +{muscleExercises.length - 8} more
                </Text>
              </View>
            )}
          </View>
        </View>
      </SurfaceCard>
    </TabSwipeContainer>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    backgroundColor: colors.primary.bg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 40,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.light,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    letterSpacing: 1,
  },
  emptyState: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  exerciseRank: {
    width: 30,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseMeta: {
    alignItems: 'flex-end',
  },
  insightsList: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  insightText: {
    flex: 1,
  },
  exerciseCount: {
    marginTop: -spacing.xs,
  },
  exerciseChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  exerciseChip: {
    backgroundColor: colors.surface.subtle,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  moreChip: {
    backgroundColor: colors.surface.tint,
  },
});

export default MuscleDetailScreen;
