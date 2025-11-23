/**
 * plan-detail
 * Modal-style screen that presents a saved workout plan with matching styling to the builder screens.
 */
import React, { useEffect, useMemo } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePlansStore, type PlansState } from '@/store/plansStore';
import { buttonPressAnimation, springTight, timingSlow } from '@/constants/animations';
import { colors, radius, spacing } from '@/constants/theme';
import hierarchyData from '@/data/hierarchy.json';

const BACK_ENTRY_OFFSET = spacing['2xl'];
const SCREEN_HEIGHT = Dimensions.get('window').height;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary.bg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  keyboardAvoider: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingBottom: spacing['2xl'] * 4,
  },
  topSection: {
    width: '100%',
    marginTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  backButtonContainer: {
    alignSelf: 'flex-start',
    borderRadius: radius.lg,
  },
  backButtonPressable: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
    paddingLeft: 0,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerContent: {
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  exercisesCard: {
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent.orangeLight,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface.subtle,
  },
  exerciseInfo: {
    gap: spacing.xs,
    flex: 1,
  },
  placeholderCard: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent.orangeLight,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
  },
});

const PlanDetailScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { planId } = useLocalSearchParams<{ planId?: string }>();
  const plans = usePlansStore((state: PlansState) => state.plans);
  const backScale = useSharedValue(1);
  const backTranslateY = useSharedValue(-BACK_ENTRY_OFFSET);
  const containerTranslateY = useSharedValue(SCREEN_HEIGHT);

  // Build muscle to mid-level group mapping
  const muscleToMidLevelMap = useMemo(() => {
    const map: Record<string, string> = {};
    const hierarchy = hierarchyData.muscle_hierarchy;

    Object.entries(hierarchy).forEach(([l1, l1Data]: [string, any]) => {
      if (l1Data?.muscles) {
        Object.entries(l1Data.muscles).forEach(([midLevel, midLevelData]: [string, any]) => {
          // Map the mid-level group to itself
          map[midLevel] = midLevel;
          
          // Map all low-level muscles to their mid-level parent
          if (midLevelData?.muscles) {
            Object.keys(midLevelData.muscles).forEach(lowLevel => {
              map[lowLevel] = midLevel;
            });
          }
        });
      }
    });
    return map;
  }, []);

  const plan = useMemo(() => plans.find((item) => item.id === planId), [planId, plans]);

  useEffect(() => {
    backTranslateY.value = withTiming(0, timingSlow);
    containerTranslateY.value = withTiming(0, timingSlow);
  }, [backTranslateY, containerTranslateY]);

  const animatedBackStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: backTranslateY.value },
      { scale: backScale.value },
    ],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: containerTranslateY.value }],
  }));

  const handleBackPress = () => {
    void Haptics.selectionAsync();
    backScale.value = withSpring(0.92, springTight);

    setTimeout(() => {
      backScale.value = withSpring(1, springTight);
      backTranslateY.value = withTiming(BACK_ENTRY_OFFSET, timingSlow);
      containerTranslateY.value = withTiming(
        SCREEN_HEIGHT,
        timingSlow,
        (finished) => {
          if (finished) {
            runOnJS(router.back)();
          }
        },
      );
    }, buttonPressAnimation.duration);
  };

  return (
    <Animated.View style={[styles.container, { paddingTop: spacing.lg + insets.top }, animatedContainerStyle]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={spacing['2xl']}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.topSection}>
            <Animated.View style={[styles.backButtonContainer, animatedBackStyle]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back to plans"
                onPress={handleBackPress}
                hitSlop={spacing.sm}
                style={styles.backButtonPressable}
              >
                <IconSymbol name="arrow-back" color={colors.text.primary} size={24} />
              </Pressable>
            </Animated.View>

            <View style={styles.headerContent}>
              <Text variant="display1" color="primary">
                {plan?.name ?? 'Workout'}
              </Text>
              <Text variant="body" color="secondary">
                {plan
                  ? `${plan.exercises.length} exercise${plan.exercises.length === 1 ? '' : 's'} saved.`
                  : 'No exercises found for this plan.'}
              </Text>
            </View>
          </View>

          {plan ? (
            <SurfaceCard tone="neutral" padding="xl" showAccentStripe={false} style={styles.exercisesCard}>
              {plan.exercises.map((exercise) => {
                // Get all muscle names from the exercise's muscles object
                const muscleNames = Object.keys(exercise.muscles || {});
                
                // Map each muscle to its mid-level parent group
                const midLevelGroups = muscleNames.map(muscle => muscleToMidLevelMap[muscle]).filter(Boolean);
                
                // Remove duplicates and sort for consistency
                const uniqueGroups = [...new Set(midLevelGroups)];
                const midLevelMusclesLabel = uniqueGroups.length > 0 ? uniqueGroups.join(' · ') : 'General';

                return (
                  <View key={exercise.id} style={styles.exerciseRow}>
                    <View style={styles.exerciseInfo}>
                      <Text variant="bodySemibold" color="primary">
                        {exercise.name}
                      </Text>
                      <Text variant="caption" color="secondary">
                        {midLevelMusclesLabel}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </SurfaceCard>
          ) : (
            <SurfaceCard tone="neutral" padding="xl" showAccentStripe={false} style={styles.placeholderCard}>
              <Text variant="bodySemibold" color="primary">
                Workout not available
              </Text>
              <Text variant="body" color="secondary">
                This workout couldn’t be found. Please return and select another.
              </Text>
            </SurfaceCard>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
};

export default PlanDetailScreen;
