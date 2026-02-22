/**
 * AnimatedChevron
 * A bouncing chevron-down icon used to hint at scrollable content below.
 * Uses Reanimated for a smooth, looping bounce animation.
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/theme';

interface AnimatedChevronProps {
  size?: number;
  color?: string;
}

export const AnimatedChevron: React.FC<AnimatedChevronProps> = ({
  size = 24,
  color,
}) => {
  const { theme } = useTheme();
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Ionicons
        name="chevron-down"
        size={size}
        color={color ?? theme.text.secondary}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
});
