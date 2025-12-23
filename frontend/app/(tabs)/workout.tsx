import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '@/components/atoms/Button';
import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { WorkoutInProgressModal } from '@/components/molecules/WorkoutInProgressModal';
import { radius, sizing, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { usePlansStore, type Plan, type PlansState } from '@/store/plansStore';
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
    top: spacing['2xl'],
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
  const [workoutInProgressVisible, setWorkoutInProgressVisible] = useState<boolean>(false);
  const [showPlansList, setShowPlansList] = useState<boolean>(false);
  const plans = usePlansStore((state: PlansState) => state.plans);
  const startSession = useSessionStore((state) => state.startSession);
  const isSessionActive = useSessionStore((state) => state.isSessionActive);
  const currentSession = useSessionStore((state) => state.currentSession);
  const isCompletionOverlayVisible = useSessionStore((state) => state.isCompletionOverlayVisible);
  const setCompletionOverlayVisible = useSessionStore((state) => state.setCompletionOverlayVisible);

  const handleBack = () => {
    Haptics.selectionAsync();
    setShowPlansList(false);
  };

  const handleStartFromPlan = () => {
    setShowPlansList(true);
  };

  const allWorkouts = useWorkoutSessionsStore((state) => state.workouts);

  const handlePlanSelect = useCallback(
    (plan: Plan) => {
      void Haptics.selectionAsync();

      const doStartSession = () => {
        setCompletionOverlayVisible(false);

        const historySetCounts: Record<string, number> = {};
        const mappedExercises: WorkoutExercise[] = plan.exercises.map((exercise) => {
          const { sets, historySetCount } = createSetsWithHistory(exercise.name, allWorkouts);
          historySetCounts[exercise.name] = historySetCount;
          return {
            name: exercise.name,
            sets,
          };
        });

        startSession(plan.id, mappedExercises, plan.name, historySetCounts);
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
    void Haptics.selectionAsync();

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
    <TabSwipeContainer contentContainerStyle={styles.contentContainer}>
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
              {plans.length > 0 ? (
                plans.map((plan: Plan) => (
                  <Pressable
                    key={plan.id}
                    onPress={() => handlePlanSelect(plan)}
                    accessibilityRole="button"
                    accessibilityLabel={`Start ${plan.name}`}
                  >
                    <SurfaceCard tone="neutral" padding="md" showAccentStripe={false} style={styles.planCard}>
                      <View style={styles.planCardContent}>
                        <Text variant="bodySemibold" color="primary">
                          {plan.name}
                        </Text>
                        <Text variant="body" color="secondary">
                          {plan.exercises.length === 1
                            ? '1 exercise included'
                            : `${plan.exercises.length} exercises included`}
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
              Start your next session
            </Text>
            <View style={styles.optionsContainer}>
              <View style={styles.buttonWrapper}>
                <Button label="Start from saved workout" size="lg" onPress={handleStartFromPlan} />
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
