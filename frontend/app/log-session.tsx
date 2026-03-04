/**
 * log-session
 * Screen for manually logging a past workout session from the calendar.
 * Mirrors the editing mode of workout-detail but creates a new session.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LogSessionContent } from '@/components/organisms/LogSessionContent';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { colors, radius, spacing, shadows, zIndex } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useWorkoutSessionsStore, type WorkoutSessionsState } from '@/store/workoutSessionsStore';
import { parseLocalISODate } from '@/utils/date';
import type { Workout, WorkoutExercise } from '@/types/workout';
import { getExerciseTypeByName } from '@/constants/exercises';
import { useCustomExerciseStore } from '@/store/customExerciseStore';

const LogSessionScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const addWorkout = useWorkoutSessionsStore((state: WorkoutSessionsState) => state.addWorkout);

  const selectedDate = date ?? '';

  // The time the user tapped "Log a Session" — captured as the default startTime
  const [defaultStartTime] = useState<number>(() => Date.now());

  const [workoutName, setWorkoutName] = useState<string>('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Friendly date label (not editable)
  const friendlyDateLabel = useMemo(() => {
    if (!selectedDate) return '';
    const d = parseLocalISODate(selectedDate);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }, [selectedDate]);

  const handleCancel = useCallback(() => {
    triggerHaptic('selection');
    router.back();
  }, [router]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    triggerHaptic('success');

    // Auto-complete cardio/duration sets that have meaningful data
    const currentCustomExercises = useCustomExerciseStore.getState().customExercises;
    const finalExercises = exercises.map((exercise) => {
      const exType = getExerciseTypeByName(exercise.name, currentCustomExercises);
      if (exType !== 'cardio' && exType !== 'duration') return exercise;
      return {
        ...exercise,
        sets: (exercise.sets ?? []).map((set) => {
          if (set.completed) return set;
          const hasDuration = (set.duration ?? 0) > 0;
          const hasDistance = (set.distance ?? 0) > 0;
          if (hasDuration || hasDistance) {
            return { ...set, completed: true };
          }
          return set;
        }),
      };
    });

    // Build the startTime from the selected date + current time-of-day
    const dateObj = parseLocalISODate(selectedDate);
    const now = new Date(defaultStartTime);
    dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    const startTime = dateObj.getTime();

    const workout: Workout = {
      id: `manual-log-${Date.now()}`,
      planId: null,
      name: workoutName.trim() || 'Logged Workout',
      date: selectedDate,
      startTime,
      endTime: durationSeconds > 0 ? startTime + durationSeconds * 1000 : startTime,
      duration: durationSeconds > 0 ? durationSeconds : undefined,
      exercises: finalExercises,
    };

    try {
      await addWorkout(workout);
      router.back();
    } catch (error) {
      console.error('[log-session] Failed to save workout', error);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, exercises, selectedDate, defaultStartTime, workoutName, durationSeconds, addWorkout, router]);

  const handleExercisesChange = useCallback((updated: WorkoutExercise[]) => {
    setExercises(updated);
  }, []);

  const handleDurationChange = useCallback((seconds: number) => {
    setDurationSeconds(seconds);
  }, []);

  // Handle Android hardware back button
  React.useEffect(() => {
    const backAction = () => {
      handleCancel();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [handleCancel]);

  return (
    <>
      {/* Sticky header */}
      <View style={[styles.stickyHeader, { backgroundColor: theme.primary.bg, paddingTop: insets.top + spacing.md }]}>
        <View style={styles.stickyHeaderContent}>
          <Text variant="heading3" color="primary">Logging Workout</Text>
          <View style={styles.stickyActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel logging"
              onPress={handleCancel}
              hitSlop={spacing.xs}
              style={[styles.stickyButton, { backgroundColor: theme.surface.card, borderColor: theme.border.medium, borderWidth: 1 }]}
            >
              <IconSymbol name="close" color={theme.text.secondary} size={20} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save logged workout"
              onPress={handleSave}
              hitSlop={spacing.xs}
              style={[styles.stickyButton, styles.saveButton, { backgroundColor: theme.accent.orange }]}
              disabled={isSaving}
            >
              <IconSymbol name="check" color={theme.text.onAccent} size={20} />
            </Pressable>
          </View>
        </View>
      </View>

      <TabSwipeContainer
        contentContainerStyle={[styles.scrollContent, { paddingTop: 70 + insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          <View style={styles.headerContent}>
            <TextInput
              style={[
                styles.titleInput,
                { color: theme.text.primary, borderColor: theme.accent.orangeMuted, backgroundColor: theme.surface.card }
              ]}
              value={workoutName}
              onChangeText={setWorkoutName}
              placeholder="Workout name"
              placeholderTextColor={theme.text.tertiary}
              autoCapitalize="words"
              returnKeyType="done"
            />
            <Text style={{ fontSize: 16, fontWeight: '500', color: theme.text.secondary, marginTop: spacing.xxs }}>
              {friendlyDateLabel}
            </Text>
          </View>
        </View>

        <LogSessionContent
          exercises={exercises}
          durationSeconds={durationSeconds}
          onExercisesChange={handleExercisesChange}
          onDurationChange={handleDurationChange}
        />
      </TabSwipeContainer>
    </>
  );
};

export default LogSessionScreen;

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    gap: spacing['2xl'],
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  topSection: { gap: spacing.md },
  headerContent: { flex: 1, gap: spacing.xs },
  titleInput: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
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
  saveButton: {
    backgroundColor: colors.accent.orange,
  },
});
