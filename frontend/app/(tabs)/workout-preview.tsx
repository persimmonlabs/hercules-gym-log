/**
 * WorkoutPreviewScreen
 * Preview screen for premade workouts - "take it or leave it" style.
 * Similar to program-details.tsx but for individual workouts.
 * 
 * Features:
 * - Instant load (no loading states - data already in store)
 * - Shows workout name, description, exercises
 * - "Add to My Workouts" button to save
 * - Back navigation to browse workouts
 */
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PremiumLimitModal } from '@/components/molecules/PremiumLimitModal';
import { colors, spacing, radius, sizing } from '@/constants/theme';
import { useProgramsStore } from '@/store/programsStore';
import { usePlansStore } from '@/store/plansStore';
import { exercises as exerciseCatalog } from '@/constants/exercises';
import type { PremadeWorkout } from '@/types/premadePlan';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.sm,
    paddingTop: spacing.xs,
    borderRadius: radius.full,
  },
  titleContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  outerCardContent: {
    gap: spacing.lg,
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  exerciseCard: {
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.md,
    gap: spacing.xs,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  exerciseNumber: {
    width: sizing.iconLG,
    height: sizing.iconLG,
    borderRadius: radius.full,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.accent.orange,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  exerciseNumberText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    includeFontPadding: false,
  },
  exerciseNameContainer: {
    flex: 1,
    flexShrink: 1,
    width: 0,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text.primary,
  },
  exercisesList: {
    gap: spacing.sm,
  },
});

export default function WorkoutPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{ workoutId: string; from?: string }>();
  const workoutId = Array.isArray(params.workoutId) ? params.workoutId[0] : params.workoutId;
  const from = Array.isArray(params.from) ? params.from[0] : params.from;

  const { premadeWorkouts } = useProgramsStore();
  const { addPlan, plans } = usePlansStore();
  const [isAdding, setIsAdding] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Direct lookup - instant, no loading needed
  const workout = premadeWorkouts.find(w => w.id === workoutId);

  // Check if already added
  const isAlreadyAdded = plans.some(p => p.name === workout?.name);

  const handleBack = useCallback(() => {
    triggerHaptic('selection');
    router.back();
  }, [router]);

  // Reset scroll position when screen gains focus
  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
      return () => clearTimeout(timeout);
    }, [])
  );

  // Handle Android hardware back button
  useEffect(() => {
    const backAction = () => {
      handleBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [handleBack]);

  // Not found state - instant render
  if (!workout) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + sizing.tabBarHeight }]}>
        <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
          <View style={styles.titleContainer}>
            <Text variant="heading2" color="primary">Workout Not Found</Text>
            <Text variant="body" color="secondary">The requested workout could not be found.</Text>
          </View>
          <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
            <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
        </View>
        <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Button label="Go Back" onPress={handleBack} />
        </View>
      </View>
    );
  }

  const handleAddToWorkouts = useCallback(async () => {
    if (isAdding || !workout) return;
    setIsAdding(true);
    triggerHaptic('selection');

    try {
      // Resolve exercises from catalog
      const resolvedExercises = workout.exercises
        .map(ex => exerciseCatalog.find(e => e.id === ex.id))
        .filter((e): e is NonNullable<typeof e> => e !== null && e !== undefined);

      await addPlan({
        name: workout.name,
        exercises: resolvedExercises,
        source: 'library',
      });

      triggerHaptic('success');

      // Navigate to My Workouts (Plans tab)
      router.replace('/(tabs)/plans');
    } catch (error: any) {
      if (error?.message === 'FREE_LIMIT_REACHED') {
        setShowLimitModal(true);
      } else {
        console.error('Failed to add workout:', error);
        Alert.alert('Error', 'Failed to add workout to your library.');
      }
    } finally {
      setIsAdding(false);
    }
  }, [addPlan, isAdding, workout, router]);

  // Format experience level for display
  const formatExperience = (level: string) => {
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  // Format goal for display
  const formatGoal = (goalStr: string) => {
    return goalStr.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <>
      <PremiumLimitModal
        visible={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limitType="workout"
      />
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + sizing.tabBarHeight }]}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text variant="heading2" color="primary">
                {workout.name}
              </Text>
              <Text variant="body" color="secondary">
                {workout.metadata.description}
              </Text>

              {/* Metadata badges */}
              <View style={styles.metadataRow}>
                <Badge
                  label={formatExperience(workout.metadata.experienceLevel)}
                  variant="workout"
                />
                <Badge
                  label={formatGoal(workout.metadata.goal)}
                  variant="workout"
                />
                <Badge
                  label={`~${workout.metadata.durationMinutes} min`}
                  variant="workout"
                />
              </View>
            </View>
            <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
              <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
            </Pressable>
          </View>

          {/* Exercises Card */}
          <SurfaceCard padding="xl" tone="neutral">
            <View style={styles.outerCardContent}>
              <Text variant="heading3" color="primary">
                Exercises ({workout.exercises.length})
              </Text>
              <View style={styles.exercisesList}>
                {workout.exercises.map((exercise, index) => (
                  <View key={exercise.id} style={styles.exerciseRow}>
                    <View style={styles.exerciseNumber}>
                      <Text style={styles.exerciseNumberText}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.exerciseNameContainer}>
                      <Text style={styles.exerciseName}>
                        {exercise.name}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </SurfaceCard>

          {/* Action Button */}
          <View style={styles.outerCardContent}>
            {isAlreadyAdded ? (
              <Button
                label="Already in My Workouts"
                onPress={() => router.replace('/(tabs)/plans')}
                size="lg"
                variant="secondary"
              />
            ) : (
              <Button
                label="Add to My Workouts"
                onPress={handleAddToWorkouts}
                loading={isAdding}
                size="lg"
              />
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
}
