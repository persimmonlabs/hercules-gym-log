import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View, ScrollView, Platform, BackHandler, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useScrollToTop, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '@/utils/haptics';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming, type AnimatedStyle } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { ScreenHeader } from '@/components/molecules/ScreenHeader';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { Button } from '@/components/atoms/Button';
import { MyScheduleCard } from '@/components/molecules/MyScheduleCard';
import { AddOverrideModal } from '@/components/molecules/AddOverrideModal';
import { colors, radius, shadows, sizing, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { usePlansStore, type Plan, type PlansState } from '@/store/plansStore';
import { useProgramsStore } from '@/store/programsStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSessionStore } from '@/store/sessionStore';
import { ProgramCard } from '@/components/molecules/ProgramCard';
import { WorkoutInProgressModal } from '@/components/molecules/WorkoutInProgressModal';
import type { WorkoutExercise } from '@/types/workout';
import { createSetsWithHistory } from '@/utils/workout';
import { useWorkoutSessionsStore, type WorkoutSessionsState } from '@/store/workoutSessionsStore';
import { useActiveScheduleStore } from '@/store/activeScheduleStore';
import type { UserProgram, Weekday, WeeklyScheduleConfig } from '@/types/premadePlan';
import { usePlanBuilderContext } from '@/providers/PlanBuilderProvider';

const getPlanSummary = (program: UserProgram) => {
  // If no schedule, fallback to basic count
  if (!program.schedule) {
    return `${program.workouts.length} workouts`;
  }

  if (program.schedule.type === 'rotation' && program.schedule.rotation) {
    const order = program.schedule.rotation.workoutOrder;
    let workoutCount = 0;

    order.forEach(id => {
      const workout = program.workouts.find(w => w.id === id);
      if (workout && workout.exercises.length > 0) {
        workoutCount++;
      }
    });

    return `${workoutCount} workouts`;
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

    return `${workoutCount} workouts`;
  }

  // Fallback
  return `${program.workouts.length} workouts`;
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
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing['2xl'],
  },
  outerCardContent: {
    gap: spacing.md,
  },
  sectionHeader: {
    width: '100%',
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  scheduleCardContent: {
    gap: spacing.lg,
  },
  planCards: {
    gap: spacing.md,
  },
  planCreateButtonWrapper: {
    width: '100%',
    marginTop: spacing.md,
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
    flex: 1,
  },
  planCardHeaderText: {
    flex: 1,
    minWidth: 200,
    minHeight: 24,
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
  const { theme } = useTheme();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  useScrollToTop(scrollRef);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // Handle Android hardware back button - navigate to Dashboard
  useEffect(() => {
    const backAction = () => {
      router.replace('/(tabs)');
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [router]);

  const [workoutInProgressVisible, setWorkoutInProgressVisible] = useState<boolean>(false);
  const plans = usePlansStore((state: PlansState) => state.plans);
  const removePlan = usePlansStore((state: PlansState) => state.removePlan);
  const { userPrograms, deleteUserProgram, deleteWorkoutFromProgram, activePlanId } = useProgramsStore();
  const startSession = useSessionStore((state) => state.startSession);
  const setCompletionOverlayVisible = useSessionStore((state) => state.setCompletionOverlayVisible);
  const isSessionActive = useSessionStore((state) => state.isSessionActive);
  const currentSession = useSessionStore((state) => state.currentSession);
  const clearSession = useSessionStore((state) => state.clearSession);
  const allWorkouts = useWorkoutSessionsStore((state: WorkoutSessionsState) => state.workouts);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [isDeleteDialogVisible, setIsDeleteDialogVisible] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [isOverrideModalVisible, setIsOverrideModalVisible] = useState<boolean>(false);
  const setActiveRule = useActiveScheduleStore((state: any) => state.setActiveRule);
  const activeScheduleRule = useActiveScheduleStore((state: any) => state.state.activeRule);
  const { setEditingPlanId } = usePlanBuilderContext();

  const handleDeleteSchedule = useCallback(async () => {
    triggerHaptic('warning');
    await setActiveRule(null);
  }, [setActiveRule]);

  const handleAddPlanPress = useCallback(() => {
    triggerHaptic('selection');
    router.push('/(tabs)/add-workout?mode=plan');
  }, [router]);

  const handleAddWorkoutPress = useCallback(() => {
    triggerHaptic('selection');
    router.push('/(tabs)/add-workout?mode=workout');
  }, [router]);


  const handleBrowseProgramsPress = useCallback(() => {
    triggerHaptic('selection');
    router.push('/(tabs)/browse-programs');
  }, [router]);

  const handleProgramPress = useCallback((program: any) => {
    triggerHaptic('selection');
    setExpandedPlanId((prev) => (prev === program.id ? null : program.id));
  }, []);

  const handleEditProgram = useCallback((program: any) => {
    triggerHaptic('selection');
    setExpandedPlanId(null);
    router.push({ pathname: '/(tabs)/edit-plan', params: { planId: program.id } });
  }, [router]);

  const executeDelete = useCallback(async (item: any) => {
    triggerHaptic('warning');

    if (item.type === 'program') {
      // Check if it's a program deletion (from My Plans) or a workout deletion (from My Workouts)
      if (item.workouts) {
        // It's a full program being deleted from My Plans
        // Just delete the program - workouts remain in My Workouts via plansStore
        await deleteUserProgram(item.id);

        // Only clear schedule if it's plan-driven and references this specific plan
        // Don't clear Weekly schedules just because a program is deleted
        if (activeScheduleRule?.type === 'plan-driven' && activeScheduleRule?.planId === item.id) {
          console.log('[plans] Clearing plan-driven schedule because associated plan was deleted');
          await setActiveRule(null);
        } else if (activePlanId === item.id) {
          // Clear programsStore active plan reference, but NOT the activeScheduleStore schedule
          console.log('[plans] Program was active plan, but not clearing schedule (type:', activeScheduleRule?.type || 'none', ')');
        }
      } else {
        // It's a workout being deleted from My Workouts
        // Need to remove from the program AND remove the standalone template
        await deleteWorkoutFromProgram(item.programId, item.id);

        // Also delete the custom workout template if it exists with the same name
        const customPlan = plans.find(p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase());
        if (customPlan) {
          await removePlan(customPlan.id);
        }

        // Also remove from ALL other programs that have this workout (by name)
        const workoutName = item.name.trim().toLowerCase();
        for (const prog of userPrograms) {
          if (prog.id === item.programId) continue; // Already handled above
          const matchingWorkout = prog.workouts.find(
            w => w.name.trim().toLowerCase() === workoutName
          );
          if (matchingWorkout) {
            await deleteWorkoutFromProgram(prog.id, matchingWorkout.id);
          }
        }
      }
    } else {
      // Deleting a standalone custom workout from My Workouts
      await removePlan(item.id);

      // Also remove from ALL programs that have a workout with this name
      const workoutName = item.name.trim().toLowerCase();
      for (const prog of userPrograms) {
        const matchingWorkout = prog.workouts.find(
          w => w.name.trim().toLowerCase() === workoutName
        );
        if (matchingWorkout) {
          await deleteWorkoutFromProgram(prog.id, matchingWorkout.id);
        }
      }
    }

    setExpandedPlanId((prev) => (prev === item.id ? null : prev));
  }, [removePlan, deleteWorkoutFromProgram, deleteUserProgram, plans, userPrograms, activePlanId, setActiveRule, activeScheduleRule]);

  const handleDeleteProgram = useCallback((program: any) => {
    triggerHaptic('selection');
    // Mark as program so we can distinguish in the modal
    setItemToDelete({ ...program, type: 'program_deletion' });
    setIsDeleteDialogVisible(true);
  }, []);

  const handlePlanPress = useCallback(
    (planId: string) => {
      triggerHaptic('selection');
      setExpandedPlanId((prev) => (prev === planId ? null : planId));
    },
    [],
  );

  const handleDeleteWorkoutItem = useCallback(
    (item: any) => {
      triggerHaptic('selection');
      setItemToDelete(item);
      setIsDeleteDialogVisible(true);
    },
    [],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;

    // If it was marked as a full program deletion (from My Plans)
    if (itemToDelete.type === 'program_deletion') {
      await executeDelete({ ...itemToDelete, type: 'program' });
    } else {
      await executeDelete(itemToDelete);
    }

    setIsDeleteDialogVisible(false);
    setItemToDelete(null);
  }, [executeDelete, itemToDelete]);

  const handleDismissDeleteDialog = useCallback(() => {
    setIsDeleteDialogVisible(false);
    setItemToDelete(null);
  }, []);


  const handleEditWorkoutItem = useCallback(
    (item: any) => {
      triggerHaptic('selection');
      setExpandedPlanId(null);

      const rawPlanId = item.type === 'program'
        ? `program:${item.programId || (item.programIds && item.programIds[0])}:${item.id}`
        : item.id;

      const encodedPlanId = encodeURIComponent(rawPlanId);
      const returnTo = encodeURIComponent('/(tabs)/plans');

      // Trigger immediate loading for the destination screen with the RAW ID
      setEditingPlanId(rawPlanId);

      router.push(`/(tabs)/create-workout?planId=${encodedPlanId}&returnTo=${returnTo}`);
    },
    [router, setEditingPlanId],
  );


  const myWorkouts = useMemo(() => {
    interface GroupedWorkout {
      id: string;
      name: string;
      exercises: any[];
      type: 'custom' | 'program';
      source?: 'premade' | 'custom' | 'library' | 'recommended';
      programNames: string[];
      programIds: string[];
      programId?: string;
      uniqueId: string;
      subtitle?: string;
    }

    const workoutsGroupedByName: Record<string, GroupedWorkout> = {};

    // 1. Collect all standalone templates
    plans.forEach(plan => {
      const nameKey = plan.name.trim().toLowerCase();
      if (!workoutsGroupedByName[nameKey]) {
        workoutsGroupedByName[nameKey] = {
          id: plan.id,
          name: plan.name,
          exercises: plan.exercises,
          type: 'custom',
          source: plan.source || 'custom',
          programNames: [],
          programIds: [],
          uniqueId: `template-${plan.id}`,
        };
      }
    });

    // 2. Collect all plan-specific workouts
    userPrograms.forEach(prog => {
      prog.workouts.forEach(w => {
        if (w.exercises.length === 0) return;

        const nameKey = w.name.trim().toLowerCase();
        if (!workoutsGroupedByName[nameKey]) {
          workoutsGroupedByName[nameKey] = {
            id: w.id,
            name: w.name,
            exercises: w.exercises,
            type: 'program',
            programNames: [prog.name],
            programIds: [prog.id],
            programId: prog.id,
            uniqueId: `group-${nameKey}`,
          };
        } else {
          if (!workoutsGroupedByName[nameKey].programNames.includes(prog.name)) {
            workoutsGroupedByName[nameKey].programNames.push(prog.name);
            workoutsGroupedByName[nameKey].programIds.push(prog.id);
          }

          // Always use the exercises from the program workout as it's more likely to be the one edited
          // also update type/id/programId to point to this program version
          workoutsGroupedByName[nameKey].exercises = w.exercises;
          workoutsGroupedByName[nameKey].type = 'program';
          workoutsGroupedByName[nameKey].id = w.id;
          workoutsGroupedByName[nameKey].programId = prog.id;
        }
      });
    });

    return Object.values(workoutsGroupedByName)
      .map((w): GroupedWorkout => ({
        ...w,
        // Simplified subtitles: just show exercise count, or plan name + exercise count
        subtitle: w.programNames.length > 0
          ? `${w.programNames[0]} • ${w.exercises.length} ${w.exercises.length === 1 ? 'exercise' : 'exercises'}`
          : `${w.exercises.length} ${w.exercises.length === 1 ? 'exercise' : 'exercises'}`
      }))
      .sort((a, b) => {
        // Priority 1: Group by Plan (Custom considered as a plan group)
        const aPlanGroup = a.type === 'custom' ? 'Custom' : a.programNames[0] || '';
        const bPlanGroup = b.type === 'custom' ? 'Custom' : b.programNames[0] || '';

        const planComparison = aPlanGroup.localeCompare(bPlanGroup);
        if (planComparison !== 0) return planComparison;

        // Priority 2: Alphabetical within plan group
        return a.name.localeCompare(b.name);
      });
  }, [plans, userPrograms]);

  const myPlans = useMemo(() => {
    return userPrograms;
  }, [userPrograms]);

  const handleStartWorkoutItem = useCallback((item: any) => {
    triggerHaptic('selection');

    const doStartSession = () => {
      setCompletionOverlayVisible(false);

      const historySetCounts: Record<string, number> = {};
      const workoutExercises: WorkoutExercise[] = item.exercises.map((exercise: any) => {
        const { sets, historySetCount } = createSetsWithHistory(exercise.name, allWorkouts);
        historySetCounts[exercise.name] = historySetCount;
        return {
          name: exercise.name,
          sets,
        };
      });

      const planId = item.type === 'program' ? (item.programId || item.programIds?.[0]) : item.id;
      const sessionName = item.name;

      startSession(planId, workoutExercises, sessionName, historySetCounts);
      setExpandedPlanId(null);
      router.push('/(tabs)/workout');
    };

    if (isSessionActive && currentSession) {
      setWorkoutInProgressVisible(true);
      return;
    }

    doStartSession();
  }, [router, startSession, setCompletionOverlayVisible, allWorkouts, isSessionActive, currentSession, setWorkoutInProgressVisible, setExpandedPlanId]);


  return (
    <TabSwipeContainer ref={scrollRef} contentContainerStyle={styles.contentContainer}>
      <WorkoutInProgressModal
        visible={workoutInProgressVisible}
        sessionName={currentSession?.name ?? 'Current Workout'}
        elapsedMinutes={currentSession ? Math.floor((Date.now() - currentSession.startTime) / 60000) : 0}
        onResume={() => {
          setWorkoutInProgressVisible(false);
          setExpandedPlanId(null);
          router.push('/(tabs)/workout');
        }}
        onCancel={() => {
          setWorkoutInProgressVisible(false);
        }}
      />

      <ScreenHeader
        title="Programs"
        subtitle="Manage your workouts and training plans"
      />

      <View style={{ marginTop: -spacing.lg }}>
        <SurfaceCard padding="xl" tone="neutral" showAccentStripe={true} style={{ borderWidth: 0 }}>
          <View style={styles.outerCardContent}>
            <View style={styles.sectionHeader}>
              <Text variant="heading3" color="primary">
                My Workouts
              </Text>
            </View>

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
                          <Text variant="bodySemibold" color="primary" style={styles.planCardHeaderText}>
                            {item.name}
                          </Text>
                        </View>
                        <View style={[styles.planActionGrid, { marginTop: spacing.lg }]}>
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
                          <Text variant="bodySemibold" color="primary" style={styles.planCardHeaderText}>
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
      </View>

      <SurfaceCard padding="xl" tone="neutral" showAccentStripe={true} style={{ borderWidth: 0 }}>
        <View style={styles.outerCardContent}>
          <View style={styles.sectionHeader}>
            <Text variant="heading3" color="primary">
              My Plans
            </Text>
          </View>

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
                      <View style={[styles.planActionGrid, { marginTop: spacing.lg }]}>
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
                  No plans yet
                </Text>
                <Text variant="body" color="secondary">
                  Add a plan from the library to see it here.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.planCreateButtonWrapper}>
            <Button label="Add Plan" onPress={handleAddPlanPress} size="md" />
          </View>
        </View>
      </SurfaceCard>

      <MyScheduleCard
        onEditPress={() => {
          triggerHaptic('selection');
          router.push('/(tabs)/schedule-setup');
        }}
        onAddOverridePress={() => setIsOverrideModalVisible(true)}
        onDeletePress={handleDeleteSchedule}
      />

      <AddOverrideModal
        visible={isOverrideModalVisible}
        onClose={() => setIsOverrideModalVisible(false)}
      />

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
                  {itemToDelete?.type === 'program_deletion' ? 'Delete Plan' : 'Remove Workout'}
                </Text>
                <Text variant="body" color="secondary">
                  Are you sure you want to {itemToDelete?.type === 'program_deletion' ? 'delete' : 'remove'} "{itemToDelete?.name}"?
                  {(itemToDelete?.type === 'program_deletion' && itemToDelete?.id === activePlanId)
                    ? ' This will also start a new week and clear your current schedule.'
                    : ''}
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
                  label={itemToDelete?.type === 'program_deletion' ? 'Delete' : 'Remove'}
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
