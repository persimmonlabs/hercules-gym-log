import React, { useCallback, useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react';
import { Pressable, StyleSheet, View, InteractionManager, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { triggerHaptic } from '@/utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { ActivityIndicator } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PlanSelectedExerciseList } from '@/components/molecules/PlanSelectedExerciseList';
import { PlanEmptyStateCard } from '@/components/molecules/PlanEmptyStateCard';
import { PlanNameCard } from '@/components/molecules/PlanNameCard';
import { PremiumLimitModal } from '@/components/molecules/PremiumLimitModal';
import { usePlanBuilderContext } from '@/providers/PlanBuilderProvider';
import { colors, radius, spacing, sizing } from '@/constants/theme';

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
  keyboardSpacerActive: {
    height: spacing['2xl'] * 6,
  },
  topSection: {
    width: '100%',
    marginBottom: spacing.sm,
    gap: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  headerContent: {
    gap: spacing.sm,
    alignItems: 'flex-start',
    flex: 1,
  },
  titleWrapper: {
    paddingBottom: spacing.xs,
  },
  headerTitle: {
    textAlign: 'left',
  },
  headerSubtitle: {
    textAlign: 'left',
    maxWidth: 320,
  },
  missingPlanCard: {
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent.orangeLight,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    position: 'relative',
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
  emptyCardContent: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  emptyTitle: {
    textAlign: 'left',
  },
  emptyBody: {
    textAlign: 'left',
  },
  addButtonContainer: {
    marginTop: spacing.lg,
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
 * Note: This was previously called "create-plan" but a Workout is the correct term
 * for a collection of exercises (e.g., "Push Day", "Pull Day").
 */
const CreateWorkoutScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [customLoadingText, setCustomLoadingText] = useState<string | null>(null);
  const scrollRef = useRef<KeyboardAwareScrollView>(null);
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
    isEditingPlanMissing,
    headerTitle,
    headerSubtitle,
    saveLabel,
    selectedListTitle,
    selectedListSubtitle,
    isSaveDisabled,
    isLoading,
    handleRemoveExercise,
    handleReorderExercises,
    handleSavePlan,
    setEditingPlanId,
    setIsLoading,
    resetSession,
    resetFilters,
    setSearchTerm,
  } = usePlanBuilderContext();

  // Track if we're returning from add-exercises
  const isReturningFromAddExercises = useRef(false);

  useLayoutEffect(() => {
    // Set editing plan ID immediately on mount
    setEditingPlanId(editingPlanId);

    return () => {
      resetSession();
    };
  }, [editingPlanId, resetSession, setEditingPlanId]);

  // Handle returning from add-exercises screen
  useFocusEffect(
    useCallback(() => {
      if (isReturningFromAddExercises.current) {
        // Wait for navigation animations to complete before hiding loading
        const task = InteractionManager.runAfterInteractions(() => {
          setIsLoading(false);
        });
        isReturningFromAddExercises.current = false;
        return () => task.cancel();
      }
    }, [setIsLoading])
  );

  useEffect(() => {
    router.prefetch('/add-exercises');
  }, [router]);

  // Reset custom loading text when loading finishes
  useEffect(() => {
    if (!isLoading) {
      setCustomLoadingText(null);
    }
  }, [isLoading]);

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
      // If this is a nested program workout (e.g. from Edit Plan screen), just go back
      const idStr = Array.isArray(planId) ? planId[0] : planId;
      if (idStr && (idStr.startsWith('program:') || idStr.includes('%3A'))) {
        router.back();
        return;
      }

      // If editing, go explicitly to My Programs (Plans tab)
      router.push('/(tabs)/plans');
    } else {
      // If creating, go back to Add Workout
      router.replace({
        pathname: '/(tabs)/add-workout',
        params: { mode: 'workout' }
      });
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

  const handleSavePlanPress = useCallback(() => {
    void (async () => {
      try {
        const result = await handleSavePlan();

        if (result === 'success') {
          // If returnTo is specified, use it for navigation
          if (decodedReturnTo) {
            router.replace(decodedReturnTo);
            return;
          }

          handleBackPress();
        }
        // Note: 'duplicate-name' no longer returned - system auto-renames duplicates
      } catch (error: any) {
        if (error?.message === 'FREE_LIMIT_REACHED') {
          setShowLimitModal(true);
        }
      }
      // Note: 'duplicate-name' no longer returned - system auto-renames duplicates
    })();
  }, [handleSavePlan, router, planId, decodedReturnTo]);

  const handleAddExercisesPress = useCallback(() => {
    triggerHaptic('selection');
    setEditingPlanId(editingPlanId); // Ensure context is synced
    setCustomLoadingText('Loading exercises...');
    setIsLoading(true); // Trigger immediate loading feedback
    isReturningFromAddExercises.current = true; // Mark that we're going to add-exercises

    // Reset filters and search BEFORE navigating so the next screen is clean on mount
    resetFilters();
    setSearchTerm('');

    // Navigate immediately - loading state is already set
    router.push('/add-exercises');
  }, [router, setIsLoading, setEditingPlanId, editingPlanId, resetFilters, setSearchTerm]);

  const hasExercises = selectedExercises.length > 0;

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
              {customLoadingText || (isEditing ? 'Loading workout...' : 'Building workout...')}
            </Text>
          </View>
        ) : (
          <KeyboardAwareScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            enableOnAndroid
            extraScrollHeight={spacing['2xl'] * 4}
            keyboardOpeningTime={0}
            enableAutomaticScroll={false}
          >
            {/* Header */}
            <View style={styles.topSection}>
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
                style={{ padding: spacing.sm, paddingTop: spacing.xs, borderRadius: radius.full }}
              >
                <IconSymbol name="arrow-back" size={sizing.iconMD} color={colors.text.primary} />
              </Pressable>
            </View>

            {isEditing && isEditingPlanMissing ? (
              <SurfaceCard tone="neutral" padding="xl" showAccentStripe={false} style={styles.missingPlanCard}>
                <Text variant="bodySemibold" color="primary">
                  Plan unavailable
                </Text>
                <Text variant="body" color="secondary">
                  We couldn't find the plan you're trying to edit. Please go back and select another plan.
                </Text>
                <Button label="Go Back" variant="secondary" onPress={router.back} />
              </SurfaceCard>
            ) : null}

            <View style={styles.nameCardContainer}>
              <PlanNameCard value={planName} onChange={setPlanName} label="Name" placeholder="e.g. Push Day" />
            </View>

            {hasExercises ? (
              <PlanSelectedExerciseList
                exercises={selectedExercises}
                onRemoveExercise={handleRemoveExercise}
                onAddExercises={handleAddExercisesPress}
                title={selectedListTitle}
                subtitle={selectedListSubtitle}
                addLabel="Add Exercises"
                onReorderExercises={handleReorderExercises}
              />
            ) : (
              <PlanEmptyStateCard
                title="No exercises yet"
                buttonLabel="Add Exercises"
                onPress={handleAddExercisesPress}
                style={styles.emptyCard}
              />
            )}

            <View style={styles.addButtonContainer}>
              <Button
                label={saveLabel}
                variant="primary"
                size="lg"
                onPress={handleSavePlanPress}
                disabled={isSaveDisabled}
                loading={isSaving}
              />
            </View>
          </KeyboardAwareScrollView>
        )}
      </View>
    </>
  );
};

export default CreateWorkoutScreen;
