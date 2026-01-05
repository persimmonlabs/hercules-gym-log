/**
 * workout-detail
 * Screen that presents a completed workout session with full detail.
 * Now integrated into the Tab navigator to ensure consistent layout and tab bar visibility.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/atoms/Button';
import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WorkoutDetailContent } from '@/components/organisms/WorkoutDetailContent';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { colors, radius, spacing } from '@/constants/theme';
import { usePlansStore, type PlansState } from '@/store/plansStore';
import { useWorkoutSessionsStore, type WorkoutSessionsState } from '@/store/workoutSessionsStore';
import { formatSessionDateTime, formatWorkoutTitle } from '@/utils/workout';
import { useWorkoutDetailAnimation } from '@/hooks/useWorkoutDetailAnimation';
import type { Workout } from '@/types/workout';

const WorkoutDetailScreen: React.FC = () => {
  const router = useRouter();
  const { workoutId, from } = useLocalSearchParams<{ workoutId?: string; from?: string }>();
  const workouts = useWorkoutSessionsStore((state: WorkoutSessionsState) => state.workouts);
  const hydrateWorkouts = useWorkoutSessionsStore((state: WorkoutSessionsState) => state.hydrateWorkouts);
  const deleteWorkout = useWorkoutSessionsStore((state: WorkoutSessionsState) => state.deleteWorkout);
  const plans = usePlansStore((state: PlansState) => state.plans);
  const hydratePlans = usePlansStore((state: PlansState) => state.hydratePlans);
  const [isDeleteDialogVisible, setIsDeleteDialogVisible] = useState<boolean>(false);
  const [lastKnownWorkout, setLastKnownWorkout] = useState<Workout | null>(null);

  useEffect(() => {
    void hydrateWorkouts();
    void hydratePlans();
  }, [hydratePlans, hydrateWorkouts]);

  const workoutFromStore = useMemo(() => workouts.find((item) => item.id === workoutId) ?? null, [workouts, workoutId]);

  useEffect(() => {
    if (workoutFromStore) {
      setLastKnownWorkout(workoutFromStore);
    }
  }, [workoutFromStore]);

  const workout = workoutFromStore ?? lastKnownWorkout;

  const planName = useMemo(() => {
    if (!workout?.planId) {
      return null;
    }
    return plans.find((plan) => plan.id === workout.planId)?.name ?? null;
  }, [plans, workout?.planId]);
  const workoutTitle = useMemo(() => formatWorkoutTitle(workout, planName), [planName, workout]);
  const sessionDateTime = useMemo(() => formatSessionDateTime(workout), [workout]);

  const handleDismiss = useCallback(() => {
    if (from === 'calendar') {
      router.replace('/(tabs)/calendar');
    } else if (from === 'dashboard') {
      router.replace('/(tabs)');
    } else {
      router.back();
    }
  }, [router, from]);

  // We keep the button animation but remove container animation since we are now in the tab flow
  const { animatedBackStyle, handleBackPress } = useWorkoutDetailAnimation({
    onDismiss: handleDismiss,
  });

  const handleDeletePress = useCallback(() => {
    if (!workout) {
      return;
    }

    void Haptics.selectionAsync();
    setIsDeleteDialogVisible(true);
  }, [workout]);

  const handleDismissDeleteDialog = useCallback(() => {
    setIsDeleteDialogVisible(false);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!workout) {
      return;
    }

    await deleteWorkout(workout.id);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsDeleteDialogVisible(false);
    handleDismiss();
  }, [deleteWorkout, handleDismiss, workout]);

  return (
    <TabSwipeContainer
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topSection}>
        <View style={styles.headerRow}>
          <View style={styles.headerContent}>
            <Text variant="heading1" color="primary">
              {workoutTitle}
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text.primary, marginTop: spacing.xxs }}>
              {sessionDateTime}
            </Text>
          </View>
          <View style={styles.actionIcons}>
            <Animated.View style={[styles.backButtonContainer, animatedBackStyle]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back to dashboard"
                onPress={handleBackPress}
                hitSlop={spacing.sm}
                style={styles.backButtonPressable}
              >
                <IconSymbol name="arrow-back" color={colors.text.primary} size={24} />
              </Pressable>
            </Animated.View>
            {workout ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete workout"
                onPress={handleDeletePress}
                hitSlop={spacing.xs}
                style={styles.iconButton}
              >
                <IconSymbol name="delete" color={colors.accent.orange} size={24} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {workout ? (
        <WorkoutDetailContent workout={workout} />
      ) : (
        <SurfaceCard tone="neutral" padding="xl" showAccentStripe={false} style={styles.placeholderCard}>
          <Text variant="bodySemibold" color="primary">
            Workout not available
          </Text>
          <Text variant="body" color="secondary">
            This workout couldn’t be found. Please return to the dashboard.
          </Text>
        </SurfaceCard>
      )}

      <Modal
        transparent
        visible={isDeleteDialogVisible}
        animationType="fade"
        onRequestClose={handleDismissDeleteDialog}
      >
        <Pressable style={styles.dialogOverlay} onPress={handleDismissDeleteDialog}>
          <Pressable
            style={styles.dialogCardPressable}
            onPress={(event) => event.stopPropagation()}
          >
            <SurfaceCard tone="neutral" padding="lg" showAccentStripe={false} style={styles.dialogCard}>
              <View style={styles.dialogContent}>
                <Text variant="heading3" color="primary">
                  Delete workout
                </Text>
                <Text variant="body" color="secondary">
                  Are you sure you want to delete this workout session? This action cannot be undone.
                </Text>
              </View>
              <View style={styles.dialogActions}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={handleDismissDeleteDialog}
                  size="md"
                  textColor={colors.accent.gradientStart}
                  style={[styles.dialogActionButton, styles.dialogCancelButton]}
                />
                <Button
                  label="Delete"
                  variant="primary"
                  onPress={handleConfirmDelete}
                  size="md"
                  style={styles.dialogActionButton}
                />
              </View>
            </SurfaceCard>
          </Pressable>
        </Pressable>
      </Modal>
    </TabSwipeContainer>
  );
};

export default WorkoutDetailScreen;

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    gap: spacing['2xl'],
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    // paddingBottom handled by TabSwipeContainer
  },
  topSection: { gap: spacing.md },
  backButtonContainer: { alignSelf: 'flex-start' },
  backButtonPressable: { borderRadius: radius.lg, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerContent: { flex: 1, gap: spacing.xs },
  titleWrapper: {
    paddingBottom: spacing.xs,
  },
  timestampText: {
    marginTop: spacing.xxs,
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: 'transparent',
  },
  dialogCardPressable: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  placeholderCard: {
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent.orangeLight,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent.orangeLight,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
  },
  dialogContent: {
    gap: spacing.xs,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  dialogActionButton: {
    flex: 1,
  },
  dialogCancelButton: {
    borderColor: colors.accent.gradientStart,
  },
});
