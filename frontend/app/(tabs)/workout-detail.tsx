/**
 * workout-detail
 * Screen that presents a completed workout session with full detail.
 * Now integrated into the Tab navigator to ensure consistent layout and tab bar visibility.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '@/utils/haptics';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/atoms/Button';
import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WorkoutDetailContent } from '@/components/organisms/WorkoutDetailContent';
import { EditableWorkoutDetailContent } from '@/components/organisms/EditableWorkoutDetailContent';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { colors, radius, spacing, shadows, zIndex } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { usePlansStore, type PlansState } from '@/store/plansStore';
import { useWorkoutSessionsStore, type WorkoutSessionsState } from '@/store/workoutSessionsStore';
import { formatSessionDateTime, formatWorkoutTitle } from '@/utils/workout';
import { useWorkoutDetailAnimation } from '@/hooks/useWorkoutDetailAnimation';
import type { Workout, WorkoutExercise } from '@/types/workout';
import { useNavigationStore } from '@/store/navigationStore';

const WorkoutDetailScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { workoutId, from } = useLocalSearchParams<{ workoutId?: string; from?: string }>();
  const workouts = useWorkoutSessionsStore((state: WorkoutSessionsState) => state.workouts);
  const hydrateWorkouts = useWorkoutSessionsStore((state: WorkoutSessionsState) => state.hydrateWorkouts);
  const deleteWorkout = useWorkoutSessionsStore((state: WorkoutSessionsState) => state.deleteWorkout);
  const updateWorkout = useWorkoutSessionsStore((state: WorkoutSessionsState) => state.updateWorkout);
  const plans = usePlansStore((state: PlansState) => state.plans);
  const hydratePlans = usePlansStore((state: PlansState) => state.hydratePlans);
  const setWorkoutDetailSource = useNavigationStore((state) => state.setWorkoutDetailSource);
  const clearWorkoutDetailSource = useNavigationStore((state) => state.clearWorkoutDetailSource);
  const [isDeleteDialogVisible, setIsDeleteDialogVisible] = useState<boolean>(false);
  const [lastKnownWorkout, setLastKnownWorkout] = useState<Workout | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedName, setEditedName] = useState<string>('');
  const [editedExercises, setEditedExercises] = useState<WorkoutExercise[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    void hydrateWorkouts();
    void hydratePlans();
  }, [hydratePlans, hydrateWorkouts]);

  // Set navigation source when component mounts
  useEffect(() => {
    if (from === 'dashboard' || from === 'calendar') {
      setWorkoutDetailSource(from);
    }
    
    // Clear source when component unmounts
    return () => {
      clearWorkoutDetailSource();
    };
  }, [from, setWorkoutDetailSource, clearWorkoutDetailSource]);

  const workoutFromStore = useMemo(() => workouts.find((item) => item.id === workoutId) ?? null, [workouts, workoutId]);

  useEffect(() => {
    if (workoutFromStore) {
      setLastKnownWorkout(workoutFromStore);
    }
  }, [workoutFromStore]);

  const workout = workoutFromStore ?? lastKnownWorkout;

  // Initialize edit state when entering edit mode
  const handleStartEditing = useCallback(() => {
    if (!workout) return;
    triggerHaptic('selection');
    setEditedName(workout.name ?? '');
    setEditedExercises(JSON.parse(JSON.stringify(workout.exercises)));
    setIsEditing(true);
  }, [workout]);

  const handleCancelEdit = useCallback(() => {
    triggerHaptic('selection');
    setIsEditing(false);
    setEditedName('');
    setEditedExercises([]);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!workout || isSaving) return;
    
    setIsSaving(true);
    triggerHaptic('success');
    
    const updatedWorkout: Workout = {
      ...workout,
      name: editedName.trim() || workout.name,
      exercises: editedExercises,
    };
    
    try {
      await updateWorkout(updatedWorkout);
      setIsEditing(false);
      setEditedName('');
      setEditedExercises([]);
    } catch (error) {
      console.error('[workout-detail] Failed to save workout', error);
    } finally {
      setIsSaving(false);
    }
  }, [workout, editedName, editedExercises, updateWorkout, isSaving]);

  const handleExercisesChange = useCallback((exercises: WorkoutExercise[]) => {
    setEditedExercises(exercises);
  }, []);

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

  // Handle Android hardware back button
  useEffect(() => {
    const backAction = () => {
      handleBackPress();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [handleBackPress]);

  const handleEditPress = useCallback(() => {
    handleStartEditing();
  }, [handleStartEditing]);

  const handleDeletePress = useCallback(() => {
    if (!workout) {
      return;
    }

    triggerHaptic('selection');
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
    triggerHaptic('success');
    setIsDeleteDialogVisible(false);
    handleDismiss();
  }, [deleteWorkout, handleDismiss, workout]);

  return (
    <>
      {/* Sticky header for edit mode */}
      {isEditing && (
        <View style={[styles.stickyHeader, { backgroundColor: theme.primary.bg, paddingTop: insets.top + spacing.md }]}>
          <View style={styles.stickyHeaderContent}>
            <Text variant="heading3" color="primary">Editing Workout</Text>
            <View style={styles.stickyActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel editing"
                onPress={handleCancelEdit}
                hitSlop={spacing.xs}
                style={[styles.stickyButton, { backgroundColor: theme.surface.card, borderColor: theme.border.medium, borderWidth: 1 }]}
              >
                <IconSymbol name="close" color={theme.text.secondary} size={20} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save changes"
                onPress={handleSaveEdit}
                hitSlop={spacing.xs}
                style={[styles.stickyButton, styles.saveButton, { backgroundColor: theme.accent.orange }]}
                disabled={isSaving}
              >
                <IconSymbol name="check" color={theme.text.onAccent} size={20} />
              </Pressable>
            </View>
          </View>
        </View>
      )}
      <TabSwipeContainer
        contentContainerStyle={[styles.scrollContent, { paddingTop: isEditing ? 70 + insets.top : insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          <View style={styles.headerRow}>
            <View style={styles.headerContent}>
            {isEditing ? (
              <TextInput
                style={[
                  styles.titleInput,
                  { color: theme.text.primary, borderColor: theme.accent.orangeMuted, backgroundColor: theme.surface.card }
                ]}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Workout name"
                placeholderTextColor={theme.text.tertiary}
                autoCapitalize="words"
                returnKeyType="done"
              />
            ) : (
              <Text variant="heading1" color="primary">
                {workoutTitle}
              </Text>
            )}
            <Text style={{ fontSize: 16, fontWeight: '500', color: theme.text.primary, marginTop: spacing.xxs }}>
              {sessionDateTime}
            </Text>
          </View>
          <View style={styles.actionIcons}>
            {!isEditing && (
              <>
                <Animated.View style={[styles.backButtonContainer, animatedBackStyle]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Go back to dashboard"
                    onPress={handleBackPress}
                    hitSlop={spacing.sm}
                    style={styles.backButtonPressable}
                  >
                    <IconSymbol name="arrow-back" color={theme.text.primary} size={24} />
                  </Pressable>
                </Animated.View>
                {workout ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Edit workout"
                      onPress={handleEditPress}
                      hitSlop={spacing.xs}
                      style={styles.iconButton}
                    >
                      <IconSymbol name="edit" color={theme.accent.orangeLight} size={24} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Delete workout"
                      onPress={handleDeletePress}
                      hitSlop={spacing.xs}
                      style={styles.iconButton}
                    >
                      <IconSymbol name="delete" color={theme.accent.orange} size={24} />
                    </Pressable>
                  </>
                ) : null}
              </>
            )}
          </View>
        </View>
      </View>

      {workout ? (
        isEditing ? (
          <EditableWorkoutDetailContent
            workout={{ ...workout, exercises: editedExercises }}
            onExercisesChange={handleExercisesChange}
          />
        ) : (
          <WorkoutDetailContent workout={workout} />
        )
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
    </>
  );
};

export default WorkoutDetailScreen;

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    gap: spacing['2xl'],
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
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
  saveButton: {
    backgroundColor: colors.accent.orange,
  },
  titleInput: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    color: colors.text.primary,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent.orangeMuted,
    backgroundColor: colors.surface.card,
    minHeight: 48,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: zIndex.sticky,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    ...shadows.sm,
  },
  stickyHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stickyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stickyButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogCardPressable: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  placeholderCard: {
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
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
    borderColor: colors.border.light,
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
