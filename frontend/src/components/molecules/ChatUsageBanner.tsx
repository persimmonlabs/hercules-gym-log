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

  const messagesRemaining = Math.max(0, usage.messagesLimit - usage.messagesUsed);
  const isLow = messagesRemaining <= 5;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface.elevated }]}>
      {/* Usage banner content removed */}
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
