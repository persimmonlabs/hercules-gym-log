/**
 * QuickFilterChip
 * Atom pill used to toggle quick search filters with animated feedback.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { colors, radius, spacing } from '@/constants/theme';
import { springBouncy, buttonPressAnimation } from '@/constants/animations';

interface QuickFilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}

export const QuickFilterChip: React.FC<QuickFilterChipProps> = ({ label, active, onPress, testID }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    Haptics.selectionAsync().catch(() => undefined);
    scale.value = withSpring(0.95, springBouncy);

    setTimeout(() => {
      scale.value = withSpring(1, springBouncy);
      onPress();
    }, buttonPressAnimation.duration);
  }, [onPress, scale]);

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={[styles.chip, active ? styles.chipActive : null]}
        onPress={handlePress}
        testID={testID}
      >
        <Text variant="caption" color={active ? 'onAccent' : 'secondary'}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.full,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.card,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
});
