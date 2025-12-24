/**
 * review-workout.tsx
 * Read-only view of a workout from a program, showing all exercises.
 */

import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, spacing, radius, sizing } from '@/constants/theme';
import { useProgramsStore } from '@/store/programsStore';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.sm,
    paddingTop: spacing.xs,
    borderRadius: radius.full,
  },
  titleContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  outerCardContent: {
    gap: spacing.md,
  },
  exerciseCard: {
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.md,
    gap: spacing.xs,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exerciseIndex: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
    paddingLeft: spacing.xl + spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
});

export default function ReviewWorkoutScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { programId, workoutId, from } = useLocalSearchParams<{
    programId: string;
    workoutId: string;
    from?: string;
  }>();

  const { premadePrograms, userPrograms } = useProgramsStore();

  const program = useMemo(() => {
    return (
      premadePrograms.find((p) => p.id === programId) ||
      userPrograms.find((p) => p.id === programId)
    );
  }, [premadePrograms, userPrograms, programId]);

  const workout = useMemo(() => {
    return program?.workouts.find((w) => w.id === workoutId);
  }, [program, workoutId]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync().catch(() => { });
    if (programId) {
      router.navigate({
        pathname: '/(tabs)/program-details',
        params: { programId }
      } as any);
    } else {
      router.back();
    }
  }, [router, programId]);

  if (!program || !workout) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom + sizing.tabBarHeight },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text variant="heading2" color="primary">
              Workout Not Found
            </Text>
            <Text variant="body" color="secondary">
              The requested workout could not be found.
            </Text>
          </View>
          <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
            <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
        </View>
        <View style={styles.notFoundContainer}>
          <IconSymbol name="error-outline" size={48} color={colors.neutral.gray400} />
          <Text variant="body" color="secondary">
            Please go back and try again.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom + sizing.tabBarHeight },
      ]}
    >
      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text variant="heading2" color="primary">
              {workout.name}
            </Text>
            <Text variant="body" color="secondary">
              {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''} •{' '}
              {program.name}
            </Text>
          </View>
          <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
            <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
        </View>

        <SurfaceCard padding="xl" tone="neutral">
          <View style={styles.outerCardContent}>
            <Text variant="heading3" color="primary">
              Exercises
            </Text>

            {workout.exercises.length === 0 ? (
              <View style={styles.exerciseCard}>
                <Text variant="body" color="secondary">
                  This is a rest day with no exercises.
                </Text>
              </View>
            ) : (
              workout.exercises.map((exercise, index) => (
                <View key={exercise.id} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseIndex}>
                      <Text variant="caption" color="onAccent">
                        {index + 1}
                      </Text>
                    </View>
                    <Text variant="bodySemibold" color="primary">
                      {exercise.name}
                    </Text>
                  </View>
                  <View style={styles.exerciseDetails}>
                    <View style={styles.detailItem}>
                      <IconSymbol
                        name="repeat"
                        size={14}
                        color={colors.text.secondary}
                      />
                      <Text variant="caption" color="secondary">
                        {exercise.sets} sets
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </SurfaceCard>
      </ScrollView>
    </View>
  );
}
