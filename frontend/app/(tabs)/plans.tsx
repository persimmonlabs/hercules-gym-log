import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { ScreenHeader } from '@/components/molecules/ScreenHeader';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { Button } from '@/components/atoms/Button';
import { WEEKDAY_LABELS } from '@/constants/schedule';
import { colors, radius, shadows, spacing } from '@/constants/theme';
import { usePlansStore, type Plan, type PlansState } from '@/store/plansStore';
import { useSchedulesStore, type SchedulesState } from '@/store/schedulesStore';
import { useProgramsStore } from '@/store/programsStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSessionStore } from '@/store/sessionStore';
import { ProgramCard } from '@/components/molecules/ProgramCard';
import type { WorkoutExercise } from '@/types/workout';
import type { Schedule } from '@/types/schedule';
import type { PremadeProgram } from '@/types/premadePlan';

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
    width: spacing['2xl'],
    height: spacing['2xl'],
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
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  const handleAddPlanPress = useCallback(() => {
    void Haptics.selectionAsync();
    setIsAddModalVisible(true);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setIsAddModalVisible(false);
  }, []);

  const handleCreateCustomPlan = useCallback(() => {
    void Haptics.selectionAsync();
    setIsAddModalVisible(false);
    router.push('/(tabs)/create-plan');
  }, [router]);

  const handleBrowseLibrary = useCallback(() => {
    void Haptics.selectionAsync();
    setIsAddModalVisible(false);
    router.push('/browse-programs');
  }, [router]);

  const handleStartQuiz = useCallback(() => {
    void Haptics.selectionAsync();
    setIsAddModalVisible(false);
    router.push('/quiz');
  }, [router]);

  const handleBrowseProgramsPress = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/browse-programs');
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
                              <IconSymbol name="play-arrow" color={colors.accent.primary} size={spacing.lg} />
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
                              <IconSymbol name="edit" color={colors.accent.primary} size={spacing.lg} />
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
                              <IconSymbol name="delete" color={colors.accent.orange} size={spacing.lg} />
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
                              <IconSymbol name="arrow-back" color={colors.accent.orange} size={spacing.lg} />
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
                        <Text variant="body" color="secondary">
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
            <Button label="Add Workout" onPress={handleAddPlanPress} size="md" />
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
                            <IconSymbol name="visibility" color={colors.accent.primary} size={spacing.lg} />
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
                            <IconSymbol name="delete" color={colors.accent.orange} size={spacing.lg} />
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
                            <IconSymbol name="arrow-back" color={colors.accent.orange} size={spacing.lg} />
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
                      <Text variant="body" color="secondary">
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

      <SurfaceCard padding="xl" tone="neutral">
        <View style={styles.outerCardContent}>
          <Text variant="heading3" color="primary">
            Program Library
          </Text>

          <SurfaceCard tone="neutral" padding="lg" showAccentStripe={false} style={styles.planCardShell}>
            <View style={styles.browseCard}>
              <IconSymbol name="search" size={48} color={colors.accent.primary} />
              <View style={{ alignItems: 'center', gap: spacing.xs }}>
                <Text variant="bodySemibold" color="primary" style={{ textAlign: 'center' }}>
                  Explore Premade Plans
                </Text>
                <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                  Browse our curated collection of workout programs for all levels.
                </Text>
              </View>
              <Button label="Browse Library" onPress={handleBrowseProgramsPress} size="md" />
            </View>
          </SurfaceCard>
        </View>
      </SurfaceCard>

      {/* Delete Confirmation Modal */}
      <Modal
        transparent
        visible={Boolean(pendingDeletePlan)}
        animationType="fade"
        onRequestClose={dismissDeleteDialog}
      >
        <View style={styles.dialogOverlay}>
          <SurfaceCard tone="neutral" padding="lg" showAccentStripe={false} style={styles.dialogCard}>
            <View style={styles.dialogContent}>
              <Text variant="heading3" color="primary">
                Delete plan
              </Text>
              <Text variant="body" color="secondary">
                Are you sure you want to delete {pendingDeletePlan?.name ?? 'this plan'}? This action cannot be undone.
              </Text>
            </View>
            <View style={styles.dialogActions}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={dismissDeleteDialog}
                size="md"
                textColor={colors.accent.gradientStart}
                style={[styles.dialogActionButton, styles.dialogCancelButton]}
              />
              <Button
                label="Delete"
                variant="primary"
                onPress={confirmDeletePlan}
                size="md"
                style={styles.dialogActionButton}
              />
            </View>
          </SurfaceCard>
        </View>
      </Modal>

      {/* Add Plan Selection Modal */}
      <Modal
        transparent
        visible={isAddModalVisible}
        animationType="fade"
        onRequestClose={handleCloseAddModal}
      >
        <Pressable style={styles.dialogOverlay} onPress={handleCloseAddModal}>
          <SurfaceCard 
            tone="neutral" 
            padding="xl" 
            showAccentStripe={false} 
            style={styles.dialogCard}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.dialogContent}>
                <Text variant="heading2" color="primary">
                  Add Workout
                </Text>
                <Text variant="body" color="secondary">
                  How would you like to create your new plan?
                </Text>

                <View style={{ gap: spacing.md, marginTop: spacing.md }}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.planCardShell,
                      { backgroundColor: pressed ? colors.surface.elevated : colors.surface.card }
                    ]}
                    onPress={handleBrowseLibrary}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                      <View style={styles.planActionIconWrapper}>
                        <IconSymbol name="search" size={24} color={colors.accent.primary} />
                      </View>
                      <View style={{ flex: 1, gap: spacing.xs }}>
                        <Text variant="bodySemibold" color="primary">Browse Library</Text>
                        <Text variant="caption" color="secondary">Find a premade program for your goals.</Text>
                      </View>
                      <IconSymbol name="chevron-right" size={20} color={colors.text.tertiary} />
                    </View>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.planCardShell,
                      { backgroundColor: pressed ? colors.surface.elevated : colors.surface.card }
                    ]}
                    onPress={handleStartQuiz}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                      <View style={styles.planActionIconWrapper}>
                        <IconSymbol name="auto-awesome" size={24} color={colors.accent.primary} />
                      </View>
                      <View style={{ flex: 1, gap: spacing.xs }}>
                        <Text variant="bodySemibold" color="primary">Get a Recommendation</Text>
                        <Text variant="caption" color="secondary">Take a quick quiz to find your perfect plan.</Text>
                      </View>
                      <IconSymbol name="chevron-right" size={20} color={colors.text.tertiary} />
                    </View>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.planCardShell,
                      { backgroundColor: pressed ? colors.surface.elevated : colors.surface.card }
                    ]}
                    onPress={handleCreateCustomPlan}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                      <View style={styles.planActionIconWrapper}>
                        <IconSymbol name="add" size={24} color={colors.accent.primary} />
                      </View>
                      <View style={{ flex: 1, gap: spacing.xs }}>
                        <Text variant="bodySemibold" color="primary">Create from Scratch</Text>
                        <Text variant="caption" color="secondary">Build a custom plan exercise by exercise.</Text>
                      </View>
                      <IconSymbol name="chevron-right" size={20} color={colors.text.tertiary} />
                    </View>
                  </Pressable>
                </View>
              </View>
              
              <View style={[styles.dialogActions, { marginTop: spacing.lg }]}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={handleCloseAddModal}
                  size="md"
                  textColor={colors.text.secondary}
                  style={styles.dialogActionButton}
                />
              </View>
            </Pressable>
          </SurfaceCard>
        </Pressable>
      </Modal>
    </TabSwipeContainer>
  );
};

export default PlansScreen;
