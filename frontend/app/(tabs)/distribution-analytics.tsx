/**
 * Volume Distribution Analytics Page
 * Body heatmap visualization for exploring muscle volume distribution
 * Tap muscle regions to see details and drill down
 */

import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, BackHandler } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { PremiumLock } from '@/components/atoms/PremiumLock';
import { TimeRangeSelector } from '@/components/atoms/TimeRangeSelector';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { FractalBubbleChart } from '@/components/molecules/FractalBubbleChart';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { colors, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { TimeRange } from '@/types/analytics';

const DistributionAnalyticsScreen: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const [timeRange, setTimeRange] = React.useState<TimeRange>('week');
  const { hierarchicalVolumeDistribution } = useAnalyticsData({ timeRange });
  const { isPremium, isLoading } = usePremiumStatus();

  // Key to force FractalBubbleChart to reset when page is revisited
  const [chartKey, setChartKey] = React.useState(0);

  // Reset chart to Overview and time range when page gains focus
  useFocusEffect(
    useCallback(() => {
      setChartKey(prev => prev + 1);
      setTimeRange('week');
    }, [])
  );

  const handleBackPress = useCallback(() => {
    router.replace('/(tabs)/profile');
  }, [router]);

  // Handle Android hardware back button
  useEffect(() => {
    const backAction = () => {
      handleBackPress();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [handleBackPress]);

  // Show loading screen while checking premium status to avoid paywall flash
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.primary.bg }]}>
        <ActivityIndicator size="large" color={theme.accent.orange} />
      </View>
    );
  }

  const handleUpgrade = () => {
    router.push('/premium');
  };

  return (
    <TabSwipeContainer contentContainerStyle={[styles.contentContainer, { backgroundColor: theme.primary.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text variant="heading2" color="primary">Volume Distribution</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Time Range Selector */}
      <View style={styles.selectorContainer}>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </View>

      {/* Upper Body Distribution */}
      <SurfaceCard tone="card" padding="lg" showAccentStripe={false}>
        <View style={styles.cardContent}>
          <PremiumLock
            isLocked={!isPremium}
            featureName="Upper Body Distribution"
            onUnlock={handleUpgrade}
          >
            <FractalBubbleChart
              key={`upper-${chartKey}`}
              data={hierarchicalVolumeDistribution}
              rootGroup="Upper Body"
              showTapHint={true}
            />
          </PremiumLock>
        </View>
      </SurfaceCard>

      {/* Lower Body Distribution */}
      <SurfaceCard tone="card" padding="lg" showAccentStripe={false}>
        <View style={styles.cardContent}>
          <PremiumLock
            isLocked={!isPremium}
            featureName="Lower Body Distribution"
            onUnlock={handleUpgrade}
          >
            <FractalBubbleChart
              key={`lower-${chartKey}`}
              data={hierarchicalVolumeDistribution}
              rootGroup="Lower Body"
              showTapHint={true}
            />
          </PremiumLock>
        </View>
      </SurfaceCard>

      {/* Core Distribution */}
      <SurfaceCard tone="card" padding="lg" showAccentStripe={false}>
        <View style={styles.cardContent}>
          <PremiumLock
            isLocked={!isPremium}
            featureName="Core Distribution"
            onUnlock={handleUpgrade}
          >
            <FractalBubbleChart
              key={`core-${chartKey}`}
              data={hierarchicalVolumeDistribution}
              rootGroup="Core"
              showTapHint={false}
            />
          </PremiumLock>
        </View>
      </SurfaceCard>
    </TabSwipeContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flexGrow: 1,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  titleWrapper: {
    paddingBottom: spacing.xxs,
  },
  selectorContainer: {
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 40,
  },
  cardContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});

export default DistributionAnalyticsScreen;
