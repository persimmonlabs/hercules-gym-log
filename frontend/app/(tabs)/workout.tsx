import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { Pressable, StyleSheet, View, ScrollView, BackHandler } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { Button } from '@/components/atoms/Button';
import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { WorkoutInProgressModal } from '@/components/molecules/WorkoutInProgressModal';
import { radius, sizing, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { usePlansStore, type Plan, type PlansState } from '@/store/plansStore';
import { useProgramsStore } from '@/store/programsStore';
import { useSessionStore } from '@/store/sessionStore';
import type { WorkoutExercise } from '@/types/workout';
import { createSetsWithHistory } from '@/utils/workout';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import WorkoutSessionScreen from '../workout-session';
import { WorkoutCompletionOverlay } from '@/components/organisms';

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: spacing['2xl'],
    position: 'relative',
  },
  heroContainer: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: 64,
    position: 'relative',
  },
  heroTitle: {
    textAlign: 'center',
  },
  buttonWrapper: {
    width: '100%',
  },
  optionsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  topBar: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.sm,
  },
  backIconButton: {
    padding: spacing.sm,
    borderRadius: spacing.md,
  },
  planList: {
    width: '100%',
    gap: spacing.sm,
  },
  planCard: {
    borderRadius: radius.lg,
  },
  planCardContent: {
    gap: spacing.xs,
  },
});

