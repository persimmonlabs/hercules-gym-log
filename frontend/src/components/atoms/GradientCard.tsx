/**
 * GradientCard
 * Reusable gradient card with bold red-orange palette and strong depth.
 * Provides customizable gradient stops, padding, and radius sourced from the theme.
 */

import React, { ReactNode, useMemo } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { spacing, radius, colors } from '@/constants/theme';

// =============================================================================
// TYPES
// =============================================================================

interface GradientCardProps {
  /** Content rendered inside the gradient card */
  children: ReactNode;
  /** Hex value for the gradient starting color */
  gradientStart?: string;
  /** Hex value for the gradient ending color */
  gradientEnd?: string;
  /** Key referencing spacing scale for internal padding */
  padding?: keyof typeof spacing;
  /** Key referencing radius scale for rounding */
  rounded?: keyof typeof radius;
  /** Optional additional style overrides */
  style?: ViewStyle;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const GradientCard: React.FC<GradientCardProps> = ({
  children,
  gradientStart = colors.accent.gradientStart,
  gradientEnd = colors.accent.gradientEnd,
  padding = 'lg',
  rounded = 'lg',
  style,
}) => {
  const containerStyle = useMemo<ViewStyle>(
    () => ({
      padding: spacing[padding],
      borderRadius: radius[rounded],
    }),
    [padding, rounded]
  );

  return (
    <LinearGradient
      colors={[gradientStart, gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.8 }}
      style={[
        styles.card,
        containerStyle,
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const shadowDepth: ViewStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.18,
  shadowRadius: 20,
  elevation: 10,
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: radius.lg,
    ...shadowDepth,
  },
});
