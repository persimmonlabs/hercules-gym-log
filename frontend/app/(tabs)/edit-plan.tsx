import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PlanNameCard } from '@/components/molecules/PlanNameCard';
import { PlanEmptyStateCard } from '@/components/molecules/PlanEmptyStateCard';
import { colors, radius, spacing, sizing } from '@/constants/theme';
import { useProgramsStore } from '@/store/programsStore';
import type { ProgramWorkout, UserProgram } from '@/types/premadePlan';
import { usePlanBuilderContext } from '@/providers/PlanBuilderProvider';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary.bg,
  },
  scrollContent: {
    flexGrow: 1,
    gap: spacing.sm,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'] * 8,
  },
  topSection: {
    width: '100%',
    marginBottom: spacing.sm,
    gap: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerContent: {
    gap: spacing.sm,
    alignItems: 'flex-start',
    flex: 1,
  },
  headerTitle: {
    textAlign: 'left',
  },
  headerSubtitle: {
    textAlign: 'left',
    maxWidth: 320,
  },
  nameCardContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  workoutsList: {
    gap: spacing.md,
  },
  workoutsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  workoutInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  removeButton: {
    padding: spacing.sm,
  },
  emptyCard: {
    marginTop: spacing.md,
    gap: spacing.md,
    position: 'relative',
  },
  notFoundCard: {
    gap: spacing.md,
    alignItems: 'center',
  },
  saveButtonContainer: {
    marginTop: spacing.lg,
  },
});

export default function EditPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { planId } = useLocalSearchParams<{ planId: string }>();

  const {
    userPrograms,
    updateUserProgram,
    deleteWorkoutFromProgram,
  } = useProgramsStore();
  const { setEditingPlanId } = usePlanBuilderContext();

  // Find the program
  const program = useMemo(() =>
    userPrograms.find(p => p.id === planId),
    [userPrograms, planId]
  );

  const [planName, setPlanName] = useState(program?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (program) {
      setPlanName(program.name);
    }
  }, [program]);

  const handleBackPress = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/(tabs)/plans');
  }, [router]);

  const handleSave = useCallback(async () => {
    if (!program || !planName.trim()) return;

    setIsSaving(true);
    void Haptics.selectionAsync();

    try {
      const updatedProgram: UserProgram = {
        ...program,
        name: planName.trim(),
        modifiedAt: Date.now(),
      };

      await updateUserProgram(updatedProgram);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/(tabs)/plans');
    } catch (error) {
      console.error('[EditPlanScreen] Failed to save:', error);
      Alert.alert('Error', 'Failed to save plan. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [program, planName, updateUserProgram, router]);

  const handleAddWorkouts = useCallback(() => {
    void Haptics.selectionAsync();
    router.push({
      pathname: '/add-workouts-to-program',
      params: { editPlanId: planId }
    });
  }, [router, planId]);

  const handleWorkoutPress = useCallback((workout: ProgramWorkout) => {
    void Haptics.selectionAsync();

    const rawCompositeId = `program:${planId}:${workout.id}`;
    const encodedCompositeId = encodeURIComponent(rawCompositeId);
    const returnTo = encodeURIComponent(`/(tabs)/edit-plan?planId=${planId}`);

    // Trigger immediate loading for the destination screen with RAW ID
    setEditingPlanId(rawCompositeId);

    // Navigate to edit workout screen
    router.push(`/(tabs)/create-workout?planId=${encodedCompositeId}&premadeWorkoutId=&returnTo=${returnTo}`);
  }, [router, planId, setEditingPlanId]);

  const handleRemoveWorkout = useCallback((workout: ProgramWorkout) => {
    void Haptics.selectionAsync();
    Alert.alert(
      'Remove Workout',
      `Are you sure you want to remove "${workout.name}" from this plan?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (workout.id) {
              await deleteWorkoutFromProgram(planId!, workout.id);
            }
          }
        }
      ]
    );
  }, [planId, deleteWorkoutFromProgram]);

  const hasWorkouts = program?.workouts && program.workouts.length > 0;

  if (!program) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.scrollContent}>
          <View style={styles.topSection}>
            <View style={styles.headerContent}>
              <Text variant="heading2" color="primary">Edit Plan</Text>
            </View>
            <Pressable onPress={handleBackPress} style={{ padding: spacing.sm }}>
              <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
            </Pressable>
          </View>

          <SurfaceCard tone="neutral" padding="xl" showAccentStripe={false} style={styles.notFoundCard}>
            <IconSymbol name="error-outline" size={48} color={colors.text.tertiary} />
            <Text variant="bodySemibold" color="primary">Plan Not Found</Text>
            <Button label="Go Back" onPress={handleBackPress} />
          </SurfaceCard>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        enableOnAndroid
        extraScrollHeight={spacing['2xl'] * 4}
        keyboardOpeningTime={0}
        enableAutomaticScroll={false}
      >
        <View style={styles.topSection}>
          <View style={styles.headerContent}>
            <Text variant="heading2" color="primary" style={styles.headerTitle} fadeIn>
              Edit Plan
            </Text>
            <Text variant="body" color="secondary" style={styles.headerSubtitle} fadeIn>
              Customize your training schedule
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go Back"
            onPress={handleBackPress}
            style={{ padding: spacing.sm, paddingTop: spacing.xs, borderRadius: radius.full }}
          >
            <IconSymbol name="arrow-back" size={sizing.iconMD} color={colors.text.primary} />
          </Pressable>
        </View>

        <View style={styles.nameCardContainer}>
          <PlanNameCard
            value={planName}
            onChange={setPlanName}
            label="Plan Name"
            placeholder="e.g. Push Pull Legs"
          />
        </View>

        {hasWorkouts ? (
          <View style={styles.workoutsList}>
            <View style={styles.workoutsHeader}>
              <View>
                <Text variant="bodySemibold" color="primary">
                  {program.workouts.length} {program.workouts.length === 1 ? 'Workout' : 'Workouts'}
                </Text>
              </View>
              <Button
                label="Add more"
                variant="ghost"
                size="sm"
                onPress={handleAddWorkouts}
              />
            </View>

            {program.workouts.map((workout) => (
              <Pressable key={workout.id} onPress={() => handleWorkoutPress(workout)}>
                <SurfaceCard
                  tone="neutral"
                  padding="md"
                  showAccentStripe={false}
                >
                  <View style={styles.workoutCard}>
                    <View style={styles.workoutInfo}>
                      <Text variant="bodySemibold" color="primary">{workout.name}</Text>
                      <Text variant="caption" color="secondary">
                        {workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleRemoveWorkout(workout)}
                      style={styles.removeButton}
                      hitSlop={8}
                    >
                      <IconSymbol name="close" size={20} color={colors.text.tertiary} />
                    </Pressable>
                  </View>
                </SurfaceCard>
              </Pressable>
            ))}
          </View>
        ) : (
          <PlanEmptyStateCard
            title="No workouts added"
            buttonLabel="Add workouts"
            onPress={handleAddWorkouts}
            style={styles.emptyCard}
          />
        )}

        <View style={styles.saveButtonContainer}>
          <Button
            label="Save Changes"
            variant="primary"
            size="lg"
            onPress={handleSave}
            disabled={!planName.trim()}
            loading={isSaving}
          />
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
