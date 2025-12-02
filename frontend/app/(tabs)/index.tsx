import React, { useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
import { Button } from '@/components/atoms/Button';
import { GradientText } from '@/components/atoms/GradientText';
import { ScreenHeader } from '@/components/molecules/ScreenHeader';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { colors, spacing, radius, shadows, sizing } from '@/constants/theme';
import { MainTabRoute } from '@/constants/navigation';
import { QuickLinkItem, RecentWorkoutSummary, WeekDayTracker } from '@/types/dashboard';
import { createWeekTracker } from '@/utils/dashboard';
import { useSchedulesStore, type SchedulesState } from '@/store/schedulesStore';
import { usePlansStore, type Plan, type PlansState } from '@/store/plansStore';
import { useProgramsStore } from '@/store/programsStore';
import { WEEKDAY_LABELS } from '@/constants/schedule';
import type { ScheduleDayKey } from '@/types/schedule';
import * as Haptics from 'expo-haptics';
import { useWorkoutSessionsStore, type WorkoutSessionsState } from '@/store/workoutSessionsStore';
import type { Workout, WorkoutExercise, SetLog } from '@/types/workout';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSessionStore } from '@/store/sessionStore';
import { useAuth } from '@/providers/AuthProvider';
import { supabaseClient } from '@/lib/supabaseClient';
import type { Schedule } from '@/types/schedule';
import type { UserProgram, RotationSchedule, ProgramWorkout } from '@/types/premadePlan';

const QUICK_LINKS: QuickLinkItem[] = [
  { id: 'link-workout', title: 'Start Workout', description: 'Log a new workout session.', icon: 'flash-outline', route: 'workout', variant: 'primary' },
  { id: 'link-calendar', title: 'View Calendar', description: 'Review past workout sessions.', icon: 'calendar-outline', route: 'calendar' },
  { id: 'link-plans', title: 'Edit Programs', description: 'Customize your workout routines.', icon: 'document-text-outline', route: 'plans' },
  { id: 'link-stats', title: 'Analyze Performance', description: 'Explore your workout analytics.', icon: 'stats-chart-outline', route: 'profile' },
];

const TAB_ROUTE_PATHS: Record<MainTabRoute, Href> = {
  index: '/(tabs)',
  calendar: '/(tabs)/calendar',
  workout: '/(tabs)/workout',
  plans: '/(tabs)/plans',
  profile: '/(tabs)/profile',
};

const SCHEDULE_DAY_KEYS: ScheduleDayKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const BUBBLE_DIAMETER = sizing.weekBubble;
const DAY_BUBBLE_RADIUS = BUBBLE_DIAMETER / 2;
const SCROLL_BOTTOM_PADDING = spacing.sm;
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

const DEFAULT_PLAN_SET_COUNT = 3;

const createDefaultSetLogs = (): SetLog[] =>
  Array.from({ length: DEFAULT_PLAN_SET_COUNT }, () => ({
    reps: 8,
    weight: 0,
    completed: false,
  }));

