import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { triggerHaptic } from '@/utils/haptics';

import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { AddOverrideModal } from '@/components/molecules/AddOverrideModal';
import { MyScheduleCard } from '@/components/molecules/MyScheduleCard';
import { ScreenHeader } from '@/components/molecules/ScreenHeader';
import { ProgramSubcardList } from '@/components/molecules/ProgramSubcardList';
import WorkoutSubcardList from '@/components/molecules/WorkoutSubcardList';
import { WorkoutInProgressModal } from '@/components/molecules/WorkoutInProgressModal';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { colors, radius, shadows, sizing, spacing } from '@/constants/theme';
import { useActiveScheduleStore } from '@/store/activeScheduleStore';
import { usePlanBuilderContext } from '@/providers/PlanBuilderProvider';
import { usePlansStore, type PlansState } from '@/store/plansStore';
import { useProgramsStore } from '@/store/programsStore';
import { useSessionStore } from '@/store/sessionStore';
import { useOutdoorSessionStore } from '@/store/outdoorSessionStore';
import { useWorkoutSessionsStore, type WorkoutSessionsState } from '@/store/workoutSessionsStore';
import type { WorkoutExercise, SetLog } from '@/types/workout';
import { createSetsWithSmartSuggestions } from '@/utils/workout';
import { useSettingsStore } from '@/store/settingsStore';
import { useCustomExerciseStore } from '@/store/customExerciseStore';

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
  },
  innerContainer: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing['2xl'],
  },
  sectionHeader: {
    width: '100%',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
    marginBottom: spacing.md,
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
    borderColor: colors.border.light,
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
  const { scrollTo } = useLocalSearchParams<{ scrollTo?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const scheduleCardRef = useRef<View>(null);
  const plansCardRef = useRef<View>(null);
  useScrollToTop(scrollRef);

  useFocusEffect(
    useCallback(() => {
      if (scrollTo === 'schedule') {
        scheduleCardRef.current?.measureLayout(
          scrollRef.current as any,
          (_x, y) => {
            scrollRef.current?.scrollTo({ y, animated: false });
          },
          () => {}
        );
      } else if (scrollTo === 'plans') {
        plansCardRef.current?.measureLayout(
          scrollRef.current as any,
          (_x, y) => {
            scrollRef.current?.scrollTo({ y: Math.max(0, y - 100), animated: false });
          },
          () => {}
        );
      } else {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }
    }, [scrollTo])
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
  const allWorkouts = useWorkoutSessionsStore((state: WorkoutSessionsState) => state.workouts);
  const customExercises = useCustomExerciseStore((state) => state.customExercises);
  const outdoorSessionStatus = useOutdoorSessionStore((state) => state.status);
  const outdoorExerciseName = useOutdoorSessionStore((state) => state.exerciseName);
  const isOutdoorSessionActive = outdoorSessionStatus === 'active' || outdoorSessionStatus === 'paused';
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [isDeleteDialogVisible, setIsDeleteDialogVisible] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [isOverrideModalVisible, setIsOverrideModalVisible] = useState<boolean>(false);
  const [showAllWorkouts, setShowAllWorkouts] = useState<boolean>(false);
  const [showAllPlans, setShowAllPlans] = useState<boolean>(false);
  const setActiveRule = useActiveScheduleStore((state: any) => state.setActiveRule);
  const activeScheduleRule = useActiveScheduleStore((state: any) => state.state.activeRule);
  const { setEditingPlanId } = usePlanBuilderContext();

  const handleDeleteSchedule = useCallback(async () => {
    triggerHaptic('warning');
    await setActiveRule(null);
  }, [setActiveRule]);

  const handleAddPlanPress = useCallback(() => {
    triggerHaptic('selection');
    router.push('/(tabs)/browse-programs');
  }, [router]);

  const handleCreatePlanPress = useCallback(() => {
    triggerHaptic('selection');
    router.push('/(tabs)/create-program');
  }, [router]);

  const handleAddWorkoutPress = useCallback(() => {
    triggerHaptic('selection');
    router.push('/(tabs)/browse-programs?mode=workout');
  }, [router]);

  const handleCreateWorkoutPress = useCallback(() => {
    triggerHaptic('selection');
    router.push('/(tabs)/create-workout');
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

  const smartSuggestionsEnabled = useSettingsStore((state) => state.smartSuggestionsEnabled);

  const handleStartWorkoutItem = useCallback((item: any) => {
    triggerHaptic('selection');

    if (isOutdoorSessionActive) {
      router.push({ pathname: '/outdoor-session', params: { exercise: outdoorExerciseName ?? '' } });
      return;
    }

    const doStartSession = () => {
      setCompletionOverlayVisible(false);

      const historySetCounts: Record<string, number> = {};
      const suggestedSetsMap: Record<string, SetLog[]> = {};
      const workoutExercises: WorkoutExercise[] = item.exercises.map((exercise: any) => {
        const result = createSetsWithSmartSuggestions(exercise.name, allWorkouts, smartSuggestionsEnabled, undefined, undefined, customExercises);
        historySetCounts[exercise.name] = result.historySetCount;
        if (result.smartSuggestedSets.length > 0) {
          suggestedSetsMap[exercise.name] = result.smartSuggestedSets;
        }
        return {
          name: exercise.name,
          sets: result.sets,
        };
      });

      const planId = item.type === 'program' ? (item.programId || item.programIds?.[0]) : item.id;
      const sessionName = item.name;

      startSession(planId, workoutExercises, sessionName, historySetCounts, suggestedSetsMap);
      setExpandedPlanId(null);
      router.push('/(tabs)/workout');
    };

    if (isSessionActive && currentSession) {
      setWorkoutInProgressVisible(true);
      return;
    }

    doStartSession();
  }, [router, startSession, setCompletionOverlayVisible, allWorkouts, isSessionActive, currentSession, setWorkoutInProgressVisible, setExpandedPlanId, isOutdoorSessionActive, outdoorExerciseName]);


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

      <View style={styles.innerContainer}>
      <ScreenHeader
        title="Programs"
        subtitle="Manage your workouts and training plans"
      />

      {/* My Workouts Section with Carousel */}
      <View style={{ marginTop: -spacing.md }}>
        <SurfaceCard tone="card" padding="xl" showAccentStripe={true} style={{ borderWidth: 0 }}>
          <WorkoutSubcardList
              workouts={myWorkouts}
              onWorkoutPress={(workout) => handlePlanPress(workout.uniqueId || workout.id)}
              onAddWorkoutPress={handleAddWorkoutPress}
              onCreateWorkoutPress={handleCreateWorkoutPress}
              selectedWorkoutId={expandedPlanId}
              onStartWorkout={handleStartWorkoutItem}
              onEditWorkout={handleEditWorkoutItem}
              onDeleteWorkout={handleDeleteWorkoutItem}
              onCloseExpanded={() => setExpandedPlanId(null)}
              showAll={showAllWorkouts}
              onToggleShowAll={() => setShowAllWorkouts(!showAllWorkouts)}
            />
        </SurfaceCard>
      </View>

      {/* My Plans Section with Carousel */}
      <View ref={plansCardRef}>
        <SurfaceCard tone="card" padding="xl" showAccentStripe={true} style={{ borderWidth: 0 }}>
          <ProgramSubcardList
              programs={myPlans}
              onProgramPress={(program) => handleProgramPress(program)}
              onAddProgramPress={handleAddPlanPress}
              onCreatePlanPress={handleCreatePlanPress}
              selectedProgramId={expandedPlanId}
              onEditProgram={handleEditProgram}
              onDeleteProgram={handleDeleteProgram}
              onCloseExpanded={() => setExpandedPlanId(null)}
              showAll={showAllPlans}
              onToggleShowAll={() => setShowAllPlans(!showAllPlans)}
            />
        </SurfaceCard>
      </View>

      {/* My Schedule Section */}
      <View ref={scheduleCardRef}>
        <SurfaceCard tone="card" padding="xl" showAccentStripe={true} style={{ borderWidth: 0 }}>
          <MyScheduleCard
            onEditPress={() => {
              triggerHaptic('selection');
              router.push({
                pathname: '/(tabs)/schedule-setup',
                params: { mode: activeScheduleRule ? 'edit' : 'create' },
              });
            }}
            onAddOverridePress={() => setIsOverrideModalVisible(true)}
            onDeletePress={handleDeleteSchedule}
          />
        </SurfaceCard>
      </View>

      </View>{/* end innerContainer */}

      <AddOverrideModal
        visible={isOverrideModalVisible}
        onClose={() => setIsOverrideModalVisible(false)}
      />


      <Modal
        transparent
        visible={isDeleteDialogVisible}
        onRequestClose={handleDismissDeleteDialog}
        animationType="fade"
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
                  Are you sure you want to {itemToDelete?.type === 'program_deletion' ? 'delete' : 'remove'} &quot;{itemToDelete?.name}&quot;?
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
