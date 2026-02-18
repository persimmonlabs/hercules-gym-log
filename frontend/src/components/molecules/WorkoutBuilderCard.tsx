/**
 * WorkoutBuilderCard
 * A unified, single-card workout builder that combines:
 * - Workout name input
 * - Modal-based exercise search
 * - Compact exercise list with reorder/delete
 * - Progress indicator and save button
 *
 * Designed for an effortless, one-screen workout creation experience.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CompactExerciseRow } from '@/components/molecules/CompactExerciseRow';
import { ExerciseSearchModal } from '@/components/molecules/ExerciseSearchModal';
import { triggerHaptic } from '@/utils/haptics';
import { colors, radius, spacing, typography, sizing } from '@/constants/theme';
import { timingFast } from '@/constants/animations';
import type { Exercise } from '@/constants/exercises';

interface WorkoutBuilderCardProps {
  // Name input
  workoutName: string;
  onWorkoutNameChange: (name: string) => void;
  namePlaceholder?: string;
  isNameDuplicate?: boolean;

  // Exercises
  exercises: Exercise[];
  onAddExercise: (exercise: Exercise) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onReorderExercises: (fromIndex: number, toIndex: number) => void;

  // Save action
  onSave: () => void;
  saveLabel?: string;
  isSaving?: boolean;
  isSaveDisabled?: boolean;

  // Optional callbacks
  onBrowseAllExercises?: () => void;
}

export const WorkoutBuilderCard: React.FC<WorkoutBuilderCardProps> = ({
  workoutName,
  onWorkoutNameChange,
  namePlaceholder = 'e.g. Push Day, Leg Day',
  isNameDuplicate = false,

  exercises,
  onAddExercise,
  onRemoveExercise,
  onReorderExercises,

  onSave,
  saveLabel = 'Save Workout',
  isSaving = false,
  isSaveDisabled = false,

  onBrowseAllExercises,
}) => {
  const [isSearchModalVisible, setSearchModalVisible] = useState(false);
  const nameFocusProgress = useSharedValue(0);
  const hasExercises = exercises.length > 0;
  const hasName = workoutName.trim().length > 0;

  // Compute excluded IDs for search
  const excludedIds = useMemo(
    () => exercises.map((ex) => ex.id),
    [exercises]
  );

  // Progress state
  const progressState = useMemo(() => {
    if (!hasName && !hasExercises) return 'empty';
    if (!hasName && hasExercises) return 'needs-name';
    if (hasName && !hasExercises) return 'needs-exercises';
    return 'ready';
  }, [hasName, hasExercises]);

  const progressMessage = useMemo(() => {
    switch (progressState) {
      case 'empty':
        return 'Start by giving your workout a name';
      case 'needs-name':
        return 'Add a name to save your workout';
      case 'needs-exercises':
        return 'Add exercises to complete your workout';
      case 'ready':
        return `${exercises.length} exercise${exercises.length !== 1 ? 's' : ''} ready`;
    }
  }, [progressState, exercises.length]);

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

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index > 0) {
        onReorderExercises(index, index - 1);
      }
    },
    [onReorderExercises]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index < exercises.length - 1) {
        onReorderExercises(index, index + 1);
      }
    },
    [exercises.length, onReorderExercises]
  );

  const handleOpenSearchModal = useCallback(() => {
    triggerHaptic('selection');
    setSearchModalVisible(true);
  }, []);

  const handleCloseSearchModal = useCallback(() => {
    setSearchModalVisible(false);
  }, []);

  return (
    <SurfaceCard tone="card" padding="xl" showAccentStripe>
      <View style={styles.container}>
        {/* Section 1: Workout Name */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="bodySemibold" color="primary">
              Name
            </Text>
          </View>
          <Animated.View style={[styles.nameInputContainer, animatedNameBorderStyle]}>
            <TextInput
              value={workoutName}
              onChangeText={onWorkoutNameChange}
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
          {isNameDuplicate && workoutName.trim().length > 0 && (
            <Text variant="caption" color="red" style={styles.errorText}>
              A workout with this name already exists
            </Text>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Section 2: Your Exercises */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.exerciseCountBadge}>
              <Text variant="bodySemibold" color="primary">
                Exercises
              </Text>
              {hasExercises && (
                <View style={styles.countBadge}>
                  <Text variant="caption" color="primary" style={styles.countText}>
                    {exercises.length}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Exercise List */}
          {hasExercises && (
            <View style={styles.exerciseList}>
              {exercises.map((exercise, index) => (
                <CompactExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  index={index}
                  totalCount={exercises.length}
                  onRemove={onRemoveExercise}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  showReorderControls={exercises.length > 1}
                />
              ))}
            </View>
          )}
          
          {/* Add Exercises Button */}
          <Pressable
            onPress={handleOpenSearchModal}
            style={({ pressed }) => [
              styles.addExerciseButton,
              pressed && styles.addExerciseButtonPressed,
            ]}
          >
            <IconSymbol name="add" size={sizing.iconMD} color={colors.accent.orange} />
            <Text variant="body" color="primary">
              Add Exercises
            </Text>
          </Pressable>
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

      {/* Exercise Search Modal */}
      <ExerciseSearchModal
        visible={isSearchModalVisible}
        onClose={handleCloseSearchModal}
        onAddExercise={onAddExercise}
        excludeIds={excludedIds}
        title="Add Exercises"
      />
    </SurfaceCard>
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
  exerciseCountBadge: {
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
  exerciseList: {
    gap: spacing.sm,
  },
  addExerciseButton: {
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
  addExerciseButtonPressed: {
    opacity: 0.8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
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
});
