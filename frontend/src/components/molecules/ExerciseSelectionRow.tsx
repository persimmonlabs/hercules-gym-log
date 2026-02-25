/**
 * ExerciseSelectionRow
 * Selectable row used within the Add Exercises screen.
 */
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import type { Exercise } from '@/constants/exercises';
import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getExerciseDisplayTagText } from '@/utils/exerciseDisplayTags';

interface ExerciseSelectionRowProps {
  exercise: Exercise;
  selected: boolean;
  onToggle: (exercise: Exercise) => void;
}

export const ExerciseSelectionRow: React.FC<ExerciseSelectionRowProps> = React.memo(({ exercise, selected, onToggle }) => {
  const { theme } = useTheme();
  const handlePress = useCallback(() => {
    triggerHaptic('selection');
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
      style={({ pressed }) => [styles.container, { borderColor: theme.border.light, backgroundColor: theme.surface.card }, selected && { borderColor: theme.accent.primary }]}
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

      <View style={[styles.checkbox, { borderColor: theme.border.light, backgroundColor: theme.surface.tint }, selected && { backgroundColor: theme.accent.primary, borderColor: theme.accent.primary }]}>
        {selected ? <IconSymbol name="check" color={theme.text.onAccent} size={18} /> : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  leftColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  textGroup: {
    gap: spacing.xxxs,
  },
  checkbox: {
    width: spacing.lg,
    height: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
