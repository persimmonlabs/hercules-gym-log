/**
 * EditableWorkoutExerciseCard
 * Molecule for editing a workout exercise within the workout edit screen.
 */

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { ExerciseSetEditor } from '@/components/molecules/ExerciseSetEditor';
import { colors, radius, shadows, sizing, spacing } from '@/constants/theme';
import { exercises as exerciseCatalog } from '@/constants/exercises';
import type { SetLog, WorkoutExercise } from '@/types/workout';

interface EditableWorkoutExerciseCardProps {
  exercise: WorkoutExercise;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onSaveSets: (sets: SetLog[]) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onProgressChange: (progress: { completedSets: number; totalSets: number }) => void;
  isInteractionDisabled?: boolean;
}

export const EditableWorkoutExerciseCard: React.FC<EditableWorkoutExerciseCardProps> = ({
  exercise,
  index,
  isExpanded,
  onToggle,
  onSaveSets,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onProgressChange,
  isInteractionDisabled = false,
}) => {
  const badgeLabel = useMemo(() => String(index + 1).padStart(2, '0'), [index]);

  const handleMove = (callback: () => void) => {
    triggerHaptic('selection');
    callback();
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.card}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`Toggle exercise ${exercise.name}`}
        disabled={isInteractionDisabled}
      >
        <View style={styles.headerRow}>
          <View style={styles.leftColumn}>
            <View style={styles.badge}>
              <Text variant="bodySemibold" color="primary">
                {badgeLabel}
              </Text>
            </View>
            <View style={styles.titleColumn}>
              <Text variant="bodySemibold" color="primary">
                {exercise.name}
              </Text>
              <Text variant="caption" color="secondary">
                {`${exercise.sets.length} set${exercise.sets.length === 1 ? '' : 's'}`}
              </Text>
            </View>
          </View>
          <View style={styles.actionsColumn}>
            <Pressable
              style={[styles.iconButton, (!canMoveUp || isInteractionDisabled) && styles.iconButtonDisabled]}
              onPress={() => handleMove(onMoveUp)}
              disabled={!canMoveUp || isInteractionDisabled}
              accessibilityRole="button"
              accessibilityLabel="Move exercise up"
            >
              <MaterialCommunityIcons
                name="chevron-up"
                size={sizing.iconMD}
                color={canMoveUp ? colors.text.primary : colors.text.tertiary}
              />
            </Pressable>
            <Pressable
              style={[styles.iconButton, (!canMoveDown || isInteractionDisabled) && styles.iconButtonDisabled]}
              onPress={() => handleMove(onMoveDown)}
              disabled={!canMoveDown || isInteractionDisabled}
              accessibilityRole="button"
              accessibilityLabel="Move exercise down"
            >
              <MaterialCommunityIcons
                name="chevron-down"
                size={sizing.iconMD}
                color={canMoveDown ? colors.text.primary : colors.text.tertiary}
              />
            </Pressable>
            <Pressable
              style={[styles.iconButton, isInteractionDisabled && styles.iconButtonDisabled]}
              onPress={() => handleMove(onRemove)}
              disabled={isInteractionDisabled}
              accessibilityRole="button"
              accessibilityLabel="Remove exercise"
            >
              <MaterialCommunityIcons name="trash-can-outline" size={sizing.iconMD} color={colors.accent.warning} />
            </Pressable>
            <MaterialCommunityIcons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={sizing.iconMD}
              color={colors.text.secondary}
            />
          </View>
        </View>
      </Pressable>

      {isExpanded ? (
        <ExerciseSetEditor
          isExpanded
          exerciseName={exercise.name}
          initialSets={exercise.sets}
          onSetsChange={onSaveSets}
          onProgressChange={onProgressChange}
          exerciseType={exerciseCatalog.find(e => e.name === exercise.name)?.exerciseType || 'weight'}
          distanceUnit={exerciseCatalog.find(e => e.name === exercise.name)?.distanceUnit}
          supportsGpsTracking={exerciseCatalog.find(e => e.name === exercise.name)?.supportsGpsTracking ?? false}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.cardSoft,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  leftColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  badge: {
    width: sizing.iconLG,
    height: sizing.iconLG,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface.subtle,
  },
  titleColumn: {
    flex: 1,
    gap: spacing.xxxs,
  },
  actionsColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    width: sizing.iconMD + spacing.xs,
    height: sizing.iconMD + spacing.xs,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface.subtle,
  },
  iconButtonDisabled: {
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
});
