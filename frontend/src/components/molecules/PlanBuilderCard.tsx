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
    setShowWorkoutPicker(false);
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
              Plan Name
            </Text>
          </View>
          <Animated.View style={[styles.nameInputContainer, animatedNameBorderStyle]}>
            <IconSymbol
              name="calendar-today"
              size={sizing.iconSM}
              color={colors.text.tertiary}
            />
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
              Add Workouts
            </Text>
            <Text variant="caption" color="secondary">
              Select from your workouts
            </Text>
          </View>

          {hasAvailableWorkouts ? (
            <>
              <Pressable
                style={styles.workoutPickerButton}
                onPress={() => setShowWorkoutPicker(!showWorkoutPicker)}
              >
                <IconSymbol
                  name="add-circle-outline"
                  size={sizing.iconSM}
                  color={colors.accent.orange}
                />
                <Text variant="body" style={styles.pickerButtonText}>
                  {showWorkoutPicker ? 'Hide workouts' : 'Choose workouts to add'}
                </Text>
                <IconSymbol
                  name={showWorkoutPicker ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={sizing.iconSM}
                  color={colors.text.tertiary}
                />
              </Pressable>

              {showWorkoutPicker && (
                <Animated.View
                  entering={FadeIn.duration(150)}
                  exiting={FadeOut.duration(100)}
                  style={styles.workoutPickerList}
                >
                  {unselectedWorkouts.length > 0 ? (
                    unselectedWorkouts.map((workout) => (
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
                    ))
                  ) : (
                    <Text variant="body" color="secondary" style={styles.allAddedText}>
                      All workouts have been added
                    </Text>
                  )}
                </Animated.View>
              )}
            </>
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

        {/* Section 3: Selected Workouts List */}
        {hasWorkouts && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.workoutCountBadge}>
                  <Text variant="bodySemibold" color="primary">
                    Your Workouts
                  </Text>
                  <View style={styles.countBadge}>
                    <Text variant="caption" color="primary" style={styles.countText}>
                      {selectedWorkouts.length}
                    </Text>
                  </View>
                </View>
                {onReorderWorkouts && selectedWorkouts.length > 1 && (
                  <Text variant="caption" color="secondary">
                    Tap arrows to reorder
                  </Text>
                )}
              </View>
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
                  />
                ))}
              </View>
            </View>
          </>
        )}

        {/* Empty State */}
        {!hasWorkouts && hasAvailableWorkouts && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.emptyState}
          >
            <IconSymbol
              name="calendar-today"
              size={32}
              color={colors.text.muted}
            />
            <Text variant="body" color="tertiary" style={styles.emptyStateText}>
              Select workouts above to build your plan
            </Text>
          </Animated.View>
        )}

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
}

const SelectedWorkoutRow: React.FC<SelectedWorkoutRowProps> = ({
  workout,
  index,
  totalCount,
  onRemove,
  onMoveUp,
  onMoveDown,
}) => {
  const isFirst = index === 0;
  const isLast = index === totalCount - 1;
  const showReorderControls = onMoveUp && onMoveDown && totalCount > 1;

  return (
    <Animated.View
      layout={Layout.springify().damping(20).stiffness(200)}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.selectedWorkoutRow}
    >
      <View style={styles.workoutRowIndex}>
        <Text variant="caption" color="secondary" style={styles.indexText}>
          {index + 1}
        </Text>
      </View>
      <View style={styles.workoutRowInfo}>
        <Text variant="body" color="primary" numberOfLines={1}>
          {workout.name}
        </Text>
        <Text variant="captionSmall" color="tertiary">
          {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.workoutRowActions}>
        {showReorderControls && (
          <View style={styles.reorderControls}>
            <Pressable
              onPress={() => onMoveUp?.(index)}
              disabled={isFirst}
              style={[styles.reorderButton, isFirst && styles.reorderButtonDisabled]}
              hitSlop={6}
            >
              <IconSymbol
                name="keyboard-arrow-up"
                size={18}
                color={isFirst ? colors.text.muted : colors.text.secondary}
              />
            </Pressable>
            <Pressable
              onPress={() => onMoveDown?.(index)}
              disabled={isLast}
              style={[styles.reorderButton, isLast && styles.reorderButtonDisabled]}
              hitSlop={6}
            >
              <IconSymbol
                name="keyboard-arrow-down"
                size={18}
                color={isLast ? colors.text.muted : colors.text.secondary}
              />
            </Pressable>
          </View>
        )}
        <Pressable
          onPress={() => onRemove(workout.id)}
          style={styles.removeButton}
          hitSlop={8}
        >
          <IconSymbol
            name="close"
            size={16}
            color={colors.accent.orange}
          />
        </Pressable>
      </View>
    </Animated.View>
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
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  pickerButtonText: {
    flex: 1,
    color: colors.accent.orange,
  },
  workoutPickerList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  workoutOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
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
  // Selected Workout Row styles
  selectedWorkoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    gap: spacing.sm,
  },
  workoutRowIndex: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: colors.accent.orangeMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontWeight: '600',
  },
  workoutRowInfo: {
    flex: 1,
    gap: 2,
  },
  workoutRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reorderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  reorderButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderButtonDisabled: {
    opacity: 0.4,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.accent.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
});
