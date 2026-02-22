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
import type { Insight, EmptyReason } from '@/hooks/useInsightsData';

interface InsightCardProps {
  /** Array of insights of the same type - first one shown by default */
  insights: Insight[];
  /** The insight type, used to show the correct header and empty state */
  insightType: 'plateau' | 'balance' | 'focus';
  /** Why insights are empty — drives the correct empty state message */
  emptyReason?: EmptyReason;
}

const HEADER_TITLES: Record<string, string> = {
  plateau: 'Plateaus Detected',
  balance: 'Balance Alerts',
  focus: 'Focus Suggestions',
};

const EMPTY_STATE_MESSAGES: Record<string, { emoji: string; message: string }> = {
  plateau: {
    emoji: '📈',
    message: "No plateaus detected — your lifts are progressing nicely. Keep pushing!",
  },
  balance: {
    emoji: '⚖️',
    message: "Your training balance looks great this week. Push, pull, upper, lower — all in check.",
  },
  focus: {
    emoji: '🎯',
    message: "You're hitting all the right muscle groups. Your coverage is well-rounded.",
  },
};

const NO_WORKOUTS_MESSAGES: Record<string, { message: string }> = {
  plateau: {
    message: "Complete a few workouts and we'll track your strength progress to detect any plateaus.",
  },
  balance: {
    message: "Log some sessions and we'll analyse your push/pull, upper/lower balance here.",
  },
  focus: {
    message: "Once you've logged a few workouts, we'll suggest which muscle groups need more attention.",
  },
};

const INSUFFICIENT_DATA_MESSAGES: Record<string, { message: string }> = {
  plateau: {
    message: "Keep logging — we need a few more sessions to start detecting plateaus.",
  },
  balance: {
    message: "A few more sessions and we'll have enough data to check your training balance.",
  },
  focus: {
    message: "Log a couple more workouts and we'll start surfacing muscle group suggestions.",
  },
};

export const InsightCard: React.FC<InsightCardProps> = ({ insights, insightType, emptyReason }) => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const headerTitle = HEADER_TITLES[insightType] ?? insightType;

  if (insights.length === 0) {
    let emptyMessage: string;
    if (emptyReason === 'no-workouts') {
      emptyMessage = NO_WORKOUTS_MESSAGES[insightType]?.message ?? '';
    } else if (emptyReason === 'insufficient-data') {
      emptyMessage = INSUFFICIENT_DATA_MESSAGES[insightType]?.message ?? '';
    } else {
      emptyMessage = EMPTY_STATE_MESSAGES[insightType]?.message ?? '';
    }
    return (
      <SurfaceCard tone="neutral" padding="md" showAccentStripe={false}>
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <Text variant="heading3" color="primary" style={styles.title}>
              {headerTitle}
            </Text>
          </View>
          <View style={styles.insightItem}>
            <Text variant="body" color="secondary" style={styles.message}>
              {emptyMessage}
            </Text>
          </View>
          <View pointerEvents="none" style={[styles.expandButton, { opacity: 0 }]}>
            <Text variant="caption" style={{ color: colors.accent.orange }}>
              +0 more
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.accent.orange} />
          </View>
        </View>
      </SurfaceCard>
    );
  }

  const primaryInsight = insights[0];
  const additionalInsights = insights.slice(1);
  const hasMore = additionalInsights.length > 0;

  return (
    <SurfaceCard tone="neutral" padding="md" showAccentStripe={false}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text variant="heading3" color="primary" style={styles.title}>
            {headerTitle}
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