const WorkoutScreen: React.FC = () => {
  const { theme } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  const [workoutInProgressVisible, setWorkoutInProgressVisible] = useState<boolean>(false);
  const [showPlansList, setShowPlansList] = useState<boolean>(false);

  // Handle Android hardware back button - navigate to Dashboard
  useEffect(() => {
    const backAction = () => {
      if (showPlansList) {
        setShowPlansList(false);
        return true;
      }
      // If not showing plans list, go to Dashboard
      return false; // Let default behavior handle it (will go to Dashboard via tab navigation)
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showPlansList]);
  const plans = usePlansStore((state: PlansState) => state.plans);
  const { userPrograms } = useProgramsStore();
  const startSession = useSessionStore((state) => state.startSession);
  const isSessionActive = useSessionStore((state) => state.isSessionActive);
  const currentSession = useSessionStore((state) => state.currentSession);
  const isCompletionOverlayVisible = useSessionStore((state) => state.isCompletionOverlayVisible);
  const setCompletionOverlayVisible = useSessionStore((state) => state.setCompletionOverlayVisible);

  const handleBack = () => {
    triggerHaptic('selection');
    setShowPlansList(false);
  };

  const handleStartFromPlan = () => {
    setShowPlansList(true);
  };

  const allWorkouts = useWorkoutSessionsStore((state) => state.workouts);

  // Combine workouts from both plans and programs with name-based deduplication
  // This prevents duplicates when the same workout exists in both plansStore and programs
  const allAvailableWorkouts = useMemo(() => {
    interface WorkoutItem {
      id: string;
      name: string;
      exercises: any[];
      type: 'custom' | 'program';
      programId?: string;
      programName?: string;
      subtitle: string;
    }

    // Use name-based grouping to prevent duplicates
    const workoutsGroupedByName: Record<string, WorkoutItem> = {};

    // Add custom workouts from plansStore first (these are the "source of truth")
    plans.forEach(plan => {
      const nameKey = plan.name.trim().toLowerCase();
      if (!workoutsGroupedByName[nameKey]) {
        workoutsGroupedByName[nameKey] = {
          id: plan.id,
          name: plan.name,
          exercises: plan.exercises,
          type: 'custom',
          subtitle: `${plan.exercises.length} ${plan.exercises.length === 1 ? 'exercise' : 'exercises'}`
        };
      }
    });

    // Add workouts from programs - only if not already present by name
    // If already present, update to show plan info (the workout is part of a plan)
    userPrograms.forEach(prog => {
      prog.workouts.forEach(w => {
        if (w.exercises.length === 0) return;

        const nameKey = w.name.trim().toLowerCase();
        if (!workoutsGroupedByName[nameKey]) {
          // New workout from program
          workoutsGroupedByName[nameKey] = {
            id: w.id,
            name: w.name,
            exercises: w.exercises,
            type: 'program',
            programId: prog.id,
            programName: prog.name,
            subtitle: `${prog.name} • ${w.exercises.length} ${w.exercises.length === 1 ? 'exercise' : 'exercises'}`
          };
        } else {
          // Already exists - update to show it's part of a plan
          // Use the program version's exercises (more up-to-date after edits)
          workoutsGroupedByName[nameKey].exercises = w.exercises;
          workoutsGroupedByName[nameKey].type = 'program';
          workoutsGroupedByName[nameKey].programId = prog.id;
          workoutsGroupedByName[nameKey].programName = prog.name;
          workoutsGroupedByName[nameKey].subtitle = `${prog.name} • ${w.exercises.length} ${w.exercises.length === 1 ? 'exercise' : 'exercises'}`;
        }
      });
    });

    // Convert to array and sort
    return Object.values(workoutsGroupedByName).sort((a, b) => {
      // Priority 1: Group by Plan (Custom considered as a plan group)
      const aPlanGroup = a.type === 'custom' ? 'Custom' : a.programName || '';
      const bPlanGroup = b.type === 'custom' ? 'Custom' : b.programName || '';

      const planComparison = aPlanGroup.localeCompare(bPlanGroup);
      if (planComparison !== 0) return planComparison;

      // Priority 2: Alphabetical within plan group
      return a.name.localeCompare(b.name);
    });
  }, [plans, userPrograms]);

  const handlePlanSelect = useCallback(
    (workout: any) => {
      triggerHaptic('selection');

      const doStartSession = () => {
        setCompletionOverlayVisible(false);

        const historySetCounts: Record<string, number> = {};
        const mappedExercises: WorkoutExercise[] = workout.exercises.map((exercise: any) => {
          const { sets, historySetCount } = createSetsWithHistory(exercise.name, allWorkouts);
          historySetCounts[exercise.name] = historySetCount;
          return {
            name: exercise.name,
            sets,
          };
        });

        const planId = workout.type === 'program' ? workout.programId : workout.id;
        startSession(planId, mappedExercises, workout.name, historySetCounts);
        setShowPlansList(false);
      };

      if (isSessionActive && currentSession) {
        setWorkoutInProgressVisible(true);
        return;
      }

      doStartSession();
    },
    [startSession, setCompletionOverlayVisible, allWorkouts, isSessionActive, currentSession],
  );

  const handleStartFromScratch = useCallback(() => {
    triggerHaptic('selection');

    const doStartSession = () => {
      setCompletionOverlayVisible(false);
      startSession(null, [], null);
      setShowPlansList(false);
    };

    if (isSessionActive && currentSession) {
      setWorkoutInProgressVisible(true);
      return;
    }

    doStartSession();
  }, [startSession, setCompletionOverlayVisible, isSessionActive, currentSession]);

  useFocusEffect(
    useCallback(() => {
      setShowPlansList(false);
    }, [])
  );

  if (isSessionActive && currentSession) {
    return (
      <>
        {isCompletionOverlayVisible ? (
          <WorkoutCompletionOverlay onDismiss={() => setCompletionOverlayVisible(false)} />
        ) : null}
        <WorkoutSessionScreen />
      </>
    );
  }

  return (
    <TabSwipeContainer ref={scrollRef} contentContainerStyle={styles.contentContainer}>
      <WorkoutInProgressModal
        visible={workoutInProgressVisible}
        sessionName={currentSession?.name ?? 'Current Workout'}
        elapsedMinutes={currentSession ? Math.floor((Date.now() - currentSession.startTime) / 60000) : 0}
        onResume={() => {
          setWorkoutInProgressVisible(false);
          setShowPlansList(false);
        }}
        onCancel={() => {
          setWorkoutInProgressVisible(false);
        }}
      />
      {isCompletionOverlayVisible ? (
        <WorkoutCompletionOverlay onDismiss={() => setCompletionOverlayVisible(false)} />
      ) : null}
      {showPlansList ? (
        <View style={styles.topBar}>
          <Pressable style={styles.backIconButton} onPress={handleBack} hitSlop={spacing.sm}>
            <IconSymbol name="arrow-back" color={theme.text.primary} size={sizing.iconMD} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.heroContainer}>
        {showPlansList ? (
          <>
            <Text variant="display1" color="primary" style={styles.heroTitle} fadeIn>
              Select a Workout
            </Text>
            <View style={styles.planList}>
              {allAvailableWorkouts.length > 0 ? (
                allAvailableWorkouts.map((workout) => (
                  <Pressable
                    key={`${workout.type}-${workout.id}`}
                    onPress={() => handlePlanSelect(workout)}
                    accessibilityRole="button"
                    accessibilityLabel={`Start ${workout.name}`}
                  >
                    <SurfaceCard tone="neutral" padding="md" showAccentStripe={true} style={styles.planCard}>
                      <View style={styles.planCardContent}>
                        <Text variant="bodySemibold" color="primary">
                          {workout.name}
                        </Text>
                        <Text variant="body" color="secondary">
                          {workout.subtitle}
                        </Text>
                      </View>
                    </SurfaceCard>
                  </Pressable>
                ))
              ) : (
                <SurfaceCard tone="neutral" padding="md" showAccentStripe={true} style={styles.planCard}>
                  <View style={styles.planCardContent}>
                    <Text variant="bodySemibold" color="primary">
                      No saved workouts yet
                    </Text>
                    <Text variant="body" color="secondary">
                      Create a workout from the Plans tab to see it here.
                    </Text>
                  </View>
                </SurfaceCard>
              )}
            </View>
          </>
        ) : (
          <>
            <Text variant="display1" color="primary" style={styles.heroTitle} fadeIn>
              Start Your Next Session
            </Text>
            <View style={styles.optionsContainer}>
              <View style={styles.buttonWrapper}>
                <Button label="Start from Saved Workout" size="lg" onPress={handleStartFromPlan} />
              </View>
              <View style={styles.buttonWrapper}>
                <Button label="Start from Scratch" size="lg" variant="light" onPress={handleStartFromScratch} />
              </View>
            </View>
          </>
        )}
      </View>
    </TabSwipeContainer>
  );
};

export default WorkoutScreen;
