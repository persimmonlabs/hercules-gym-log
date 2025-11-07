/**
 * WeeklyStreakCard
 * Organism component that visualizes the user's weekly activity streak.
 * Combines schedule awareness with warm neutral surfaces and subtle accents.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { colors, radius, sizing, spacing } from '@/constants/theme';
import { WeekDayTracker } from '@/types/dashboard';

interface WeeklyStreakCardProps {
  /** Title displayed at the top of the card */
  title: string;
  /** Supporting copy explaining the section */
  subtitle: string;
  /** Weekly activity data */
  data: WeekDayTracker[];
}

export const WeeklyStreakCard: React.FC<WeeklyStreakCardProps> = ({
  title,
  subtitle,
  data,
}) => {
  return (
    <SurfaceCard tone="subtle" padding="xl">
      <View style={styles.header}>
        <Text variant="heading3" color="primary">
          {title}
        </Text>
        <Text variant="body" color="secondary">
          {subtitle}
        </Text>
      </View>

      <View style={styles.weekRow}>
        {data.map((day) => (
          <View key={day.id} style={styles.dayBubbleWrapper}>
            <View
              style={[
                styles.dayBubble,
                day.hasWorkout && styles.dayBubbleCompleted,
                day.isToday && styles.dayBubbleToday,
              ]}
            >
              <Text variant="bodySemibold" color="primary">
                {day.date}
              </Text>
            </View>
            <Text variant="caption" color="secondary">
              {day.label}
            </Text>
          </View>
        ))}
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  dayBubbleWrapper: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  dayBubble: {
    width: sizing.weekBubble,
    height: sizing.weekBubble,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  dayBubbleCompleted: {
    borderColor: colors.accent.orange,
    backgroundColor: colors.surface.subtle,
  },
  dayBubbleToday: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.surface.tint,
  },
});
