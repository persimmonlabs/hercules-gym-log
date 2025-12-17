import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenHeader } from '@/components/molecules/ScreenHeader';
import { Text } from '@/components/atoms/Text';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { PersonalRecordsSection } from '@/components/organisms/PersonalRecordsSection';
import { AnalyticsCard } from '@/components/atoms/AnalyticsCard';
import { SimpleDistributionChart } from '@/components/molecules/SimpleDistributionChart';
import { SimpleVolumeChart } from '@/components/molecules/SimpleVolumeChart';
import { TrainingBalanceCard } from '@/components/molecules/TrainingBalanceCard';
import { TimeRangeSelector } from '@/components/atoms/TimeRangeSelector';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { TimeRange } from '@/types/analytics';
import type { CardioStats } from '@/types/analytics';
import { useSettingsStore } from '@/store/settingsStore';

// Simple cardio stats content component
const CardioStatsContent: React.FC<{ stats: CardioStats }> = ({ stats }) => {
  const { formatDistance } = useSettingsStore();
  const { totalDuration, totalDistanceByType } = stats;
  
  // Check if there's any cardio data
  const hasData = totalDuration > 0 || Object.keys(totalDistanceByType).length > 0;
  
  if (!hasData) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
        <Text variant="body" color="secondary">
          No cardio data available for this time range
        </Text>
      </View>
    );
  }

  const formatDuration = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  const distanceEntries = Object.entries(totalDistanceByType).filter(([, dist]) => dist > 0);

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ alignItems: 'center' }}>
        <Text variant="heading2" color="primary">
          {formatDuration(totalDuration)}
        </Text>
        <Text variant="caption" color="secondary">
          Total Time
        </Text>
      </View>

      {distanceEntries.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="bodySemibold" color="secondary">
            Distance by Activity
          </Text>
          {distanceEntries.map(([exerciseName, distance]) => (
            <View key={exerciseName} style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingVertical: spacing.xs 
            }}>
              <Text variant="body" color="primary" style={{ flex: 1 }}>
                {exerciseName}
              </Text>
              <Text variant="bodySemibold" color="primary">
                {formatDistance(distance)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};


const StatsScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    contentContainer: {
      flexGrow: 1,
      backgroundColor: theme.primary.bg,
      paddingTop: spacing.xl,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing['2xl'],
    },
  });
  
  // Independent state for each card
  const [volumeTimeRange, setVolumeTimeRange] = useState<TimeRange>('week');
  const [cardioTimeRange, setCardioTimeRange] = useState<TimeRange>('week');
  
  // Fetch data separately for each time range
  const { hasFilteredData: hasVolumeData } = useAnalyticsData({ timeRange: volumeTimeRange });
  const weightUnit = useSettingsStore((state) => state.weightUnit);
  const { cardioStats } = useAnalyticsData({ timeRange: cardioTimeRange });

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
        title="Volume Distribution"
        onPress={handleDistributionPress}
        showAccentStripe={false}
        titleCentered={true}
        showHorizontalAccentBar={false}
      >
        <SimpleDistributionChart />
      </AnalyticsCard>

      <AnalyticsCard
        title={`Volume Totals (${weightUnit})`}
        onPress={handleVolumePress}
        headerRight={
          <TimeRangeSelector value={volumeTimeRange} onChange={setVolumeTimeRange} />
        }
        isEmpty={!hasVolumeData}
        showAccentStripe={false}
        titleCentered={true}
        showHorizontalAccentBar={false}
      >
        <SimpleVolumeChart timeRange={volumeTimeRange} />
      </AnalyticsCard>

      <TrainingBalanceCard />

      <AnalyticsCard
        title="Cardio Summary"
        showAccentStripe={false}
        titleCentered={true}
        showHorizontalAccentBar={false}
        headerRight={
          <TimeRangeSelector value={cardioTimeRange} onChange={setCardioTimeRange} />
        }
      >
        <CardioStatsContent stats={cardioStats} />
      </AnalyticsCard>
    </TabSwipeContainer>
  );
};

export default StatsScreen;
