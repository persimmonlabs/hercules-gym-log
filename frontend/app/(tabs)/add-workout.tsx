import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, type ViewStyle, BackHandler } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { triggerHaptic } from '@/utils/haptics';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming, type AnimatedStyle } from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { colors, radius, shadows, sizing, spacing } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  titleWrapper: {
    paddingBottom: spacing.xs,
  },
  backButton: {
    padding: spacing.sm,
    paddingTop: spacing.xs,
    borderRadius: radius.full,
  },
  titleContainer: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xl,
  },
  dialogContent: {
    gap: spacing.xs,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  dialogActionButton: {
    flex: 1,
  },
  planCardShell: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.cardSoft,
  },
});

const CARD_LIFT_TRANSLATE = -2;
const CARD_LIFT_DURATION_MS = 200;
const CARD_PRESS_SCALE = 0.98;
const SCALE_DOWN_DURATION_MS = 150;
const scaleDownTimingConfig = {
  duration: SCALE_DOWN_DURATION_MS,
  easing: Easing.out(Easing.cubic),
};
const scaleUpSpringConfig = {
  damping: 15,
  stiffness: 300,
};

const timingConfig = {
  duration: CARD_LIFT_DURATION_MS,
  easing: Easing.out(Easing.cubic),
};

type ShadowConfig = {
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

const shadowConfigs: Record<'sm' | 'md' | 'lg', ShadowConfig> = {
  sm: {
    shadowOpacity: shadows.sm.shadowOpacity,
    shadowRadius: shadows.sm.shadowRadius,
    elevation: shadows.sm.elevation,
  },
  md: {
    shadowOpacity: shadows.md.shadowOpacity,
    shadowRadius: shadows.md.shadowRadius,
    elevation: shadows.md.elevation,
  },
  lg: {
    shadowOpacity: shadows.lg.shadowOpacity,
    shadowRadius: shadows.lg.shadowRadius,
    elevation: shadows.lg.elevation,
  },
};

type CardLiftAnimation = {
  animatedStyle: AnimatedStyle<ViewStyle>;
  onPressIn: () => void;
  onPressOut: () => void;
};

const useCardLiftAnimation = (initialShadow: ShadowConfig, activeShadow: ShadowConfig): CardLiftAnimation => {
  const translateY = useSharedValue<number>(0);
  const shadowOpacity = useSharedValue<number>(initialShadow.shadowOpacity);
  const shadowRadius = useSharedValue<number>(initialShadow.shadowRadius);
  const elevation = useSharedValue<number>(initialShadow.elevation);
  const scale = useSharedValue<number>(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    shadowOpacity: shadowOpacity.value,
    shadowRadius: shadowRadius.value,
    elevation: elevation.value,
  }));

  const handlePressIn = () => {
    translateY.value = withTiming(CARD_LIFT_TRANSLATE, timingConfig);
    shadowOpacity.value = withTiming(activeShadow.shadowOpacity, timingConfig);
    shadowRadius.value = withTiming(activeShadow.shadowRadius, timingConfig);
    elevation.value = withTiming(activeShadow.elevation, timingConfig);
    scale.value = withTiming(CARD_PRESS_SCALE, scaleDownTimingConfig);
  };

  const handlePressOut = () => {
    translateY.value = withTiming(0, timingConfig);
    shadowOpacity.value = withTiming(initialShadow.shadowOpacity, timingConfig);
    shadowRadius.value = withTiming(initialShadow.shadowRadius, timingConfig);
    elevation.value = withTiming(initialShadow.elevation, timingConfig);
    scale.value = withSpring(1, scaleUpSpringConfig);
  };

  return {
    animatedStyle,
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
  };
};

export default function AddWorkoutScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: 'program' | 'workout' }>();
  const isWorkoutMode = mode === 'workout';

  const browseLiftAnimation = useCardLiftAnimation(shadowConfigs.sm, shadowConfigs.md);
  const scratchLiftAnimation = useCardLiftAnimation(shadowConfigs.sm, shadowConfigs.md);

  const handleBack = useCallback(() => {
    triggerHaptic('selection');
    router.push('/(tabs)/plans');
  }, [router]);

  // Handle Android hardware back button
  useEffect(() => {
    const backAction = () => {
      handleBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [handleBack]);

  const handleBrowseLibrary = useCallback(() => {
    triggerHaptic('selection');
    router.push({
      pathname: '/(tabs)/browse-programs',
      params: { mode: isWorkoutMode ? 'workout' : 'program' }
    });
  }, [router, isWorkoutMode]);

  const handleCreateCustomPlan = useCallback(() => {
    triggerHaptic('selection');
    if (isWorkoutMode) {
      router.push('/(tabs)/create-workout');
    } else {
      router.push('/(tabs)/create-program');
    }
  }, [router, isWorkoutMode]);

  return (
    <TabSwipeContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text variant="heading2" color="primary">
              {isWorkoutMode ? 'Add Workout' : 'Add Plan'}
            </Text>
            <Text variant="body" color="secondary">
              {isWorkoutMode ? 'How would you like to create your new workout?' : 'How would you like to create your new plan?'}
            </Text>
          </View>
          <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
            <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
        </View>

        <View style={styles.contentContainer}>
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <Animated.View style={browseLiftAnimation.animatedStyle}>
              <Pressable
                style={[styles.planCardShell, { minHeight: 60 }]}
                onPressIn={browseLiftAnimation.onPressIn}
                onPressOut={browseLiftAnimation.onPressOut}
                onPress={() => {
                  browseLiftAnimation.onPressOut();
                  handleBrowseLibrary();
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text variant="bodySemibold" color="primary">{isWorkoutMode ? 'Browse Workouts' : 'Browse Plans'}</Text>
                  </View>
                  <IconSymbol name="chevron-right" size={20} color={colors.text.tertiary} />
                </View>
              </Pressable>
            </Animated.View>

            <Animated.View style={scratchLiftAnimation.animatedStyle}>
              <Pressable
                style={[styles.planCardShell, { minHeight: 60 }]}
                onPressIn={scratchLiftAnimation.onPressIn}
                onPressOut={scratchLiftAnimation.onPressOut}
                onPress={() => {
                  scratchLiftAnimation.onPressOut();
                  handleCreateCustomPlan();
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text variant="bodySemibold" color="primary">Create from Scratch</Text>
                  </View>
                  <IconSymbol name="chevron-right" size={20} color={colors.text.tertiary} />
                </View>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>
    </TabSwipeContainer>
  );
}
