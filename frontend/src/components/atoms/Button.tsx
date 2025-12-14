/**
 * Button Component
 * Reusable, animated button with multiple variants and sizes
 * Includes spring animations, haptic feedback, and polished styling
 */

import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text as RNText,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, radius, typography, sizing, opacity, shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { springBouncy, buttonPressAnimation } from '@/constants/animations';

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized.padEnd(6, '0');

  const value = parseInt(full, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }): string => {
  const toHex = (component: number) => component.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const interpolateHexColor = (start: string, end: string, ratio: number): string => {
  const factor = clamp(ratio, 0, 1);
  const startRgb = hexToRgb(start);
  const endRgb = hexToRgb(end);

  const mixChannel = (channelStart: number, channelEnd: number) => {
    return Math.round(channelStart + (channelEnd - channelStart) * factor);
  };

  return rgbToHex({
    r: mixChannel(startRgb.r, endRgb.r),
    g: mixChannel(startRgb.g, endRgb.g),
    b: mixChannel(startRgb.b, endRgb.b),
  });
};

// ============================================================================
// TYPES
// ============================================================================

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'light';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps {
  /** Button label text */
  label: string;
  /** Callback when button is pressed */
  onPress: () => void;
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Custom style override */
  style?: StyleProp<ViewStyle>;
  /** Optional override for inner button styling */
  contentStyle?: StyleProp<ViewStyle>;
  /** Whether to show loading state */
  loading?: boolean;
  /** Optional override for text color */
  textColor?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
  contentStyle,
  loading = false,
  textColor,
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  // Animation styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Handle press with animation and haptics
  const handlePress = useCallback(() => {
    if (disabled || loading) return;

    // Haptic feedback
    Haptics.selectionAsync();

    // Reset scale after brief delay
    setTimeout(() => {
      onPress();
    }, buttonPressAnimation.duration);
  }, [disabled, loading, onPress]);

  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;
    scale.value = withSpring(0.92, springBouncy);
  }, [disabled, loading, scale]);

  const handlePressOut = useCallback(() => {
    if (disabled || loading) return;
    scale.value = withSpring(1, springBouncy);
  }, [disabled, loading, scale]);

  const baseButtonStyle = [styles.buttonBase, sizeStyles[size]];
  const disabledStyle = disabled ? styles.disabled : undefined;

  let content: React.ReactNode;

  // Dynamic variant styles based on theme
  const dynamicVariantStyles: Record<Exclude<ButtonVariant, 'primary'>, ViewStyle> = {
    secondary: {
      backgroundColor: theme.surface.tint,
      borderWidth: 1,
      borderColor: theme.border.light,
      borderRadius: radius.lg,
    },
    ghost: {
      backgroundColor: theme.surface.card,
      borderWidth: 1.5,
      borderColor: theme.accent.orange,
      borderRadius: radius.lg,
    },
    danger: {
      backgroundColor: theme.accent.red,
      borderRadius: radius.lg,
    },
    light: {
      backgroundColor: theme.surface.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.border.light,
    },
  };

  // Dynamic text colors based on theme
  const dynamicTextStyles: Record<Exclude<ButtonVariant, 'light'>, TextStyle> = {
    primary: { color: theme.text.onAccent },
    secondary: { color: theme.text.primary },
    ghost: { color: theme.accent.orange },
    danger: { color: theme.text.onAccent },
  };

  const textVariantStyle = variant !== 'light' ? dynamicTextStyles[variant as Exclude<ButtonVariant, 'light'>] : undefined;

  const finalTextStyle = [
    styles.textBase,
    textSizeStyles[size],
    textVariantStyle,
  ].filter(Boolean) as TextStyle[];

  if (textColor) {
    finalTextStyle.push({ color: textColor });
  }

  if (variant === 'primary') {
    content = (
      <LinearGradient
        colors={[theme.accent.gradientStart, theme.accent.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[...baseButtonStyle, styles.primaryButton, contentStyle as ViewStyle, disabledStyle]}
      >
        <RNText style={finalTextStyle}>{loading ? '...' : label}</RNText>
      </LinearGradient>
    );
  } else {
    const variantStyle = dynamicVariantStyles[variant];

    const variantShadow =
      variant === 'danger'
        ? styles.dangerShadow
        : variant === 'secondary'
        ? styles.secondaryShadow
        : variant === 'light'
        ? styles.lightShadow
        : undefined;

    const renderLabel = () => {
      if (variant === 'light') {
        const letters = label.split('');
        const denominator = Math.max(letters.length - 1, 1);

        return (
          <View style={styles.lightLetterRow}>
            {letters.map((char, index) => {
              const ratio = letters.length === 1 ? 0 : index / denominator;
              const letterColor = interpolateHexColor(
                theme.accent.gradientStart,
                theme.accent.gradientEnd,
                ratio
              );

              return (
                <RNText
                  key={`${char}-${index}`}
                  style={[
                    styles.textBase,
                    textSizeStyles[size],
                    styles.lightLetter,
                    { color: letterColor },
                  ]}
                >
                  {char === ' ' ? '\u00A0' : char}
                </RNText>
              );
            })}
          </View>
        );
      }

      return <RNText style={finalTextStyle}>{loading ? '...' : label}</RNText>;
    };

    content = (
      <Animated.View
        style={[...baseButtonStyle, variantStyle, variantShadow, contentStyle, disabledStyle]}
      >
        {renderLabel()}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        style={styles.touchable}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        {content}
      </TouchableOpacity>
    </Animated.View>
  );
};

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: {
    height: sizing.buttonSM,
    paddingHorizontal: spacing.lg,
  },
  md: {
    height: sizing.buttonMD,
    paddingHorizontal: spacing.xl,
  },
  lg: {
    height: sizing.buttonLG,
    paddingHorizontal: spacing['2xl'],
  },
  xl: {
    height: sizing.buttonXL,
    paddingHorizontal: spacing['2xl'],
  },
};

const textSizeStyles: Record<ButtonSize, TextStyle> = {
  sm: { fontSize: 14 },
  md: { fontSize: 16 },
  lg: { fontSize: 18 },
  xl: { fontSize: 18 },
};

const styles = StyleSheet.create({
  touchable: {
    width: '100%',
  },
  buttonBase: {
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    borderRadius: radius.lg,
  },
  secondaryButton: {
    backgroundColor: colors.surface.tint,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.lg,
  },
  secondaryShadow: {
    ...shadows.sm,
  },
  ghostButton: {
    backgroundColor: colors.surface.card,
    borderWidth: 1.5,
    borderColor: colors.accent.orange,
    borderRadius: radius.lg,
  },
  dangerButton: {
    backgroundColor: colors.accent.red,
    borderRadius: radius.lg,
  },
  dangerShadow: {
    ...shadows.md,
  },
  lightButton: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  lightShadow: {
    ...shadows.sm,
  },
  textBase: {
    ...typography.bodySemibold,
    fontWeight: '600' as any,
  },
  primaryText: {
    color: colors.text.onAccent,
  },
  secondaryText: {
    color: colors.text.primary,
  },
  ghostText: {
    color: colors.accent.orange,
  },
  dangerText: {
    color: colors.text.onAccent,
  },
  lightText: {
    color: colors.accent.primary,
  },
  lightTextMask: {
    ...typography.bodySemibold,
    fontWeight: '600' as any,
    color: colors.text.primary,
  },
  disabled: {
    opacity: opacity.disabled,
  },
  lightLetterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lightLetter: {
    fontWeight: '600' as any,
  },
});