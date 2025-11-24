import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { ScreenHeader } from '@/components/molecules/ScreenHeader';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { FocusDistributionChart } from '@/components/molecules/FocusDistributionChart';
import { WeeklyVolumeChart } from '@/components/molecules/WeeklyVolumeChart';
import { PersonalRecordsSection } from '@/components/organisms/PersonalRecordsSection';
import { colors, spacing } from '@/constants/theme';

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    backgroundColor: colors.primary.bg,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xl,
  },
  cardContent: {
    gap: spacing.md,
  },
  headerStripe: {
    height: 4,
    width: '100%',
    backgroundColor: colors.accent.orange,
    borderRadius: 2,
    marginTop: spacing.xs,
  },
});

const StatsScreen: React.FC = () => {
  return (
    <TabSwipeContainer contentContainerStyle={styles.contentContainer}>
      <ScreenHeader title="Performance" subtitle="View your training metrics and personal records." />

      <PersonalRecordsSection />

      <SurfaceCard tone="neutral" padding="xl" showAccentStripe={false}>
        <View style={styles.cardContent}>
          <View>
            <Text variant="heading3" color="primary">
              Set Distribution
            </Text>
            <View style={styles.headerStripe} />
          </View>
          <FocusDistributionChart />
        </View>
      </SurfaceCard>

      <SurfaceCard tone="neutral" padding="xl" showAccentStripe={false}>
        <View style={styles.cardContent}>
          <View>
            <Text variant="heading3" color="primary">
              Weekly Volume
            </Text>
            <View style={styles.headerStripe} />
          </View>
          <WeeklyVolumeChart />
        </View>
      </SurfaceCard>
    </TabSwipeContainer>
  );
};

export default StatsScreen;
