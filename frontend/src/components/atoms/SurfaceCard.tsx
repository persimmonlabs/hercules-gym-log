/**
 * SurfaceCard
 * Neutral card container with consistent padding, radius, and shadow.
 * Designed for calm layouts using the warm neutral palette.
 */

import React, { ReactNode, useMemo } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';

import { colors, radius, shadows, spacing } from '@/constants/theme';
import { AnimatedAccentStripe } from '@/components/atoms/AnimatedAccentStripe';

// =============================================================================
// TYPES
// =============================================================================

export type SurfaceTone = 'card' | 'elevated' | 'subtle' | 'tint' | 'neutral';

interface SurfaceCardProps {
  /** Content displayed inside the card */
  children: ReactNode;
  /** Spacing token for internal padding */
  padding?: keyof typeof spacing;
  /** Surface tone (card, elevated, subtle) */
  tone?: SurfaceTone;
  /** Optional style overrides */
  style?: StyleProp<AnimatedStyle<ViewStyle>>;
  /** Control visibility of the animated accent stripe */
  showAccentStripe?: boolean;
  /** Disable drop shadow rendering */
  withShadow?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const SurfaceCard: React.FC<SurfaceCardProps> = ({
  children,
  padding = 'xl',
  tone = 'card',
  style,
  showAccentStripe = true,
  withShadow = true,
}) => {
  const containerStyle = useMemo<ViewStyle>(
    () => ({
      padding: spacing[padding],
      borderRadius: radius.lg,
      backgroundColor:
        tone === 'neutral'
          ? colors.surface.card
          : colors.surface[tone === 'tint' ? 'tint' : tone],
    }),
    [padding, tone]
  );

  const flattenedStyle = useMemo<ViewStyle | undefined>(() => {
    if (!style) {
      return undefined;
    }

    return StyleSheet.flatten(style) as ViewStyle;
  }, [style]);

  const marginKeys = useMemo(() => (
    [
      'margin',
      'marginTop',
      'marginRight',
      'marginBottom',
      'marginLeft',
      'marginHorizontal',
      'marginVertical',
      'marginStart',
      'marginEnd',
    ] as const
  ), []);

  const { outerStyle, innerStyle } = useMemo(() => {
    if (!flattenedStyle) {
      return {
        outerStyle: undefined,
        innerStyle: undefined,
      };
    }

    const resolvedOuter: ViewStyle = {};
    const resolvedInner: ViewStyle = {};

    Object.entries(flattenedStyle).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }

      if ((marginKeys as readonly string[]).includes(key)) {
        (resolvedOuter as Record<string, unknown>)[key] = value;
        return;
      }

      (resolvedInner as Record<string, unknown>)[key] = value;
    });

    return {
      outerStyle: Object.keys(resolvedOuter).length > 0 ? resolvedOuter : undefined,
      innerStyle: Object.keys(resolvedInner).length > 0 ? resolvedInner : undefined,
    };
  }, [flattenedStyle, marginKeys]);

  return (
    <Animated.View style={[styles.shadowWrapper, withShadow ? styles.cardShadow : null, outerStyle]}>
      <Animated.View style={[styles.cardInner, containerStyle, innerStyle]}>
        {showAccentStripe ? <AnimatedAccentStripe style={styles.accentStripe} /> : null}
        {children}
      </Animated.View>
    </Animated.View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  shadowWrapper: {
    width: '100%',
    borderRadius: radius.lg,
  },
  cardShadow: {
    ...shadows.sm,
  },
  cardInner: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    position: 'relative',
  },
  accentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: spacing.xs,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
});
