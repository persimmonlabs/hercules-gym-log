/**
 * ExerciseSelectionRow
 * Selectable row used within the Add Exercises screen.
 */
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import type { Exercise } from '@/constants/exercises';
import { colors, radius, spacing } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getExerciseDisplayTagText } from '@/utils/exerciseDisplayTags';

interface ExerciseSelectionRowProps {
  exercise: Exercise;
  selected: boolean;
  onToggle: (exercise: Exercise) => void;
}

export const ExerciseSelectionRow: React.FC<ExerciseSelectionRowProps> = ({ exercise, selected, onToggle }) => {
  const handlePress = useCallback(() => {
    Haptics.selectionAsync().catch(() => undefined);
    onToggle(exercise);
  }, [exercise, onToggle]);

  const tagText = useMemo(() => {
    return getExerciseDisplayTagText({
      muscles: exercise.muscles,
      exerciseType: exercise.exerciseType,
    });
  }, [exercise.exerciseType, exercise.muscles]);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={handlePress}
      style={({ pressed }) => [styles.container, selected ? styles.containerSelected : null]}
    >
      <View style={styles.leftColumn}>
        <View style={styles.textGroup}>
          <Text variant="bodySemibold" color="primary">
            {exercise.name}
          </Text>
          {tagText ? (
            <Text variant="caption" color="secondary">
              {tagText}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.checkbox, selected ? styles.checkboxSelected : null]}>
        {selected ? <IconSymbol name="check" color={colors.text.onAccent} size={18} /> : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.card,
    gap: spacing.md,
  },
  leftColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  containerSelected: {
    borderColor: colors.accent.primary,
  },
  textGroup: {
    gap: spacing.xxxs,
  },
  checkbox: {
    width: spacing.lg,
    height: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.tint,
  },
  checkboxSelected: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
});
