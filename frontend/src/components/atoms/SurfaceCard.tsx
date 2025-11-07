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

  return (
    <Animated.View style={[styles.card, containerStyle, style]}>
      {showAccentStripe ? <AnimatedAccentStripe style={styles.accentStripe} /> : null}
      {children}
    </Animated.View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  card: {
    width: '100%',
    ...shadows.sm,
    overflow: 'hidden',
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
