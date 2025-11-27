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
import type { Schedule } from '@/types/schedule';
import type { PremadeProgram } from '@/types/premadePlan';

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
    gap: spacing.xl,
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
  const hydrateSchedules = useSchedulesStore((state: SchedulesState) => state.hydrateSchedules);
  const updateSchedule = useSchedulesStore((state: SchedulesState) => state.updateSchedule);
  const { userPrograms, deleteUserProgram, deleteWorkoutFromProgram } = useProgramsStore();
  const startSession = useSessionStore((state) => state.startSession);
  const setCompletionOverlayVisible = useSessionStore((state) => state.setCompletionOverlayVisible);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [pendingDeletePlan, setPendingDeletePlan] = useState<any | null>(null);

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

  const handleViewProgram = useCallback((program: any) => {
    void Haptics.selectionAsync();
    router.push({ pathname: '/program-details', params: { programId: program.id } });
  }, [router]);

  const handleDeleteProgram = useCallback((program: any) => {
    void Haptics.selectionAsync();
    setPendingDeletePlan({ ...program, type: 'program' });
  }, []);

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
      setPendingDeletePlan(item);
    },
    [],
  );

  const dismissDeleteDialog = useCallback(() => {
    setPendingDeletePlan(null);
  }, []);

  const confirmDeletePlan = useCallback(async () => {
    if (!pendingDeletePlan) {
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    if (pendingDeletePlan.type === 'program') {
      // Check if it's a program deletion (from My Plans) or a workout deletion (from My Workouts)
      if (pendingDeletePlan.workouts) {
        // It's a full program being deleted
        await deleteUserProgram(pendingDeletePlan.id);
      } else {
        // It's a workout being deleted from a program
        await deleteWorkoutFromProgram(pendingDeletePlan.programId, pendingDeletePlan.id);

        // Check if the program is now empty and remove it if so
        const updatedPrograms = useProgramsStore.getState().userPrograms;
        const program = updatedPrograms.find(p => p.id === pendingDeletePlan.programId);
        if (program && program.workouts.length === 0) {
          await deleteUserProgram(pendingDeletePlan.programId);
        }
      }
    } else {
      schedules.forEach((schedule: Schedule) => {
        const nextWeekdays = { ...schedule.weekdays };
        let didUpdate = false;

        (Object.keys(nextWeekdays) as (keyof Schedule['weekdays'])[]).forEach((day) => {
          if (nextWeekdays[day] === pendingDeletePlan.id) {
            nextWeekdays[day] = null;
            didUpdate = true;
          }
        });

        if (didUpdate) {
          void updateSchedule({ ...schedule, weekdays: nextWeekdays });
        }
      });

      void removePlan(pendingDeletePlan.id);
    }

    setExpandedPlanId((prev) => (prev === pendingDeletePlan.id ? null : prev));
    setPendingDeletePlan(null);
  }, [pendingDeletePlan, removePlan, schedules, updateSchedule, deleteWorkoutFromProgram, deleteUserProgram]);

  const createDefaultSetLogs = useCallback(() => {
    return Array.from({ length: 3 }, () => ({ reps: 8, weight: 0, completed: false }));
  }, []);

  const handleEditWorkoutItem = useCallback(
    (item: any) => {
      void Haptics.selectionAsync();
      setExpandedPlanId(null);

      if (item.type === 'program') {
        const compositeId = `program:${item.programId}:${item.id}`;
        router.push({ pathname: '/(tabs)/create-plan', params: { planId: compositeId } });
      } else {
        router.push({ pathname: '/(tabs)/create-plan', params: { planId: item.id } });
      }
    },
    [router],
  );

  const handleEditSchedulePress = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/schedule-editor');
  }, [router]);

  useEffect(() => {
    void hydrateSchedules();
  }, [hydrateSchedules]);

  const activeSchedule = schedules[0] ?? null;

  const planNameLookup = useMemo(() => {
    return plans.reduce<Record<string, string>>((acc, plan) => {
      acc[plan.id] = plan.name;
      return acc;
    }, {});
  }, [plans]);

  const myWorkouts = useMemo(() => {
    const customWorkouts = plans.map(p => ({
      ...p,
      type: 'custom' as const,
      uniqueId: p.id,
      subtitle: p.exercises.length === 1 ? '1 exercise' : `${p.exercises.length} exercises`
    }));

    const programWorkouts = userPrograms.flatMap(prog =>
      prog.workouts.map(w => ({
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

    return [...customWorkouts, ...programWorkouts].sort((a, b) => a.name.localeCompare(b.name));
  }, [plans, userPrograms]);

  const myPlans = useMemo(() => {
    return userPrograms;
  }, [userPrograms]);

  const handleStartWorkoutItem = useCallback((item: any) => {
    void Haptics.selectionAsync();
    setCompletionOverlayVisible(false);

    const workoutExercises: WorkoutExercise[] = item.exercises.map((exercise: any) => ({
      name: exercise.name,
      sets: createDefaultSetLogs(),
    }));

    // Use program ID if it's a program workout, otherwise the plan ID
    const planId = item.type === 'program' ? item.programId : item.id;

    startSession(planId, workoutExercises);
    setExpandedPlanId(null);
    router.push('/(tabs)/workout');
  }, [createDefaultSetLogs, router, startSession, setCompletionOverlayVisible]);

  return (
    <TabSwipeContainer contentContainerStyle={styles.contentContainer}>
      <ScreenHeader title="My Programs" subtitle="Create and manage your workout plans." />

      <SurfaceCard padding="xl" tone="neutral">
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
                            handleViewProgram(program);
                          }}
                        >
                          <View style={styles.planActionIconWrapper}>
                            <IconSymbol name="visibility" color={colors.accent.primary} size={sizing.iconMD} />
                          </View>
                          <Text variant="caption" color="primary" style={styles.planActionLabel}>View</Text>
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
                        {program.workouts.length} workouts • {program.metadata?.daysPerWeek || 3} days/week
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
            {activeSchedule ? (
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
            ) : (
              <Text variant="body" color="secondary" style={styles.scheduleEmptyText}>
                No schedule yet. Assign plans to your week to see them here.
              </Text>
            )}
          </View>

          <View style={styles.scheduleButtonWrapper}>
            <Button label="Edit Schedule" onPress={handleEditSchedulePress} size="md" />
          </View>
        </View>
      </SurfaceCard>
    </TabSwipeContainer>
  );
};

export default PlansScreen;
