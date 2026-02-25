/**
 * AnimatedAccentStripe
 * Solid accent stripe aligned to the left edge of cards.
 */

import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';

interface AnimatedAccentStripeProps {
  /** Optional style overrides for stripe layout */
  style?: StyleProp<ViewStyle>;
}

export const AnimatedAccentStripe: React.FC<AnimatedAccentStripeProps> = ({ style }) => {
  const { theme } = useTheme();
  return <Animated.View pointerEvents="none" style={[styles.stripe, { backgroundColor: theme.accent.orange }, style]} />;
};

const styles = StyleSheet.create({
  stripe: {},
});
