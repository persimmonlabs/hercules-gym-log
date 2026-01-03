import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

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
  const { planId, premadeWorkoutId, returnTo } = useLocalSearchParams<{ planId?: string; premadeWorkoutId?: string; returnTo?: string }>();
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
    handleRemoveExercise,
    handleReorderExercises,
    handleSavePlan,
    setEditingPlanId,
    resetSession,
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

  const isPremadeReview = Boolean(premadeWorkoutId);

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
      // If reviewing a premade workout, go back to Browse Workouts
      // Using explicit push instead of back() because back() was navigating to dashboard in Tabs layout
      router.push({
        pathname: '/(tabs)/browse-programs',
        params: { mode: 'workout' }
      });
    } else {
      // If creating, go back to Add Workout
      router.replace({
        pathname: '/(tabs)/add-workout',
        params: { mode: 'workout' }
      });
    }
  }, [router, planId, decodedReturnTo, premadeWorkoutId]);

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
    router.push('/add-exercises');
  }, [router]);

  const hasExercises = selectedExercises.length > 0;

  return (
    <>
      <PremiumLimitModal
        visible={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limitType="workout"
      />
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
                We couldn’t find the plan you’re trying to edit. Please go back and select another plan.
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
              addLabel="Add exercises"
              onReorderExercises={handleReorderExercises}
            />
          ) : (
            <PlanEmptyStateCard
              title="No exercises yet"
              buttonLabel="Add exercises"
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
      </View>
    </>
  );
};

export default CreateWorkoutScreen;
