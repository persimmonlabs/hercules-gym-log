import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export type BadgeVariant = 'primary' | 'accent' | 'neutral' | 'outline' | 'success' | 'warning' | 'workout';
export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'sm',
  style
}) => {
  const { theme } = useTheme();

  const getTextColor = () => {
    switch (variant) {
      case 'outline': return 'secondary';
      case 'neutral': return 'primary';
      case 'workout': return 'primary'; // overridden below
      default: return 'onAccent';
    }
  };

  const variantStyles = useMemo(() => {
    switch (variant) {
      case 'workout':
        return {
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: theme.border.light,
        };
      case 'neutral':
        return {
          backgroundColor: theme.surface.elevated,
          borderWidth: 1,
          borderColor: theme.border.light,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.border.medium,
        };
      case 'accent':
      case 'primary':
        return {
          backgroundColor: theme.accent.primary,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.2)',
        };
      case 'success':
        return {
          backgroundColor: theme.accent.success,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.2)',
        };
      case 'warning':
        return {
          backgroundColor: theme.accent.warning,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.2)',
        };
      default:
        return {};
    }
  }, [variant, theme]);

  const containerStyles = [
    styles.container,
    size === 'sm' ? styles.sizeSm : styles.sizeMd,
    variantStyles,
    style,
  ];

  return (
    <View style={containerStyles}>
      <Text
        variant={size === 'sm' ? 'caption' : 'body'}
        color={variant === 'workout' ? undefined : getTextColor()}
        style={{
          textTransform: 'capitalize',
          ...(variant === 'workout' ? { color: '#000000' } : {})
        }}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
});
