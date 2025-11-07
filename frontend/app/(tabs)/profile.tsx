import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { ScreenHeader } from '@/components/molecules/ScreenHeader';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { colors, spacing } from '@/constants/theme';

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    backgroundColor: colors.primary.bg,
    paddingTop: spacing['2xl'],
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing['2xl'],
  },
  cardStack: {
    gap: spacing.md,
  },
  cardContent: {
    gap: spacing.sm,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statTile: {
    flexGrow: 1,
    minWidth: 140,
    gap: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.primary.dark,
    opacity: 0.2,
  },
});

const personalRecords = [
  { label: 'Back Squat', value: '405 lbs' },
  { label: 'Bench Press', value: '275 lbs' },
  { label: 'Deadlift', value: '485 lbs' },
];

const weeklySummary = [
  { label: 'Sessions', value: '4' },
  { label: 'Volume', value: '42,350 lbs' },
  { label: 'Avg. Duration', value: '58 min' },
  { label: 'Streak', value: '12 days' },
];

const focusAreas = [
  { label: 'Strength', value: '45%' },
  { label: 'Hypertrophy', value: '35%' },
  { label: 'Conditioning', value: '20%' },
];

const StatsScreen: React.FC = () => {
  return (
    <TabSwipeContainer contentContainerStyle={styles.contentContainer}>
      <ScreenHeader title="Stats" subtitle="Monitor progress and celebrate new PRs." />

      <SurfaceCard tone="neutral" padding="xl">
        <View style={styles.cardContent}>
          <Text variant="heading3" color="primary">
            Personal Records
          </Text>
          <View style={styles.cardStack}>
            {personalRecords.map((record) => (
              <SurfaceCard key={record.label} tone="neutral" padding="lg" showAccentStripe={false}>
                <View style={styles.cardContent}>
                  <Text variant="bodySemibold" color="primary">
                    {record.label}
                  </Text>
                  <Text variant="heading3" color="primary">
                    {record.value}
                  </Text>
                </View>
              </SurfaceCard>
            ))}
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard tone="neutral" padding="xl">
        <View style={styles.cardContent}>
          <Text variant="heading3" color="primary">
            Weekly Snapshot
          </Text>
          <View style={styles.statGrid}>
            {weeklySummary.map((stat) => (
              <SurfaceCard key={stat.label} tone="neutral" padding="lg" showAccentStripe={false}>
                <View style={styles.cardContent}>
                  <Text variant="body" color="secondary">
                    {stat.label}
                  </Text>
                  <Text variant="heading2" color="primary">
                    {stat.value}
                  </Text>
                </View>
              </SurfaceCard>
            ))}
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard tone="neutral" padding="xl">
        <View style={styles.cardContent}>
          <Text variant="heading3" color="primary">
            Focus Distribution
          </Text>
          <View style={styles.cardStack}>
            {focusAreas.map((area, index) => (
              <View key={area.label}>
                <View style={styles.cardContent}>
                  <Text variant="bodySemibold" color="primary">
                    {area.label}
                  </Text>
                  <Text variant="heading3" color="primary">
                    {area.value}
                  </Text>
                </View>
                {index < focusAreas.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>
        </View>
      </SurfaceCard>

    </TabSwipeContainer>
  );
};

export default StatsScreen;
