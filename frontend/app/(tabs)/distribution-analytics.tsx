/**
 * Distribution Analytics Page
 * Body heatmap visualization for exploring muscle set distribution
 * Tap muscle regions to see details and drill down
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { PremiumLock } from '@/components/atoms/PremiumLock';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { FractalBubbleChart } from '@/components/molecules/FractalBubbleChart';
import { ExerciseInsights } from '@/components/molecules/ExerciseInsights';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { colors, spacing } from '@/constants/theme';

const DistributionAnalyticsScreen: React.FC = () => {
  const router = useRouter();
  const { hierarchicalSets } = useAnalyticsData({ timeRange: 'all' });
  const { isPremium } = usePremiumStatus();

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
        <Text variant="heading2" color="primary">Set Distribution</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Fractal Bubble Chart - Drill down through muscle hierarchy */}
      <SurfaceCard tone="neutral" padding="lg">
        <View style={styles.cardContent}>
          <PremiumLock
            isLocked={!isPremium}
            featureName="Muscle Distribution Explorer"
            onUnlock={handleUpgrade}
          >
            <FractalBubbleChart
              data={hierarchicalSets}
              onMusclePress={handleMusclePress}
            />
          </PremiumLock>
        </View>
      </SurfaceCard>

      {/* Exercise Insights (Premium) */}
      <SurfaceCard tone="neutral" padding="lg">
        <View style={styles.cardContent}>
          <PremiumLock
            isLocked={!isPremium}
            featureName="Exercise Insights"
            onUnlock={handleUpgrade}
          >
            <ExerciseInsights />
          </PremiumLock>
        </View>
      </SurfaceCard>
    </TabSwipeContainer>
  );
};

const styles = StyleSheet.create({
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
