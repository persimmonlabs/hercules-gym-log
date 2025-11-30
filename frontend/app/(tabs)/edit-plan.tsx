/**
 * EditPlanScreen
 * Screen for editing an existing Plan (collection of workouts).
 * 
 * Features:
 * - Edit plan name
 * - Choose schedule type (Weekly or Rotation)
 * - Configure schedule (assign workouts to days or set rotation order)
 * - Add/remove workouts
 * - Tap workout to edit it
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PlanNameCard } from '@/components/molecules/PlanNameCard';
import { ScheduleTypeSelector } from '@/components/molecules/ScheduleTypeSelector';
import { WeeklyScheduleEditor } from '@/components/molecules/WeeklyScheduleEditor';
import { RotationScheduleEditor } from '@/components/molecules/RotationScheduleEditor';
import { colors, radius, spacing, sizing } from '@/constants/theme';
import { useProgramsStore } from '@/store/programsStore';
import type { 
  ScheduleType, 
  PlanScheduleConfig, 
  WeeklyScheduleConfig,
  RotationScheduleConfig,
  ProgramWorkout,
} from '@/types/premadePlan';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  datePickerLabel: {
    flex: 1,
  },
  datePickerValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scrollContent: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
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
  nameCardContainer: {
    marginTop: spacing.sm,
  },
  sectionCard: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.accent.success,
  },
  footer: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  notFoundCard: {
    gap: spacing.md,
    alignItems: 'center',
  },
});

const DEFAULT_WEEKLY_SCHEDULE: WeeklyScheduleConfig = {
  monday: null,
  tuesday: null,
  wednesday: null,
  thursday: null,
  friday: null,
  saturday: null,
  sunday: null,
};

export default function EditPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  
  const { 
    userPrograms, 
    updateUserProgram, 
    updateProgramSchedule,
    deleteWorkoutFromProgram,
    addWorkoutToProgram,
    activePlanId,
    setActivePlan,
  } = useProgramsStore();

  // Find the program
  const program = useMemo(() => 
    userPrograms.find(p => p.id === planId),
    [userPrograms, planId]
  );

  // Local state for editing
  const [planName, setPlanName] = useState(program?.name || '');
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    program?.schedule?.type || program?.scheduleType || 'rotation'
  );
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleConfig>(
    program?.schedule?.weekly || DEFAULT_WEEKLY_SCHEDULE
  );
  const [rotationSchedule, setRotationSchedule] = useState<RotationScheduleConfig>({
    workoutOrder: program?.schedule?.rotation?.workoutOrder || 
                  program?.workouts.map(w => w.id) || [],
    startDate: program?.schedule?.rotation?.startDate,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Sync local state when program changes
  useEffect(() => {
    if (program) {
      setPlanName(program.name);
      setScheduleType(program.schedule?.type || program.scheduleType || 'rotation');
      setWeeklySchedule(program.schedule?.weekly || DEFAULT_WEEKLY_SCHEDULE);
      setRotationSchedule({
        workoutOrder: program.schedule?.rotation?.workoutOrder || 
                      program.workouts.map(w => w.id) || [],
        startDate: program.schedule?.rotation?.startDate,
      });
    }
  }, [program]);

  // Format the start date for display
  const formattedStartDate = useMemo(() => {
    if (!rotationSchedule.startDate) return 'Not set';
    return new Date(rotationSchedule.startDate).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [rotationSchedule.startDate]);

  // Handle date picker change
  const handleDateChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    // On Android, the picker closes automatically, on iOS we need to handle it
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'set' && selectedDate) {
      // Set to start of day to ensure consistent behavior
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      setRotationSchedule(prev => ({
        ...prev,
        startDate: startOfDay.getTime(),
      }));
    }
    
    if (Platform.OS === 'ios' && event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  }, []);

  const handleOpenDatePicker = useCallback(() => {
    void Haptics.selectionAsync();
    setShowDatePicker(true);
  }, []);

  const handleCloseDatePicker = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const isActive = activePlanId === planId;

  const handleBackPress = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/(tabs)/plans');
  }, [router]);

  const saveChanges = useCallback(async () => {
    if (!program || !planName.trim()) return false;
    
    // Build schedule config
    const schedule: PlanScheduleConfig = {
      type: scheduleType,
      weekly: scheduleType === 'weekly' ? weeklySchedule : undefined,
      rotation: scheduleType === 'rotation' ? rotationSchedule : undefined,
      currentRotationIndex: program.schedule?.currentRotationIndex || 0,
    };

    // Update the program
    const updatedProgram = {
      ...program,
      name: planName.trim(),
      schedule,
      scheduleType,
      modifiedAt: Date.now(),
    };

    await updateUserProgram(updatedProgram);
    return true;
  }, [program, planName, scheduleType, weeklySchedule, rotationSchedule, updateUserProgram]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    void Haptics.selectionAsync();

    try {
      const success = await saveChanges();
      if (success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push('/(tabs)/plans');
      }
    } catch (error) {
      console.error('[EditPlanScreen] Failed to save:', error);
      Alert.alert('Error', 'Failed to save plan. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [saveChanges, router]);

  const handleAddWorkouts = useCallback(() => {
    void Haptics.selectionAsync();
    // Navigate to add workouts screen with the plan ID
    // The add-workouts-to-program screen will need to be updated to handle edit mode
    router.push({ 
      pathname: '/add-workouts-to-program',
      params: { editPlanId: planId }
    });
  }, [router, planId]);

  const handleAddRestDay = useCallback(() => {
    void Haptics.selectionAsync();
    
    if (!program || !planId) return;

    // Check if a Rest Day already exists in the program
    const existingRestDay = program.workouts.find(w => w.exercises.length === 0 && w.name === 'Rest Day');
    
    if (existingRestDay) {
      // Reuse existing rest day
      setRotationSchedule(prev => ({
        ...prev,
        workoutOrder: [...prev.workoutOrder, existingRestDay.id],
      }));
    } else {
      // Create new rest day
      const restDayId = `rest-${Date.now()}`;
      const restDayWorkout: ProgramWorkout = {
        id: restDayId,
        name: 'Rest Day',
        exercises: [],
      };
      
      addWorkoutToProgram(planId, restDayWorkout).then(() => {
        setRotationSchedule(prev => ({
          ...prev,
          workoutOrder: [...prev.workoutOrder, restDayId],
        }));
      });
    }
  }, [program, planId, addWorkoutToProgram]);

  const handleWorkoutPress = useCallback(async (workout: ProgramWorkout) => {
    void Haptics.selectionAsync();
    
    // Auto-save before navigating
    try {
      const success = await saveChanges();
      if (!success) {
        Alert.alert('Error', 'Please enter a plan name before editing workouts.');
        return;
      }
    } catch (error) {
      console.error('[EditPlanScreen] Failed to auto-save:', error);
      // Continue anyway? Probably safer to warn user.
    }

    // Navigate to edit workout screen with returnTo parameter
    const compositeId = encodeURIComponent(`program:${planId}:${workout.id}`);
    const returnTo = encodeURIComponent(`/(tabs)/edit-plan?planId=${planId}`);
    router.push(`/(tabs)/create-workout?planId=${compositeId}&premadeWorkoutId=&returnTo=${returnTo}`);
  }, [router, planId, saveChanges, planName]);

  const handleRemoveWorkout = useCallback((workoutId: string, index: number) => {
    if (!planId) return;
    
    Alert.alert(
      'Remove Workout',
      'Are you sure you want to remove this workout from the plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            
            // Check if this workout is used multiple times in the rotation
            const occurrenceCount = rotationSchedule.workoutOrder.filter(id => id === workoutId).length;
            
            // Update rotation schedule to remove ONLY this instance
            setRotationSchedule(prev => {
              const newOrder = [...prev.workoutOrder];
              newOrder.splice(index, 1);
              return { ...prev, workoutOrder: newOrder };
            });
            
            // If it was the last occurrence, also delete from program
            if (occurrenceCount === 1) {
              await deleteWorkoutFromProgram(planId, workoutId);
              
              // Update weekly schedule to clear any references
              setWeeklySchedule(prev => {
                const updated = { ...prev };
                (Object.keys(updated) as (keyof WeeklyScheduleConfig)[]).forEach(day => {
                  if (updated[day] === workoutId) {
                    updated[day] = null;
                  }
                });
                return updated;
              });
            }
          },
        },
      ]
    );
  }, [planId, deleteWorkoutFromProgram, rotationSchedule]);

  const handleToggleActive = useCallback(async () => {
    void Haptics.selectionAsync();
    
    if (isActive) {
      await setActivePlan(null);
    } else {
      await setActivePlan(planId || null);
    }
  }, [isActive, planId, setActivePlan]);

  const isSaveDisabled = !planName.trim();

  // Bottom padding to account for tab bar
  const scrollBottomPadding = spacing['2xl'] * 2 + insets.bottom;

  if (!program) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text variant="heading2" color="primary">Edit Plan</Text>
            </View>
            <Pressable onPress={handleBackPress} style={styles.backButton} hitSlop={8}>
              <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
            </Pressable>
          </View>
          
          <SurfaceCard tone="neutral" padding="xl" showAccentStripe={false} style={styles.notFoundCard}>
            <IconSymbol name="error-outline" size={48} color={colors.text.tertiary} />
            <Text variant="bodySemibold" color="primary">Plan Not Found</Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
              The plan you're trying to edit could not be found.
            </Text>
            <Button label="Go Back" onPress={handleBackPress} />
          </SurfaceCard>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text variant="heading2" color="primary">
              Edit Plan
            </Text>
            <Text variant="body" color="secondary">
              Customize your training schedule
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go Back"
            onPress={handleBackPress}
            style={styles.backButton}
            hitSlop={8}
          >
            <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
        </View>

        {/* Plan Name */}
        <View style={styles.nameCardContainer}>
          <PlanNameCard 
            value={planName} 
            onChange={setPlanName} 
            label="Plan Name" 
            placeholder="e.g. Push Pull Legs" 
          />
        </View>

        {/* Active Status */}
        <SurfaceCard tone="neutral" padding="lg" showAccentStripe={false}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text variant="bodySemibold" color="primary">Active Plan</Text>
              {isActive && (
                <View style={styles.activeBadge}>
                  <IconSymbol name="check" size={14} color={colors.text.onAccent} />
                  <Text variant="caption" color="onAccent">Active</Text>
                </View>
              )}
            </View>
            <Text variant="body" color="secondary">
              {isActive 
                ? "This plan is currently active. Today's workout will be based on your schedule."
                : "Set this as your active plan to see today's workout on the dashboard."
              }
            </Text>
            <Button
              label={isActive ? "Deactivate Plan" : "Set as Active Plan"}
              variant={isActive ? "secondary" : "primary"}
              size="md"
              onPress={handleToggleActive}
            />
          </View>
        </SurfaceCard>

        {/* Schedule Type */}
        <SurfaceCard tone="neutral" padding="lg" showAccentStripe={false}>
          <View style={styles.sectionCard}>
            <Text variant="bodySemibold" color="primary">Schedule Type</Text>
            <Text variant="body" color="secondary">
              Choose how you want to organize your workouts.
            </Text>
            <ScheduleTypeSelector
              value={scheduleType}
              onChange={setScheduleType}
            />
          </View>
        </SurfaceCard>

        {/* Schedule Configuration */}
        <SurfaceCard tone="neutral" padding="lg" showAccentStripe={false}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text variant="bodySemibold" color="primary">
                {scheduleType === 'weekly' ? 'Weekly Schedule' : 'Rotation Order'}
              </Text>
            </View>
            
            {scheduleType === 'weekly' ? (
              <>
                <WeeklyScheduleEditor
                  schedule={weeklySchedule}
                  workouts={program.workouts}
                  onChange={setWeeklySchedule}
                />
                <Button
                  label="Add Workouts"
                  variant="ghost"
                  size="sm"
                  onPress={handleAddWorkouts}
                />
              </>
            ) : (
              <>
                {/* Start Date Picker */}
                <View style={{ gap: spacing.sm }}>
                  <Text variant="caption" color="secondary">
                    Set the date when Day 1 of your rotation begins
                  </Text>
                  <Pressable style={styles.datePickerRow} onPress={handleOpenDatePicker}>
                    <Text variant="bodySemibold" color="primary" style={styles.datePickerLabel}>
                      Start Date
                    </Text>
                    <View style={styles.datePickerValue}>
                      <Text variant="body" color={rotationSchedule.startDate ? 'primary' : 'tertiary'}>
                        {formattedStartDate}
                      </Text>
                      <IconSymbol name="calendar-today" size={18} color={colors.accent.primary} />
                    </View>
                  </Pressable>
                  
                  {showDatePicker && (
                    Platform.OS === 'ios' ? (
                      <View style={{ alignItems: 'center', gap: spacing.sm }}>
                        <DateTimePicker
                          value={rotationSchedule.startDate ? new Date(rotationSchedule.startDate) : new Date()}
                          mode="date"
                          display="spinner"
                          onChange={handleDateChange}
                          textColor={colors.text.primary}
                        />
                        <Button 
                          label="Done" 
                          variant="ghost" 
                          size="sm" 
                          onPress={handleCloseDatePicker} 
                        />
                      </View>
                    ) : (
                      <DateTimePicker
                        value={rotationSchedule.startDate ? new Date(rotationSchedule.startDate) : new Date()}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                      />
                    )
                  )}
                </View>

                <RotationScheduleEditor
                  schedule={rotationSchedule}
                  workouts={program.workouts}
                  onWorkoutPress={handleWorkoutPress}
                  onRemoveWorkout={handleRemoveWorkout}
                  onChange={setRotationSchedule}
                />
                <View style={{ gap: spacing.sm }}>
                  <Button
                    label="Add Workouts"
                    variant="ghost"
                    size="sm"
                    onPress={handleAddWorkouts}
                  />
                  <Button
                    label="Add Rest Day"
                    variant="ghost"
                    size="sm"
                    onPress={handleAddRestDay}
                  />
                </View>
              </>
            )}
          </View>
        </SurfaceCard>

        {/* Save Button */}
        <View style={styles.footer}>
          <Button
            label="Save Changes"
            variant="primary"
            size="lg"
            onPress={handleSave}
            disabled={isSaveDisabled}
            loading={isSaving}
          />
        </View>
      </ScrollView>
    </View>
  );
}
