/**
 * ChatUsageBanner
 * Displays remaining AI chat usage for the current period
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius } from '@/constants/theme';
import type { UsageInfo } from '@/types/herculesAI';

interface ChatUsageBannerProps {
  usage: UsageInfo | null;
}

export const ChatUsageBanner: React.FC<ChatUsageBannerProps> = ({ usage }) => {
  const { theme } = useTheme();

  if (!usage) {
    return null;
  }

  const normalRemaining = Math.max(0, usage.messagesLimit - usage.messagesUsed);
  const totalRemaining = normalRemaining + (usage.purchasedCredits ?? 0);
  const isLow = totalRemaining <= 10;
  const isExhausted = totalRemaining <= 0;

  if (isExhausted) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface.elevated }]}>
      <Text
        variant="caption"
        color={isLow ? 'warning' : 'tertiary'}
      >
        {totalRemaining} credit{totalRemaining !== 1 ? 's' : ''} remaining
        {(usage.purchasedCredits ?? 0) > 0
          ? ` (${usage.purchasedCredits} purchased)`
          : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
});
