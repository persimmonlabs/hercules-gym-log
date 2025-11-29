/**
 * AddWorkoutsToPlanScreen (file: add-workouts-to-program.tsx)
 * Screen for selecting workouts to add to a Plan.
 * 
 * TERMINOLOGY:
 * - Plan: A collection of workouts (e.g., "PPL", "Bro Split")
 * - Workout: A collection of exercises (e.g., "Push Day", "Pull Day")
 * 
 * Modes:
 * - Create mode: No editPlanId param, uses ProgramBuilderContext
 * - Edit mode: Has editPlanId param, adds workouts directly to existing plan
 */
import React, { useCallback, useState, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing } from '@/constants/theme';
// Plan here refers to a Workout (collection of exercises) - legacy naming in plansStore
import { usePlansStore, type Plan } from '@/store/plansStore';
import { useProgramBuilderContext } from '@/providers/ProgramBuilderProvider';
import { useProgramsStore } from '@/store/programsStore';
import type { ProgramWorkout } from '@/types/premadePlan';

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
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
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
  checkIcon: {
    padding: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    gap: spacing.md,
  },
});

export default function AddWorkoutsToProgramScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { editPlanId } = useLocalSearchParams<{ editPlanId?: string }>();
  const { plans } = usePlansStore();
  const { selectedWorkouts, addWorkouts } = useProgramBuilderContext();
  const { userPrograms, addWorkoutToProgram } = useProgramsStore();

  // Check if we're in edit mode (editing existing plan)
  const isEditMode = Boolean(editPlanId);
  const existingProgram = useMemo(() => 
    isEditMode ? userPrograms.find(p => p.id === editPlanId) : null,
    [isEditMode, editPlanId, userPrograms]
  );
  
  // Get IDs of workouts already in the plan (to exclude from selection)
  const existingWorkoutIds = useMemo(() => {
    if (isEditMode && existingProgram) {
      return new Set(existingProgram.workouts.map(w => w.id));
    }
    return new Set(selectedWorkouts.map(w => w.id));
  }, [isEditMode, existingProgram, selectedWorkouts]);

  // Available workouts to add (exclude already-added ones in edit mode)
  const availableWorkouts = useMemo(() => {
    if (isEditMode) {
      return plans.filter(p => !existingWorkoutIds.has(p.id));
    }
    return plans;
  }, [plans, isEditMode, existingWorkoutIds]);
  
  // Initialize selected IDs (empty in edit mode, from context in create mode)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => 
    isEditMode ? new Set() : new Set(selectedWorkouts.map(w => w.id))
  );

  const handleBack = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  }, [router]);

  const handleToggleWorkout = useCallback((workoutId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(workoutId)) {
        next.delete(workoutId);
      } else {
        next.add(workoutId);
      }
      return next;
    });
  }, []);

  const handleAddSelected = useCallback(async () => {
    Haptics.selectionAsync().catch(() => {});
    
    if (isEditMode && editPlanId) {
      // Edit mode: Add workouts directly to the existing plan
      const workoutsToAdd = plans.filter(p => selectedIds.has(p.id));
      
      for (const workout of workoutsToAdd) {
        const programWorkout: ProgramWorkout = {
          id: `workout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: workout.name,
          exercises: workout.exercises.map(ex => ({
            id: ex.id,
            name: ex.name,
            sets: 3,
          })),
        };
        await addWorkoutToProgram(editPlanId, programWorkout);
      }
      
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      // Create mode: Add to context
      const workoutsToAdd = plans.filter(p => selectedIds.has(p.id));
      addWorkouts(workoutsToAdd);
    }
    
    router.back();
  }, [router, selectedIds, plans, isEditMode, editPlanId, addWorkouts, addWorkoutToProgram]);

  const selectedCount = selectedIds.size;

  const renderWorkoutItem = useCallback(({ item }: { item: Plan }) => {
    const isSelected = selectedIds.has(item.id);
    
    return (
      <Pressable onPress={() => handleToggleWorkout(item.id)}>
        <SurfaceCard 
          tone="neutral" 
          padding="md" 
          showAccentStripe={false}
          style={isSelected ? { borderColor: colors.accent.primary, borderWidth: 2 } : undefined}
        >
          <View style={styles.workoutCard}>
            <View style={styles.workoutInfo}>
              <Text variant="bodySemibold" color="primary">{item.name}</Text>
              <Text variant="caption" color="secondary">
                {item.exercises.length} {item.exercises.length === 1 ? 'exercise' : 'exercises'}
              </Text>
            </View>
            <View style={styles.checkIcon}>
              <IconSymbol 
                name={isSelected ? "check-circle" : "radio-button-unchecked"} 
                size={24} 
                color={isSelected ? colors.accent.primary : colors.text.tertiary} 
              />
            </View>
          </View>
        </SurfaceCard>
      </Pressable>
    );
  }, [selectedIds, handleToggleWorkout]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text variant="heading2" color="primary">
            Add Workouts
          </Text>
          <Text variant="body" color="secondary">
            Select workouts to add to your plan
          </Text>
        </View>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
          <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
      </View>

      {/* List */}
      <FlatList
        data={availableWorkouts}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        renderItem={renderWorkoutItem}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="fitness-center" size={48} color={colors.neutral.gray400} />
            <Text variant="body" color="secondary">
              {isEditMode ? 'All workouts already added to this plan' : 'No workouts available'}
            </Text>
          </View>
        }
      />

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          label={selectedCount > 0 ? `Add ${selectedCount} Workout${selectedCount > 1 ? 's' : ''}` : 'Select Workouts'}
          onPress={handleAddSelected}
          disabled={selectedCount === 0}
          size="lg"
        />
      </View>
    </View>
  );
}
