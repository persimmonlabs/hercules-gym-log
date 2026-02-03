/**
 * DistanceByActivityCard
 * Shows cardio distance breakdown by activity type with time range filtering.
 * Uses correct units per exercise (miles, meters, floors) and respects user preferences.
 */
import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { AnalyticsCard } from '@/components/atoms/AnalyticsCard';
import { TimeRangeSelector } from '@/components/atoms/TimeRangeSelector';
import { spacing } from '@/constants/theme';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useSettingsStore } from '@/store/settingsStore';
import { exercises as exerciseCatalog } from '@/constants/exercises';
import { TIME_RANGE_SUBTITLES } from '@/types/analytics';
import type { TimeRange } from '@/types/analytics';

const EMPTY_CARD_MIN_HEIGHT = 120;

export const DistanceByActivityCard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const { formatDistanceForExercise } = useSettingsStore();
  
  const { cardioStats } = useAnalyticsData({ timeRange });

  const distanceEntries = useMemo(() => {
    return Object.entries(cardioStats.totalDistanceByType)
      .filter(([, dist]) => dist > 0)
      .sort((a, b) => b[1] - a[1]); // Sort by distance descending
  }, [cardioStats.totalDistanceByType]);

  const hasData = distanceEntries.length > 0;

  return (
    <AnalyticsCard
      title="Distance by Activity"
      showAccentStripe={false}
      titleCentered={true}
      showHorizontalAccentBar={false}
      showChevron={false}
      headerRight={
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      }
    >
      {!hasData ? (
        <View style={styles.emptyState}>
          <Text variant="body" color="secondary" style={styles.emptyText}>
            {`No distance data for ${TIME_RANGE_SUBTITLES[timeRange].toLowerCase()}.`}
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {distanceEntries.map(([exerciseName, distance]) => {
            // Get the exercise's specific distance unit from catalog
            const exerciseEntry = exerciseCatalog.find(e => e.name === exerciseName);
            const distanceUnit = exerciseEntry?.distanceUnit;

            return (
              <View key={exerciseName} style={styles.activityRow}>
                <Text variant="body" color="primary" style={styles.activityName} numberOfLines={1}>
                  {exerciseName}
                </Text>
                <Text variant="bodySemibold" color="primary">
                  {formatDistanceForExercise(distance, distanceUnit)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </AnalyticsCard>
  );
};

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    minHeight: EMPTY_CARD_MIN_HEIGHT,
  },
  emptyText: {
    textAlign: 'center',
  },
  listContainer: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  activityName: {
    flex: 1,
    marginRight: spacing.md,
  },
});
