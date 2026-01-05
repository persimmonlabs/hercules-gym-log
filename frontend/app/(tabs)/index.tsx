import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useScrollToTop, useFocusEffect } from '@react-navigation/native';
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
import { useTheme } from '@/hooks/useTheme';
import { RecentWorkoutSummary, WeekDayTracker } from '@/types/dashboard';
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
import { useUserProfileStore } from '@/store/userProfileStore';
import { useAuth } from '@/providers/AuthProvider';
import { WorkoutInProgressModal } from '@/components/molecules/WorkoutInProgressModal';
import type { Schedule } from '@/types/schedule';
import type { UserProgram, RotationSchedule, ProgramWorkout } from '@/types/premadePlan';
import { createSetsWithHistory } from '@/utils/workout';
import { useActiveScheduleStore } from '@/store/activeScheduleStore';
import { formatDateToLocalISO } from '@/utils/date';





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
  },
  contentContainer: {
    paddingTop: spacing.xl,
    paddingBottom: SCROLL_BOTTOM_PADDING,
    paddingHorizontal: spacing.md,
    gap: spacing['2xl'],
  },
  dashboardCardHeader: {
    width: '100%',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
    marginBottom: spacing.md,
  },
  pressableStretch: {
    width: '100%',
  },
  streakTitle: {
    width: '100%',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
    marginBottom: spacing.md,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBubbleContent: {
    width: '100%',
    height: '100%',
    borderRadius: DAY_BUBBLE_RADIUS - spacing.xxxs,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dayNumber: {
    textAlign: 'center',
  },
  dayLabel: {
    textAlign: 'center',
  },
  dayLabelToday: {
    textAlign: 'center',
  },
  sectionHeading: {
    marginBottom: 0,
  },
  sectionHeader: {
    width: '100%',
    gap: spacing.xs,
    paddingBottom: 0,
  },
  todaysPlanCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },

  todaysPlanContainer: {
    width: '100%',
  },
  todaysPlanBody: {
    width: '100%',
    gap: spacing.lg,
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
    borderWidth: 0,
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
    gap: spacing.md,
  },
  recentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
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
  const { theme } = useTheme();
  const { user } = useAuth();
  const workouts = useWorkoutSessionsStore((state: WorkoutSessionsState) => state.workouts);
  const profile = useUserProfileStore((state) => state.profile);

  const [workoutInProgressVisible, setWorkoutInProgressVisible] = useState<boolean>(false);

  // Get firstName and userInitial reactively from store state
  const firstName = profile?.firstName || null;
  const userInitial = firstName ? firstName.charAt(0).toUpperCase() : null;

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
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  const schedules = useSchedulesStore((state: SchedulesState) => state.schedules);
  const hydrateSchedules = useSchedulesStore((state: SchedulesState) => state.hydrateSchedules);
  const plans = usePlansStore((state: PlansState) => state.plans);
  const hydratePlans = usePlansStore((state: PlansState) => state.hydratePlans);
  const { activeRotation, getCurrentRotationWorkout, hydratePrograms, userPrograms, getTodayWorkout, activePlanId } = useProgramsStore();
  const hydrateWorkouts = useWorkoutSessionsStore((state: WorkoutSessionsState) => state.hydrateWorkouts);
  const activeScheduleResult = useActiveScheduleStore((state) => state.getTodaysWorkout());
  const activeScheduleRule = useActiveScheduleStore((state) => state.state.activeRule);
  const startSession = useSessionStore((state) => state.startSession);
  const setCompletionOverlayVisible = useSessionStore((state) => state.setCompletionOverlayVisible);
  const isSessionActive = useSessionStore((state) => state.isSessionActive);
  const currentSession = useSessionStore((state) => state.currentSession);

  // Helper function to get workout name from ID
  const getWorkoutName = (workoutId: string | null): string => {
    if (!workoutId) return 'Rest Day';

    // Check plans (My Workouts)
    const plan = plans.find((p) => p.id === workoutId);
    if (plan) return plan.name;

    // Check user programs
    for (const program of userPrograms) {
      const workout = program.workouts.find((w) => w.id === workoutId);
      if (workout) return workout.name;
    }

    return 'Unknown Workout';
  };

  // Helper function to get exercise count from workout ID
  const getExerciseCount = (workoutId: string | null): number => {
    if (!workoutId) return 0;

    // Check plans (My Workouts)
    const plan = plans.find((p) => p.id === workoutId);
    if (plan) return plan.exercises.length;

    // Check user programs
    for (const program of userPrograms) {
      const workout = program.workouts.find((w) => w.id === workoutId);
      if (workout) return workout.exercises.length;
    }

    return 0;
  };

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
    | { variant: 'standaloneRotation'; dayLabel: string; plan: Plan; dayNumber: number }
    | { variant: 'completed'; workout: Workout }
    | { variant: 'ongoing'; sessionName: string | null; exerciseCount: number; elapsedMinutes: number }
    | { variant: 'activeSchedule'; dayLabel: string; workoutId: string | null; context?: string };

  const todaysCardState: TodaysCardState = useMemo(() => {
    // PRIORITY 1: Check for ongoing workout session (highest priority)
    if (isSessionActive && currentSession) {
      const elapsedMs = Date.now() - currentSession.startTime;
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      return {
        variant: 'ongoing',
        sessionName: currentSession.name,
        exerciseCount: currentSession.exercises.length,
        elapsedMinutes,
      };
    }

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

    // PRIORITY 3: Check new activeScheduleStore (unified schedule system)
    if (activeScheduleRule && activeScheduleResult.source !== 'none') {
      const workoutName = getWorkoutName(activeScheduleResult.workoutId);
      const exerciseCount = getExerciseCount(activeScheduleResult.workoutId);
      const contextText = activeScheduleResult.workoutId ? `${exerciseCount} ${exerciseCount === 1 ? 'exercise' : 'exercises'}` : 'Take the day off';
      return {
        variant: 'activeSchedule',
        dayLabel: workoutName,
        workoutId: activeScheduleResult.workoutId,
        context: contextText,
      };
    }

    // Check for active rotation or active plan (Legacy System)
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

    // Check for standalone rotating schedule
    if (activeSchedule.type === 'rotating' && activeSchedule.rotating) {
      const { days, startDate } = activeSchedule.rotating;

      if (days.length === 0) {
        return { variant: 'rest', dayLabel: todayLabel };
      }

      if (!startDate) {
        // No start date set, show as rest
        return { variant: 'rest', dayLabel: todayLabel };
      }

      // Calculate which day of the rotation we're on
      const now = new Date();
      const start = new Date(startDate);
      now.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        // Schedule starts in the future
        return { variant: 'rest', dayLabel: todayLabel };
      }

      const currentDayIndex = diffDays % days.length;
      const currentDay = days[currentDayIndex];

      if (!currentDay || !currentDay.planId) {
        // Rest day in the rotation
        return { variant: 'rest', dayLabel: `Day ${currentDay?.dayNumber ?? currentDayIndex + 1}` };
      }

      // Find the plan for today
      const plan = planNameLookup[currentDay.planId];
      if (!plan) {
        return { variant: 'rest', dayLabel: `Day ${currentDay.dayNumber}` };
      }

      return {
        variant: 'standaloneRotation',
        dayLabel: `Day ${currentDay.dayNumber}`,
        plan,
        dayNumber: currentDay.dayNumber,
      };
    }

    // Weekly schedule
    const todaysPlanId = activeSchedule.weekdays[todayKey];

    if (!todaysPlanId) {
      return { variant: 'rest', dayLabel: todayLabel };
    }

    const plan = planNameLookup[todaysPlanId];

    if (!plan) {
      return { variant: 'rest', dayLabel: todayLabel };
    }

    return { variant: 'plan', dayLabel: todayLabel, plan };
  }, [activeSchedule, activeRotation, getTodayWorkout, planNameLookup, plans.length, todayKey, todayLabel, userPrograms, workouts, activePlanId, isSessionActive, currentSession, activeScheduleRule, activeScheduleResult, getWorkoutName, getExerciseCount]);

  const todaysPlan = todaysCardState.variant === 'plan'
    ? todaysCardState.plan
    : todaysCardState.variant === 'standaloneRotation'
      ? todaysCardState.plan
      : null;
  const rotationWorkout = todaysCardState.variant === 'rotation' ? todaysCardState.workout : null;

  const handleTodaysCardPress = useCallback(() => {
    if (todaysCardState.variant === 'plan' || todaysCardState.variant === 'rotation' || todaysCardState.variant === 'standaloneRotation' || todaysCardState.variant === 'noPlans') {
      return;
    }

    void Haptics.selectionAsync();

    if (todaysCardState.variant === 'ongoing') {
      router.push('/(tabs)/workout');
      return;
    }

    if (todaysCardState.variant === 'completed') {
      router.push({ pathname: '/(tabs)/workout-detail', params: { workoutId: todaysCardState.workout.id, from: 'dashboard' } });
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

    const doStartSession = () => {
      setCompletionOverlayVisible(false);

      const target = todaysPlan || rotationWorkout;
      if (!target) return;

      const historySetCounts: Record<string, number> = {};
      const workoutExercises: WorkoutExercise[] = target.exercises.map((exercise) => {
        const { sets, historySetCount } = createSetsWithHistory(exercise.name, workouts);
        historySetCounts[exercise.name] = historySetCount;
        return {
          name: exercise.name,
          sets,
        };
      });

      const planId = todaysCardState.variant === 'rotation'
        ? todaysCardState.programId
        : (todaysPlan?.id ?? '');
      const sessionName = todaysCardState.variant === 'rotation'
        ? (rotationWorkout?.name ?? null)
        : todaysCardState.variant === 'standaloneRotation'
          ? `${todaysCardState.dayLabel}: ${todaysPlan?.name ?? 'Workout'}`
          : (todaysPlan?.name ?? null);

      startSession(planId, workoutExercises, sessionName, historySetCounts);
      router.push('/(tabs)/workout');
    };

    if (isSessionActive && currentSession) {
      setWorkoutInProgressVisible(true);
      return;
    }

    doStartSession();
  }, [todaysPlan, rotationWorkout, startSession, router, setCompletionOverlayVisible, todaysCardState, workouts, isSessionActive, currentSession]);

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
      exercise.sets.length > 0 ? exercise.sets.some((set) => set.completed) : false
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


  const recentWorkoutLiftOne = useCardLiftAnimation(shadowConfigs.sm, shadowConfigs.md);
  const recentWorkoutLiftTwo = useCardLiftAnimation(shadowConfigs.sm, shadowConfigs.md);
  const recentWorkoutLiftThree = useCardLiftAnimation(shadowConfigs.sm, shadowConfigs.md);
  const recentWorkoutLifts = [recentWorkoutLiftOne, recentWorkoutLiftTwo, recentWorkoutLiftThree];

  return (
    <TabSwipeContainer ref={scrollRef}>
      <LinearGradient
        colors={[theme.primary.bg, theme.primary.light, theme.primary.bg]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.backgroundGradient}
      >
        <View style={[styles.container, { backgroundColor: theme.primary.bg }]}>
          <WorkoutInProgressModal
            visible={workoutInProgressVisible}
            sessionName={currentSession?.name ?? 'Current Workout'}
            elapsedMinutes={currentSession ? Math.floor((Date.now() - currentSession.startTime) / 60000) : 0}
            onResume={() => {
              setWorkoutInProgressVisible(false);
              router.push('/(tabs)/workout');
            }}
            onCancel={() => {
              setWorkoutInProgressVisible(false);
            }}
          />
          <View style={styles.contentContainer}>
            <ScreenHeader
              title={firstName ? `Welcome, ${firstName}!` : 'Welcome!'}
              subtitle="Your fitness journey starts here."
              onProfilePress={() => router.push('/modals/profile')}
              userInitial={userInitial}
            />

            <Animated.View style={weeklyTrackerAnimatedStyle}>
              <Pressable style={styles.pressableStretch}>
                <SurfaceCard tone="card" padding="xl" showAccentStripe={true} style={{ borderWidth: 0, marginTop: -spacing.md }}>
                  <View style={styles.dashboardCardHeader}>
                    <Text variant="heading3" color="primary">
                      Your Week
                    </Text>
                  </View>

                  <View style={styles.weekRow}>
                    {weekTracker.map((day, index) => {
                      const variant = getDayVariant(day);
                      const isWorkoutDay = variant === 'workout';
                      const isToday = day.isToday;
                      const borderStyle = isWorkoutDay
                        ? [
                          styles.dayBubbleBorder,
                          { backgroundColor: theme.accent.orange, borderColor: theme.accent.orange },
                        ]
                        : [
                          styles.dayBubbleBorder,
                          { backgroundColor: theme.surface.elevated, borderColor: theme.accent.orange },
                        ];
                      const contentStyle = [
                        styles.dayBubbleContent,
                        isWorkoutDay
                          ? { backgroundColor: theme.accent.orange }
                          : { backgroundColor: theme.surface.elevated },
                      ];
                      const dayNumberColor: 'primary' | 'onAccent' = isWorkoutDay ? 'onAccent' : 'primary';

                      const handleDayPress = () => {
                        if (day.hasWorkout) {
                          // Extract ISO date from day.id (format: YYYY-MM-DD-label)
                          const dayISO = day.id.split('-').slice(0, 3).join('-');

                          // Find the workout for this day by comparing ISO dates
                          const workout = workouts.find(w => {
                            const workoutISO = w.startTime
                              ? formatDateToLocalISO(new Date(w.startTime))
                              : w.date ? formatDateToLocalISO(new Date(w.date)) : null;
                            return workoutISO === dayISO;
                          });

                          if (workout) {
                            void Haptics.selectionAsync();
                            router.push({ pathname: '/(tabs)/workout-detail', params: { workoutId: workout.id, from: 'dashboard' } });
                          }
                        }
                      };

                      return (
                        <Pressable key={day.id} style={styles.dayBubbleWrapper} onPress={handleDayPress}>
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
                        </Pressable>
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
                <SurfaceCard tone="card" padding="xl" showAccentStripe={true} style={{ borderWidth: 0, marginTop: -spacing.md }}>
                  <View style={styles.todaysPlanContainer}>
                    <View style={styles.dashboardCardHeader}>
                      <Text variant="heading3" color="primary">
                        Today's Workout
                      </Text>
                    </View>
                    <View style={styles.todaysPlanBody}>
                      {todaysCardState.variant === 'ongoing' ? (
                        <SurfaceCard
                          tone="neutral"
                          padding="lg"
                          showAccentStripe={false}
                          style={styles.inlineCard}
                        >
                          <View style={styles.quickLinkRow}>
                            <View style={styles.quickLinkInfo}>
                              <Text variant="bodySemibold" color="primary">
                                {todaysCardState.sessionName ?? 'Workout in Progress'}
                              </Text>
                              <Text variant="body" color="secondary">
                                {todaysCardState.exerciseCount} {todaysCardState.exerciseCount === 1 ? 'exercise' : 'exercises'} · {todaysCardState.elapsedMinutes} min elapsed
                              </Text>
                            </View>
                            <Pressable
                              style={styles.planStartButton}
                              onPress={handleTodaysCardPress}
                              accessibilityRole="button"
                              accessibilityLabel="Resume ongoing workout"
                            >
                              <View style={styles.quickLinkButton}>
                                <LinearGradient
                                  colors={[theme.accent.gradientStart, theme.accent.gradientEnd]}
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
                      ) : todaysCardState.variant === 'activeSchedule' ? (
                        <SurfaceCard
                          tone="neutral"
                          padding="lg"
                          showAccentStripe={false}
                          style={styles.inlineCard}
                        >
                          <View style={styles.quickLinkRow}>
                            <View style={styles.quickLinkInfo}>
                              <Text variant="bodySemibold" color="primary">
                                {todaysCardState.workoutId ? todaysCardState.dayLabel : 'Rest Day'}
                              </Text>
                              <Text variant="body" color="secondary">
                                {todaysCardState.context || (todaysCardState.workoutId ? 'Scheduled workout' : 'Take the day off')}
                              </Text>
                            </View>
                            {todaysCardState.workoutId && (
                              <Pressable
                                style={styles.planStartButton}
                                onPress={() => {
                                  void Haptics.selectionAsync();

                                  // Find the workout from either plans or user programs
                                  let targetWorkout: Plan | ProgramWorkout | null = null;
                                  let planId = '';
                                  let sessionName = '';

                                  const plan = plans.find((p) => p.id === todaysCardState.workoutId);
                                  if (plan) {
                                    targetWorkout = plan;
                                    planId = plan.id;
                                    sessionName = plan.name;
                                  } else {
                                    for (const program of userPrograms) {
                                      const workout = program.workouts.find((w) => w.id === todaysCardState.workoutId);
                                      if (workout) {
                                        targetWorkout = workout;
                                        planId = program.id;
                                        sessionName = workout.name;
                                        break;
                                      }
                                    }
                                  }

                                  if (targetWorkout) {
                                    const historySetCounts: Record<string, number> = {};
                                    const workoutExercises: WorkoutExercise[] = targetWorkout.exercises.map((exercise) => {
                                      const { sets, historySetCount } = createSetsWithHistory(exercise.name, workouts);
                                      historySetCounts[exercise.name] = historySetCount;
                                      return {
                                        name: exercise.name,
                                        sets,
                                      };
                                    });

                                    startSession(planId, workoutExercises, sessionName, historySetCounts);
                                  }

                                  router.push('/(tabs)/workout');
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Start today's workout"
                              >
                                <View style={styles.quickLinkButton}>
                                  <LinearGradient
                                    colors={[theme.accent.gradientStart, theme.accent.gradientEnd]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.planStartButtonGradient}
                                  />
                                  <Text variant="bodySemibold" color="onAccent">
                                    →
                                  </Text>
                                </View>
                              </Pressable>
                            )}
                          </View>
                        </SurfaceCard>
                      ) : todaysCardState.variant === 'plan' || todaysCardState.variant === 'rotation' || todaysCardState.variant === 'standaloneRotation' ? (
                        <SurfaceCard
                          tone="neutral"
                          padding="lg"
                          showAccentStripe={false}
                          style={styles.inlineCard}
                        >
                          <View style={styles.quickLinkRow}>
                            <View style={styles.quickLinkInfo}>
                              <Text variant="bodySemibold" color="primary">
                                {todaysCardState.variant === 'rotation'
                                  ? `${todaysCardState.programName}: ${todaysCardState.workout.name}`
                                  : todaysCardState.variant === 'standaloneRotation'
                                    ? `${todaysCardState.dayLabel}: ${todaysCardState.plan.name}`
                                    : todaysCardState.plan.name}
                              </Text>
                              <Text variant="body" color="secondary">
                                {todaysCardState.variant === 'rotation'
                                  ? `${todaysCardState.workout.exercises.length} exercises`
                                  : todaysCardState.variant === 'standaloneRotation'
                                    ? `${todaysCardState.plan.exercises.length} exercises`
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
                                  colors={[theme.accent.gradientStart, theme.accent.gradientEnd]}
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
                          style={styles.inlineCard}
                        >
                          <View style={styles.recentCardHeader}>
                            <Text variant="bodySemibold" color="primary">
                              {todaysCardState.workout.name
                                ? todaysCardState.workout.name
                                : todaysCardState.workout.planId
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
                      ) : todaysCardState.variant === 'noPlans' ? (
                        <SurfaceCard
                          tone="neutral"
                          padding="lg"
                          showAccentStripe={false}
                          style={styles.inlineCard}
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
                          <Text variant="body" color="secondary">
                            Assign workouts to your schedule to see them here.
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                </SurfaceCard>
              </Pressable>
            </Animated.View>



            <Animated.View style={recentWorkoutsAnimatedStyle}>
              <SurfaceCard tone="card" padding="xl" showAccentStripe={true} style={{ borderWidth: 0 }}>
                <View style={styles.dashboardCardHeader}>
                  <Text variant="heading3" color="primary">
                    Recent Workouts
                  </Text>
                </View>
                <View style={styles.recentWorkoutsList}>
                  {recentWorkouts.length > 0 ? (
                    recentWorkouts.map((workout, index) => {
                      const lift = recentWorkoutLifts[index];
                      const planTitle = workout.planId ? planNameLookup[workout.planId]?.name : null;
                      const workoutTitle = workout.name ?? planTitle ?? `${formatWorkoutDateLabel(workout)} Session`;

                      return (
                        <Pressable
                          key={workout.id}
                          style={styles.pressableStretch}
                          onPressIn={lift?.onPressIn}
                          onPressOut={lift?.onPressOut}
                          onPress={() => {
                            lift?.onPressOut?.();
                            void Haptics.selectionAsync();
                            router.push({ pathname: '/(tabs)/workout-detail', params: { workoutId: workout.id, from: 'dashboard' } });
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
                      style={styles.inlineCard}
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
