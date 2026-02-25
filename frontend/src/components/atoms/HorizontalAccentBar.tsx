/**
 * HorizontalAccentBar
 * Orange horizontal accent bar for placement under titles
 */

import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface HorizontalAccentBarProps {
  /** Optional style overrides for the bar */
  style?: StyleProp<ViewStyle>;
  /** Whether the bar should span full width (defaults to true) */
  fullWidth?: boolean;
  /** Custom width if fullWidth is false (defaults to 100px) */
  width?: number;
}

export const HorizontalAccentBar: React.FC<HorizontalAccentBarProps> = ({ 
  style, 
  fullWidth = true,
  width = 100 
}) => {
  const { theme } = useTheme();
  const barStyle = fullWidth 
    ? [styles.bar, { backgroundColor: theme.accent.orangeMuted }, styles.fullWidth, style] 
    : [styles.bar, { backgroundColor: theme.accent.orangeMuted, width }, style];
    
  return (
    <Animated.View 
      pointerEvents="none" 
      style={barStyle} 
    />
  );
};

const styles = StyleSheet.create({
  bar: {
    height: 3,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.xs,
  },
  fullWidth: {
    width: '100%',
  },
});
