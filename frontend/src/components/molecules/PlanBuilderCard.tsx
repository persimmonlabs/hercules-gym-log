/**
 * PlanBuilderCard
 * A unified, single-card plan builder that combines:
 * - Plan name input
 * - Inline workout selector
 * - Selected workout list with reorder/delete
 * - Progress indicator and save button
 *
 * Designed for an effortless, one-screen plan creation experience.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, ScrollView } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { triggerHaptic } from '@/utils/haptics';
import { colors, radius, spacing, typography, sizing } from '@/constants/theme';
import { timingFast } from '@/constants/animations';
import type { Plan } from '@/store/plansStore';

interface PlanBuilderCardProps {
  // Name input
  planName: string;
  onPlanNameChange: (name: string) => void;
  namePlaceholder?: string;
  isNameDuplicate?: boolean;

  // Workouts
  availableWorkouts: Plan[];
  selectedWorkouts: Plan[];
  onAddWorkout: (workout: Plan) => void;
  onRemoveWorkout: (workoutId: string) => void;
  onReorderWorkouts?: (fromIndex: number, toIndex: number) => void;

  // Save action
  onSave: () => void;
  saveLabel?: string;
  isSaving?: boolean;
  isSaveDisabled?: boolean;

  // Optional callbacks
  onCreateWorkout?: () => void;
  enableRowAnimations?: boolean;
}

export const PlanBuilderCard: React.FC<PlanBuilderCardProps> = ({
  planName,
  onPlanNameChange,
  namePlaceholder = 'e.g. Push Pull Legs, Full Body Split',
  isNameDuplicate = false,

  availableWorkouts,
  selectedWorkouts,
  onAddWorkout,
  onRemoveWorkout,
  onReorderWorkouts,

  onSave,
  saveLabel = 'Save Plan',
  isSaving = false,
  isSaveDisabled = false,

  onCreateWorkout,
  enableRowAnimations = true,
}) => {
  const nameFocusProgress = useSharedValue(0);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const hasWorkouts = selectedWorkouts.length > 0;
  const hasName = planName.trim().length > 0;
  const hasAvailableWorkouts = availableWorkouts.length > 0;

  // Filter out already selected workouts from available list
  const unselectedWorkouts = useMemo(() => {
    const selectedIds = new Set(selectedWorkouts.map(w => w.id));
    return availableWorkouts.filter(w => !selectedIds.has(w.id));
  }, [availableWorkouts, selectedWorkouts]);
  const hasUnselectedWorkouts = unselectedWorkouts.length > 0;

  // Progress state
  const progressState = useMemo(() => {
    if (!hasName && !hasWorkouts) return 'empty';
    if (!hasName && hasWorkouts) return 'needs-name';
    if (hasName && !hasWorkouts) return 'needs-workouts';
    return 'ready';
  }, [hasName, hasWorkouts]);

  const progressMessage = useMemo(() => {
    switch (progressState) {
      case 'empty':
        return 'Start by giving your plan a name';
      case 'needs-name':
        return 'Add a name to save your plan';
      case 'needs-workouts':
        return 'Add workouts to complete your plan';
      case 'ready':
        return `${selectedWorkouts.length} workout${selectedWorkouts.length !== 1 ? 's' : ''} ready`;
    }
  }, [progressState, selectedWorkouts.length]);

  // Animated styles for name input
  const animatedNameBorderStyle = useAnimatedStyle(() => ({
    borderColor:
      nameFocusProgress.value > 0 ? colors.accent.primary : colors.border.light,
  }));

  const handleNameFocus = useCallback(() => {
    nameFocusProgress.value = withTiming(1, timingFast);
  }, [nameFocusProgress]);

  const handleNameBlur = useCallback(() => {
    nameFocusProgress.value = withTiming(0, timingFast);
  }, [nameFocusProgress]);

  const handleAddWorkout = useCallback((workout: Plan) => {
    triggerHaptic('light');
    onAddWorkout(workout);
  }, [onAddWorkout]);

  const handleRemoveWorkout = useCallback((workoutId: string) => {
    triggerHaptic('warning');
    onRemoveWorkout(workoutId);
  }, [onRemoveWorkout]);

  const handleMoveUp = useCallback(
    (index: number) => {
      if (onReorderWorkouts && index > 0) {
        triggerHaptic('selection');
        onReorderWorkouts(index, index - 1);
      }
    },
    [onReorderWorkouts]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (onReorderWorkouts && index < selectedWorkouts.length - 1) {
        triggerHaptic('selection');
        onReorderWorkouts(index, index + 1);
      }
    },
    [onReorderWorkouts, selectedWorkouts.length]
  );

  return (
    <SurfaceCard tone="card" padding="xl" showAccentStripe>
      <View style={styles.container}>
        {/* Section 1: Plan Name */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="bodySemibold" color="primary">
              Name
            </Text>
          </View>
          <Animated.View style={[styles.nameInputContainer, animatedNameBorderStyle]}>
            <TextInput
              value={planName}
              onChangeText={onPlanNameChange}
              placeholder={namePlaceholder}
              placeholderTextColor={colors.text.muted}
              selectionColor={colors.accent.primary}
              cursorColor={colors.accent.primary}
              style={styles.nameInput}
              onFocus={handleNameFocus}
              onBlur={handleNameBlur}
              returnKeyType="next"
              autoCapitalize="words"
            />
          </Animated.View>
          {isNameDuplicate && planName.trim().length > 0 && (
            <Text variant="caption" color="red" style={styles.errorText}>
              A plan with this name already exists
            </Text>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Section 2: Add Workouts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="bodySemibold" color="primary">
              Workouts
            </Text>
            {hasWorkouts && (
              <View style={styles.countBadge}>
                <Text variant="caption" color="primary" style={styles.countText}>
                  {selectedWorkouts.length}
                </Text>
              </View>
            )}
          </View>
          {hasWorkouts && (
            <View style={styles.workoutList}>
              {selectedWorkouts.map((workout, index) => (
                <SelectedWorkoutRow
                  key={workout.id}
                  workout={workout}
                  index={index}
                  totalCount={selectedWorkouts.length}
                  onRemove={handleRemoveWorkout}
                  onMoveUp={onReorderWorkouts ? handleMoveUp : undefined}
                  onMoveDown={onReorderWorkouts ? handleMoveDown : undefined}
                  enableRowAnimations={enableRowAnimations}
                />
              ))}
            </View>
          )}
          {onReorderWorkouts && selectedWorkouts.length > 1 && (
            <Text variant="caption" color="secondary" style={styles.reorderHint}>
              Tap arrows to reorder
            </Text>
          )}

          {hasAvailableWorkouts ? (
            hasUnselectedWorkouts ? (
              <>
                <Pressable
                  onPress={() => setShowWorkoutPicker(!showWorkoutPicker)}
                  style={({ pressed }) => [
                    styles.workoutPickerButton,
                    pressed && styles.workoutPickerButtonPressed,
                  ]}
                >
                  <IconSymbol
                    name={showWorkoutPicker ? 'remove' : 'add'}
                    size={sizing.iconMD}
                    color={colors.accent.orange}
                  />
                  <Text variant="body" style={styles.pickerButtonText}>
                    {showWorkoutPicker ? 'Hide workouts' : 'Add Workouts'}
                  </Text>
                </Pressable>

                {showWorkoutPicker && (
                  <Animated.View
                    entering={FadeIn.duration(150)}
                    exiting={FadeOut.duration(100)}
                    style={styles.workoutPickerList}
                  >
                    {unselectedWorkouts.map((workout) => (
                      <Pressable
                        key={workout.id}
                        style={({ pressed }) => [
                          styles.workoutOption,
                          pressed && styles.workoutOptionPressed,
                        ]}
                        onPress={() => handleAddWorkout(workout)}
                      >
                        <View style={styles.workoutOptionInfo}>
                          <Text variant="body" color="primary" numberOfLines={1}>
                            {workout.name}
                          </Text>
                          <Text variant="captionSmall" color="tertiary">
                            {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        <View style={styles.addButton}>
                          <IconSymbol
                            name="add"
                            size={18}
                            color={colors.accent.orange}
                          />
                        </View>
                      </Pressable>
                    ))}
                  </Animated.View>
                )}
              </>
            ) : (
              <Text variant="body" color="secondary" style={styles.allAddedText}>
                All workouts have been added
              </Text>
            )
          ) : (
            <View style={styles.noWorkoutsContainer}>
              <IconSymbol
                name="fitness-center"
                size={32}
                color={colors.text.muted}
              />
              <Text variant="body" color="tertiary" style={styles.noWorkoutsText}>
                Create workouts first to build a plan
              </Text>
              {onCreateWorkout && (
                <Button
                  label="Create a Workout"
                  variant="ghost"
                  size="md"
                  onPress={onCreateWorkout}
                />
              )}
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Section 4: Progress & Save */}
        <View style={styles.section}>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressDot,
                progressState === 'ready' && styles.progressDotReady,
              ]}
            />
            <Text variant="caption" color={progressState === 'ready' ? 'primary' : 'secondary'}>
              {progressMessage}
            </Text>
          </View>

          {/* Save Button */}
          <Button
            label={saveLabel}
            variant="primary"
            size="lg"
            onPress={onSave}
            disabled={isSaveDisabled || isNameDuplicate}
            loading={isSaving}
          />
        </View>
      </View>
    </SurfaceCard>
  );
};

