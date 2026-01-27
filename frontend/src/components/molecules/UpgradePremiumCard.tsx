/**
 * UpgradePremiumCard
 * Promotional card encouraging free users to upgrade to premium.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { spacing, radius, shadows } from '@/constants/theme';
import { springBouncy } from '@/constants/animations';
import { useTheme } from '@/hooks/useTheme';
import { triggerHaptic } from '@/utils/haptics';

interface UpgradePremiumCardProps {
  onPress?: () => void;
}

export const UpgradePremiumCard: React.FC<UpgradePremiumCardProps> = ({ onPress }) => {
  const router = useRouter();
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    pressable: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md + 2,
      paddingHorizontal: spacing.lg,
      minHeight: 64,
      backgroundColor: theme.surface.card,
      borderRadius: radius.lg,
      marginHorizontal: spacing.lg,
    },
    iconBadge: {
      width: 32,
      height: 32,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accent.orange,
      marginRight: spacing.md,
    },
    content: {
      flex: 1,
      gap: 3,
      justifyContent: 'center',
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text.primary,
    },
    subtitle: {
      fontSize: 13,
      color: theme.text.secondary,
      lineHeight: 18,
    },
    chevron: {
      marginLeft: spacing.sm,
    },
  });

  const handlePress = () => {
    triggerHaptic('selection');
    if (onPress) {
      onPress();
      return;
    }
    router.push('/premium' as any);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.pressable,
        { backgroundColor: pressed ? theme.surface.elevated : theme.surface.card }
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Upgrade to Premium"
    >
      <View style={styles.iconBadge}>
        <IconSymbol name="star" size={18} color="#FFFFFF" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Go Premium</Text>
        <Text style={styles.subtitle}>Unlock advanced analytics and unlimited workouts</Text>
      </View>
      <IconSymbol name="chevron-right" size={18} color={theme.text.tertiary} style={styles.chevron} />
    </Pressable>
  );
};
