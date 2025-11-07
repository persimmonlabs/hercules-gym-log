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
  outerCardContent: {
    gap: spacing.lg,
  },
  planCards: {
    gap: spacing.md,
  },
  planCardContent: {
    gap: spacing.xs,
  },
  createPlanCardContent: {
    gap: spacing.sm,
  },
  planCardShell: {
    borderWidth: 1,
    borderColor: colors.primary.dark,
    backgroundColor: colors.surface.card,
  },
});

const PlansScreen: React.FC = () => {
  const plans = ['Push Day', 'Pull Day', 'Leg Day'] as const;
  const suggestedPlans = ['Full Body Strength', 'Mobility Reset', 'Core Intensive'] as const;

  return (
    <TabSwipeContainer contentContainerStyle={styles.contentContainer}>
      <ScreenHeader title="Plans" subtitle="Shape upcoming sessions and strategy." />

      <SurfaceCard padding="xl" tone="neutral">
        <View style={styles.outerCardContent}>
          <Text variant="heading3" color="primary">
            My Plans
          </Text>

          <View style={styles.planCards}>
            {plans.map((plan) => (
              <SurfaceCard
                key={plan}
                tone="neutral"
                padding="lg"
                showAccentStripe={false}
                style={styles.planCardShell}
              >
                <View style={styles.planCardContent}>
                  <Text variant="bodySemibold" color="primary">
                    {plan}
                  </Text>
                  <Text variant="body" color="secondary">
                    Tap to expand and review exercises.
                  </Text>
                </View>
              </SurfaceCard>
            ))}
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard tone="neutral" padding="lg" style={styles.planCardShell}>
        <View style={styles.createPlanCardContent}>
          <Text variant="heading3" color="primary">
            Create a Plan
          </Text>
          <Text variant="body" color="secondary">
            Craft a new routine tailored to your goals.
          </Text>
        </View>
      </SurfaceCard>

      <SurfaceCard padding="xl" tone="neutral">
        <View style={styles.outerCardContent}>
          <Text variant="heading3" color="primary">
            Suggested Plans
          </Text>

          <View style={styles.planCards}>
            {suggestedPlans.map((plan) => (
              <SurfaceCard
                key={plan}
                tone="neutral"
                padding="lg"
                showAccentStripe={false}
                style={styles.planCardShell}
              >
                <View style={styles.planCardContent}>
                  <Text variant="bodySemibold" color="primary">
                    {plan}
                  </Text>
                  <Text variant="body" color="secondary">
                    Explore curated workouts designed to keep momentum high.
                  </Text>
                </View>
              </SurfaceCard>
            ))}
          </View>
        </View>
      </SurfaceCard>
    </TabSwipeContainer>
  );
};

export default PlansScreen;
