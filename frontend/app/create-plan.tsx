import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PlanQuickBuilderCard } from '@/components/molecules/PlanQuickBuilderCard';
import type { PlanQuickBuilderField } from '@/types/planQuickBuilder';
import { PlanSelectedExerciseList } from '@/components/molecules/PlanSelectedExerciseList';
import { PremiumLimitModal } from '@/components/molecules/PremiumLimitModal';
import { useSemanticExerciseSearch } from '@/hooks/useSemanticExerciseSearch';
import { type Plan, type PlansState, usePlansStore } from '@/store/plansStore';
import { useProgramsStore } from '@/store/programsStore';
import { exercises, type Exercise, type ExerciseCatalogItem } from '@/constants/exercises';
import { timingSlow } from '@/constants/animations';
import { colors, radius, spacing, sizing, zIndex } from '@/constants/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type SubmitPlanResult = 'success' | 'missing-name' | 'no-exercises' | 'error';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary.bg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    gap: spacing.sm,
    paddingBottom: spacing['2xl'] * 4,
  },
  keyboardAvoider: {
    flex: 1,
  },
  topSection: {
    width: '100%',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  backButtonContainer: {
    borderRadius: radius.lg,
    marginLeft: spacing.sm,
    paddingTop: spacing.xs,
  },
  backButtonPressable: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
    paddingLeft: 0,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
    justifyContent: 'center',
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
  builderContainer: {
    marginTop: -spacing.sm,
  },
  missingPlanCard: {
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent.orangeLight,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    position: 'relative',
  },
});

const CreatePlanScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { planId, premadeWorkoutId } = useLocalSearchParams<{ planId?: string; premadeWorkoutId?: string }>();
  const editingPlanId = useMemo(() => {
    if (!planId) {
      return null;
    }

    return Array.isArray(planId) ? planId[0] ?? null : planId;
  }, [planId]);

  const targetPremadeWorkoutId = useMemo(() => {
    if (!premadeWorkoutId) {
      return null;
    }
    return Array.isArray(premadeWorkoutId) ? premadeWorkoutId[0] ?? null : premadeWorkoutId;
  }, [premadeWorkoutId]);
  const scrollRef = useRef<ScrollView | null>(null);
  const cardOffset = useRef<number>(0);
  const fieldPositions = useRef<Record<PlanQuickBuilderField, number>>({
    planName: 0,
    search: 0,
  });
  const containerTranslateY = useSharedValue(SCREEN_HEIGHT);
  const [planName, setPlanName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<PlanQuickBuilderField | null>(null);
  const hasInitializedFromPlan = useRef<boolean>(false);
  const [isNameDuplicate, setIsNameDuplicate] = useState<boolean>(false);
  const [showLimitModal, setShowLimitModal] = useState<boolean>(false);

  const persistPlan = usePlansStore((state: PlansState) => state.addPlan);
  const updatePlanStore = usePlansStore((state: PlansState) => state.updatePlan);
  const plans = usePlansStore((state: PlansState) => state.plans);
  const editingPlan = useMemo<Plan | null>(() => {
    if (!editingPlanId) {
      return null;
    }

    return plans.find((plan) => plan.id === editingPlanId) ?? null;
  }, [plans, editingPlanId]);

  const premadeWorkouts = useProgramsStore((state) => state.premadeWorkouts);
  const premadeWorkout = useMemo(() => {
    if (!targetPremadeWorkoutId) return null;
    return premadeWorkouts.find(w => w.id === targetPremadeWorkoutId) ?? null;
  }, [premadeWorkouts, targetPremadeWorkoutId]);
  
  // Check if this premade workout has already been added to My Workouts
  const isAlreadyAdded = useMemo(() => {
    if (!premadeWorkout) return false;
    const addedWorkoutNames = new Set(
      plans
        .filter(plan => plan.source === 'premade' || plan.source === 'library' || plan.source === 'recommended')
        .map(plan => plan.name.trim().toLowerCase())
    );
    return addedWorkoutNames.has(premadeWorkout.name.trim().toLowerCase());
  }, [premadeWorkout, plans]);
  const selectedIds = selectedExercises.map((exercise) => exercise.id);
  const suggestedExercises = useSemanticExerciseSearch(searchTerm, exercises, {
    excludeIds: selectedIds,
    limit: 6,
  });

  const isEditing = Boolean(editingPlanId);
  const isPremadeReview = Boolean(targetPremadeWorkoutId);

  const nameFieldLabel = 'Name';
  const namePlaceholder = 'e.g. Push Day';
  const selectedListTitle = 'Plan exercises';
  const selectedListSubtitle = 'Tap to remove. Use arrows to reorder.';

  let saveCtaLabel = 'Save Workout';
  let headerTitle = 'Create Workout';
  let headerSubtitle = 'Build your workout template';

  if (isEditing) {
    saveCtaLabel = 'Update Workout';
    headerTitle = 'Edit Workout';
    headerSubtitle = 'Update your workout template';
  } else if (isPremadeReview) {
    saveCtaLabel = 'Add Workout';
    headerTitle = 'Review Workout';
    headerSubtitle = 'Review and customize this workout template';
  }

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: containerTranslateY.value }],
  }));

  useEffect(() => {
    containerTranslateY.value = withTiming(0, timingSlow);
  }, [containerTranslateY]);

  useEffect(() => {
    if (hasInitializedFromPlan.current) {
      return;
    }

    if (isEditing && editingPlan) {
      setPlanName(editingPlan.name);
      setSelectedExercises(editingPlan.exercises);
      setSearchTerm('');
      hasInitializedFromPlan.current = true;
    } else if (premadeWorkout) {
      // If this premade workout has already been added, redirect back
      if (isAlreadyAdded) {
        router.back();
        return;
      }
      
      setPlanName(premadeWorkout.name);

      // Map premade exercises (which might just have IDs) to full Exercise objects
      const mappedExercises = premadeWorkout.exercises.map(ex => {
        const fullExercise = exercises.find(e => e.id === ex.id);
        return fullExercise ? { ...fullExercise } : null;
      }).filter((ex): ex is ExerciseCatalogItem => ex !== null);

      setSelectedExercises(mappedExercises);
      setSearchTerm('');
      hasInitializedFromPlan.current = true;
    }
  }, [editingPlan, isEditing, premadeWorkout, isAlreadyAdded, router]);

  useEffect(() => {
    const trimmedName = planName.trim();

    if (!trimmedName) {
      setIsNameDuplicate(false);
      return;
    }

    // Check if name is duplicate (excluding current plan if editing)
    const isDuplicate = plans.some((plan) => {
      if (isEditing && plan.id === editingPlanId) {
        return false;
      }
      return plan.name.toLowerCase() === trimmedName.toLowerCase();
    });

    setIsNameDuplicate(isDuplicate);
  }, [planName, plans, isEditing, editingPlanId]);

  const handleAddExercise = useCallback((exercise: Exercise) => {
    setSelectedExercises((prev) => {
      const exists = prev.some((item) => item.id === exercise.id);

      if (exists) {
        return prev;
      }

      return [...prev, exercise];
    });
  }, []);

  const handleRemoveExercise = useCallback((exerciseId: string) => {
    setSelectedExercises((prev) => prev.filter((exercise) => exercise.id !== exerciseId));
  }, []);

  const handleReorderList = useCallback((newExercises: Exercise[]) => {
    setSelectedExercises(newExercises);
  }, []);

  const handleCardLayout = useCallback((positionY: number) => {
    cardOffset.current = positionY;
  }, []);

  const handleFieldLayout = useCallback((field: PlanQuickBuilderField, positionY: number) => {
    fieldPositions.current[field] = positionY;
  }, []);

  const handleFieldFocus = useCallback((field: PlanQuickBuilderField) => {
    const scrollView = scrollRef.current;
    const fieldOffset = cardOffset.current + fieldPositions.current[field];
    const desiredOffset = Math.max(fieldOffset - spacing.xs, cardOffset.current);

    setFocusedField(field);

    if (scrollView) {
      scrollView.scrollTo({ y: Math.max(desiredOffset, 0), animated: true });
    }
  }, []);

  const handleFieldBlur = useCallback(() => {
    setFocusedField(null);
  }, []);

  const editingPlanCreatedAt = editingPlan?.createdAt ?? null;

  const submitPlan = useCallback(async (): Promise<SubmitPlanResult> => {
    const trimmedName = planName.trim();

    if (!trimmedName) {
      return 'missing-name';
    }

    if (selectedExercises.length === 0) {
      return 'no-exercises';
    }

    const isEditingPlan = Boolean(editingPlanId);
    const createdAtTimestamp = isEditingPlan && editingPlanCreatedAt
      ? editingPlanCreatedAt
      : Date.now();

    try {
      console.log('[create-plan] Submitting plan', { name: trimmedName, exerciseCount: selectedExercises.length });

      if (isEditingPlan) {
        // Update existing plan - the store handles Supabase sync
        await updatePlanStore({
          id: editingPlanId as string,
          name: trimmedName,
          exercises: selectedExercises,
          createdAt: createdAtTimestamp,
        });
      } else {
        // Create new plan - the store handles Supabase sync
        await persistPlan({
          name: trimmedName,
          exercises: selectedExercises,
          createdAt: createdAtTimestamp,
          source: isPremadeReview ? 'premade' : 'custom',
        });
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return 'success';
    } catch (error: any) {
      if (error?.message === 'FREE_LIMIT_REACHED') {
        setShowLimitModal(true);
        return 'error';
      }
      console.error('[create-plan] Failed to persist plan', error);
      return 'error';
    }
  }, [editingPlanCreatedAt, editingPlanId, persistPlan, planName, selectedExercises, updatePlanStore]);

  const handleSavePlan = useCallback(async () => {
    const trimmedName = planName.trim();

    if (trimmedName.length === 0 || selectedExercises.length === 0) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await submitPlan();

      if (result === 'success') {
        if (!isEditing) {
          setPlanName('');
          setSearchTerm('');
          setSelectedExercises([]);
        }
        router.back();
      }
    } finally {
      setIsSaving(false);
    }
  }, [isEditing, planName, router, selectedExercises, submitPlan]);

  const handleBackPress = useCallback(() => {
    void Haptics.selectionAsync();

    containerTranslateY.value = withTiming(
      SCREEN_HEIGHT,
      timingSlow,
      (finished) => {
        if (finished) {
          runOnJS(router.back)();
        }
      }
    );
  }, [containerTranslateY, router]);

  return (
    <>
      <PremiumLimitModal
        visible={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limitType="workout"
      />
      <Animated.View style={[styles.container, { paddingTop: spacing.lg + insets.top, paddingBottom: insets.bottom + sizing.tabBarHeight }, animatedContainerStyle]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={spacing['2xl']}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.topSection}>
            <View style={styles.headerContent}>
              <Text variant="heading1" color="primary" style={styles.headerTitle} fadeIn>
                {headerTitle}
              </Text>
              <Text variant="body" color="secondary" style={styles.headerSubtitle} fadeIn>
                {headerSubtitle}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go Back"
              style={styles.backButtonContainer}
              onPress={handleBackPress}
            >
              <IconSymbol name="arrow-back" size={sizing.iconMD} color={colors.text.primary} />
            </Pressable>
          </View>

          {isEditing && !editingPlan ? (
            <SurfaceCard tone="neutral" padding="xl" showAccentStripe={false} style={styles.missingPlanCard}>
              <Text variant="bodySemibold" color="primary">
                Plan unavailable
              </Text>
              <Text variant="body" color="secondary">
                We couldn’t find the plan you’re trying to edit. Please go back and select another plan.
              </Text>
              <Button label="Go Back" variant="secondary" onPress={router.back} />
            </SurfaceCard>
          ) : isPremadeReview && isAlreadyAdded ? (
            <SurfaceCard tone="neutral" padding="xl" showAccentStripe={false} style={styles.missingPlanCard}>
              <Text variant="bodySemibold" color="primary">
                Workout Already Added
              </Text>
              <Text variant="body" color="secondary">
                This workout has already been added to your My Workouts. You can find it in the Plans tab.
              </Text>
              <Button label="Go Back" variant="secondary" onPress={router.back} />
            </SurfaceCard>
          ) : null}

          {!(isPremadeReview && isAlreadyAdded) && (
          <View style={styles.builderContainer}>
            <PlanQuickBuilderCard
              planName={planName}
              onPlanNameChange={setPlanName}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              suggestions={suggestedExercises}
              onAddExercise={handleAddExercise}
              onCardLayout={handleCardLayout}
              onFieldLayout={handleFieldLayout}
              onFieldFocus={handleFieldFocus}
              onFieldBlur={handleFieldBlur}
              onFocusSearch={() => handleFieldFocus('search')}
              isFieldFocused={focusedField !== null}
              planNameLabel={nameFieldLabel}
              planNamePlaceholder={namePlaceholder}
              isNameDuplicate={isNameDuplicate}
            />
          </View>
        )}

          {!(isPremadeReview && isAlreadyAdded) && (
          <PlanSelectedExerciseList
            exercises={selectedExercises}
            onRemoveExercise={handleRemoveExercise}
            onAddExercises={() => handleFieldFocus('search')}
            onReorder={handleReorderList}
            onReorderExercises={(fromIndex, toIndex) => {
              const newExercises = [...selectedExercises];
              const [moved] = newExercises.splice(fromIndex, 1);
              newExercises.splice(toIndex, 0, moved);
              handleReorderList(newExercises);
            }}
            onSave={handleSavePlan}
            isSaveDisabled={planName.trim().length === 0 || selectedExercises.length === 0 || isSaving || isNameDuplicate}
            isSaving={isSaving}
            title={selectedListTitle}
            subtitle={selectedListSubtitle}
            saveLabel={saveCtaLabel}
          />
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
    </>
  );
};

export default CreatePlanScreen;
