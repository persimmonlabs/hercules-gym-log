import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View, ScrollView, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { triggerHaptic } from '@/utils/haptics';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { Button } from '@/components/atoms/Button';
import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { WorkoutInProgressModal } from '@/components/molecules/WorkoutInProgressModal';
import { colors, radius, sizing, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { usePlansStore, type Plan, type PlansState } from '@/store/plansStore';
import { useProgramsStore } from '@/store/programsStore';
import { useSessionStore } from '@/store/sessionStore';
import type { WorkoutExercise, SetLog } from '@/types/workout';
import { createSetsWithSmartSuggestions } from '@/utils/workout';
import { useSettingsStore } from '@/store/settingsStore';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { useCustomExerciseStore } from '@/store/customExerciseStore';
import WorkoutSessionScreen from '../workout-session';
import { WorkoutCompletionOverlay } from '@/components/organisms';
import { useOutdoorSessionStore } from '@/store/outdoorSessionStore';

const BASE_OUTDOOR_EXERCISES = [
  { name: 'Outdoor Run' },
  { name: 'Outdoor Cycling' },
  { name: 'Outdoor Walk' },
] as const;

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
  createCard: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.accent.orange,
  },
  createCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inlineInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: 16,
  },
  inlineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
});

const WorkoutScreen: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const outdoorSessionStatus = useOutdoorSessionStore((s) => s.status);
  const outdoorExerciseName = useOutdoorSessionStore((s) => s.exerciseName);
  const isOutdoorSessionActive = outdoorSessionStatus === 'active' || outdoorSessionStatus === 'paused';
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  const [workoutInProgressVisible, setWorkoutInProgressVisible] = useState<boolean>(false);
  const [showPlansList, setShowPlansList] = useState<boolean>(false);
  const [showOutdoorPicker, setShowOutdoorPicker] = useState<boolean>(false);
  const [showNewOutdoorInput, setShowNewOutdoorInput] = useState<boolean>(false);
  const [newOutdoorName, setNewOutdoorName] = useState<string>('');
  const [newOutdoorError, setNewOutdoorError] = useState<string | null>(null);
  const [isCreatingOutdoor, setIsCreatingOutdoor] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const startOutdoorSession = useOutdoorSessionStore((s) => s.startSession);
  const addCustomExercise = useCustomExerciseStore((state) => state.addCustomExercise);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Handle Android hardware back button - navigate to Dashboard
  useEffect(() => {
    const backAction = () => {
      if (showOutdoorPicker) {
        setShowOutdoorPicker(false);
        return true;
      }
      if (showPlansList) {
        setShowPlansList(false);
        return true;
      }
      // If not showing plans list, go to Dashboard
      return false; // Let default behavior handle it (will go to Dashboard via tab navigation)
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showPlansList, showOutdoorPicker]);
  const plans = usePlansStore((state: PlansState) => state.plans);
  const { userPrograms } = useProgramsStore();
  const smartSuggestionsEnabled = useSettingsStore((state) => state.smartSuggestionsEnabled);
  const startSession = useSessionStore((state) => state.startSession);
  const isSessionActive = useSessionStore((state) => state.isSessionActive);
  const currentSession = useSessionStore((state) => state.currentSession);
  const isCompletionOverlayVisible = useSessionStore((state) => state.isCompletionOverlayVisible);
  const setCompletionOverlayVisible = useSessionStore((state) => state.setCompletionOverlayVisible);

  const handleBack = () => {
    triggerHaptic('selection');
    setShowPlansList(false);
    setShowOutdoorPicker(false);
  };

  const handleStartFromPlan = () => {
    setShowPlansList(true);
  };

  const allWorkouts = useWorkoutSessionsStore((state) => state.workouts);
  const customExercises = useCustomExerciseStore((state) => state.customExercises);

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

      if (isOutdoorSessionActive) {
        router.push({ pathname: '/outdoor-session', params: { exercise: outdoorExerciseName ?? '' } });
        return;
      }

      const doStartSession = () => {
        setCompletionOverlayVisible(false);

        const historySetCounts: Record<string, number> = {};
        const suggestedSetsMap: Record<string, SetLog[]> = {};
        const dataPointsMap: Record<string, any[]> = {};
        const mappedExercises: WorkoutExercise[] = workout.exercises.map((exercise: any) => {
          const result = createSetsWithSmartSuggestions(exercise.name, allWorkouts, smartSuggestionsEnabled, undefined, undefined, customExercises);
          historySetCounts[exercise.name] = result.historySetCount;
          if (result.smartSuggestedSets.length > 0) {
            suggestedSetsMap[exercise.name] = result.smartSuggestedSets;
          }
          if (result.dataPoints && result.dataPoints.length > 0) {
            dataPointsMap[exercise.name] = result.dataPoints;
          }
          return {
            name: exercise.name,
            sets: result.sets,
          };
        });

        const planId = workout.type === 'program' ? workout.programId : workout.id;
        startSession(planId, mappedExercises, workout.name, historySetCounts, suggestedSetsMap, dataPointsMap);
        setShowPlansList(false);
      };

      if (isSessionActive && currentSession) {
        setWorkoutInProgressVisible(true);
        return;
      }

      doStartSession();
    },
    [startSession, setCompletionOverlayVisible, allWorkouts, isSessionActive, currentSession, isOutdoorSessionActive, outdoorExerciseName, router],
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

  // Dynamic outdoor exercises: built-in + custom outdoor exercises
  const allOutdoorExercises = useMemo(() => {
    const builtIn = BASE_OUTDOOR_EXERCISES.map(ex => ({ name: ex.name, isCustom: false }));
    const customOutdoor = customExercises
      .filter(ce => ce.exerciseType === 'cardio' && ce.supportsGpsTracking)
      .map(ce => ({ name: ce.name, isCustom: true }));
    return [...builtIn, ...customOutdoor];
  }, [customExercises]);

  const handleStartOutdoor = useCallback(() => {
    triggerHaptic('selection');
    setShowOutdoorPicker(true);
    setShowNewOutdoorInput(false);
    setNewOutdoorName('');
    setNewOutdoorError(null);
  }, []);

  const handleShowNewOutdoorInput = useCallback(() => {
    triggerHaptic('selection');
    setShowNewOutdoorInput(true);
    // Scroll to bottom so the input card is visible above the keyboard
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, []);

  const handleCreateOutdoorExercise = useCallback(async () => {
    const trimmed = newOutdoorName.trim();
    if (!trimmed || trimmed.length < 2) {
      setNewOutdoorError('Name must be at least 2 characters');
      return;
    }
    setIsCreatingOutdoor(true);
    setNewOutdoorError(null);
    try {
      const result = await addCustomExercise({
        name: trimmed,
        exerciseType: 'cardio',
        supportsGpsTracking: true,
      });
      if (result) {
        triggerHaptic('success');
        setShowNewOutdoorInput(false);
        setNewOutdoorName('');
        // Auto-start the newly created outdoor exercise
        handleOutdoorExerciseSelect(result.name);
      } else {
        setNewOutdoorError('An exercise with this name already exists');
      }
    } catch {
      setNewOutdoorError('Failed to create exercise');
    } finally {
      setIsCreatingOutdoor(false);
    }
  }, [newOutdoorName, addCustomExercise]);

  const handleOutdoorExerciseSelect = useCallback(
    (exerciseName: string) => {
      triggerHaptic('selection');

      if (isSessionActive) {
        setWorkoutInProgressVisible(true);
        return;
      }

      startOutdoorSession(exerciseName);
      setShowOutdoorPicker(false);
      router.push({ pathname: '/outdoor-session', params: { exercise: exerciseName } });
    },
    [startOutdoorSession, router, isSessionActive],
  );

  useFocusEffect(
    useCallback(() => {
      setShowPlansList(false);
      setShowOutdoorPicker(false);
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
    <TabSwipeContainer
      ref={scrollRef}
      contentContainerStyle={[
        styles.contentContainer,
        showNewOutdoorInput && keyboardHeight > 0
          ? { paddingBottom: keyboardHeight + spacing['2xl'] }
          : undefined,
      ]}
    >
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
      {(showPlansList || showOutdoorPicker) ? (
        <View style={styles.topBar}>
          <Pressable style={styles.backIconButton} onPress={handleBack} hitSlop={spacing.sm}>
            <IconSymbol name="arrow-back" color={theme.text.primary} size={sizing.iconMD} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.heroContainer}>
        {showOutdoorPicker ? (
          <>
            <Text variant="display1" color="primary" style={styles.heroTitle} fadeIn>
              Select an Exercise
            </Text>
            <View style={styles.planList}>
              {allOutdoorExercises.map((ex) => (
                <Pressable
                  key={ex.name}
                  onPress={() => handleOutdoorExerciseSelect(ex.name)}
                  accessibilityRole="button"
                  accessibilityLabel={`Start ${ex.name}`}
                >
                  <SurfaceCard tone="neutral" padding="md" showAccentStripe={false} style={styles.planCard}>
                    <View style={styles.planCardContent}>
                      <Text variant="bodySemibold" color="primary">
                        {ex.name}
                      </Text>
                    </View>
                  </SurfaceCard>
                </Pressable>
              ))}
              {showNewOutdoorInput ? (
                <SurfaceCard tone="neutral" padding="md" showAccentStripe={false} style={styles.planCard}>
                  <View style={styles.planCardContent}>
                    <Text variant="bodySemibold" color="primary">New Outdoor Exercise</Text>
                    <TextInput
                      style={[styles.inlineInput, { backgroundColor: theme.surface.elevated, color: theme.text.primary, borderColor: theme.border.light }]}
                      placeholder="e.g., Trail Hike"
                      placeholderTextColor={theme.text.tertiary}
                      value={newOutdoorName}
                      onChangeText={(t) => { if (t.length <= 50) { setNewOutdoorName(t); setNewOutdoorError(null); } }}
                      autoCapitalize="words"
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleCreateOutdoorExercise}
                      onFocus={() => {
                        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
                      }}
                    />
                    {newOutdoorError ? (
                      <Text variant="caption" style={{ color: colors.accent.warning }}>{newOutdoorError}</Text>
                    ) : null}
                    <View style={styles.inlineActions}>
                      <Pressable onPress={() => { setShowNewOutdoorInput(false); setNewOutdoorName(''); setNewOutdoorError(null); }}>
                        <Text variant="bodySemibold" color="secondary">Cancel</Text>
                      </Pressable>
                      <Button
                        label={isCreatingOutdoor ? 'Creating...' : 'Create & Start'}
                        size="sm"
                        onPress={handleCreateOutdoorExercise}
                        disabled={newOutdoorName.trim().length < 2 || isCreatingOutdoor}
                      />
                    </View>
                  </View>
                </SurfaceCard>
              ) : (
                <Pressable
                  onPress={handleShowNewOutdoorInput}
                  accessibilityRole="button"
                  accessibilityLabel="Create a new outdoor exercise"
                >
                  <SurfaceCard tone="neutral" padding="md" showAccentStripe={false} style={[styles.planCard, styles.createCard]}>
                    <View style={styles.createCardContent}>
                      <IconSymbol name="add" size={sizing.iconSM} color={theme.accent.orange} />
                      <Text variant="bodySemibold" style={{ color: theme.accent.orange }}>
                        Create New Outdoor Exercise
                      </Text>
                    </View>
                  </SurfaceCard>
                </Pressable>
              )}
            </View>
          </>
        ) : showPlansList ? (
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
                    <SurfaceCard tone="neutral" padding="md" showAccentStripe={false} style={styles.planCard}>
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
                <SurfaceCard tone="neutral" padding="md" showAccentStripe={false} style={styles.planCard}>
                  <View style={styles.planCardContent}>
                    <Text variant="bodySemibold" color="primary">
                      No saved workouts yet
                    </Text>
                    <Text variant="body" color="secondary">
                      Create a workout from the Programs tab to see it here.
                    </Text>
                  </View>
                </SurfaceCard>
              )}
              <Pressable
                onPress={() => {
                  triggerHaptic('selection');
                  setShowPlansList(false);
                  router.push('/(tabs)/plans');
                }}
                accessibilityRole="button"
                accessibilityLabel="Create a new workout"
              >
                <SurfaceCard tone="neutral" padding="md" showAccentStripe={false} style={[styles.planCard, styles.createCard]}>
                  <View style={styles.createCardContent}>
                    <IconSymbol name="add" size={sizing.iconSM} color={theme.accent.orange} />
                    <Text variant="bodySemibold" style={{ color: theme.accent.orange }}>
                      Create a New Workout
                    </Text>
                  </View>
                </SurfaceCard>
              </Pressable>
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
                <Button
                  label="Start Outdoor Exercise"
                  size="lg"
                  variant="ghost"
                  onPress={handleStartOutdoor}
                  contentStyle={{ backgroundColor: theme.accent.orangeMuted, borderColor: theme.accent.orange, borderWidth: 1 }}
                  textColor={theme.text.primary}
                />
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
