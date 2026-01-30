import React, { useCallback, useEffect, useMemo, useState, useLayoutEffect } from 'react';
import { Pressable, StyleSheet, View, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { triggerHaptic } from '@/utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { ActivityIndicator } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WorkoutBuilderCard } from '@/components/molecules/WorkoutBuilderCard';
import { PremiumLimitModal } from '@/components/molecules/PremiumLimitModal';
import { usePlanBuilderContext } from '@/providers/PlanBuilderProvider';
import { colors, radius, spacing, sizing } from '@/constants/theme';
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary.bg,
  },
  loadingText: {
    textAlign: 'center',
  },
});

/**
 * CreateWorkoutScreen
 * Screen for creating/editing a Workout (collection of exercises).
 * 
 * Uses the new unified WorkoutBuilderCard for an effortless, 
 * one-screen workout creation experience.
 */
const CreateWorkoutScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const { planId, returnTo } = useLocalSearchParams<{ 
    planId?: string; 
    returnTo?: string; 
  }>();
  
  // Compute editingPlanId from URL params
  const editingPlanId = useMemo(() => {
    if (planId) {
      const id = Array.isArray(planId) ? planId[0] : planId;
      if (id) return id;
    }
    return null;
  }, [planId]);

  const {
    planName,
    setPlanName,
    selectedExercises,
    isSaving,
    isEditing,
    isLoading,
    isSaveDisabled,
    saveLabel,
    handleAddExercise,
    handleRemoveExercise,
    handleReorderExercises,
    handleSavePlan,
    setEditingPlanId,
    setIsLoading,
    resetSession,
  } = usePlanBuilderContext();

  // Dynamic header text
  const headerTitle = isEditing ? 'Edit Workout' : 'Create Workout';
  const headerSubtitle = isEditing 
    ? 'Update your workout template' 
    : 'Build your custom workout';

  useLayoutEffect(() => {
    // Set editing plan ID immediately on mount
    setEditingPlanId(editingPlanId);
    // Hide loading after mount
    setIsLoading(false);

    return () => {
      resetSession();
    };
  }, [editingPlanId, resetSession, setEditingPlanId, setIsLoading]);

  // Decode returnTo if provided
  const decodedReturnTo = useMemo(() => {
    if (!returnTo) return null;
    const rawReturnTo = Array.isArray(returnTo) ? returnTo[0] : returnTo;
    try {
      return decodeURIComponent(rawReturnTo);
    } catch {
      return rawReturnTo;
    }
  }, [returnTo]);

  const handleBackPress = useCallback(() => {
    triggerHaptic('selection');

    // If returnTo is specified, use it for navigation
    if (decodedReturnTo) {
      router.replace(decodedReturnTo as any);
      return;
    }

    if (planId) {
      // If this is a nested program workout, just go back
      const idStr = Array.isArray(planId) ? planId[0] : planId;
      if (idStr && (idStr.startsWith('program:') || idStr.includes('%3A'))) {
        router.back();
        return;
      }
      // If editing, go to Plans tab
      router.push('/(tabs)/plans');
    } else {
      // If creating, go to Programs tab
      router.push('/(tabs)/plans');
    }
  }, [router, planId, decodedReturnTo]);

  // Handle Android hardware back button
  useEffect(() => {
    const backAction = () => {
      handleBackPress();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [handleBackPress]);

  const handleSavePress = useCallback(() => {
    void (async () => {
      try {
        const result = await handleSavePlan();

        if (result === 'success') {
          if (decodedReturnTo) {
            router.replace(decodedReturnTo);
            return;
          }
          handleBackPress();
        }
      } catch (error: any) {
        if (error?.message === 'FREE_LIMIT_REACHED') {
          setShowLimitModal(true);
        }
      }
    })();
  }, [handleSavePlan, router, decodedReturnTo, handleBackPress]);

  // Handle adding exercise from inline search
  const handleAddExerciseFromSearch = useCallback((exercise: Exercise) => {
    handleAddExercise(exercise);
  }, [handleAddExercise]);

  // Handle browse all exercises - navigate to full add-exercises screen
  const handleBrowseAllExercises = useCallback(() => {
    triggerHaptic('selection');
    router.push('/add-exercises');
  }, [router]);

  return (
    <>
      <PremiumLimitModal
        visible={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limitType="workout"
      />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
            <Text variant="body" color="secondary" style={styles.loadingText}>
              {isEditing ? 'Loading workout...' : 'Preparing...'}
            </Text>
          </View>
        ) : (
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
                  {headerTitle}
                </Text>
                <Text variant="body" color="secondary" style={styles.headerSubtitle} fadeIn>
                  {headerSubtitle}
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

            {/* Unified Workout Builder Card */}
            <WorkoutBuilderCard
              workoutName={planName}
              onWorkoutNameChange={setPlanName}
              namePlaceholder="e.g. Push Day, Leg Day"
              exercises={selectedExercises}
              onAddExercise={handleAddExerciseFromSearch}
              onRemoveExercise={handleRemoveExercise}
              onReorderExercises={handleReorderExercises}
              onSave={handleSavePress}
              saveLabel={saveLabel}
              isSaving={isSaving}
              isSaveDisabled={isSaveDisabled}
              onBrowseAllExercises={handleBrowseAllExercises}
            />
          </KeyboardAwareScrollView>
        )}
      </View>
    </>
  );
};

export default CreateWorkoutScreen;
