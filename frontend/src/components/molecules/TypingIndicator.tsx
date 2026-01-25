/**
 * TypingIndicator
 * Animated dot-dot-dot indicator for AI typing state
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { spacing, radius } from '@/constants/theme';

interface TypingIndicatorProps {
  isVisible: boolean;
}

const DOT_SIZE = 8;
const ANIMATION_DURATION = 400;

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible }) => {
  const { theme } = useTheme();

  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  useEffect(() => {
    if (isVisible) {
      dot1Opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: ANIMATION_DURATION }),
          withTiming(0.3, { duration: ANIMATION_DURATION })
        ),
        -1,
        false
      );

      dot2Opacity.value = withDelay(
        ANIMATION_DURATION / 3,
        withRepeat(
          withSequence(
            withTiming(1, { duration: ANIMATION_DURATION }),
            withTiming(0.3, { duration: ANIMATION_DURATION })
          ),
          -1,
          false
        )
      );

      dot3Opacity.value = withDelay(
        (ANIMATION_DURATION / 3) * 2,
        withRepeat(
          withSequence(
            withTiming(1, { duration: ANIMATION_DURATION }),
            withTiming(0.3, { duration: ANIMATION_DURATION })
          ),
          -1,
          false
        )
      );
    } else {
      dot1Opacity.value = 0.3;
      dot2Opacity.value = 0.3;
      dot3Opacity.value = 0.3;
    }
  }, [isVisible, dot1Opacity, dot2Opacity, dot3Opacity]);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }));

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.dotsContainer}>
        <Animated.View
          style={[styles.dot, { backgroundColor: theme.text.secondary }, dot1Style]}
        />
        <Animated.View
          style={[styles.dot, { backgroundColor: theme.text.secondary }, dot2Style]}
        />
        <Animated.View
          style={[styles.dot, { backgroundColor: theme.text.secondary }, dot3Style]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingVertical: spacing.md,
    width: '100%',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
