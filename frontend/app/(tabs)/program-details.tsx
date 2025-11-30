import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, spacing, radius, sizing } from '@/constants/theme';
import { useProgramsStore } from '@/store/programsStore';
import type { PremadeProgram, UserProgram, RotationSchedule } from '@/types/premadePlan';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
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
    gap: spacing.xl,
  },
  outerCardContent: {
    gap: spacing.lg,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  workoutCard: {
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  workoutsList: {
    gap: spacing.md,
  },
});

export default function ProgramDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { programId, from } = useLocalSearchParams<{ programId: string; from?: string }>();
  const { premadePrograms, userPrograms, clonePremadeProgram, setActiveRotation } = useProgramsStore();
  const [isAdding, setIsAdding] = useState(false);

  const program = premadePrograms.find(p => p.id === programId) || userPrograms.find(p => p.id === programId);
  const isUserProgram = program && !program.isPremade;

  const handleBack = useCallback(() => {
    Haptics.selectionAsync().catch(() => { });
    if (from === 'quiz') {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.navigate('/quiz');
      }
    } else {
      // Default to browse programs
      router.navigate('/(tabs)/browse-programs');
    }
  }, [router, from]);

  if (!program) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + sizing.tabBarHeight }]}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text variant="heading2" color="primary">Program Not Found</Text>
            <Text variant="body" color="secondary">The requested program could not be found.</Text>
          </View>
          <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
            <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
        </View>
        <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Button label="Go Back" onPress={handleBack} />
        </View>
      </View>
    );
  }

  const handleAddToPlans = useCallback(async () => {
    if (isAdding) return;
    setIsAdding(true);
    Haptics.selectionAsync().catch(() => { });

    try {
      await clonePremadeProgram(program!.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });

      // Navigate back to Plans tab
      router.dismissAll();
      router.replace('/(tabs)/plans');
    } catch (error) {
      console.error('Failed to add program:', error);
      Alert.alert('Error', 'Failed to add program to your library.');
    } finally {
      setIsAdding(false);
    }
  }, [clonePremadeProgram, isAdding, program!.id, router]);

  const handleWorkoutPress = useCallback((workoutId: string) => {
    Haptics.selectionAsync().catch(() => { });
    router.push({
      pathname: '/(tabs)/review-workout',
      params: { programId: program!.id, workoutId, from: 'program-details' }
    } as any);
  }, [router, program]);

  const handleSetRotation = useCallback(async () => {
    if (isAdding) return;
    setIsAdding(true);
    Haptics.selectionAsync().catch(() => { });

    try {
      const rotation: RotationSchedule = {
        id: `rot-${Date.now()}`,
        name: program!.name,
        programId: program!.id,
        workoutSequence: program!.workouts.map(w => w.id),
        currentIndex: 0,
      };

      await setActiveRotation(rotation);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });

      Alert.alert(
        'Schedule Updated',
        'This program is now your active rotation schedule. Check the Dashboard for your next workout.',
        [{
          text: 'OK', onPress: () => {
            router.dismissAll();
            router.replace('/(tabs)');
          }
        }]
      );
    } catch (error) {
      console.error('Failed to set rotation:', error);
      Alert.alert('Error', 'Failed to update schedule.');
    } finally {
      setIsAdding(false);
    }
  }, [isAdding, program, setActiveRotation, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + sizing.tabBarHeight }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text variant="heading2" color="primary">
            {program.name}
          </Text>
          <Text variant="body" color="secondary">
            {program.metadata.description}
          </Text>
        </View>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
          <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SurfaceCard padding="xl" tone="neutral">
          <View style={styles.outerCardContent}>
            <View style={styles.tags}>
              <Badge label={program.metadata.goal} variant="accent" />
              <Badge label={program.metadata.experienceLevel} variant="neutral" />
              <Badge label={program.metadata.equipment} variant="outline" />
              <Badge label={`${program.metadata.daysPerWeek} days/week`} variant="primary" />
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard padding="xl" tone="neutral">
          <View style={styles.outerCardContent}>
            <Text variant="heading3" color="primary">Workouts Included</Text>
            <View style={styles.workoutsList}>
              {program.workouts.map((workout, index) => (
                <Pressable
                  key={workout.id}
                  style={styles.workoutCard}
                  onPress={() => handleWorkoutPress(workout.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${workout.name}`}
                >
                  <View style={styles.workoutCardHeader}>
                    <Text variant="bodySemibold" color="primary">
                      {index + 1}. {workout.name}
                    </Text>
                    <IconSymbol name="chevron-right" size={18} color={colors.text.tertiary} />
                  </View>
                  <View style={styles.exerciseCount}>
                    <IconSymbol name="fitness-center" size={14} color={colors.text.secondary} />
                    <Text variant="caption" color="secondary">
                      {workout.exercises.length} exercises
                    </Text>
                  </View>
                  {/* List first 3 exercises as preview */}
                  <View style={{ marginTop: spacing.xs, paddingLeft: spacing.sm }}>
                    {workout.exercises.slice(0, 3).map(ex => (
                      <Text key={ex.id} variant="caption" color="secondary">• {ex.name}</Text>
                    ))}
                    {workout.exercises.length > 3 && (
                      <Text variant="caption" color="tertiary" style={{ marginLeft: spacing.xs }}>
                        +{workout.exercises.length - 3} more
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard padding="xl" tone="neutral">
          <View style={styles.outerCardContent}>
            {isUserProgram ? (
              <Button
                label="Start Rotation Schedule"
                onPress={handleSetRotation}
                loading={isAdding}
                size="lg"
                variant="primary"
              />
            ) : (
              <Button
                label="Add to My Plans"
                onPress={handleAddToPlans}
                loading={isAdding}
                size="lg"
              />
            )}
          </View>
        </SurfaceCard>
      </ScrollView>
    </View>
  );
}
