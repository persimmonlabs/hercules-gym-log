import React, { useCallback, useState, useEffect } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PlanNameCard } from '@/components/molecules/PlanNameCard';
import { PlanEmptyStateCard } from '@/components/molecules/PlanEmptyStateCard';
import { colors, radius, spacing, sizing } from '@/constants/theme';
import { usePlansStore } from '@/store/plansStore';
import { useProgramsStore } from '@/store/programsStore';
import { useProgramBuilderContext } from '@/providers/ProgramBuilderProvider';
import type { UserProgram, ProgramWorkout } from '@/types/premadePlan';
import type { Exercise } from '@/constants/exercises';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary.bg,
  },
  scrollContent: {
    flexGrow: 1,
    gap: spacing.sm,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'] * 8,
  },
  topSection: {
    width: '100%',
    marginBottom: spacing.sm,
    gap: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerContent: {
    gap: spacing.sm,
    alignItems: 'flex-start',
    flex: 1,
  },
  headerTitle: {
    textAlign: 'left',
  },
  headerSubtitle: {
    textAlign: 'left',
    maxWidth: 320,
  },
  nameCardContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  emptyCard: {
    marginTop: spacing.md,
    gap: spacing.md,
    position: 'relative',
  },
  noWorkoutsCard: {
    gap: spacing.md,
    alignItems: 'center',
  },
  addButtonContainer: {
    marginTop: spacing.lg,
  },
  workoutsList: {
    gap: spacing.md,
  },
  workoutsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  workoutInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  removeButton: {
    padding: spacing.sm,
  },
});

/**
 * CreatePlanScreen (file: create-program.tsx)
 * Screen for creating a Plan (collection of workouts).
 * 
 * TERMINOLOGY:
 * - Plan: A collection of workouts (e.g., "PPL", "Bro Split")
 * - Workout: A collection of exercises (e.g., "Push Day", "Pull Day")
 * 
 * Note: The file is named "create-program" for routing but creates Plans.
 * "Program" and "Plan" are used interchangeably in this codebase.
 */
const CreatePlanScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { plans } = usePlansStore();
  const { userPrograms, addUserProgram } = useProgramsStore();
  const { 
    programName, 
    setProgramName, 
    selectedWorkouts, 
    removeWorkout,
    resetBuilder 
  } = useProgramBuilderContext();
  
  const [isSaving, setIsSaving] = useState(false);

  // Reset builder when component unmounts
  useEffect(() => {
    return () => {
      resetBuilder();
    };
  }, [resetBuilder]);

  const hasWorkouts = selectedWorkouts.length > 0;
  const hasUserWorkouts = plans.length > 0;
  
  // Check for duplicate program name
  const isDuplicateName = userPrograms.some(
    p => p.name.toLowerCase().trim() === programName.toLowerCase().trim()
  );
  
  const isSaveDisabled = !programName.trim() || selectedWorkouts.length === 0 || isDuplicateName;

  const handleBackPress = useCallback(() => {
    void Haptics.selectionAsync();
    router.replace({
      pathname: '/(tabs)/add-workout',
      params: { mode: 'program' }
    });
  }, [router]);

  const handleAddWorkoutsPress = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/add-workouts-to-program');
  }, [router]);

  const handleRemoveWorkout = useCallback((workoutId: string) => {
    void Haptics.selectionAsync();
    removeWorkout(workoutId);
  }, [removeWorkout]);

  const handleSaveProgram = useCallback(async () => {
    if (isSaveDisabled) return;
    
    setIsSaving(true);
    void Haptics.selectionAsync();

    try {
      // Check for duplicate name
      if (isDuplicateName) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Plan Name Taken',
          'A plan with this name already exists. Please choose a different name.',
          [{ text: 'OK' }]
        );
        setIsSaving(false);
        return;
      }

      // Convert Plan[] to ProgramWorkout[]
      const programWorkouts: ProgramWorkout[] = selectedWorkouts.map(plan => ({
        id: plan.id,
        name: plan.name,
        exercises: plan.exercises.map((ex: Exercise) => ({
          id: ex.id,
          name: ex.name,
          sets: 3,
        })),
      }));

      const newProgram: UserProgram = {
        id: `prog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: programName.trim(),
        workouts: programWorkouts,
        metadata: {
          goal: 'general-fitness',
          experienceLevel: 'intermediate',
          equipment: 'full-gym',
          daysPerWeek: selectedWorkouts.length,
          description: `Custom program with ${selectedWorkouts.length} workouts`,
        },
        scheduleType: 'rotation',
        isPremade: false,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      await addUserProgram(newProgram);
      
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/(tabs)/plans');
    } catch (error) {
      console.error('[CreateProgramScreen] Failed to save program:', error);
      Alert.alert('Error', 'Failed to save program. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [programName, selectedWorkouts, isSaveDisabled, isDuplicateName, addUserProgram, router]);

  const handleGoToCreateWorkout = useCallback(() => {
    void Haptics.selectionAsync();
    router.replace({
      pathname: '/(tabs)/add-workout',
      params: { mode: 'workout' }
    });
  }, [router]);

  // If user has no workouts, show a message
  if (!hasUserWorkouts) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topSection}>
            <View style={styles.headerContent}>
              <Text variant="heading2" color="primary" style={styles.headerTitle}>
                Create Plan
              </Text>
              <Text variant="body" color="secondary" style={styles.headerSubtitle}>
                Build a custom training plan
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go Back"
              onPress={handleBackPress}
              style={{ padding: spacing.sm, paddingTop: spacing.xs, borderRadius: radius.full }}
            >
              <IconSymbol name="arrow-back" size={sizing.iconMD} color={colors.text.primary} />
            </Pressable>
          </View>

          <SurfaceCard tone="neutral" padding="xl" showAccentStripe={false} style={styles.noWorkoutsCard}>
            <IconSymbol name="fitness-center" size={48} color={colors.text.tertiary} />
            <Text variant="bodySemibold" color="primary">No Workouts Yet</Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
              You need to create some workouts before you can build a plan. Plans are collections of workouts.
            </Text>
            <Button 
              label="Create a Workout First" 
              variant="primary" 
              onPress={handleGoToCreateWorkout} 
            />
          </SurfaceCard>
        </KeyboardAwareScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        enableOnAndroid
        extraScrollHeight={spacing['2xl'] * 4}
        keyboardOpeningTime={0}
        enableAutomaticScroll={false}
      >
        <View style={styles.topSection}>
          <View style={styles.headerContent}>
            <Text variant="heading2" color="primary" style={styles.headerTitle} fadeIn>
              Create Plan
            </Text>
            <Text variant="body" color="secondary" style={styles.headerSubtitle} fadeIn>
              Build a custom training plan
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go Back"
            onPress={handleBackPress}
            style={{ padding: spacing.sm, paddingTop: spacing.xs, borderRadius: radius.full }}
          >
            <IconSymbol name="arrow-back" size={sizing.iconMD} color={colors.text.primary} />
          </Pressable>
        </View>

        <View style={styles.nameCardContainer}>
          <PlanNameCard 
            value={programName} 
            onChange={setProgramName} 
            label="Plan Name" 
            placeholder="e.g. Push Pull Legs" 
          />
        </View>

        {hasWorkouts ? (
          <View style={styles.workoutsList}>
            <View style={styles.workoutsHeader}>
              <View>
                <Text variant="bodySemibold" color="primary">
                  {selectedWorkouts.length} {selectedWorkouts.length === 1 ? 'Workout' : 'Workouts'}
                </Text>
                <Text variant="caption" color="secondary">
                  Tap to remove, drag to reorder
                </Text>
              </View>
              <Button 
                label="Add more" 
                variant="secondary" 
                size="sm" 
                onPress={handleAddWorkoutsPress} 
              />
            </View>
            
            {selectedWorkouts.map((workout) => (
              <SurfaceCard 
                key={workout.id} 
                tone="neutral" 
                padding="md" 
                showAccentStripe={false}
              >
                <View style={styles.workoutCard}>
                  <View style={styles.workoutInfo}>
                    <Text variant="bodySemibold" color="primary">{workout.name}</Text>
                    <Text variant="caption" color="secondary">
                      {workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}
                    </Text>
                  </View>
                  <Pressable 
                    onPress={() => handleRemoveWorkout(workout.id)}
                    style={styles.removeButton}
                    hitSlop={8}
                  >
                    <IconSymbol name="close" size={20} color={colors.text.tertiary} />
                  </Pressable>
                </View>
              </SurfaceCard>
            ))}
          </View>
        ) : (
          <PlanEmptyStateCard
            title="No workouts added"
            buttonLabel="Add workouts"
            onPress={handleAddWorkoutsPress}
            style={styles.emptyCard}
          />
        )}

        <View style={styles.addButtonContainer}>
          <Button
            label="Save Plan"
            variant="primary"
            size="lg"
            onPress={handleSaveProgram}
            disabled={isSaveDisabled}
            loading={isSaving}
          />
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

export default CreatePlanScreen;
