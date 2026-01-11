/**
 * RotationScheduleEditor
 * Edit rotation schedule - reorder workouts in the rotation cycle.
 * Uses up/down buttons for reordering (no external dependency).
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing } from '@/constants/theme';
import type { RotationScheduleConfig, ProgramWorkout } from '@/types/premadePlan';

interface RotationScheduleEditorProps {
  schedule: RotationScheduleConfig;
  workouts: ProgramWorkout[];
  onWorkoutPress: (workout: ProgramWorkout) => void;
  onRemoveWorkout: (workoutId: string, index: number) => void;
  onChange: (schedule: RotationScheduleConfig) => void;
}

interface WorkoutItem {
  id: string;
  workout: ProgramWorkout;
  order: number;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  reorderButtons: {
    gap: spacing.xxs,
  },
  reorderButton: {
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  reorderButtonDisabled: {
    opacity: 0.3,
  },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  helperText: {
    paddingHorizontal: spacing.md,
  },
});

export const RotationScheduleEditor: React.FC<RotationScheduleEditorProps> = ({
  schedule,
  workouts,
  onWorkoutPress,
  onRemoveWorkout,
  onChange,
}) => {
  // Create workout items from workout order
  const workoutItems: WorkoutItem[] = schedule.workoutOrder
    .map((id, index) => {
      const workout = workouts.find(w => w.id === id);
      if (!workout) return null;
      return { id, workout, order: index + 1 };
    })
    .filter((item): item is WorkoutItem => item !== null);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    triggerHaptic('selection');
    
    const newOrder = [...schedule.workoutOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    
    onChange({
      ...schedule,
      workoutOrder: newOrder,
    });
  }, [schedule, onChange]);

  const handleMoveDown = useCallback((index: number) => {
    if (index >= schedule.workoutOrder.length - 1) return;
    triggerHaptic('selection');
    
    const newOrder = [...schedule.workoutOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    
    onChange({
      ...schedule,
      workoutOrder: newOrder,
    });
  }, [schedule, onChange]);

  if (workoutItems.length === 0) {
    return (
      <View style={styles.emptyState}>
        <IconSymbol name="fitness-center" size={32} color={colors.text.tertiary} />
        <Text variant="body" color="secondary">
          No workouts in rotation
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {workoutItems.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === workoutItems.length - 1;

        return (
          <View key={`${item.id}-${index}`} style={styles.workoutRow}>
            <View style={styles.reorderButtons}>
              <Pressable
                style={[styles.reorderButton, isFirst && styles.reorderButtonDisabled]}
                onPress={() => handleMoveUp(index)}
                disabled={isFirst}
                hitSlop={4}
              >
                <IconSymbol 
                  name="keyboard-arrow-up" 
                  size={18} 
                  color={isFirst ? colors.text.muted : colors.text.secondary} 
                />
              </Pressable>
              <Pressable
                style={[styles.reorderButton, isLast && styles.reorderButtonDisabled]}
                onPress={() => handleMoveDown(index)}
                disabled={isLast}
                hitSlop={4}
              >
                <IconSymbol 
                  name="keyboard-arrow-down" 
                  size={18} 
                  color={isLast ? colors.text.muted : colors.text.secondary} 
                />
              </Pressable>
            </View>
            
            <View style={styles.orderBadge}>
              <Text variant="caption" color="onAccent">
                {item.order}
              </Text>
            </View>

              <Pressable 
                style={styles.workoutInfo}
                onPress={() => item.workout.exercises.length > 0 && onWorkoutPress(item.workout)}
              >
                <Text variant="bodySemibold" color="primary">
                  {item.workout.name}
                </Text>
                <Text variant="bodySemibold" color="primary">
                  {item.workout.exercises.length > 0 
                    ? `${item.workout.exercises.length} exercises`
                    : 'Rest day'
                  }
                </Text>
              </Pressable>

            <View style={styles.actionButtons}>
              {item.workout.exercises.length > 0 && (
                <Pressable
                  style={styles.actionButton}
                  onPress={() => onWorkoutPress(item.workout)}
                  hitSlop={8}
                >
                  <IconSymbol name="edit" size={18} color={colors.accent.primary} />
                </Pressable>
              )}
              <Pressable
                style={styles.actionButton}
                onPress={() => {
                  triggerHaptic('selection');
                  onRemoveWorkout(item.id, index);
                }}
                hitSlop={8}
              >
                <IconSymbol name="close" size={18} color={colors.accent.orange} />
              </Pressable>
            </View>
          </View>
        );
      })}
      <Text variant="caption" color="tertiary" style={styles.helperText}>
        Use arrows to reorder. Workouts will cycle in this order.
      </Text>
    </View>
  );
};
