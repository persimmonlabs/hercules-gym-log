/**
 * InsightCard
 * Displays actionable training insights with colored borders based on priority
 * Shows one insight per category with expandable list for additional insights
 * 
 * Border colors:
 * - Red: Alerts (plateaus)
 * - Amber: Warnings (balance issues)
 * - Blue: Suggestions (focus areas)
 * - Green: Celebrations (streak milestones)
 */

import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { spacing, radius, colors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Insight } from '@/hooks/useInsightsData';

interface InsightCardProps {
  /** Array of insights of the same type - first one shown by default */
  insights: Insight[];
}

export const InsightCard: React.FC<InsightCardProps> = ({ insights }) => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  if (insights.length === 0) return null;

  const primaryInsight = insights[0];
  const additionalInsights = insights.slice(1);
  const hasMore = additionalInsights.length > 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface.card,
          borderColor: primaryInsight.borderColor,
        },
      ]}
    >
      {/* Primary Insight */}
      <View style={styles.insightItem}>
        {/* Header with icon and title */}
        <View style={styles.header}>
          <Text style={styles.icon}>{primaryInsight.icon}</Text>
          <Text variant="heading3" color="primary" style={styles.title}>
            {primaryInsight.title}
          </Text>
        </View>

        {/* Message */}
        <Text variant="body" color="secondary" style={styles.message}>
          {primaryInsight.message}
        </Text>
      </View>

      {/* Additional insights (collapsed by default) */}
      {hasMore && isExpanded && (
        <View style={styles.additionalInsights}>
          {additionalInsights.map((insight, index) => (
            <View
              key={index}
              style={[
                styles.additionalItem,
                { borderTopColor: theme.border.light },
              ]}
            >
              <Text variant="body" color="secondary" style={styles.message}>
                {insight.message}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Expand/Collapse button */}
      {hasMore && (
        <Pressable
          onPress={() => setIsExpanded(!isExpanded)}
          style={styles.expandButton}
          hitSlop={spacing.sm}
        >
          <Text variant="caption" style={{ color: colors.accent.orange }}>
            {isExpanded
              ? 'Show less'
              : `+${additionalInsights.length} more`}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.accent.orange}
          />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 2,
    padding: spacing.md,
    gap: spacing.sm,
  },
  insightItem: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: 24,
  },
  title: {
    flex: 1,
  },
  message: {
    lineHeight: 22,
  },
  additionalInsights: {
    gap: spacing.sm,
  },
  additionalItem: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
});
