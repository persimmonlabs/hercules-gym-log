/**
 * GlassContainer Component
 * Lightweight, airy glass effect using expo-blur
 * Clean, sleek, and modern aesthetic
 */

import React, { ReactNode } from 'react';
import {
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';

import { spacing, radius } from '@/constants/theme';

// ============================================================================
// TYPES
// ============================================================================

interface GlassContainerProps {
  /** Content to render inside the glass container */
  children: ReactNode;
  /** Blur intensity (0-100). Default 85 for airy feel */
  intensity?: number;
  /** Padding size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' */
  padding?: keyof typeof spacing;
  /** Border radius size: 'sm' | 'md' | 'lg' | 'xl' | 'full' */
  rounded?: keyof typeof radius;
  /** Custom style override */
  style?: ViewStyle;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const GlassContainer: React.FC<GlassContainerProps> = ({
  children,
  intensity = 85,
  padding = 'md',
  rounded = 'lg',
  style,
}) => {
  const containerStyle: ViewStyle = {
    borderRadius: radius[rounded],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing[padding],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  };

  return (
    <BlurView intensity={intensity} style={containerStyle}>
      <View style={style}>
        {children}
      </View>
    </BlurView>
  );
};