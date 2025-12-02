import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenHeader } from '@/components/molecules/ScreenHeader';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { PersonalRecordsSection } from '@/components/organisms/PersonalRecordsSection';
import { AnalyticsCard } from '@/components/atoms/AnalyticsCard';
import { SimpleDistributionChart } from '@/components/molecules/SimpleDistributionChart';
import { SimpleVolumeChart } from '@/components/molecules/SimpleVolumeChart';
import { TrainingBalanceCard } from '@/components/molecules/TrainingBalanceCard';
import { VolumeComparisonCard } from '@/components/molecules/VolumeComparisonCard';
import { TimeRangeSelector } from '@/components/atoms/TimeRangeSelector';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { colors, spacing } from '@/constants/theme';
import { TimeRange } from '@/types/analytics';

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    backgroundColor: colors.primary.bg,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing['2xl'],
  },
});

const StatsScreen: React.FC = () => {
  const router = useRouter();
  const [volumeTimeRange, setVolumeTimeRange] = useState<TimeRange>('week');
  const { hasFilteredData } = useAnalyticsData({ timeRange: volumeTimeRange });

  const handleDistributionPress = () => {
    router.push('/(tabs)/distribution-analytics');
  };

  const handleVolumePress = () => {
    router.push('/(tabs)/volume-analytics');
  };

  return (
    <TabSwipeContainer contentContainerStyle={styles.contentContainer}>
      <ScreenHeader
        title="Performance"
        subtitle="View your training metrics and personal records."
      />

      <View style={{ marginTop: -spacing.lg }}>
        <PersonalRecordsSection />
      </View>

      <AnalyticsCard
        title="Set Distribution"
        onPress={handleDistributionPress}
        showAccentStripe={false}
        titleCentered={true}
      >
        <SimpleDistributionChart />
      </AnalyticsCard>

      <AnalyticsCard
        title="Volume"
        onPress={handleVolumePress}
        headerRight={
          <TimeRangeSelector value={volumeTimeRange} onChange={setVolumeTimeRange} />
        }
        isEmpty={!hasFilteredData}
        showAccentStripe={false}
        titleCentered={true}
      >
        <SimpleVolumeChart timeRange={volumeTimeRange} />
      </AnalyticsCard>

      <TrainingBalanceCard />

      <VolumeComparisonCard />
    </TabSwipeContainer>
  );
};

export default StatsScreen;
