import React, { useCallback, useEffect, useMemo } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { triggerHaptic } from '@/utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PlanSelectedExerciseList } from '@/components/molecules/PlanSelectedExerciseList';
import { PlanEmptyStateCard } from '@/components/molecules/PlanEmptyStateCard';
import { PlanNameCard } from '@/components/molecules/PlanNameCard';
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
    marginBottom: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.md,
    position: 'relative',
  },
  headerContent: {
    gap: spacing.md,
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    textAlign: 'center',
  },
  headerSubtitle: {
    textAlign: 'center',
    maxWidth: '100%',
  },
  missingPlanCard: {
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
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

const CreatePlanScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { planId } = useLocalSearchParams<{ planId?: string }>();
  const editingPlanId = useMemo(() => {
    if (!planId) {
      return null;
    }
    return Array.isArray(planId) ? planId[0] ?? null : planId;
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
    handleRemoveExercise,
    handleReorderExercises,
    handleSavePlan,
    setEditingPlanId,
    resetSession,
  } = usePlanBuilderContext();

  useEffect(() => {
    setEditingPlanId(editingPlanId);

    return () => {
      if (!editingPlanId) {
        resetSession();
      }
    };
  }, [editingPlanId, resetSession, setEditingPlanId]);

  useEffect(() => {
    router.prefetch('/add-exercises');
  }, [router]);


  const handleBackPress = useCallback(() => {
    triggerHaptic('selection');
    router.replace({
      pathname: '/(tabs)/add-workout',
      params: { mode: 'workout' }
    });
  }, [router]);

  const handleSavePlanPress = useCallback(() => {
    void (async () => {
      const result = await handleSavePlan();

      if (result === 'success') {
        router.push('/(tabs)/plans');
      } else if (result === 'duplicate-name') {
        triggerHaptic('error');
        Alert.alert(
          'Plan Name Taken',
          'A workout plan with this name already exists. Please choose a different name.',
          [{ text: 'OK' }]
        );
      }
    })();
  }, [handleSavePlan, router]);

  const handleAddExercisesPress = useCallback(() => {
    triggerHaptic('selection');
    router.push('/add-exercises');
  }, [router]);

  const hasExercises = selectedExercises.length > 0;

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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go Back"
            onPress={handleBackPress}
            style={{ padding: spacing.sm, paddingTop: spacing.xs, borderRadius: radius.full, position: 'absolute', left: 0, top: 0 }}
          >
            <IconSymbol name="arrow-back" size={sizing.iconMD} color={colors.text.primary} />
          </Pressable>
          <View style={styles.headerContent}>
            <Text variant="display1" color="primary" style={styles.headerTitle} fadeIn>
              {headerTitle}
            </Text>
            <Text variant="body" color="secondary" style={styles.headerSubtitle} fadeIn>
              {headerSubtitle}
            </Text>
          </View>
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
    </View>
  );
};

export default CreatePlanScreen;
