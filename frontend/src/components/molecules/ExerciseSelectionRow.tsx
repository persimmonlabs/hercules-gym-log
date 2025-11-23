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
import hierarchyData from '@/data/hierarchy.json';

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

  // Build muscle to mid-level group mapping
  const muscleToMidLevelMap = useMemo(() => {
    const map: Record<string, string> = {};
    const hierarchy = hierarchyData.muscle_hierarchy;

    Object.entries(hierarchy).forEach(([l1, l1Data]) => {
      if (l1Data.muscles) {
        Object.entries(l1Data.muscles).forEach(([midLevel, midLevelData]) => {
          // Map the mid-level group to itself
          map[midLevel] = midLevel;
          
          // Map all low-level muscles to their mid-level parent
          if (midLevelData.muscles) {
            Object.keys(midLevelData.muscles).forEach(lowLevel => {
              map[lowLevel] = midLevel;
            });
          }
        });
      }
    });
    return map;
  }, []);

  const midLevelMusclesLabel = useMemo(() => {
    // Get all muscle names from the exercise's muscles object
    const muscleNames = Object.keys(exercise.muscles || {});
    
    // Map each muscle to its mid-level parent group
    const midLevelGroups = muscleNames.map(muscle => muscleToMidLevelMap[muscle]).filter(Boolean);
    
    // Remove duplicates and sort for consistency
    const uniqueGroups = [...new Set(midLevelGroups)];
    
    return uniqueGroups.length > 0 ? uniqueGroups.join(' · ') : 'General';
  }, [exercise.muscles, muscleToMidLevelMap]);

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
          <Text variant="caption" color="secondary">
            {midLevelMusclesLabel}
          </Text>
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
