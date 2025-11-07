import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import type { ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';

import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { ScreenHeader } from '@/components/molecules/ScreenHeader';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { colors, spacing, radius, shadows, sizing } from '@/constants/theme';
import { MainTabRoute } from '@/constants/navigation';
import { QuickLinkItem, RecentWorkoutSummary, WeekDayTracker } from '@/types/dashboard';
import { createWeekTracker } from '@/utils/dashboard';

const WORKOUT_ACTIVITY: boolean[] = [false, true, true, true, false, false, false];
type WeekDayOverride = {
  hasWorkout: boolean;
  isToday: boolean;
};

const WEEK_DAY_OVERRIDES: WeekDayOverride[] = [
  { hasWorkout: false, isToday: false },
  { hasWorkout: true, isToday: false },
  { hasWorkout: true, isToday: false },
  { hasWorkout: true, isToday: true },
  { hasWorkout: false, isToday: false },
  { hasWorkout: false, isToday: false },
  { hasWorkout: false, isToday: false },
];

const QUICK_LINKS: QuickLinkItem[] = [
  { id: 'link-workout', title: 'Start Workout', description: 'Log a fresh training session.', icon: 'flash-outline', route: 'workout', variant: 'primary' },
  { id: 'link-calendar', title: 'View History', description: 'Review past sessions and PRs.', icon: 'calendar-outline', route: 'calendar' },
  { id: 'link-plans', title: 'Edit Plans', description: 'Fine-tune upcoming workouts.', icon: 'document-text-outline', route: 'plans' },
  { id: 'link-stats', title: 'View Stats', description: 'Track progress and personal bests.', icon: 'stats-chart-outline', route: 'profile' },
];

const TAB_ROUTE_PATHS: Record<MainTabRoute, Href> = {
  index: '/(tabs)',
  calendar: '/(tabs)/calendar',
  workout: '/(tabs)/workout',
  plans: '/(tabs)/plans',
  profile: '/(tabs)/profile',
};

const RECENT_WORKOUTS: RecentWorkoutSummary[] = [
  { id: 'recent-1', date: 'Nov 4', exercise: 'Deadlift', volume: '2,400 lbs' },
  { id: 'recent-2', date: 'Nov 3', exercise: 'Overhead Press', volume: '1,080 lbs' },
  { id: 'recent-3', date: 'Nov 2', exercise: 'Back Squat', volume: '1,980 lbs' },
];

const BUBBLE_DIAMETER = sizing.weekBubble;
const SCROLL_BOTTOM_PADDING = spacing.sm;
const WEEKLY_TRACKER_DELAY_MS = 100;
const TODAYS_PLAN_DELAY_MS = 200;
const QUICK_LINKS_DELAY_MS = 300;
const RECENT_WORKOUTS_DELAY_MS = 400;
const CARD_ENTRY_DURATION_MS = 500;
const DAY_POP_BUFFER_MS = 100;
const DAY_POP_STAGGER_MS = 50;
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

const timingConfig = {
  duration: CARD_LIFT_DURATION_MS,
  easing: Easing.out(Easing.cubic),
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

const styles = StyleSheet.create({
  backgroundGradient: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
  },
  contentContainer: {
    paddingTop: spacing['2xl'],
    paddingBottom: SCROLL_BOTTOM_PADDING,
    paddingHorizontal: spacing.md,
    gap: spacing['2xl'],
  },
  pressableStretch: {
    width: '100%',
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  streakTitle: {
    flex: 1,
    gap: spacing.xs,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginHorizontal: -spacing.sm,
  },
  dayBubbleWrapper: {
    flex: 0,
    alignItems: 'center',
    gap: spacing.xs,
  },
  dayBubbleBase: {
    width: BUBBLE_DIAMETER,
    height: BUBBLE_DIAMETER,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dayBubbleOutline: {
    borderWidth: 1,
    borderColor: colors.primary.dark,
  },
  dayBubbleFill: {
    backgroundColor: colors.surface.card,
  },
  gradientBubble: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.full,
  },
  sectionHeading: { marginBottom: spacing.md },
  todaysPlanCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  todaysPlanAccentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: spacing.xs,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  todaysPlanContent: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  todaysMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  todaysMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.accent.orange,
  },
  quickLinksList: {
    gap: spacing.lg,
  },
  inlineCard: {
    borderWidth: 1,
    borderColor: colors.primary.dark,
    backgroundColor: colors.surface.card,
  },
  quickLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  quickLinkInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  quickLinkButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentWorkoutsList: {
    gap: spacing.lg,
  },
  recentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  accentUnderline: {
    width: 56,
    height: 3,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
});

const DashboardScreen: React.FC = () => {
  const weekTracker = useMemo<WeekDayTracker[]>(() => {
    const baseWeek = createWeekTracker(WORKOUT_ACTIVITY);

    return baseWeek.map((day, index) => {
      const override = WEEK_DAY_OVERRIDES[index];

      if (!override) {
        return day;
      }

      return {
        ...day,
        hasWorkout: override.hasWorkout,
        isToday: override.isToday,
      };
    });
  }, []);

  const getDayVariant = (day: WeekDayTracker): 'rest' | 'workout' | 'todayRest' | 'todayWorkout' => {
    if (day.isToday && day.hasWorkout) {
      return 'todayWorkout';
    }

    if (day.isToday) {
      return 'todayRest';
    }

    if (day.hasWorkout) {
      return 'workout';
    }

    return 'rest';
  };

  const weeklyTrackerTranslateY = useSharedValue<number>(20);
  const weeklyTrackerOpacity = useSharedValue<number>(0);
  const todaysPlanTranslateY = useSharedValue<number>(20);
  const todaysPlanOpacity = useSharedValue<number>(0);
  const quickLinksTranslateY = useSharedValue<number>(20);
  const quickLinksOpacity = useSharedValue<number>(0);
  const recentWorkoutsTranslateY = useSharedValue<number>(20);
  const recentWorkoutsOpacity = useSharedValue<number>(0);
  const sunScale = useSharedValue<number>(0);
  const monScale = useSharedValue<number>(0);
  const tueScale = useSharedValue<number>(0);
  const wedScale = useSharedValue<number>(0);
  const thuScale = useSharedValue<number>(0);
  const friScale = useSharedValue<number>(0);
  const satScale = useSharedValue<number>(0);

  useEffect(() => {
    const animationConfig = {
      duration: CARD_ENTRY_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    };

    weeklyTrackerTranslateY.value = withDelay(WEEKLY_TRACKER_DELAY_MS, withTiming(0, animationConfig));
    weeklyTrackerOpacity.value = withDelay(WEEKLY_TRACKER_DELAY_MS, withTiming(1, animationConfig));
    todaysPlanTranslateY.value = withDelay(TODAYS_PLAN_DELAY_MS, withTiming(0, animationConfig));
    todaysPlanOpacity.value = withDelay(TODAYS_PLAN_DELAY_MS, withTiming(1, animationConfig));
    quickLinksTranslateY.value = withDelay(QUICK_LINKS_DELAY_MS, withTiming(0, animationConfig));
    quickLinksOpacity.value = withDelay(QUICK_LINKS_DELAY_MS, withTiming(1, animationConfig));
    recentWorkoutsTranslateY.value = withDelay(RECENT_WORKOUTS_DELAY_MS, withTiming(0, animationConfig));
    recentWorkoutsOpacity.value = withDelay(RECENT_WORKOUTS_DELAY_MS, withTiming(1, animationConfig));
  }, []);

  useEffect(() => {
    const springConfig = {
      damping: 12,
      stiffness: 200,
      mass: 0.5,
    };

    const popInStartDelay = WEEKLY_TRACKER_DELAY_MS + CARD_ENTRY_DURATION_MS + DAY_POP_BUFFER_MS;

    [sunScale, monScale, tueScale, wedScale, thuScale, friScale, satScale].forEach((scale, index) => {
      scale.value = withDelay(popInStartDelay + index * DAY_POP_STAGGER_MS, withSpring(1, springConfig));
    });
  }, []);

  const weeklyTrackerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: weeklyTrackerTranslateY.value }],
    opacity: weeklyTrackerOpacity.value,
  }));

  const todaysPlanAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: todaysPlanTranslateY.value }],
    opacity: todaysPlanOpacity.value,
  }));

  const quickLinksAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: quickLinksTranslateY.value }],
    opacity: quickLinksOpacity.value,
  }));

  const recentWorkoutsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: recentWorkoutsTranslateY.value }],
    opacity: recentWorkoutsOpacity.value,
  }));

  const sunAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sunScale.value }],
  }));

  const monAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: monScale.value }],
  }));

  const tueAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tueScale.value }],
  }));

  const wedAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: wedScale.value }],
  }));

  const thuAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: thuScale.value }],
  }));

  const friAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: friScale.value }],
  }));

  const satAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: satScale.value }],
  }));

  const dayAnimatedStyles = [
    sunAnimatedStyle,
    monAnimatedStyle,
    tueAnimatedStyle,
    wedAnimatedStyle,
    thuAnimatedStyle,
    friAnimatedStyle,
    satAnimatedStyle,
  ];

  const router = useRouter();

  const weeklyCardLift = useCardLiftAnimation(shadowConfigs.sm, shadowConfigs.md);
  const todaysPlanLift = useCardLiftAnimation(shadowConfigs.md, shadowConfigs.lg);
  const quickLinkLiftOne = useCardLiftAnimation(shadowConfigs.sm, shadowConfigs.md);
  const quickLinkLiftTwo = useCardLiftAnimation(shadowConfigs.sm, shadowConfigs.md);
  const quickLinkLiftThree = useCardLiftAnimation(shadowConfigs.sm, shadowConfigs.md);
  const quickLinkLiftFour = useCardLiftAnimation(shadowConfigs.sm, shadowConfigs.md);
  const quickLinkLifts = [quickLinkLiftOne, quickLinkLiftTwo, quickLinkLiftThree, quickLinkLiftFour];
  const recentWorkoutLiftOne = useCardLiftAnimation(shadowConfigs.sm, shadowConfigs.md);
  const recentWorkoutLiftTwo = useCardLiftAnimation(shadowConfigs.sm, shadowConfigs.md);
  const recentWorkoutLiftThree = useCardLiftAnimation(shadowConfigs.sm, shadowConfigs.md);
  const recentWorkoutLifts = [recentWorkoutLiftOne, recentWorkoutLiftTwo, recentWorkoutLiftThree];

  return (
    <TabSwipeContainer>
      <LinearGradient
        colors={[colors.primary.bg, colors.primary.light, colors.primary.bg]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.backgroundGradient}
      >
        <View style={styles.container}>
          <View style={styles.contentContainer}>
            <ScreenHeader title="Hello Owen!" subtitle="Track your lifts and keep the streak alive." />

          <Animated.View style={weeklyTrackerAnimatedStyle}>
            <Pressable
              style={styles.pressableStretch}
              onPressIn={weeklyCardLift.onPressIn}
              onPressOut={weeklyCardLift.onPressOut}
            >
              <SurfaceCard tone="card" padding="lg" style={weeklyCardLift.animatedStyle}>
                <View style={styles.streakHeader}>
                  <View style={styles.streakTitle}>
                    <Text variant="heading3" color="primary">
                      Your Week
                    </Text>
                  </View>
                </View>

                <View style={styles.weekRow}>
                  {weekTracker.map((day, index) => (
                    <View key={day.id} style={styles.dayBubbleWrapper}>
                      <Animated.View style={[styles.dayBubbleBase, styles.dayBubbleOutline, dayAnimatedStyles[index]]}>
                        {(() => {
                          const variant = getDayVariant(day);

                          if (variant === 'workout' || variant === 'todayWorkout') {
                            return (
                              <LinearGradient
                                colors={[colors.accent.gradientStart, colors.accent.gradientEnd]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.gradientBubble}
                              />
                            );
                          }

                          return <View style={[styles.gradientBubble, styles.dayBubbleFill]} />;
                        })()}
                        <Text variant="bodySemibold" color={getDayVariant(day) === 'todayWorkout' ? 'onAccent' : 'primary'}>
                          {day.date}
                        </Text>
                      </Animated.View>
                      <Text variant="caption" color="secondary">
                        {day.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </SurfaceCard>
            </Pressable>
          </Animated.View>

          <Animated.View style={todaysPlanAnimatedStyle}>
            <Pressable
              style={styles.pressableStretch}
              onPressIn={todaysPlanLift.onPressIn}
              onPressOut={todaysPlanLift.onPressOut}
            >
              <Animated.View style={[styles.todaysPlanCard, todaysPlanLift.animatedStyle]}>
                <LinearGradient
                  colors={[colors.accent.gradientStart, colors.accent.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.todaysPlanAccentStripe}
                  pointerEvents="none"
                />
                <View style={styles.todaysPlanContent}>
                  <Text variant="heading3" color="primary">
                    Today's Plan
                  </Text>
                  <Text variant="heading2" color="primary">
                    Pull Day
                  </Text>
                  <Text variant="body" color="secondary">
                    6 exercises · 45 minutes
                  </Text>
                </View>
              </Animated.View>
            </Pressable>
          </Animated.View>

          <Animated.View style={quickLinksAnimatedStyle}>
            <SurfaceCard tone="card" padding="xl">
              <Text variant="heading3" color="primary" style={styles.sectionHeading}>
                Quick Links
              </Text>
              <View style={styles.quickLinksList}>
                {QUICK_LINKS.map((link, index) => (
                  <Pressable
                    key={link.id}
                    style={styles.pressableStretch}
                    onPressIn={quickLinkLifts[index].onPressIn}
                    onPressOut={quickLinkLifts[index].onPressOut}
                    onPress={() => {
                      quickLinkLifts[index].onPressOut();
                      router.push(TAB_ROUTE_PATHS[link.route]);
                    }}
                  >
                    <SurfaceCard
                      tone="neutral"
                      padding="lg"
                      showAccentStripe={false}
                      style={[styles.inlineCard, quickLinkLifts[index].animatedStyle]}
                    >
                      <View style={styles.quickLinkRow}>
                        <View style={styles.quickLinkInfo}>
                          <Text variant="bodySemibold" color="primary">
                            {link.title}
                          </Text>
                          <Text variant="body" color="secondary">
                            {link.description}
                          </Text>
                        </View>
                        <View style={styles.quickLinkButton}>
                          <LinearGradient
                            colors={[colors.accent.gradientStart, colors.accent.gradientEnd]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ width: '100%', height: '100%', borderRadius: radius.full, opacity: link.variant === 'primary' ? 1 : 0.12, position: 'absolute' }}
                          />
                          <Text variant="bodySemibold" color={link.variant === 'primary' ? 'onAccent' : 'orange'}>
                            →
                          </Text>
                        </View>
                      </View>
                    </SurfaceCard>
                  </Pressable>
                ))}
              </View>
            </SurfaceCard>
          </Animated.View>

          <Animated.View style={recentWorkoutsAnimatedStyle}>
            <SurfaceCard tone="card" padding="xl">
              <Text variant="heading3" color="primary" style={styles.sectionHeading}>
                Recent Workouts
              </Text>
              <View style={styles.recentWorkoutsList}>
                {RECENT_WORKOUTS.map((workout, index) => (
                  <Pressable
                    key={workout.id}
                    style={styles.pressableStretch}
                    onPressIn={recentWorkoutLifts[index].onPressIn}
                    onPressOut={recentWorkoutLifts[index].onPressOut}
                  >
                    <SurfaceCard
                      tone="neutral"
                      padding="lg"
                      showAccentStripe={false}
                      style={[styles.inlineCard, recentWorkoutLifts[index].animatedStyle]}
                    >
                      <View style={styles.recentCardHeader}>
                        <Text variant="bodySemibold" color="primary">
                          {workout.exercise}
                        </Text>
                        <Text variant="body" color="secondary">
                          {workout.date}
                        </Text>
                      </View>
                      <Text variant="body" color="secondary">
                        Volume {workout.volume}
                      </Text>
                      <View style={[styles.accentUnderline, { marginTop: spacing.md }] }>
                        <LinearGradient
                          colors={[colors.accent.gradientStart, colors.accent.gradientEnd]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{ width: '100%', height: '100%', borderRadius: radius.full }}
                        />
                      </View>
                    </SurfaceCard>
                  </Pressable>
                ))}
              </View>
            </SurfaceCard>
          </Animated.View>

          
          </View>
        </View>
      </LinearGradient>
    </TabSwipeContainer>
  );
};

export default DashboardScreen;
