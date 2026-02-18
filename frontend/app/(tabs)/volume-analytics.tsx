/**
 * Volume Analytics Page
 * Category screen for detailed volume analytics with time range selection
 * Shows high-tier (free), body-part breakdowns (premium-gated)
 */

import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, BackHandler } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { PremiumLock } from '@/components/atoms/PremiumLock';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { DrilldownBarChart } from '@/components/molecules/DrilldownBarChart';
import { TimeRangeSelector } from '@/components/atoms/TimeRangeSelector';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { colors, spacing } from '@/constants/theme';
import { useSettingsStore } from '@/store/settingsStore';

const VolumeAnalyticsScreen: React.FC = () => {
  const router = useRouter();
  const [timeRange, setTimeRange] = React.useState<'week' | 'month' | 'year' | 'all'>('week');
  const { hierarchicalVolumeDistribution } = useAnalyticsData({ timeRange });
  const { isPremium, isLoading } = usePremiumStatus();
  const weightUnit = useSettingsStore((state) => state.weightUnit);

  // Key to force charts to reset when page is revisited
  const [chartKey, setChartKey] = React.useState(0);

  // Reset time range and charts when page is revisited
  useFocusEffect(
    useCallback(() => {
      setTimeRange('week');
      setChartKey(prev => prev + 1);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent.orange} />
      </View>
    );
  }

  const handleUpgrade = () => {
    router.push('/premium');
  };

  return (
    <TabSwipeContainer contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text variant="heading2" color="primary">Volume Totals ({weightUnit})</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Time Range Selector */}
      <View style={styles.selectorContainer}>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </View>

      {/* Upper Body Breakdown (Premium) */}
      <PremiumLock
        isLocked={!isPremium}
        featureName="Upper Body Breakdown"
        onUnlock={handleUpgrade}
      >
        <SurfaceCard tone="neutral" padding="md" showAccentStripe={false}>
          <DrilldownBarChart
            key={`upper-${chartKey}`}
            data={hierarchicalVolumeDistribution}
            rootGroup="Upper Body"
          />
        </SurfaceCard>
      </PremiumLock>

      {/* Lower Body Breakdown (Premium) */}
      <PremiumLock
        isLocked={!isPremium}
        featureName="Lower Body Breakdown"
        onUnlock={handleUpgrade}
      >
        <SurfaceCard tone="neutral" padding="md" showAccentStripe={false}>
          <DrilldownBarChart
            key={`lower-${chartKey}`}
            data={hierarchicalVolumeDistribution}
            rootGroup="Lower Body"
          />
        </SurfaceCard>
      </PremiumLock>

      {/* Core Breakdown (Premium) */}
      <PremiumLock
        isLocked={!isPremium}
        featureName="Core Breakdown"
        onUnlock={handleUpgrade}
      >
        <SurfaceCard tone="neutral" padding="md" showAccentStripe={false}>
          <DrilldownBarChart
            key={`core-${chartKey}`}
            data={hierarchicalVolumeDistribution}
            rootGroup="Core"
            showTapHint={false}
          />
        </SurfaceCard>
      </PremiumLock>

      {/* Tip */}
      <View style={styles.tipContainer}>
        <Ionicons name="information-circle-outline" size={18} color={colors.text.tertiary} />
        <Text variant="caption" color="tertiary" style={styles.tipText}>
          Volume = weight × reps for all completed sets
        </Text>
      </View>
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
    gap: spacing.md,
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 40,
  },
  selectorContainer: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  tipText: {
    flex: 0,
  },
});

export default VolumeAnalyticsScreen;