type ShadowConfig = {
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

const shadowConfigs: Record<'sm' | 'md' | 'lg', ShadowConfig> = {
  sm: {
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  md: {
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  lg: {
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
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
    paddingTop: spacing.xl,
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
    marginBottom: spacing.md,
  },
  streakTitle: {
    flex: 1,
    gap: spacing.xs,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    borderRadius: DAY_BUBBLE_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBubbleBorder: {
    width: '100%',
    height: '100%',
    borderRadius: DAY_BUBBLE_RADIUS,
    borderWidth: spacing.xxxs,
    borderColor: colors.accent.orange,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
  },
  dayBubbleBorderWorkout: {
    borderColor: colors.accent.orange,
    backgroundColor: colors.accent.orange,
  },
  dayBubbleContent: {
    width: '100%',
    height: '100%',
    borderRadius: DAY_BUBBLE_RADIUS - spacing.xxxs,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dayBubbleContentRest: {
    backgroundColor: colors.surface.card,
  },
  dayBubbleContentWorkout: {
    backgroundColor: colors.accent.orange,
  },
  dayNumber: {
    textAlign: 'center',
  },
  dayLabel: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  dayLabelToday: {
    textAlign: 'center',
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
    gap: spacing.md,
  },
  planStartButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  planStartButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: radius.full,
    position: 'absolute',
  },
  todaysPlanSubCard: {
    borderColor: 'transparent',
  },
  todaysPlanEmptyContent: {
    gap: spacing.sm,
    width: '100%',
  },
  todaysPlanActions: {
    marginTop: spacing.md,
    width: '100%',
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent.orangeLight,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  recentEmptyCard: {
    borderWidth: 0,
    borderColor: 'transparent',
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
  todaysPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  todaysPlanInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  todaysPlanStartButton: {
    borderRadius: radius.md,
  },
  todaysPlanStartGradient: {
    borderRadius: radius.md,
    padding: spacing.xxxs,
  },
  todaysPlanStartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  todaysPlanStartIcon: {
    width: spacing.lg,
    height: spacing.lg,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todaysPlanStartIconMask: {
    width: spacing.lg,
    height: spacing.lg,
  },
  todaysPlanStartIconFill: {
    ...StyleSheet.absoluteFillObject,
  },
});

const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const [firstName, setFirstName] = React.useState<string | null>(null);
  const workouts = useWorkoutSessionsStore((state: WorkoutSessionsState) => state.workouts);

  useEffect(() => {
    if (user?.id) {
      // Fetch from profiles table (primary source of truth)
      supabaseClient
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.first_name) {
            setFirstName(data.first_name);
          } else {
            setFirstName(null);
          }
        });
    } else {
      setFirstName(null);
    }
  }, [user]);

  // Force refresh when screen comes into focus (e.g. returning from profile modal)
  useFocusEffect(
    useCallback(() => {
      const refreshName = async () => {
        const { data: { user: freshUser } } = await supabaseClient.auth.getUser();

        if (freshUser?.id) {
          // Fetch from profiles table
          const { data } = await supabaseClient
            .from('profiles')
            .select('first_name')
            .eq('id', freshUser.id)
            .single();

          if (data?.first_name) {
            setFirstName(data.first_name);
          } else {
            setFirstName(null);
          }
        }
      };

      void refreshName();
    }, [])
  );

  const weekTracker = useMemo<WeekDayTracker[]>(() => {
    return createWeekTracker(workouts);
  }, [workouts]);

  const getDayVariant = (day: WeekDayTracker): 'rest' | 'workout' => {
    return day.hasWorkout ? 'workout' : 'rest';
  };

  const weeklyTrackerTranslateY = useSharedValue<number>(0);
  const weeklyTrackerOpacity = useSharedValue<number>(1);
  const todaysPlanTranslateY = useSharedValue<number>(0);
  const todaysPlanOpacity = useSharedValue<number>(1);
  const quickLinksTranslateY = useSharedValue<number>(0);
  const quickLinksOpacity = useSharedValue<number>(1);
  const recentWorkoutsTranslateY = useSharedValue<number>(0);
  const recentWorkoutsOpacity = useSharedValue<number>(1);
  const sunScale = useSharedValue<number>(0);
  const monScale = useSharedValue<number>(0);
  const tueScale = useSharedValue<number>(0);
  const wedScale = useSharedValue<number>(0);
  const thuScale = useSharedValue<number>(0);
  const friScale = useSharedValue<number>(0);
  const satScale = useSharedValue<number>(0);

  useEffect(() => {
    const springConfig = {
      damping: 12,
      stiffness: 200,
      mass: 0.5,
    };

    const popInStartDelay = 300;
    const staggerMs = 50;

    [sunScale, monScale, tueScale, wedScale, thuScale, friScale, satScale].forEach((scale, index) => {
      scale.value = withDelay(popInStartDelay + index * staggerMs, withSpring(1, springConfig));
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
  const schedules = useSchedulesStore((state: SchedulesState) => state.schedules);
  const hydrateSchedules = useSchedulesStore((state: SchedulesState) => state.hydrateSchedules);
  const plans = usePlansStore((state: PlansState) => state.plans);
  const hydratePlans = usePlansStore((state: PlansState) => state.hydratePlans);
  const { activeRotation, getCurrentRotationWorkout, hydratePrograms, userPrograms, getTodayWorkout, activePlanId } = useProgramsStore();
  const hydrateWorkouts = useWorkoutSessionsStore((state: WorkoutSessionsState) => state.hydrateWorkouts);
  const startSession = useSessionStore((state) => state.startSession);
  const setCompletionOverlayVisible = useSessionStore((state) => state.setCompletionOverlayVisible);

  useEffect(() => {
    void hydrateSchedules();
  }, [hydrateSchedules]);

  useEffect(() => {
    void hydratePlans();
  }, [hydratePlans]);

  useEffect(() => {
    void hydratePrograms();
  }, [hydratePrograms]);

  useEffect(() => {
    void hydrateWorkouts();
  }, [hydrateWorkouts]);

  const todayKey: ScheduleDayKey = useMemo(() => {
    const dayIndex = new Date().getDay();
    return SCHEDULE_DAY_KEYS[dayIndex];
  }, []);

  const todayLabel = useMemo(() => {
    const match = WEEKDAY_LABELS.find((entry) => entry.key === todayKey);
    return match?.label ?? 'Today';
  }, [todayKey]);

  const planNameLookup = useMemo(() => {
    return plans.reduce<Record<string, Plan>>((acc, plan) => {
      acc[plan.id] = plan;
      return acc;
    }, {});
  }, [plans]);

  const activeSchedule = schedules[0] ?? null;

  type TodaysCardState =
    | { variant: 'noSchedule' }
    | { variant: 'noPlans' }
    | { variant: 'rest'; dayLabel: string }
    | { variant: 'plan'; dayLabel: string; plan: Plan }
    | { variant: 'rotation'; programName: string; workout: ProgramWorkout; programId: string }
    | { variant: 'completed'; workout: Workout };

  const todaysCardState: TodaysCardState = useMemo(() => {
    // Check for completed workout today
    const todayString = new Date().toDateString();
    const todaysWorkouts = workouts.filter(w => {
      const timestamp = w.endTime ?? w.startTime ?? new Date(w.date).getTime();
      return new Date(timestamp).toDateString() === todayString;
    });

    if (todaysWorkouts.length > 0) {
      // Sort by most recent
      const latestWorkout = todaysWorkouts.sort((a, b) => {
        const aTime = a.endTime ?? a.startTime ?? new Date(a.date).getTime();
        const bTime = b.endTime ?? b.startTime ?? new Date(b.date).getTime();
        return bTime - aTime;
      })[0];

      return { variant: 'completed', workout: latestWorkout };
    }

    // Check for active rotation or active plan (New System)
    const todayProgramWorkout = getTodayWorkout();

    // Check if there's an active plan
    const activePlan = userPrograms.find(p => p.id === activePlanId);

    // If we have an active plan but no workout (e.g., future start date or rest day)
    if (activePlan && activePlan.schedule) {
      if (todayProgramWorkout) {
        return {
          variant: 'rotation',
          programName: activePlan.name,
          workout: todayProgramWorkout,
          programId: activePlan.id
        };
      }

      // Active plan exists but no workout today (future start date or rest day in rotation)
      if (activePlan.schedule.type === 'rotation' && activePlan.schedule.rotation?.startDate) {
        const now = new Date();
        const start = new Date(activePlan.schedule.rotation.startDate);
        now.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          // Plan starts in the future
          return { variant: 'rest', dayLabel: todayLabel };
        }
      }
    }

    if (plans.length === 0 && userPrograms.length === 0) {
      return { variant: 'noPlans' };
    }

    if (!activeSchedule) {
      return { variant: 'noSchedule' };
    }

    const todaysPlanId = activeSchedule.weekdays[todayKey];

    if (!todaysPlanId) {
      return { variant: 'rest', dayLabel: todayLabel };
    }

    const plan = planNameLookup[todaysPlanId];

    if (!plan) {
      return { variant: 'rest', dayLabel: todayLabel };
    }

    return { variant: 'plan', dayLabel: todayLabel, plan };
  }, [activeSchedule, activeRotation, getTodayWorkout, planNameLookup, plans.length, todayKey, todayLabel, userPrograms, workouts, activePlanId]);

  const todaysPlan = todaysCardState.variant === 'plan' ? todaysCardState.plan : null;
  const rotationWorkout = todaysCardState.variant === 'rotation' ? todaysCardState.workout : null;

  const handleTodaysCardPress = useCallback(() => {
    if (todaysCardState.variant === 'plan' || todaysCardState.variant === 'rotation' || todaysCardState.variant === 'noPlans') {
      return;
    }

    void Haptics.selectionAsync();

    if (todaysCardState.variant === 'completed') {
      router.push({ pathname: '/(tabs)/workout-detail', params: { workoutId: todaysCardState.workout.id } });
      return;
    }

    router.push('/(tabs)/schedule-editor');
  }, [router, todaysCardState]);

  const handleCreatePlanPress = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/(tabs)/plans');
  }, [router]);

  const handlePlanActionStart = useCallback(() => {
    if (!todaysPlan && !rotationWorkout) {
      return;
    }

    void Haptics.selectionAsync();

    // Explicitly reset overlay state before starting new session
    setCompletionOverlayVisible(false);

    const target = todaysPlan || rotationWorkout;
    if (!target) return;

    const workoutExercises: WorkoutExercise[] = target.exercises.map((exercise) => ({
      name: exercise.name,
      sets: createDefaultSetLogs(),
    }));

    const planId = todaysCardState.variant === 'rotation' ? todaysCardState.programId : (todaysPlan?.id ?? '');

    startSession(planId, workoutExercises);
    router.push('/(tabs)/workout');
  }, [todaysPlan, rotationWorkout, startSession, router, setCompletionOverlayVisible, todaysCardState]);

  const recentWorkouts = useMemo<Workout[]>(() => {
    if (workouts.length === 0) {
      return [];
    }

    return [...workouts]
      .sort((a, b) => {
        const aTimestamp = a.endTime ?? a.startTime ?? new Date(a.date).getTime();
        const bTimestamp = b.endTime ?? b.startTime ?? new Date(b.date).getTime();
        return bTimestamp - aTimestamp;
      })
      .slice(0, 3);
  }, [workouts]);

  const formatWorkoutSubtitle = useCallback((workout: Workout) => {
    const completedExercises = workout.exercises.filter((exercise) =>
      exercise.sets.length > 0 ? exercise.sets.every((set) => set.completed) : false
    );
    const completedCount = completedExercises.length;
    const base = `${completedCount} completed ${completedCount === 1 ? 'exercise' : 'exercises'}`;
    const durationMinutes = workout.duration ? Math.max(Math.round(workout.duration / 60), 1) : null;

    if (durationMinutes) {
      return `${base} · ${durationMinutes} min`;
    }

    return base;
  }, []);

  const formatWorkoutDateLabel = useCallback((workout: Workout) => {
    const timestamp = workout.endTime ?? workout.startTime ?? new Date(workout.date).getTime();
    const date = new Date(timestamp);

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }, []);

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
            <ScreenHeader
              title={firstName ? `Welcome, ${firstName}!` : 'Welcome!'}
              subtitle="Stay on top of your training journey."
              onProfilePress={() => router.push('/modals/profile')}
            />

            <Animated.View style={weeklyTrackerAnimatedStyle}>
              <Pressable style={styles.pressableStretch}>
                <SurfaceCard tone="card" padding="lg" style={{ borderWidth: 0, marginTop: -spacing.md }}>
                  <View style={styles.streakHeader}>
                    <View style={styles.streakTitle}>
                      <Text variant="heading3" color="primary">
                        Your Week
                      </Text>
                    </View>
                  </View>

                  <View style={styles.weekRow}>
                    {weekTracker.map((day, index) => {
                      const variant = getDayVariant(day);
                      const isWorkoutDay = variant === 'workout';
                      const isToday = day.isToday;
                      const borderStyle = isWorkoutDay
                        ? [styles.dayBubbleBorder, styles.dayBubbleBorderWorkout]
                        : styles.dayBubbleBorder;
                      const contentStyle = [
                        styles.dayBubbleContent,
                        isWorkoutDay ? styles.dayBubbleContentWorkout : styles.dayBubbleContentRest,
                      ];
                      const dayNumberColor: 'primary' | 'onAccent' = isWorkoutDay ? 'onAccent' : 'primary';

                      return (
                        <View key={day.id} style={styles.dayBubbleWrapper}>
                          <Animated.View style={[styles.dayBubbleBase, dayAnimatedStyles[index]]}>
                            <View style={borderStyle}>
                              <View style={contentStyle}>
                                <Text variant="bodySemibold" color={dayNumberColor}>
                                  {day.date}
                                </Text>
                              </View>
                            </View>
                          </Animated.View>
                          {isToday ? (
                            <GradientText variant="caption" style={styles.dayLabelToday}>
                              {day.label}
                            </GradientText>
                          ) : (
                            <Text variant="caption" color="secondary" style={styles.dayLabel}>
                              {day.label}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </SurfaceCard>
              </Pressable>
            </Animated.View>

            <Animated.View style={todaysPlanAnimatedStyle}>
              <Pressable
                style={styles.pressableStretch}
                onPress={() => {
                  if (todaysPlan) {
                    return;
                  }

                  handleTodaysCardPress();
                }}
              >
                <Animated.View style={styles.todaysPlanCard}>
                  <LinearGradient
                    colors={[colors.accent.gradientStart, colors.accent.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.todaysPlanAccentStripe}
                    pointerEvents="none"
                  />
                  <View style={styles.todaysPlanContent}>
                    <Text variant="heading3" color="primary">
                      Today's Workout
                    </Text>
                    {todaysCardState.variant === 'plan' || todaysCardState.variant === 'rotation' ? (
                      <SurfaceCard
                        tone="neutral"
                        padding="lg"
                        showAccentStripe={false}
                        style={[styles.inlineCard, styles.todaysPlanSubCard]}
                      >
                        <View style={styles.quickLinkRow}>
                          <View style={styles.quickLinkInfo}>
                            <Text variant="bodySemibold" color="primary">
                              {todaysCardState.variant === 'rotation'
                                ? `${todaysCardState.programName}: ${todaysCardState.workout.name}`
                                : todaysCardState.plan.name}
                            </Text>
                            <Text variant="body" color="secondary">
                              {todaysCardState.variant === 'rotation'
                                ? `${todaysCardState.workout.exercises.length} exercises`
                                : `${todaysCardState.plan.exercises.length} exercises`}
                            </Text>
                          </View>
                          <Pressable
                            style={styles.planStartButton}
                            onPress={handlePlanActionStart}
                            accessibilityRole="button"
                            accessibilityLabel="Start today's workout"
                          >
                            <View style={styles.quickLinkButton}>
                              <LinearGradient
                                colors={[colors.accent.gradientStart, colors.accent.gradientEnd]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.planStartButtonGradient}
                              />
                              <Text variant="bodySemibold" color="onAccent">
                                →
                              </Text>
                            </View>
                          </Pressable>
                        </View>
                      </SurfaceCard>
                    ) : todaysCardState.variant === 'completed' ? (
                      <SurfaceCard
                        tone="neutral"
                        padding="lg"
                        showAccentStripe={false}
                        style={[styles.inlineCard, styles.todaysPlanSubCard]}
                      >
                        <View style={styles.recentCardHeader}>
                          <Text variant="bodySemibold" color="primary">
                            {todaysCardState.workout.planId
                              ? planNameLookup[todaysCardState.workout.planId]?.name ?? `${formatWorkoutDateLabel(todaysCardState.workout)} Session`
                              : `${formatWorkoutDateLabel(todaysCardState.workout)} Session`}
                          </Text>
                          <Text variant="body" color="secondary">
                            {formatWorkoutDateLabel(todaysCardState.workout)}
                          </Text>
                        </View>
                        <Text variant="body" color="secondary">
                          {formatWorkoutSubtitle(todaysCardState.workout)}
                        </Text>
                      </SurfaceCard>
                    ) : todaysCardState.variant === 'rest' ? (
                      <>
                        <Text variant="heading2" color="primary">
                          Rest Day
                        </Text>
                        <Text variant="body" color="secondary">
                          Recharge and get ready for your next workout.
                        </Text>
                      </>
                    ) : todaysCardState.variant === 'noPlans' ? (
                      <SurfaceCard
                        tone="neutral"
                        padding="lg"
                        showAccentStripe={false}
                        style={[styles.inlineCard, styles.todaysPlanSubCard]}
                      >
                        <View style={styles.todaysPlanEmptyContent}>
                          <Text variant="bodySemibold" color="primary">
                            Create a workout plan
                          </Text>
                          <Text variant="body" color="secondary">
                            No workout plans yet. Build one to see it here.
                          </Text>
                          <View style={styles.todaysPlanActions}>
                            <Button label="Create Workout Plan" size="md" onPress={handleCreatePlanPress} />
                          </View>
                        </View>
                      </SurfaceCard>
                    ) : (
                      <>
                        <Text variant="heading2" color="primary">
                          Add Your Schedule
                        </Text>
                        <Text variant="body" color="secondary">
                          Assign workouts to your week to see them here.
                        </Text>
                      </>
                    )}
                  </View>
                </Animated.View>
              </Pressable>
            </Animated.View>

            <Animated.View style={quickLinksAnimatedStyle}>
              <SurfaceCard tone="card" padding="xl" style={{ borderWidth: 0 }}>
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
                          </View>
                          <View style={styles.quickLinkButton}>
                            <LinearGradient
                              colors={[colors.accent.gradientStart, colors.accent.gradientEnd]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: radius.full,
                                opacity: link.variant === 'primary' ? 1 : 0.12,
                                position: 'absolute',
                              }}
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
              <SurfaceCard tone="card" padding="xl" style={{ borderWidth: 0 }}>
                <Text variant="heading3" color="primary" style={styles.sectionHeading}>
                  Recent Workouts
                </Text>
                <View style={styles.recentWorkoutsList}>
                  {recentWorkouts.length > 0 ? (
                    recentWorkouts.map((workout, index) => {
                      const lift = recentWorkoutLifts[index];
                      const planTitle = workout.planId ? planNameLookup[workout.planId]?.name : null;
                      const workoutTitle = planTitle ?? `${formatWorkoutDateLabel(workout)} Session`;

                      return (
                        <Pressable
                          key={workout.id}
                          style={styles.pressableStretch}
                          onPressIn={lift?.onPressIn}
                          onPressOut={lift?.onPressOut}
                          onPress={() => {
                            lift?.onPressOut?.();
                            void Haptics.selectionAsync();
                            router.push({ pathname: '/workout-detail', params: { workoutId: workout.id } });
                          }}
                        >
                          <SurfaceCard
                            tone="neutral"
                            padding="lg"
                            showAccentStripe={false}
                            style={[styles.inlineCard, lift?.animatedStyle]}
                          >
                            <View style={styles.recentCardHeader}>
                              <Text variant="bodySemibold" color="primary">
                                {workoutTitle}
                              </Text>
                              <Text variant="body" color="secondary">
                                {formatWorkoutDateLabel(workout)}
                              </Text>
                            </View>
                            <Text variant="body" color="secondary">
                              {formatWorkoutSubtitle(workout)}
                            </Text>
                          </SurfaceCard>
                        </Pressable>
                      );
                    })
                  ) : (
                    <SurfaceCard
                      tone="neutral"
                      padding="lg"
                      showAccentStripe={false}
                      style={[styles.inlineCard, styles.recentEmptyCard]}
                    >
                      <Text variant="bodySemibold" color="primary">
                        No workouts yet
                      </Text>
                      <Text variant="body" color="secondary">
                        Complete a workout session and it will appear here.
                      </Text>
                    </SurfaceCard>
                  )}
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
