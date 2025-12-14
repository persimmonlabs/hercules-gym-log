/**
 * CardioStatsCard
 * Displays cardio statistics: total duration and distance by exercise type.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { colors, spacing, radius } from '@/constants/theme';
import type { CardioStats } from '@/types/analytics';
import { useSettingsStore } from '@/store/settingsStore';

interface CardioStatsCardProps {
  stats: CardioStats;
  timeRangeLabel: string;
}

const formatDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
};

export const CardioStatsCard: React.FC<CardioStatsCardProps> = ({
  stats,
  timeRangeLabel,
}) => {
  const { formatDistance } = useSettingsStore();
  const { totalDuration, totalDistanceByType, sessionCount } = stats;
  
  // Check if there's any cardio data
  const hasData = totalDuration > 0 || Object.keys(totalDistanceByType).length > 0;
  
  if (!hasData) {
    return null;
  }

  const distanceEntries = Object.entries(totalDistanceByType).filter(([, dist]) => dist > 0);

  return (
    <SurfaceCard tone="neutral" padding="lg" showAccentStripe>
      <View style={styles.header}>
        <Text variant="heading3" color="primary">
          Cardio Summary
        </Text>
        <Text variant="caption" color="secondary">
          {timeRangeLabel}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text variant="heading2" color="primary">
            {formatDuration(totalDuration)}
          </Text>
          <Text variant="caption" color="secondary">
            Total Time
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text variant="heading2" color="primary">
            {sessionCount}
          </Text>
          <Text variant="caption" color="secondary">
            Sessions
          </Text>
        </View>
      </View>

      {distanceEntries.length > 0 && (
        <View style={styles.distanceSection}>
          <Text variant="bodySemibold" color="secondary" style={styles.distanceTitle}>
            Distance by Activity
          </Text>
          {distanceEntries.map(([exerciseName, distance]) => (
            <View key={exerciseName} style={styles.distanceRow}>
              <Text variant="body" color="primary" style={styles.exerciseName}>
                {exerciseName}
              </Text>
              <Text variant="bodySemibold" color="primary">
                {formatDistance(distance)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.light,
  },
  distanceSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  distanceTitle: {
    marginBottom: spacing.sm,
  },
  distanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  exerciseName: {
    flex: 1,
  },
});
