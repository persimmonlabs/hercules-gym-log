/**
 * PlanQuickBuilderSuggestionRow
 * Molecule for displaying a suggested exercise with gradient add button.
 */
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { colors, radius, spacing } from '@/constants/theme';
import type { Exercise } from '@/constants/exercises';
import { springBouncy, buttonPressAnimation } from '@/constants/animations';
import { IconSymbol } from '@/components/ui/icon-symbol';
import hierarchyData from '@/data/hierarchy.json';

interface PlanQuickBuilderSuggestionRowProps {
  exercise: Exercise;
  onAdd: (exercise: Exercise) => void;
}

export const PlanQuickBuilderSuggestionRow: React.FC<PlanQuickBuilderSuggestionRowProps> = ({
  exercise,
  onAdd,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    scale.value = withSpring(0.94, springBouncy);

    setTimeout(() => {
      scale.value = withSpring(1, springBouncy);
      onAdd(exercise);
    }, buttonPressAnimation.duration);
  }, [exercise, onAdd, scale]);

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
    <Animated.View style={animatedStyle}>
      <Pressable style={styles.container} onPress={handlePress} accessibilityRole="button">
        <View style={styles.textGroup}>
          <Text variant="bodySemibold" color="primary">
            {exercise.name}
          </Text>
          <Text variant="caption" color="secondary">
            {midLevelMusclesLabel}
          </Text>
        </View>

        <LinearGradient
          colors={[colors.accent.gradientStart, colors.accent.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.addButton}
        >
          <IconSymbol name="add" color={colors.text.onAccent} size={20} />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    gap: spacing.md,
  },
  textGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
