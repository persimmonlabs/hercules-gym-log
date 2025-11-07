import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '@/components/atoms/Button';
import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { colors, sizing, spacing } from '@/constants/theme';

const MY_PLANS: readonly string[] = ['Push Day', 'Pull Day', 'Leg Day'];

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.bg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: spacing['2xl'],
    position: 'relative',
  },
  heroContainer: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroTitle: {
    textAlign: 'center',
  },
  buttonWrapper: {
    width: '100%',
  },
  optionsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  topBar: {
    position: 'absolute',
    top: spacing['2xl'],
    left: spacing.sm,
  },
  backIconButton: {
    padding: spacing.sm,
    borderRadius: spacing.md,
  },
  planList: {
    width: '100%',
    gap: spacing.sm,
  },
  planCard: {
    borderWidth: 1,
    borderColor: colors.primary.dark,
    backgroundColor: colors.surface.card,
  },
  planCardContent: {
    gap: spacing.xs,
  },
});

const WorkoutScreen: React.FC = () => {
  const router = useRouter();
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [showPlansList, setShowPlansList] = useState<boolean>(false);

  const handleStartPress = () => {
    setShowOptions(true);
  };

  const handleBack = () => {
    Haptics.selectionAsync();
    if (showPlansList) {
      setShowPlansList(false);
      return;
    }
    setShowOptions(false);
  };

  const handleStartFromPlan = () => {
    setShowPlansList(true);
  };

  const handleStartFromScratch = () => {
    router.push('/modal');
  };

  useFocusEffect(
    useCallback(() => {
      setShowOptions(false);
      setShowPlansList(false);
    }, [])
  );

  return (
    <TabSwipeContainer contentContainerStyle={styles.contentContainer}>
      {showOptions ? (
        <View style={styles.topBar}>
          <Pressable style={styles.backIconButton} onPress={handleBack} hitSlop={spacing.sm}>
            <IconSymbol name="arrow-back" color={colors.text.primary} size={sizing.iconMD} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.heroContainer}>
        {showOptions ? (
          showPlansList ? (
            <>
              <Text variant="display1" color="primary" style={styles.heroTitle} fadeIn>
                Select a Plan
              </Text>
              <View style={styles.planList}>
                {MY_PLANS.map((plan) => (
                  <SurfaceCard
                    key={plan}
                    tone="neutral"
                    padding="md"
                    showAccentStripe={false}
                    style={styles.planCard}
                  >
                    <View style={styles.planCardContent}>
                      <Text variant="bodySemibold" color="primary">
                        {plan}
                      </Text>
                      <Text variant="body" color="secondary">
                        Tap to review this routine before you begin.
                      </Text>
                    </View>
                  </SurfaceCard>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text variant="display1" color="primary" style={styles.heroTitle} fadeIn>
                How do you want to start?
              </Text>
              <View style={styles.optionsContainer}>
                <View style={styles.buttonWrapper}>
                  <Button label="Start from Plan" size="lg" onPress={handleStartFromPlan} />
                </View>
                <View style={styles.buttonWrapper}>
                  <Button label="Start from Scratch" size="lg" variant="light" onPress={handleStartFromScratch} />
                </View>
              </View>
            </>
          )
        ) : (
          <>
            <Text variant="display1" color="primary" style={styles.heroTitle} fadeIn>
              Start your next session.
            </Text>
            <View style={styles.buttonWrapper}>
              <Button label="Begin Workout" size="lg" onPress={handleStartPress} />
            </View>
          </>
        )}
      </View>
    </TabSwipeContainer>
  );
};

export default WorkoutScreen;
