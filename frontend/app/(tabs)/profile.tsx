import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, ScrollView, BackHandler } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';

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
import { TIME_RANGE_SUBTITLES, TimeRange } from '@/types/analytics';
import type { CardioStats } from '@/types/analytics';
import { useSettingsStore } from '@/store/settingsStore';
import { exercises as exerciseCatalog } from '@/constants/exercises';

// Simple cardio stats content component
const EMPTY_CARD_MIN_HEIGHT = 240;

interface CardioStatsContentProps {
  stats: CardioStats;
  timeRange: TimeRange;
}

const CardioStatsContent: React.FC<CardioStatsContentProps> = ({ stats, timeRange }) => {
  const { formatDistanceForExercise } = useSettingsStore();
  const { totalDuration, totalDistanceByType } = stats;

  // Check if there's any cardio data
  const hasData = totalDuration > 0 || Object.keys(totalDistanceByType).length > 0;

  if (!hasData) {
    return (
      <View style={cardioStyles.emptyState}>
        <Text variant="body" color="secondary" style={cardioStyles.emptyText}>
          {`No workout data for ${TIME_RANGE_SUBTITLES[timeRange].toLowerCase()}.`}
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
          {distanceEntries.map(([exerciseName, distance]) => {
            const exerciseEntry = exerciseCatalog.find(e => e.name === exerciseName);
            const distanceUnit = exerciseEntry?.distanceUnit;
            return (
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
                  {formatDistanceForExercise(distance, distanceUnit)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const cardioStyles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    minHeight: EMPTY_CARD_MIN_HEIGHT,
  },
  emptyText: {
    textAlign: 'center',
  },
});


const StatsScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // Handle Android hardware back button - navigate to Dashboard
  useEffect(() => {
    const backAction = () => {
      router.replace('/(tabs)');
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [router]);

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

  // Reset time ranges to 'week' when page gains focus
  useFocusEffect(
    useCallback(() => {
      setVolumeTimeRange('week');
      setCardioTimeRange('week');
    }, [])
  );

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
    <TabSwipeContainer ref={scrollRef} contentContainerStyle={styles.contentContainer}>
      <ScreenHeader
        title="Performance"
        subtitle="Track your gains and personal records"
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
        <CardioStatsContent stats={cardioStats} timeRange={cardioTimeRange} />
      </AnalyticsCard>
    </TabSwipeContainer>
  );
};

export default StatsScreen;
