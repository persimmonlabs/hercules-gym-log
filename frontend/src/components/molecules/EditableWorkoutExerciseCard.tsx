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
import { useTheme } from '@/hooks/useTheme';
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
  const { theme } = useTheme();
  const badgeLabel = useMemo(() => String(index + 1).padStart(2, '0'), [index]);

  const handleMove = (callback: () => void) => {
    triggerHaptic('selection');
    callback();
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.card, { backgroundColor: theme.surface.card, borderColor: theme.accent.orangeMuted }]}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`Toggle exercise ${exercise.name}`}
        disabled={isInteractionDisabled}
      >
        <View style={styles.headerRow}>
          <View style={styles.leftColumn}>
            <View style={[styles.badge, { backgroundColor: theme.surface.elevated, borderColor: theme.accent.orangeMuted }]}>
              <Text variant="bodySemibold" color="primary">
                {badgeLabel}
              </Text>
            </View>
            <View style={styles.titleColumn}>
              <Text variant="bodySemibold" color="secondary">
                {exercise.name}
              </Text>
              <Text variant="caption" color="secondary">
                {`${exercise.sets.length} set${exercise.sets.length === 1 ? '' : 's'}`}
              </Text>
            </View>
          </View>
          <View style={styles.actionsColumn}>
            <Pressable
              style={[styles.iconButton, { backgroundColor: theme.surface.elevated }, (!canMoveUp || isInteractionDisabled) && { backgroundColor: theme.surface.card, borderWidth: 1, borderColor: theme.border.medium }]}
              onPress={() => handleMove(onMoveUp)}
              disabled={!canMoveUp || isInteractionDisabled}
              accessibilityRole="button"
              accessibilityLabel="Move exercise up"
            >
              <MaterialCommunityIcons
                name="chevron-up"
                size={sizing.iconMD}
                color={canMoveUp ? theme.text.primary : theme.text.tertiary}
              />
            </Pressable>
            <Pressable
              style={[styles.iconButton, { backgroundColor: theme.surface.elevated }, (!canMoveDown || isInteractionDisabled) && { backgroundColor: theme.surface.card, borderWidth: 1, borderColor: theme.border.medium }]}
              onPress={() => handleMove(onMoveDown)}
              disabled={!canMoveDown || isInteractionDisabled}
              accessibilityRole="button"
              accessibilityLabel="Move exercise down"
            >
              <MaterialCommunityIcons
                name="chevron-down"
                size={sizing.iconMD}
                color={canMoveDown ? theme.text.primary : theme.text.tertiary}
              />
            </Pressable>
            <Pressable
              style={[styles.iconButton, { backgroundColor: theme.surface.elevated }, isInteractionDisabled && { backgroundColor: theme.surface.card, borderWidth: 1, borderColor: theme.border.medium }]}
              onPress={() => handleMove(onRemove)}
              disabled={isInteractionDisabled}
              accessibilityRole="button"
              accessibilityLabel="Remove exercise"
            >
              <MaterialCommunityIcons name="trash-can-outline" size={sizing.iconMD} color={theme.accent.orange} />
            </Pressable>
            <MaterialCommunityIcons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={sizing.iconMD}
              color={theme.text.secondary}
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
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  iconButtonDisabled: {
    borderWidth: 1,
  },
});
