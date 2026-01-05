import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { ActivityIndicator, InteractionManager } from 'react-native';

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
  const { planId, premadeWorkoutId, returnTo, from } = useLocalSearchParams<{ planId?: string; premadeWorkoutId?: string; returnTo?: string; from?: string }>();
  const editingPlanId = useMemo(() => {
    // Prioritize planId (Edit Mode) over premadeWorkoutId (Review/Create Mode)
    // This fixes an issue where residual params might trigger Review mode when Edit is intended
    if (planId) {
      const id = Array.isArray(planId) ? planId[0] : planId;
      if (id) return id;
    }

    if (premadeWorkoutId) {
      const id = Array.isArray(premadeWorkoutId) ? premadeWorkoutId[0] : premadeWorkoutId;
      if (id) return `premade:${id}`;
    }

    return null;
  }, [planId, premadeWorkoutId]);
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

  useEffect(() => {
    setEditingPlanId(editingPlanId);

    return () => {
      resetSession();
    };
  }, [editingPlanId, resetSession, setEditingPlanId]);

  useEffect(() => {
    router.prefetch('/add-exercises');
  }, [router]);

  // Reset custom loading text when loading finishes
  useEffect(() => {
    if (!isLoading) {
      setCustomLoadingText(null);
    }
  }, [isLoading]);

  // Turn off loading state when screen gains focus
  // This handles the return transition from "Add Exercises" or other screens
  useFocusEffect(
    useCallback(() => {
      if (isLoading) {
        // Defer hiding the loading screen until interactions (navigation animations) are complete
        // and add a small buffer to ensure the UI has time to paint and prevent visual pop-in
        const task = InteractionManager.runAfterInteractions(() => {
          // A short timeout ensures the frame has actually painted
          setTimeout(() => {
            setIsLoading(false);
          }, 100);
        });

        return () => task.cancel();
      }
    }, [isLoading, setIsLoading])
  );

  const isPremadeReview = Boolean(premadeWorkoutId);

  // Scroll to top when entering review mode
  useEffect(() => {
    if (isPremadeReview && scrollRef.current) {
      // Small delay to ensure the component has mounted
      setTimeout(() => {
        scrollRef.current?.scrollToPosition(0, 0, false);
      }, 100);
    }
  }, [isPremadeReview]);

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
    void Haptics.selectionAsync();

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
    } else if (premadeWorkoutId) {
      // If reviewing a premade workout and coming from browse, go back to Browse Workouts
      if (from === 'browse') {
        router.replace({
          pathname: '/(tabs)/browse-programs',
          params: { mode: 'workout' }
        });
        return;
      }
      
      // If reviewing a premade workout and coming from quiz, go back to Quiz results
      if (from === 'quiz') {
        router.back();
        return;
      }
      
      // Otherwise, go to Programs Page after saving
      // Using explicit push instead of back() because back() was navigating to dashboard in Tabs layout
      router.push('/(tabs)/plans');
    } else {
      // If creating, go back to Add Workout
      router.replace({
        pathname: '/(tabs)/add-workout',
        params: { mode: 'workout' }
      });
    }
  }, [router, planId, decodedReturnTo, premadeWorkoutId, from]);

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
    void Haptics.selectionAsync();
    setEditingPlanId(editingPlanId); // Ensure context is synced
    setCustomLoadingText('Loading exercises...');
    setIsLoading(true); // Trigger immediate loading feedback

    // Reset filters and search BEFORE navigating so the next screen is clean on mount
    resetFilters();
    setSearchTerm('');

    // Defer navigation slightly to allow the UI to render the loading state first
    setTimeout(() => {
      router.push('/add-exercises');
    }, 10);
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
