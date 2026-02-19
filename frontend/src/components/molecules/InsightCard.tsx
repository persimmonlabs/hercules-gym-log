/**
 * InsightCard
 * Displays actionable training insights with consistent app theme styling
 * Shows one insight per category with expandable list for additional insights
 * 
 * Uses orange theme colors throughout, no icons or colored borders
 */

import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { spacing, colors, radius } from '@/constants/theme';
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

  // Map insight types to consistent headers
  const getHeaderTitle = (type: string): string => {
    switch (type) {
      case 'plateau':
        return 'Plateaus Detected';
      case 'balance':
        return 'Balance Alerts';
      case 'focus':
        return 'Focus Suggestions';
      default:
        return primaryInsight.title;
    }
  };

  return (
    <SurfaceCard tone="neutral" padding="md" showAccentStripe={false}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text variant="heading3" color="primary" style={styles.title}>
            {getHeaderTitle(primaryInsight.type)}
          </Text>
        </View>

        {/* Primary Insight Content */}
        <View style={styles.insightItem}>
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

        {/* Expand/Collapse button (or invisible placeholder to keep spacing consistent) */}
        {hasMore ? (
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
        ) : (
          <View pointerEvents="none" style={[styles.expandButton, { opacity: 0 }]}>
            <Text variant="caption" style={{ color: colors.accent.orange }}>
              +0 more
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.accent.orange} />
          </View>
        )}
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  // Compact spacing to match Dashboard cards (AnalyticsCard)
  content: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  headerSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  title: {
    textAlign: 'center',
  },
  insightItem: {
    width: '100%',
    alignItems: 'flex-start',
  },
  message: {
    lineHeight: 22,
    textAlign: 'left',
  },
  additionalInsights: {
    gap: spacing.xs,
  },
  additionalItem: {
    borderTopWidth: 1,
    paddingTop: spacing.xs,
  },
  expandButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
});
