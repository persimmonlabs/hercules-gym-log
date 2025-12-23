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
import { getExerciseDisplayTagText } from '@/utils/exerciseDisplayTags';

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

  const tagText = useMemo(() => {
    return getExerciseDisplayTagText({
      muscles: exercise.muscles,
      exerciseType: exercise.exerciseType,
    });
  }, [exercise.exerciseType, exercise.muscles]);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable style={styles.container} onPress={handlePress} accessibilityRole="button">
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
