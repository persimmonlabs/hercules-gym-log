import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, BackHandler, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '@/utils/haptics';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PlanBuilderCard } from '@/components/molecules/PlanBuilderCard';
import { colors, radius, spacing, sizing } from '@/constants/theme';
import { usePlansStore, type Plan } from '@/store/plansStore';
import { useProgramsStore } from '@/store/programsStore';
import type { ProgramWorkout, UserProgram } from '@/types/premadePlan';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary.bg,
  },
  scrollContent: {
    flexGrow: 1,
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'] * 4,
  },
  headerRow: {
    width: '100%',
    marginBottom: spacing.sm,
    gap: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
    gap: spacing.xs,
  },
  headerTitle: {
    textAlign: 'left',
  },
  headerSubtitle: {
    textAlign: 'left',
  },
  notFoundCard: {
    gap: spacing.md,
    alignItems: 'center',
  },
});

export default function EditPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { planId } = useLocalSearchParams<{ planId: string }>();

  const { plans, isLoading: areWorkoutsLoading } = usePlansStore();
  const {
    userPrograms,
    updateUserProgram,
    addWorkoutToProgram,
    deleteWorkoutFromProgram,
    isLoading: areProgramsLoading,
  } = useProgramsStore();

  const program = useMemo(
    () => userPrograms.find((p) => p.id === planId) ?? null,
    [userPrograms, planId],
  );

  const [isPrefetching, setIsPrefetching] = useState(true);
  const isLoading = areProgramsLoading || areWorkoutsLoading || isPrefetching;

  const [planName, setPlanName] = useState(program?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (program) {
      setPlanName(program.name);
    }
  }, [program]);

  useEffect(() => {
    if (areProgramsLoading || areWorkoutsLoading) {
      return;
    }

    // Delay removing prefetch state to next frame to avoid flicker
    const frame = requestAnimationFrame(() => {
      setIsPrefetching(false);
    });

    return () => cancelAnimationFrame(frame);
  }, [areProgramsLoading, areWorkoutsLoading]);

  const selectedWorkouts = useMemo<Plan[]>(() => {
    if (!program) return [];

    if (!plans || plans.length === 0) return [];

    // Build helpers for matching by name (case-insensitive)
    const plansByName = plans.reduce<Map<string, Plan[]>>((acc, plan) => {
      const key = plan.name.trim().toLowerCase();
      const bucket = acc.get(key) ?? [];
      bucket.push(plan);
      acc.set(key, bucket);
      return acc;
    }, new Map());

    const result: Plan[] = [];

    for (const workout of program.workouts) {
      let match: Plan | undefined;

      // 1) Prefer explicit sourceWorkoutId if present
      if (workout.sourceWorkoutId) {
        match = plans.find((p) => p.id === workout.sourceWorkoutId);
      }

      // 2) Fallback: match by name (case-insensitive)
      if (!match) {
        const nameKey = workout.name.trim().toLowerCase();
        const candidates = plansByName.get(nameKey) ?? [];

        if (candidates.length === 1) {
          match = candidates[0];
        } else if (candidates.length > 1 && workout.exercises && workout.exercises.length > 0) {
          // If multiple templates share the same name, pick the one with max overlapping exercise IDs
          const workoutExerciseIds = new Set(
            workout.exercises.map((ex: any) => String(ex.id)),
          );

          let best: Plan | undefined;
          let bestOverlap = -1;

          for (const candidate of candidates) {
            const overlap = candidate.exercises.filter((ex) =>
              workoutExerciseIds.has(String(ex.id)),
            ).length;

            if (overlap > bestOverlap) {
              bestOverlap = overlap;
              best = candidate;
            }
          }

          match = best;
        }
      }

      if (match && !result.some((p) => p.id === match!.id)) {
        result.push(match);
      }
    }

    return result;
  }, [program, plans]);

  const isDuplicateName = useMemo(
    () =>
      userPrograms.some(
        (p) =>
          p.id !== planId &&
          p.name.toLowerCase().trim() === planName.toLowerCase().trim(),
      ),
    [userPrograms, planId, planName],
  );

  const isSaveDisabled = !planName.trim() || selectedWorkouts.length === 0 || isDuplicateName;

  const handleBackPress = useCallback(() => {
    triggerHaptic('selection');
    router.push('/(tabs)/plans');
  }, [router]);

  // Handle Android hardware back button
  useEffect(() => {
    const backAction = () => {
      handleBackPress();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [handleBackPress]);

  const handleAddWorkout = useCallback(
    async (workout: Plan) => {
      if (!program) return;
      triggerHaptic('selection');

      const programWorkout: ProgramWorkout = {
        id: workout.id,
        name: workout.name,
        exercises: workout.exercises.map((ex) => ({
          id: ex.id,
          name: ex.name,
          sets: 3,
        })),
      };

      await addWorkoutToProgram(program.id, programWorkout);
    },
    [addWorkoutToProgram, program],
  );

  const handleRemoveWorkout = useCallback(
    async (workoutId: string) => {
      if (!program) return;
      triggerHaptic('selection');
      await deleteWorkoutFromProgram(program.id, workoutId);
    },
    [deleteWorkoutFromProgram, program],
  );

  const handleSave = useCallback(async () => {
    if (!program || isSaveDisabled) return;

    setIsSaving(true);
    triggerHaptic('selection');

    try {
      if (isDuplicateName) {
        triggerHaptic('error');
        Alert.alert(
          'Plan Name Taken',
          'A plan with this name already exists. Please choose a different name.',
          [{ text: 'OK' }],
        );
        setIsSaving(false);
        return;
      }

      const updatedProgram: UserProgram = {
        ...program,
        name: planName.trim(),
        modifiedAt: Date.now(),
      };

      await updateUserProgram(updatedProgram);
      triggerHaptic('success');
      router.push('/(tabs)/plans');
    } catch (error) {
      console.error('[EditPlanScreen] Failed to save:', error);
      Alert.alert('Error', 'Failed to save plan. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [program, planName, isSaveDisabled, isDuplicateName, updateUserProgram, router]);

  const handleGoToCreateWorkout = useCallback(() => {
    triggerHaptic('selection');
    router.push('/(tabs)/create-workout');
  }, [router]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
        <Text variant="body" color="secondary" style={{ marginTop: spacing.md }}>
          Loading plan...
        </Text>
      </View>
    );
  }

  if (!program) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.scrollContent}>
          <View style={styles.headerRow}>
            <View style={styles.headerContent}>
              <Text variant="heading2" color="primary">
                Edit Plan
              </Text>
            </View>
            <Pressable onPress={handleBackPress} style={{ padding: spacing.sm }}>
              <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
            </Pressable>
          </View>

          <SurfaceCard tone="neutral" padding="xl" showAccentStripe={false} style={styles.notFoundCard}>
            <IconSymbol name="error-outline" size={48} color={colors.text.tertiary} />
            <Text variant="bodySemibold" color="primary">
              Plan Not Found
            </Text>
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
        extraScrollHeight={spacing['2xl'] * 2}
        keyboardOpeningTime={0}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerContent}>
            <Text variant="heading2" color="primary" style={styles.headerTitle} fadeIn>
              Edit Plan
            </Text>
            <Text variant="body" color="secondary" style={styles.headerSubtitle} fadeIn>
              Customize your training plan
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

        {/* Unified Plan Builder Card (same as Create Plan) */}
        <PlanBuilderCard
          planName={planName}
          onPlanNameChange={setPlanName}
          namePlaceholder="e.g. Push Pull Legs, Full Body Split"
          isNameDuplicate={isDuplicateName && planName.trim().length > 0}
          availableWorkouts={plans}
          selectedWorkouts={selectedWorkouts}
          onAddWorkout={handleAddWorkout}
          onRemoveWorkout={handleRemoveWorkout}
          onSave={handleSave}
          saveLabel="Save Plan"
          isSaving={isSaving}
          isSaveDisabled={isSaveDisabled}
          onCreateWorkout={handleGoToCreateWorkout}
          enableRowAnimations={false}
        />
      </KeyboardAwareScrollView>
    </View>
  );
}
