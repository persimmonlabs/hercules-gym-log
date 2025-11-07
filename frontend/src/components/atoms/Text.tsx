/**
 * Text Component
 * Themed text with variants, colors, and fade-in animations
 * Supports heading1-3, body, caption variants
 */

import React, { useEffect } from 'react';
import {
  Text as RNText,
  TextProps,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { colors, typography } from '@/constants/theme';
import { textFadeInAnimation } from '@/constants/animations';

// ============================================================================
// TYPES
// ============================================================================

type TextVariant = 'display1' | 'heading1' | 'heading2' | 'heading3' | 'body' | 'bodySemibold' | 'caption' | 'captionSmall';
type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'orange'
  | 'red'
  | 'success'
  | 'warning'
  | 'onAccent';

interface TextComponentProps extends TextProps {
  /** Text variant (heading, body, caption) */
  variant?: TextVariant;
  /** Text color */
  color?: TextColor;
  /** Fade in animation on mount */
  fadeIn?: boolean;
  /** Animation delay (ms) */
  delay?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const Text: React.FC<TextComponentProps> = ({
  variant = 'body',
  color = 'primary',
  fadeIn = false,
  delay = 0,
  children,
  style,
  ...props
}) => {
  const opacity = useSharedValue(fadeIn ? 0 : 1);

  // Fade-in animation on mount
  useEffect(() => {
    if (fadeIn) {
      opacity.value = withTiming(1, {
        duration: textFadeInAnimation.duration,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [fadeIn, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Get typography style and cast fontWeight properly
  const typographyStyle = {
    ...typography[variant],
    fontWeight: typography[variant].fontWeight as any,
  };

  // Get color
  const colorMap: Record<TextColor, string> = {
    primary: colors.text.primary,
    secondary: colors.text.secondary,
    tertiary: colors.text.tertiary,
    orange: colors.accent.orange,
    red: colors.accent.red,
    success: colors.accent.success,
    warning: colors.accent.warning,
    onAccent: colors.text.onAccent,
  };

  const textColor = colorMap[color];

  const textStyle = [
    typographyStyle,
    { color: textColor },
    style,
  ];

  return (
    <Animated.View style={animatedStyle}>
      <RNText style={textStyle} {...props}>
        {children}
      </RNText>
    </Animated.View>
  );
};