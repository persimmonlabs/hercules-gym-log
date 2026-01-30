import React, { useCallback, useState, useEffect } from 'react';
import { Alert, Pressable, StyleSheet, View, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { triggerHaptic } from '@/utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PlanBuilderCard } from '@/components/molecules/PlanBuilderCard';
import { PremiumLimitModal } from '@/components/molecules/PremiumLimitModal';
import { colors, radius, spacing, sizing } from '@/constants/theme';
import { usePlansStore, type Plan } from '@/store/plansStore';
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
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'] * 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerContent: {
    flex: 1,
    gap: spacing.xs,
  },
  headerTitle: {
    textAlign: 'left',
  },
  headerSubtitle: {
    textAlign: 'left',
  },
  backButton: {
    padding: spacing.sm,
    paddingTop: spacing.xs,
    borderRadius: radius.full,
  },
});

/**
 * CreatePlanScreen (file: create-program.tsx)
 * Screen for creating a Plan (collection of workouts).
 * 
 * Uses the new unified PlanBuilderCard for an effortless,
 * one-screen plan creation experience.
 * 
 * TERMINOLOGY:
 * - Plan: A collection of workouts (e.g., "PPL", "Bro Split")
 * - Workout: A collection of exercises (e.g., "Push Day", "Pull Day")
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
    addWorkout,
    removeWorkout,
    resetBuilder 
  } = useProgramBuilderContext();
  
  const [isSaving, setIsSaving] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Reset builder when component unmounts
  useEffect(() => {
    return () => {
      resetBuilder();
    };
  }, [resetBuilder]);

  // Check for duplicate program name
  const isDuplicateName = userPrograms.some(
    p => p.name.toLowerCase().trim() === programName.toLowerCase().trim()
  );
  
  const isSaveDisabled = !programName.trim() || selectedWorkouts.length === 0 || isDuplicateName;

  const handleBackPress = useCallback(() => {
    triggerHaptic('selection');
    router.back();
  }, [router]);

  // Handle Android hardware back button
  useEffect(() => {
    const backAction = () => {
      handleBackPress();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [handleBackPress]);

  const handleAddWorkout = useCallback((workout: Plan) => {
    addWorkout(workout);
  }, [addWorkout]);

  const handleRemoveWorkout = useCallback((workoutId: string) => {
    removeWorkout(workoutId);
  }, [removeWorkout]);

  const handleReorderWorkouts = useCallback((fromIndex: number, toIndex: number) => {
    // Reordering not currently supported in program builder context
    // This is a placeholder for future implementation
  }, []);

  const handleSaveProgram = useCallback(async () => {
    if (isSaveDisabled) return;
    
    setIsSaving(true);
    triggerHaptic('selection');

    try {
      // Check for duplicate name
      if (isDuplicateName) {
        triggerHaptic('error');
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
      
      triggerHaptic('success');
      router.push('/(tabs)/plans');
    } catch (error: any) {
      if (error?.message === 'FREE_LIMIT_REACHED') {
        setShowLimitModal(true);
      } else {
        console.error('[CreateProgramScreen] Failed to save program:', error);
        Alert.alert('Error', 'Failed to save program. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }, [programName, selectedWorkouts, isSaveDisabled, isDuplicateName, addUserProgram, router]);

  const handleGoToCreateWorkout = useCallback(() => {
    triggerHaptic('selection');
    router.replace({
      pathname: '/(tabs)/add-workout',
      params: { mode: 'workout' }
    });
  }, [router]);

  return (
    <>
      <PremiumLimitModal
        visible={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limitType="plan"
      />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          enableOnAndroid
          extraScrollHeight={spacing['2xl'] * 2}
          keyboardOpeningTime={0}
        >
          {/* Header */}
          <View style={styles.headerRow}>
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
              style={styles.backButton}
            >
              <IconSymbol name="arrow-back" size={sizing.iconMD} color={colors.text.primary} />
            </Pressable>
          </View>

          {/* Unified Plan Builder Card */}
          <PlanBuilderCard
            planName={programName}
            onPlanNameChange={setProgramName}
            namePlaceholder="e.g. Push Pull Legs, Full Body Split"
            isNameDuplicate={isDuplicateName && programName.trim().length > 0}
            availableWorkouts={plans}
            selectedWorkouts={selectedWorkouts}
            onAddWorkout={handleAddWorkout}
            onRemoveWorkout={handleRemoveWorkout}
            onReorderWorkouts={handleReorderWorkouts}
            onSave={handleSaveProgram}
            saveLabel="Save Plan"
            isSaving={isSaving}
            isSaveDisabled={isSaveDisabled}
            onCreateWorkout={handleGoToCreateWorkout}
          />
        </KeyboardAwareScrollView>
      </View>
    </>
  );
};

export default CreatePlanScreen;
