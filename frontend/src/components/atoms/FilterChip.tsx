/**
 * FilterChip
 * Atom component for displaying active filters with remove functionality
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing, sizing } from '@/constants/theme';
import { springBouncy, buttonPressAnimation } from '@/constants/animations';

interface FilterChipProps {
  label: string;
  onRemove: () => void;
  testID?: string;
}

export const FilterChip: React.FC<FilterChipProps> = ({ label, onRemove, testID }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    triggerHaptic('selection');
    scale.value = withSpring(0.95, springBouncy);

    setTimeout(() => {
      scale.value = withSpring(1, springBouncy);
      onRemove();
    }, buttonPressAnimation.duration);
  }, [onRemove, scale]);

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label} filter`}
        style={styles.chip}
        onPress={handlePress}
        testID={testID}
      >
        <Text variant="caption" color="primary">
          {label}
        </Text>
        <IconSymbol name="close" color={colors.text.primary} size={sizing.iconXS} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.full,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.subtle,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
});
