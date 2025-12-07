import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, Alert, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming, type AnimatedStyle } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { ScreenHeader } from '@/components/molecules/ScreenHeader';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { Button } from '@/components/atoms/Button';
import { WEEKDAY_LABELS } from '@/constants/schedule';
import { colors, radius, shadows, sizing, spacing } from '@/constants/theme';
import { usePlansStore, type Plan, type PlansState } from '@/store/plansStore';
import { useSchedulesStore, type SchedulesState } from '@/store/schedulesStore';
import { useProgramsStore } from '@/store/programsStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSessionStore } from '@/store/sessionStore';
import { ProgramCard } from '@/components/molecules/ProgramCard';
import type { WorkoutExercise } from '@/types/workout';
import { createDefaultSetsForExercise } from '@/utils/workout';
import type { Schedule } from '@/types/schedule';
import type { PremadeProgram, WeeklyScheduleConfig, Weekday, UserProgram } from '@/types/premadePlan';

const getPlanSummary = (program: UserProgram) => {
  // If no schedule, fallback to basic count
  if (!program.schedule) {
    return `${program.workouts.length} workouts`;
  }

  if (program.schedule.type === 'rotation' && program.schedule.rotation) {
    const order = program.schedule.rotation.workoutOrder;
    let workoutCount = 0;
    let restCount = 0;

    order.forEach(id => {
      const workout = program.workouts.find(w => w.id === id);
      if (workout) {
        if (workout.exercises.length > 0) {
          workoutCount++;
        } else {
          restCount++;
        }
      }
    });

    const totalDays = workoutCount + restCount;
    return `${workoutCount} workouts • ${restCount} rest days • ${totalDays} day plan`;
  }

  if (program.schedule.type === 'weekly' && program.schedule.weekly) {
    const weekly = program.schedule.weekly;
    const days: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    let workoutCount = 0;

    days.forEach(day => {
      const workoutId = weekly[day];
      if (workoutId) {
        const workout = program.workouts.find(w => w.id === workoutId);
        if (workout && workout.exercises.length > 0) {
          workoutCount++;
        }
      }
    });

    const restCount = 7 - workoutCount;
    return `${workoutCount} workouts • ${restCount} rest days • 7 day plan`;
  }

  // Fallback
  return `${program.workouts.length} workouts • ${program.metadata?.daysPerWeek || 3} days/week`;
};

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

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    backgroundColor: colors.primary.bg,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing['2xl'],
  },
  outerCardContent: {
    gap: spacing.lg,
  },
  scheduleCardContent: {
    gap: spacing.lg,
  },
  planCards: {
    gap: spacing.md,
  },
  planCreateButtonWrapper: {
    width: '100%',
  },
  planCardContent: {
    gap: spacing.xs,
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
  planActionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  planActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
    backgroundColor: 'transparent',
  },
  planActionIconWrapper: {
    width: sizing.iconXL,
    height: sizing.iconXL,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  planExpandedContent: {
    gap: spacing.md,
  },
  planActionIconWarning: {
    borderColor: colors.accent.warning,
  },
  planActionIconSecondary: {
    borderColor: colors.border.medium,
  },
  planActionLabel: {
    textAlign: 'center',
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleSubCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.cardSoft,
  },
  scheduleRows: {
    gap: spacing.sm,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleDayLabel: {
    flexShrink: 0,
  },
  schedulePlanLabel: {
    flex: 1,
    textAlign: 'right',
  },
  scheduleEmptyText: {
    textAlign: 'left',
  },
  scheduleButtonWrapper: {
    width: '100%',
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent.orangeLight,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
  },
  dialogContent: {
    gap: spacing.xs,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  dialogActionButton: {
    flex: 1,
  },
  dialogCancelButton: {
    borderColor: colors.accent.gradientStart,
  },
  dialogCardPressable: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  browseCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
});

const PlansScreen: React.FC = () => {
  const router = useRouter();
  const plans = usePlansStore((state: PlansState) => state.plans);
  const removePlan = usePlansStore((state: PlansState) => state.removePlan);
  const schedules = useSchedulesStore((state: SchedulesState) => state.schedules);
  const updateSchedule = useSchedulesStore((state: SchedulesState) => state.updateSchedule);
  const { userPrograms, deleteUserProgram, deleteWorkoutFromProgram, activePlanId } = useProgramsStore();
  const startSession = useSessionStore((state) => state.startSession);
  const setCompletionOverlayVisible = useSessionStore((state) => state.setCompletionOverlayVisible);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [isDeleteDialogVisible, setIsDeleteDialogVisible] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  const handleAddPlanPress = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/(tabs)/add-workout?mode=plan');
  }, [router]);

  const handleAddWorkoutPress = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/(tabs)/add-workout?mode=workout');
  }, [router]);


  const handleBrowseProgramsPress = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/(tabs)/browse-programs');
  }, [router]);

  const handleProgramPress = useCallback((program: any) => {
    void Haptics.selectionAsync();
    setExpandedPlanId((prev) => (prev === program.id ? null : program.id));
  }, []);

  const handleEditProgram = useCallback((program: any) => {
    void Haptics.selectionAsync();
    setExpandedPlanId(null);
    router.push({ pathname: '/(tabs)/edit-plan', params: { planId: program.id } });
  }, [router]);

  const executeDelete = useCallback(async (item: any) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    if (item.type === 'program') {
      // Check if it's a program deletion (from My Plans) or a workout deletion (from My Workouts)
      if (item.workouts) {
        // It's a full program being deleted
        await deleteUserProgram(item.id);
      } else {
        // It's a workout being deleted from a program
        await deleteWorkoutFromProgram(item.programId, item.id);

        // FIX: Also delete the custom workout if it exists with the same name.
        // This prevents the "shadowing" issue where deleting a program workout
        // reveals an older custom workout of the same name.
        const customPlan = plans.find(p => p.name === item.name);
        if (customPlan) {
          removePlan(customPlan.id);
        }

        // Check if the program is now empty and remove it if so
        const updatedPrograms = useProgramsStore.getState().userPrograms;
        const program = updatedPrograms.find(p => p.id === item.programId);
        if (program && program.workouts.length === 0) {
          await deleteUserProgram(item.programId);
        }
      }
    } else {
      schedules.forEach((schedule: Schedule) => {
        const nextWeekdays = { ...schedule.weekdays };
        let didUpdate = false;

        (Object.keys(nextWeekdays) as (keyof Schedule['weekdays'])[]).forEach((day) => {
          if (nextWeekdays[day] === item.id) {
            nextWeekdays[day] = null;
            didUpdate = true;
          }
        });

        if (didUpdate) {
          void updateSchedule({ ...schedule, weekdays: nextWeekdays });
        }
      });

      void removePlan(item.id);
    }

    setExpandedPlanId((prev) => (prev === item.id ? null : prev));
  }, [removePlan, schedules, updateSchedule, deleteWorkoutFromProgram, deleteUserProgram, plans]);

  const handleDeleteProgram = useCallback((program: any) => {
    void Haptics.selectionAsync();
    Alert.alert(
      'Delete Plan',
      `Are you sure you want to delete "${program.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => executeDelete({ ...program, type: 'program' })
        }
      ]
    );
  }, [executeDelete]);

  const handlePlanPress = useCallback(
    (planId: string) => {
      void Haptics.selectionAsync();
      setExpandedPlanId((prev) => (prev === planId ? null : planId));
    },
    [],
  );

  const handleDeleteWorkoutItem = useCallback(
    (item: any) => {
      void Haptics.selectionAsync();
      setItemToDelete(item);
      setIsDeleteDialogVisible(true);
    },
    [],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;
    await executeDelete(itemToDelete);
    setIsDeleteDialogVisible(false);
    setItemToDelete(null);
  }, [executeDelete, itemToDelete]);

  const handleDismissDeleteDialog = useCallback(() => {
    setIsDeleteDialogVisible(false);
    setItemToDelete(null);
  }, []);


  const handleEditWorkoutItem = useCallback(
    (item: any) => {
      void Haptics.selectionAsync();
      setExpandedPlanId(null);

      if (item.type === 'program') {
        const compositeId = encodeURIComponent(`program:${item.programId}:${item.id}`);
        router.push(`/(tabs)/create-workout?planId=${compositeId}&premadeWorkoutId=`);
      } else {
        router.push(`/(tabs)/create-workout?planId=${encodeURIComponent(item.id)}&premadeWorkoutId=`);
      }
    },
    [router],
  );

  const handleEditSchedulePress = useCallback(() => {
    void Haptics.selectionAsync();

    // If there's an active plan, go to edit-plan to edit the schedule
    // This works for both weekly and rotation schedules
    if (activePlanId) {
      router.push({ pathname: '/(tabs)/edit-plan', params: { planId: activePlanId } });
    } else {
      // Fall back to the legacy schedule editor for standalone weekly schedules
      router.push('/(tabs)/schedule-editor');
    }
  }, [router, activePlanId]);


  const activeSchedule = schedules[0] ?? null;

  const planNameLookup = useMemo(() => {
    return plans.reduce<Record<string, string>>((acc, plan) => {
      acc[plan.id] = plan.name;
      return acc;
    }, {});
  }, [plans]);

  const myWorkouts = useMemo(() => {
    // Build a set of workout names that are in programs (for deduplication)
    const programWorkoutNames = new Set<string>();
    userPrograms.forEach(prog => {
      prog.workouts.forEach(w => {
        // Only track non-rest-day workouts
        if (w.exercises.length > 0) {
          programWorkoutNames.add(w.name);
        }
      });
    });

    // Custom workouts - exclude if they're already in a program (by name)
    // This prevents duplicates when a workout exists both standalone AND in a plan
    const customWorkouts = plans
      .filter(p => !programWorkoutNames.has(p.name))
      .map(p => ({
        ...p,
        type: 'custom' as const,
        uniqueId: p.id,
        subtitle: p.exercises.length === 1 ? '1 exercise' : `${p.exercises.length} exercises`
      }));

    // Program workouts - filter out rest days (workouts with 0 exercises)
    const programWorkouts = userPrograms.flatMap(prog =>
      prog.workouts
        .filter(w => w.exercises.length > 0) // Filter out rest days
        .map(w => ({
          id: w.id,
          name: w.name,
          exercises: w.exercises,
          type: 'program' as const,
          programName: prog.name,
          programId: prog.id,
          uniqueId: `${prog.id}-${w.id}`,
          subtitle: `${prog.name} • ${w.exercises.length} exercises`
        }))
    );

    const allWorkouts = [...customWorkouts, ...programWorkouts];

    return allWorkouts.sort((a, b) => a.name.localeCompare(b.name));
  }, [plans, userPrograms]);

  const myPlans = useMemo(() => {
    return userPrograms;
  }, [userPrograms]);

  const handleStartWorkoutItem = useCallback((item: any) => {
    void Haptics.selectionAsync();
    setCompletionOverlayVisible(false);

    const workoutExercises: WorkoutExercise[] = item.exercises.map((exercise: any) => ({
      name: exercise.name,
      sets: createDefaultSetsForExercise(exercise.name),
    }));

    // Use program ID if it's a program workout, otherwise the plan ID
    const planId = item.type === 'program' ? item.programId : item.id;

    startSession(planId, workoutExercises);
    setExpandedPlanId(null);
    router.push('/(tabs)/workout');
  }, [router, startSession, setCompletionOverlayVisible]);

  return (
    <TabSwipeContainer contentContainerStyle={styles.contentContainer}>
      <ScreenHeader title="My Programs" subtitle="Create and manage your workout plans." />

      <SurfaceCard padding="xl" tone="neutral" style={{ marginTop: -spacing.md }}>
        <View style={styles.outerCardContent}>
          <Text variant="heading3" color="primary">
            My Workouts
          </Text>

          <View style={styles.planCards}>
            {myWorkouts.length > 0 ? (
              myWorkouts.map((item) => (
                <Pressable
                  key={item.uniqueId}
                  style={styles.planCardShell}
                  onPress={() => handlePlanPress(item.uniqueId)}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${item.name}`}
                >
                  {expandedPlanId === item.uniqueId ? (
                    <View style={styles.planExpandedContent}>
                      <View style={styles.planCardHeader}>
                        <Text variant="bodySemibold" color="primary">
                          {item.name}
                        </Text>
                      </View>
                      <View style={styles.planActionGrid}>
                        <Pressable
                          style={styles.planActionButton}
                          onPress={(event) => {
                            event.stopPropagation();
                            handleStartWorkoutItem(item);
                          }}
                        >
                          <View style={styles.planActionIconWrapper}>
                            <IconSymbol name="play-arrow" color={colors.accent.primary} size={sizing.iconMD} />
                          </View>
                          <Text variant="caption" color="primary" style={styles.planActionLabel}>Start</Text>
                        </Pressable>
                        <Pressable
                          style={styles.planActionButton}
                          onPress={(event) => {
                            event.stopPropagation();
                            handleEditWorkoutItem(item);
                          }}
                        >
                          <View style={styles.planActionIconWrapper}>
                            <IconSymbol name="edit" color={colors.accent.primary} size={sizing.iconMD} />
                          </View>
                          <Text variant="caption" color="primary" style={styles.planActionLabel}>Edit</Text>
                        </Pressable>
                        <Pressable
                          style={styles.planActionButton}
                          onPress={(event) => {
                            event.stopPropagation();
                            handleDeleteWorkoutItem(item);
                          }}
                        >
                          <View style={[styles.planActionIconWrapper, { borderColor: colors.accent.orange }]}>
                            <IconSymbol name="delete" color={colors.accent.orange} size={sizing.iconMD} />
                          </View>
                          <Text variant="caption" color="primary" style={styles.planActionLabel}>Delete</Text>
                        </Pressable>
                        <Pressable
                          style={styles.planActionButton}
                          onPress={(event) => {
                            event.stopPropagation();
                            setExpandedPlanId(null);
                          }}
                        >
                          <View style={[styles.planActionIconWrapper, { borderColor: colors.accent.orange }]}>
                            <IconSymbol name="arrow-back" color={colors.accent.orange} size={sizing.iconMD} />
                          </View>
                          <Text variant="caption" color="primary" style={styles.planActionLabel}>Back</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.planCardContent}>
                      <View style={styles.planCardHeader}>
                        <Text variant="bodySemibold" color="primary">
                          {item.name}
                        </Text>
                      </View>
                      <Text variant="labelMedium" color="secondary">
                        {item.subtitle}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))
            ) : (
              <View style={[styles.planCardShell, styles.planCardContent]}>
                <Text variant="bodySemibold" color="primary">
                  No workouts yet
                </Text>
                <Text variant="body" color="secondary">
                  Create a custom plan or add a program to see workouts here.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.planCreateButtonWrapper}>
            <Button label="Add Workout" onPress={handleAddWorkoutPress} size="md" />
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard padding="xl" tone="neutral">
        <View style={styles.outerCardContent}>
          <Text variant="heading3" color="primary">
            My Plans
          </Text>

          <View style={styles.planCards}>
            {myPlans.length > 0 ? (
              myPlans.map((program) => (
                <Pressable
                  key={program.id}
                  style={styles.planCardShell}
                  onPress={() => handleProgramPress(program)}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${program.name}`}
                >
                  {expandedPlanId === program.id ? (
                    <View style={styles.planExpandedContent}>
                      <View style={styles.planCardHeader}>
                        <Text variant="bodySemibold" color="primary">
                          {program.name}
                        </Text>
                      </View>
                      <View style={styles.planActionGrid}>
                        <Pressable
                          style={styles.planActionButton}
                          onPress={(event) => {
                            event.stopPropagation();
                            handleEditProgram(program);
                          }}
                        >
                          <View style={styles.planActionIconWrapper}>
                            <IconSymbol name="edit" color={colors.accent.primary} size={sizing.iconMD} />
                          </View>
                          <Text variant="caption" color="primary" style={styles.planActionLabel}>Edit</Text>
                        </Pressable>
                        <Pressable
                          style={styles.planActionButton}
                          onPress={(event) => {
                            event.stopPropagation();
                            handleDeleteProgram(program);
                          }}
                        >
                          <View style={[styles.planActionIconWrapper, { borderColor: colors.accent.orange }]}>
                            <IconSymbol name="delete" color={colors.accent.orange} size={sizing.iconMD} />
                          </View>
                          <Text variant="caption" color="primary" style={styles.planActionLabel}>Delete</Text>
                        </Pressable>
                        <Pressable
                          style={styles.planActionButton}
                          onPress={(event) => {
                            event.stopPropagation();
                            setExpandedPlanId(null);
                          }}
                        >
                          <View style={[styles.planActionIconWrapper, { borderColor: colors.accent.orange }]}>
                            <IconSymbol name="arrow-back" color={colors.accent.orange} size={sizing.iconMD} />
                          </View>
                          <Text variant="caption" color="primary" style={styles.planActionLabel}>Back</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.planCardContent}>
                      <View style={styles.planCardHeader}>
                        <Text variant="bodySemibold" color="primary">
                          {program.name}
                        </Text>
                      </View>
                      <Text variant="labelMedium" color="secondary">
                        {getPlanSummary(program)}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))
            ) : (
              <View style={[styles.planCardShell, styles.planCardContent]}>
                <Text variant="bodySemibold" color="primary">
                  No programs yet
                </Text>
                <Text variant="body" color="secondary">
                  Add a program from the library to see it here.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.planCreateButtonWrapper}>
            <Button label="Add Plan" onPress={handleAddPlanPress} size="md" />
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard padding="xl" tone="neutral">
        <View style={styles.scheduleCardContent}>
          <Text variant="heading3" color="primary">
            My Schedule
          </Text>

          <View style={styles.scheduleSubCard}>
            {(() => {
              // Find active plan directly from userPrograms to ensure reactivity
              const activePlan = activePlanId ? userPrograms.find(p => p.id === activePlanId) : null;

              // Show active plan schedule if available
              if (activePlan && activePlan.schedule) {
                const schedule = activePlan.schedule;

                if (schedule.type === 'weekly' && schedule.weekly) {
                  // Weekly schedule view
                  const weekdays: { key: Weekday; label: string }[] = [
                    { key: 'monday', label: 'Monday' },
                    { key: 'tuesday', label: 'Tuesday' },
                    { key: 'wednesday', label: 'Wednesday' },
                    { key: 'thursday', label: 'Thursday' },
                    { key: 'friday', label: 'Friday' },
                    { key: 'saturday', label: 'Saturday' },
                    { key: 'sunday', label: 'Sunday' },
                  ];

                  return (
                    <View style={styles.scheduleRows}>
                      <View style={styles.scheduleRow}>
                        <Text variant="caption" color="secondary">
                          Active Plan: {activePlan.name}
                        </Text>
                      </View>
                      {weekdays.map(({ key, label }) => {
                        const workoutId = schedule.weekly![key];
                        const workout = workoutId
                          ? activePlan.workouts.find(w => w.id === workoutId)
                          : null;

                        return (
                          <View key={key} style={styles.scheduleRow}>
                            <Text variant="bodySemibold" color="primary" style={styles.scheduleDayLabel}>
                              {label}
                            </Text>
                            <Text variant="body" color="secondary" style={styles.schedulePlanLabel}>
                              {workout?.name ?? 'Rest Day'}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  );
                }

                if (schedule.type === 'rotation' && schedule.rotation) {
                  // Rotation schedule view
                  let currentIndex = schedule.currentRotationIndex || 0;
                  let isBeforeStart = false;

                  if (schedule.rotation.startDate) {
                    const now = new Date();
                    const start = new Date(schedule.rotation.startDate);
                    now.setHours(0, 0, 0, 0);
                    start.setHours(0, 0, 0, 0);
                    const diffTime = now.getTime() - start.getTime();
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays < 0) {
                      // Start date is in the future
                      isBeforeStart = true;
                    } else {
                      // Calculate which day of the rotation we're on
                      currentIndex = diffDays % schedule.rotation.workoutOrder.length;
                    }
                  }

                  if (isBeforeStart) {
                    const startDate = new Date(schedule.rotation.startDate!);
                    const formattedDate = startDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    return (
                      <View style={styles.scheduleRows}>
                        <View style={styles.scheduleRow}>
                          <Text variant="caption" color="secondary">
                            Active Plan: {activePlan.name} (Rotation)
                          </Text>
                        </View>
                        <View style={[styles.scheduleRow, { marginTop: spacing.sm }]}>
                          <Text variant="bodySemibold" color="primary">
                            Rest Day
                          </Text>
                        </View>
                        <View style={styles.scheduleRow}>
                          <Text variant="body" color="tertiary">
                            Plan starts on {formattedDate}
                          </Text>
                        </View>
                      </View>
                    );
                  }

                  const totalWorkouts = schedule.rotation.workoutOrder.length;
                  const currentWorkoutId = schedule.rotation.workoutOrder[currentIndex];
                  const currentWorkout = activePlan.workouts.find(w => w.id === currentWorkoutId);

                  // Calculate the date for today's workout
                  let workoutDateLabel = 'Today';
                  if (schedule.rotation.startDate) {
                    // Get the actual number of days elapsed since start
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const startDate = new Date(schedule.rotation.startDate);
                    startDate.setHours(0, 0, 0, 0);
                    const diffDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

                    // The workout date is start date + diffDays
                    const workoutDate = new Date(startDate);
                    workoutDate.setDate(startDate.getDate() + diffDays);

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);

                    if (workoutDate.getTime() === today.getTime()) {
                      workoutDateLabel = 'Today';
                    } else if (workoutDate.getTime() === tomorrow.getTime()) {
                      workoutDateLabel = 'Tomorrow';
                    } else {
                      workoutDateLabel = workoutDate.toLocaleDateString('en-US', {
                        month: 'numeric',
                        day: 'numeric',
                      });
                    }
                  }

                  return (
                    <View style={styles.scheduleRows}>
                      <View style={styles.scheduleRow}>
                        <Text variant="caption" color="secondary">
                          Active Plan: {activePlan.name} (Rotation)
                        </Text>
                      </View>
                      <View style={[styles.scheduleRow, { marginTop: spacing.sm }]}>
                        <Text variant="bodySemibold" color="primary">
                          {currentWorkout?.exercises.length === 0 ? 'Rest Day' : 'Next Workout'}
                        </Text>
                        <Text variant="body" color="secondary" style={styles.schedulePlanLabel}>
                          {currentWorkout?.name ?? 'None'}
                        </Text>
                      </View>
                      <View style={styles.scheduleRow}>
                        <Text variant="body" color="tertiary">
                          {workoutDateLabel} • Day {currentIndex + 1} of {totalWorkouts}
                          {currentWorkout?.exercises.length === 0 && ' (Rest)'}
                        </Text>
                      </View>
                    </View>
                  );
                }
              }

              // Fallback to old schedule system
              if (activeSchedule) {
                return (
                  <View style={styles.scheduleRows}>
                    {WEEKDAY_LABELS.map(({ key, label }) => {
                      const assignedPlanId = activeSchedule.weekdays[key];
                      const assignedName = assignedPlanId ? planNameLookup[assignedPlanId] : null;

                      return (
                        <View key={key} style={styles.scheduleRow}>
                          <Text variant="bodySemibold" color="primary" style={styles.scheduleDayLabel}>
                            {label}
                          </Text>
                          <Text variant="body" color="secondary" style={styles.schedulePlanLabel}>
                            {assignedName ?? 'Rest Day'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              }

              // No schedule
              return (
                <Text variant="body" color="secondary" style={styles.scheduleEmptyText}>
                  No active plan. Set a plan as active from My Plans to see your schedule here.
                </Text>
              );
            })()}
          </View>

          <View style={styles.scheduleButtonWrapper}>
            <Button label="Edit Schedule" onPress={handleEditSchedulePress} size="md" />
          </View>
        </View>
      </SurfaceCard>

      <Modal
        transparent
        visible={isDeleteDialogVisible}
        onRequestClose={handleDismissDeleteDialog}
      >
        <Pressable style={styles.dialogOverlay} onPress={handleDismissDeleteDialog}>
          <Pressable
            style={styles.dialogCardPressable}
            onPress={(event) => event.stopPropagation()}
          >
            <SurfaceCard tone="neutral" padding="lg" showAccentStripe={false} style={styles.dialogCard}>
              <View style={styles.dialogContent}>
                <Text variant="heading3" color="primary">
                  Remove Workout
                </Text>
                <Text variant="body" color="secondary">
                  Are you sure you want to remove "{itemToDelete?.name}"?
                </Text>
              </View>
              <View style={styles.dialogActions}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={handleDismissDeleteDialog}
                  size="md"
                  textColor={colors.accent.orange}
                  style={[styles.dialogActionButton, styles.dialogCancelButton]}
                />
                <Button
                  label="Remove"
                  variant="primary"
                  onPress={handleConfirmDelete}
                  size="md"
                  style={styles.dialogActionButton}
                />
              </View>
            </SurfaceCard>
          </Pressable>
        </Pressable>
      </Modal>
    </TabSwipeContainer>
  );
};

export default PlansScreen;
