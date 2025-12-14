/**
 * Volume Analytics Page
 * Category screen for detailed volume analytics with time range selection
 * Shows high-tier (free), body-part breakdowns (premium-gated)
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { PremiumLock } from '@/components/atoms/PremiumLock';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { TieredBarChart } from '@/components/molecules/TieredBarChart';
import { TimeRangeSelector } from '@/components/atoms/TimeRangeSelector';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { colors, spacing } from '@/constants/theme';
import { TIME_RANGE_SUBTITLES } from '@/types/analytics';
import { useSettingsStore } from '@/store/settingsStore';

const VolumeAnalyticsScreen: React.FC = () => {
  const router = useRouter();
  const [timeRange, setTimeRange] = React.useState<'week' | 'month' | 'year' | 'all'>('week');
  const { weeklyVolume } = useAnalyticsData({ timeRange });
  const { isPremium } = usePremiumStatus();
  const { getWeightUnit } = useSettingsStore();
  const weightUnit = getWeightUnit();

  const handleBackPress = () => {
    router.replace('/(tabs)/profile');
  };

  const handleMusclePress = (muscleName: string) => {
    router.push({
      pathname: '/(tabs)/muscle-detail',
      params: { muscle: muscleName },
    } as any);
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
        <Text variant="heading2" color="primary">Volume</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Time Range Selector */}
      <View style={styles.selectorContainer}>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </View>

      {/* High-tier (Free) - Total Volume */}
      <SurfaceCard tone="neutral" padding="md">
        <View style={styles.section}>
          <Text variant="labelMedium" color="secondary" style={styles.tierLabel}>
            TOTAL VOLUME • {TIME_RANGE_SUBTITLES[timeRange].toUpperCase()}
          </Text>
          <TieredBarChart
            data={weeklyVolume.high}
            unit={weightUnit}
          />
        </View>
      </SurfaceCard>

      {/* Upper Body Breakdown (Premium) */}
      <SurfaceCard tone="neutral" padding="md">
        <PremiumLock
          isLocked={!isPremium}
          featureName="Upper Body Breakdown"
          onUnlock={handleUpgrade}
        >
          <View style={styles.section}>
            <Text variant="labelMedium" color="secondary" style={styles.tierLabel}>
              UPPER BODY
            </Text>
            <Text variant="caption" color="tertiary" style={styles.tierHint}>
              Chest • Back • Shoulders • Arms
            </Text>
            <TieredBarChart
              data={weeklyVolume.byBodyPart.upper}
              unit={weightUnit}
              onBarPress={handleMusclePress}
            />
          </View>
        </PremiumLock>
      </SurfaceCard>

      {/* Lower Body Breakdown (Premium) */}
      <SurfaceCard tone="neutral" padding="md">
        <PremiumLock
          isLocked={!isPremium}
          featureName="Lower Body Breakdown"
          onUnlock={handleUpgrade}
        >
          <View style={styles.section}>
            <Text variant="labelMedium" color="secondary" style={styles.tierLabel}>
              LOWER BODY
            </Text>
            <Text variant="caption" color="tertiary" style={styles.tierHint}>
              Quads • Hamstrings • Glutes • Calves • Hips
            </Text>
            <TieredBarChart
              data={weeklyVolume.byBodyPart.lower}
              unit={weightUnit}
              onBarPress={handleMusclePress}
            />
          </View>
        </PremiumLock>
      </SurfaceCard>

      {/* Core Breakdown (Premium) */}
      <SurfaceCard tone="neutral" padding="md">
        <PremiumLock
          isLocked={!isPremium}
          featureName="Core Breakdown"
          onUnlock={handleUpgrade}
        >
          <View style={styles.section}>
            <Text variant="labelMedium" color="secondary" style={styles.tierLabel}>
              CORE
            </Text>
            <Text variant="caption" color="tertiary" style={styles.tierHint}>
              Abs • Obliques
            </Text>
            <TieredBarChart
              data={weeklyVolume.byBodyPart.core}
              unit={weightUnit}
              onBarPress={handleMusclePress}
            />
          </View>
        </PremiumLock>
      </SurfaceCard>

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
  section: {
    gap: spacing.xs,
  },
  tierLabel: {
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  tierHint: {
    marginBottom: spacing.sm,
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
