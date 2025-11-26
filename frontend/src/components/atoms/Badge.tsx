import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing } from '@/constants/theme';

export type BadgeVariant = 'primary' | 'accent' | 'neutral' | 'outline' | 'success' | 'warning';
export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Sizes
  sizeSm: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  sizeMd: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  // Variants
  primary: {
    backgroundColor: colors.accent.primary,
  },
  accent: {
    backgroundColor: colors.accent.primary,
  },
  neutral: {
    backgroundColor: colors.surface.elevated,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  success: {
    backgroundColor: colors.accent.success,
  },
  warning: {
    backgroundColor: colors.accent.warning,
  },
});

export const Badge: React.FC<BadgeProps> = ({ 
  label, 
  variant = 'neutral', 
  size = 'sm', 
  style 
}) => {
  const getTextColor = () => {
    switch (variant) {
      case 'outline': return 'secondary';
      case 'neutral': return 'primary';
      default: return 'onAccent'; // Assuming inverse is white/contrast
    }
  };

  const containerStyles = [
    styles.container,
    size === 'sm' ? styles.sizeSm : styles.sizeMd,
    styles[variant],
    style,
  ];

  return (
    <View style={containerStyles}>
      <Text 
        variant={size === 'sm' ? 'caption' : 'body'} 
        color={getTextColor()}
        style={{ textTransform: 'capitalize' }}
      >
        {label}
      </Text>
    </View>
  );
};
