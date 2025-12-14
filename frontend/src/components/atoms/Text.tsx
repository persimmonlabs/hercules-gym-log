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

import { typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { textFadeInAnimation } from '@/constants/animations';

// ============================================================================
// TYPES
// ============================================================================

type TextVariant =
  | 'display1'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'label'
  | 'labelMedium'
  | 'statValue'
  | 'captionMedium'
  | 'body'
  | 'bodySemibold'
  | 'caption'
  | 'captionSmall';
type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'neutral'
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
  const { theme } = useTheme();
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

  // Get color based on current theme
  const colorMap: Record<TextColor, string> = {
    primary: theme.text.primary,
    secondary: theme.text.secondary,
    tertiary: theme.text.tertiary,
    neutral: theme.neutral.gray600,
    orange: theme.accent.orange,
    red: theme.accent.red,
    success: theme.accent.success,
    warning: theme.accent.warning,
    onAccent: theme.text.onAccent,
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