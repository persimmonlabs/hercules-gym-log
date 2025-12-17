/**
 * Volume Distribution Analytics Page
 * Body heatmap visualization for exploring muscle volume distribution
 * Tap muscle regions to see details and drill down
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
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
import type { TimeRange } from '@/types/analytics';

const DistributionAnalyticsScreen: React.FC = () => {
  const router = useRouter();
  const [timeRange, setTimeRange] = React.useState<TimeRange>('all');
  const { hierarchicalVolumeDistribution } = useAnalyticsData({ timeRange });
  const { isPremium, isLoading } = usePremiumStatus();
  
  // Key to force FractalBubbleChart to reset when page is revisited
  const [chartKey, setChartKey] = React.useState(0);
  
  // Reset chart to Overview and time range when page gains focus
  useFocusEffect(
    useCallback(() => {
      setChartKey(prev => prev + 1);
      setTimeRange('all');
    }, [])
  );
  
  // Show loading screen while checking premium status to avoid paywall flash
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent.orange} />
      </View>
    );
  }

  const handleBackPress = () => {
    router.replace('/(tabs)/profile');
  };

  const handleUpgrade = () => {
    // TODO: Navigate to premium upgrade screen
    console.log('Navigate to premium upgrade');
  };

  return (
    <TabSwipeContainer contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text variant="heading2" color="primary">Volume Distribution</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Time Range Selector */}
      <View style={styles.selectorContainer}>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </View>

      {/* Upper Body Distribution */}
      <SurfaceCard tone="neutral" padding="lg" showAccentStripe={false}>
        <View style={styles.cardContent}>
          <PremiumLock
            isLocked={!isPremium}
            featureName="Upper Body Distribution"
            onUnlock={handleUpgrade}
          >
            <FractalBubbleChart
              key={`upper-${chartKey}-${timeRange}`}
              data={hierarchicalVolumeDistribution}
              rootGroup="Upper Body"
            />
          </PremiumLock>
        </View>
      </SurfaceCard>

      {/* Lower Body Distribution */}
      <SurfaceCard tone="neutral" padding="lg" showAccentStripe={false}>
        <View style={styles.cardContent}>
          <PremiumLock
            isLocked={!isPremium}
            featureName="Lower Body Distribution"
            onUnlock={handleUpgrade}
          >
            <FractalBubbleChart
              key={`lower-${chartKey}-${timeRange}`}
              data={hierarchicalVolumeDistribution}
              rootGroup="Lower Body"
            />
          </PremiumLock>
        </View>
      </SurfaceCard>

      {/* Core Distribution */}
      <SurfaceCard tone="neutral" padding="lg" showAccentStripe={false}>
        <View style={styles.cardContent}>
          <PremiumLock
            isLocked={!isPremium}
            featureName="Core Distribution"
            onUnlock={handleUpgrade}
          >
            <FractalBubbleChart
              key={`core-${chartKey}-${timeRange}`}
              data={hierarchicalVolumeDistribution}
              rootGroup="Core"
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
    backgroundColor: colors.primary.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flexGrow: 1,
    backgroundColor: colors.primary.bg,
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