// Selected Workout Row Sub-component
interface SelectedWorkoutRowProps {
  workout: Plan;
  index: number;
  totalCount: number;
  onRemove: (workoutId: string) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  enableRowAnimations?: boolean;
}

const SelectedWorkoutRow: React.FC<SelectedWorkoutRowProps> = ({
  workout,
  index,
  totalCount,
  onRemove,
  onMoveUp,
  onMoveDown,
  enableRowAnimations = true,
}) => {
  const isFirst = index === 0;
  const isLast = index === totalCount - 1;
  const hasReorderHandlers = Boolean(onMoveUp && onMoveDown);
  const canReorder = hasReorderHandlers && totalCount > 1;

  const RowWrapper = enableRowAnimations ? Animated.View : View;

  return (
    <RowWrapper
      {...(enableRowAnimations ? {
        layout: Layout.springify().damping(20).stiffness(200),
        entering: FadeIn.duration(200),
        exiting: FadeOut.duration(150),
      } : {})}
      style={styles.selectedWorkoutRow}
    >
      {/* Reorder controls on the left when enabled; otherwise no spacer */}
      {canReorder && (
        <View style={styles.reorderArea}>
          <Pressable
            onPress={() => onMoveUp?.(index)}
            disabled={isFirst}
            style={styles.reorderButton}
            hitSlop={4}
          >
            <IconSymbol
              name="keyboard-arrow-up"
              size={20}
              color={isFirst ? colors.text.muted : colors.text.secondary}
            />
          </Pressable>
          <Pressable
            onPress={() => onMoveDown?.(index)}
            disabled={isLast}
            style={styles.reorderButton}
            hitSlop={4}
          >
            <IconSymbol
              name="keyboard-arrow-down"
              size={20}
              color={isLast ? colors.text.muted : colors.text.secondary}
            />
          </Pressable>
        </View>
      )}

      {/* Workout name + metadata in the middle */}
      <View style={styles.textContainer}>
        <Text variant="body" color="primary" numberOfLines={1}>
          {workout.name}
        </Text>
        <Text variant="caption" color="secondary">
          {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* X/remove button on the right, matching CompactExerciseRow */}
      <Pressable
        onPress={() => onRemove(workout.id)}
        style={styles.removeButton}
        hitSlop={12}
      >
        <IconSymbol
          name="close"
          size={18}
          color={colors.text.tertiary}
        />
      </Pressable>
    </RowWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  nameInput: {
    flex: 1,
    ...typography.body,
    fontWeight: typography.body.fontWeight as any,
    color: colors.text.primary,
    paddingVertical: spacing.xs,
  },
  errorText: {
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.xs,
  },
  workoutPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accent.orangeMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent.orange,
    borderStyle: 'dashed',
  },
  workoutPickerButtonPressed: {
    opacity: 0.8,
  },
  pickerButtonText: {
    flex: 1,
    textAlign: 'center',
  },
  reorderHint: {
    marginTop: spacing.xs,
    textAlign: 'left',
  },
  workoutPickerList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  workoutOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    minHeight: 56,
  },
  workoutOptionPressed: {
    backgroundColor: colors.accent.orangeMuted,
    borderColor: colors.accent.orange,
  },
  workoutOptionInfo: {
    flex: 1,
    gap: 2,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.accent.orangeMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allAddedText: {
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  noWorkoutsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  noWorkoutsText: {
    textAlign: 'center',
  },
  workoutCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countBadge: {
    backgroundColor: colors.accent.orange,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    color: colors.text.onAccent,
    fontWeight: '600',
  },
  workoutList: {
    gap: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyStateText: {
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.text.muted,
  },
  progressDotReady: {
    backgroundColor: colors.accent.success,
  },
  // Selected Workout Row styles (match CompactExerciseRow layout)
  selectedWorkoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    minHeight: 56,
    gap: spacing.sm,
  },
  reorderArea: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
  },
  reorderButton: {
    padding: 2,
  },
  indexBadge: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: spacing.xs,
    flexShrink: 1,
  },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
