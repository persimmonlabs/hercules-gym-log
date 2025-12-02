/**
 * StreaksCard
 * Displays workout streak and consistency overview
 * 
 * Shows: current streak, longest streak, workouts this week, average per week
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';

interface StatItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  highlight?: boolean;
}

const StatItem: React.FC<StatItemProps> = ({ icon, label, value, highlight }) => (
  <View style={styles.statItem}>
    <View style={[styles.iconContainer, highlight && styles.iconHighlight]}>
      <Ionicons
        name={icon}
        size={20}
        color={highlight ? colors.text.onAccent : colors.accent.orange}
      />
    </View>
    <Text variant="statValue" color="primary" style={styles.statValue}>
      {value}
    </Text>
    <Text variant="caption" color="secondary" style={styles.statLabel}>
      {label}
    </Text>
  </View>
);

export const StreaksCard: React.FC = () => {
  const { streakData, hasData } = useAnalyticsData();

  if (!hasData) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="flame-outline" size={32} color={colors.text.tertiary} />
        <Text variant="body" color="secondary" style={styles.emptyText}>
          Complete your first workout to start tracking streaks!
        </Text>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <View style={styles.statsGrid}>
        <StatItem
          icon="flame"
          label="Current Streak"
          value={`${streakData.currentStreak}d`}
          highlight={streakData.currentStreak > 0}
        />
        <StatItem
          icon="trophy"
          label="Best Streak"
          value={`${streakData.longestStreak}d`}
        />
        <StatItem
          icon="calendar"
          label="This Week"
          value={streakData.workoutsThisWeek}
        />
        <StatItem
          icon="trending-up"
          label="Avg/Week"
          value={streakData.averagePerWeek}
        />
      </View>

      {/* Motivational message based on streak */}
      {streakData.currentStreak >= 7 && (
        <View style={styles.motivationBanner}>
          <Ionicons name="star" size={16} color={colors.accent.orange} />
          <Text variant="caption" color="primary" style={styles.motivationText}>
            {streakData.currentStreak >= 30
              ? "Incredible! You're a fitness machine! 💪"
              : streakData.currentStreak >= 14
              ? "Two weeks strong! Keep crushing it!"
              : "One week streak! You're building momentum!"}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  iconHighlight: {
    backgroundColor: colors.accent.orange,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    textAlign: 'center',
    marginTop: spacing.xxs,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
  },
  motivationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.tint,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  motivationText: {
    flex: 1,
  },
});
