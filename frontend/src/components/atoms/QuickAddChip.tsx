/**
 * QuickAddChip
 * Atom for animated pill chip used to add exercises quickly.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { colors, radius, spacing } from '@/constants/theme';
import { springBouncy, buttonPressAnimation } from '@/constants/animations';

interface QuickAddChipProps {
  label: string;
  onPress: () => void;
  testID?: string;
}

export const QuickAddChip: React.FC<QuickAddChipProps> = ({ label, onPress, testID }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.94, springBouncy);
    triggerHaptic('selection');

    setTimeout(() => {
      scale.value = withSpring(1, springBouncy);
      onPress();
    }, buttonPressAnimation.duration);
  }, [onPress, scale]);

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint={`Add ${label} exercise`}
        style={styles.chip}
        onPress={handlePress}
        testID={testID}
      >
        <View style={styles.textContainer}>
          <Text variant="caption" color="primary">
            {label}
          </Text>
        </View>
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
    backgroundColor: colors.surface.subtle,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  textContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
