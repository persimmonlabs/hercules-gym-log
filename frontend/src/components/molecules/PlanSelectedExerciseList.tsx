/**
 * PlanSelectedExerciseList
 * Displays selected exercises with simple arrow-based reordering.
 * Eliminates complex drag-and-drop gestures in favor of reliable button clicks.
 */
import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Exercise } from '@/constants/exercises';
import { colors, radius, sizing, spacing } from '@/constants/theme';
import { getExerciseDisplayTagText } from '@/utils/exerciseDisplayTags';

interface PlanSelectedExerciseListProps {
  exercises: Exercise[];
  onRemoveExercise: (exerciseId: string) => void;
  onAddExercises: () => void;
  onReorderExercises: (fromIndex: number, toIndex: number) => void;
  onReorder?: (newExercises: Exercise[]) => void; // Support legacy full-array callback
  onSave?: () => void;
  title?: string;
  subtitle?: string;
  addLabel?: string;
  saveLabel?: string;
  isSaveDisabled?: boolean;
  isSaving?: boolean;
}

export const PlanSelectedExerciseList: React.FC<PlanSelectedExerciseListProps> = ({
  exercises,
  onRemoveExercise,
  onAddExercises,
  onReorderExercises,
  onReorder,
  onSave,
  title,
  subtitle,
  addLabel,
  saveLabel,
  isSaveDisabled,
  isSaving,
}) => {
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= exercises.length) return;

    Haptics.selectionAsync();
    
    // Call index-based callback
    onReorderExercises(index, newIndex);

    // Call legacy array-based callback if provided
    if (onReorder) {
      const newExercises = [...exercises];
      const [moved] = newExercises.splice(index, 1);
      newExercises.splice(newIndex, 0, moved);
      onReorder(newExercises);
    }
  };

  if (exercises.length === 0) return null;

  return (
    <SurfaceCard padding="xl" tone="card" showAccentStripe style={styles.card}>
      <View style={styles.header}>
        <Text variant="bodySemibold" color="primary">
          {title ?? 'Exercises'}
        </Text>
        {subtitle && (
          <Text variant="caption" color="secondary">
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.list}>
        {exercises.map((exercise, index) => {
          const isFirst = index === 0;
          const isLast = index === exercises.length - 1;

          const tagText = getExerciseDisplayTagText({
            muscles: exercise.muscles,
            exerciseType: exercise.exerciseType,
          });

          return (
            <Animated.View 
              key={exercise.id} 
              layout={Layout.springify().damping(35).stiffness(300).mass(0.8)}
              entering={FadeIn}
              style={styles.row}
            >
              <View style={styles.rowContent}>
                <View style={styles.textContainer}>
                  <Text variant="bodySemibold" color="primary">
                    {exercise.name}
                  </Text>
                  {tagText ? (
                    <Text variant="caption" color="secondary">
                      {tagText}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.actions}>
                  <View style={styles.reorderControls}>
                    <Pressable
                      onPress={() => handleMove(index, 'up')}
                      disabled={isFirst}
                      style={({ pressed }) => [
                        styles.iconButton,
                        isFirst && styles.iconButtonDisabled,
                        pressed && styles.iconButtonPressed
                      ]}
                      hitSlop={8}
                    >
                      <IconSymbol 
                        name="keyboard-arrow-up" 
                        size={20} 
                        color={isFirst ? colors.text.tertiary : colors.text.primary} 
                      />
                    </Pressable>
                    
                    <Pressable
                      onPress={() => handleMove(index, 'down')}
                      disabled={isLast}
                      style={({ pressed }) => [
                        styles.iconButton,
                        isLast && styles.iconButtonDisabled,
                        pressed && styles.iconButtonPressed
                      ]}
                      hitSlop={8}
                    >
                      <IconSymbol 
                        name="keyboard-arrow-down" 
                        size={20} 
                        color={isLast ? colors.text.tertiary : colors.text.primary} 
                      />
                    </Pressable>
                  </View>

                  <View style={styles.divider} />

                  <Pressable
                    onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      onRemoveExercise(exercise.id);
                    }}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.deleteButtonPressed
                    ]}
                    hitSlop={8}
                  >
                    <IconSymbol 
                      name="delete-outline" 
                      size={sizing.iconSM} 
                      color={colors.accent.orange} 
                    />
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Button
          label={addLabel ?? 'Add exercises'}
          variant="primary"
          onPress={onAddExercises}
        />
        {onSave && (
          <Button
            label={saveLabel ?? 'Save Plan'}
            variant="primary"
            onPress={onSave}
            disabled={isSaveDisabled}
            loading={isSaving}
          />
        )}
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    width: '100%',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.accent.orange,
    gap: spacing.md,
  },
  textContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reorderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.sm,
    padding: 2,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  iconButtonDisabled: {
    opacity: 0.3,
  },
  iconButtonPressed: {
    backgroundColor: colors.surface.subtle,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border.light,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  deleteButtonPressed: {
    backgroundColor: colors.surface.subtle,
  },
  footer: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
});
