import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useActiveScheduleStore } from '@/store/activeScheduleStore';
import { useProgramsStore } from '@/store/programsStore';
import { usePlansStore } from '@/store/plansStore';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius, colors } from '@/constants/theme';
import type { ScheduleOverride } from '@/types/activeSchedule';
import { SheetModal } from './SheetModal';

interface AddOverrideModalProps {
  visible: boolean;
  onClose: () => void;
  editingOverride?: ScheduleOverride | null;
}

const getNextSevenDays = (): { date: string; label: string; isToday: boolean }[] => {
  const days: { date: string; label: string; isToday: boolean }[] = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    let label: string;
    if (i === 0) {
      label = 'Today';
    } else if (i === 1) {
      label = 'Tomorrow';
    } else {
      label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    days.push({ date: dateStr, label, isToday: i === 0 });
  }

  return days;
};

export const AddOverrideModal: React.FC<AddOverrideModalProps> = ({
  visible,
  onClose,
  editingOverride,
}) => {
  const { theme } = useTheme();
  const addOverride = useActiveScheduleStore((state) => state.addOverride);
  const removeOverride = useActiveScheduleStore((state) => state.removeOverride);
  const overrides = useActiveScheduleStore((state) => state.state.overrides);

  const userPrograms = useProgramsStore((state) => state.userPrograms);
  const plans = usePlansStore((state) => state.plans);

  const [selectedDate, setSelectedDate] = useState<string | null>(
    editingOverride?.date || null
  );
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(
    editingOverride?.workoutId ?? null
  );
  const [isRest, setIsRest] = useState<boolean>(
    editingOverride ? editingOverride.workoutId === null : false
  );

  const nextSevenDays = useMemo(() => getNextSevenDays(), []);

  const allWorkouts = useMemo(() => {
    const workouts: { id: string; name: string; source: string }[] = [];

    userPrograms.forEach((program) => {
      program.workouts.forEach((w) => {
        if (w.exercises.length > 0) {
          workouts.push({ id: w.id, name: w.name, source: program.name });
        }
      });
    });

    plans.forEach((plan) => {
      workouts.push({ id: plan.id, name: plan.name, source: 'Custom' });
    });

    return workouts;
  }, [userPrograms, plans]);

  const existingOverrideDates = useMemo(() => {
    return new Set(overrides.map((o) => o.date));
  }, [overrides]);

  const handleDateSelect = useCallback((date: string) => {
    void Haptics.selectionAsync();
    setSelectedDate(date);

    // If this date has an existing override, load it for editing
    const existingOverride = overrides.find(o => o.date === date);
    if (existingOverride) {
      setSelectedWorkoutId(existingOverride.workoutId);
      setIsRest(existingOverride.workoutId === null);
    } else {
      setSelectedWorkoutId(null);
      setIsRest(false);
    }
  }, [overrides]);

  const handleWorkoutSelect = useCallback((workoutId: string | null) => {
    void Haptics.selectionAsync();
    if (workoutId === null) {
      setIsRest(true);
      setSelectedWorkoutId(null);
    } else {
      setIsRest(false);
      setSelectedWorkoutId(workoutId);
    }
  }, []);

  const handleSave = useCallback(async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (!selectedDate) return;

    const override: ScheduleOverride = {
      date: selectedDate,
      workoutId: isRest ? null : selectedWorkoutId,
    };

    await addOverride(override);
    onClose();
  }, [selectedDate, selectedWorkoutId, isRest, addOverride, onClose]);

  const handleRemove = useCallback(async () => {
    if (!selectedDate) return;

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await removeOverride(selectedDate);
    onClose();
  }, [selectedDate, removeOverride, onClose]);

  const handleClose = useCallback(() => {
    void Haptics.selectionAsync();
    setSelectedDate(null);
    setSelectedWorkoutId(null);
    setIsRest(false);
    onClose();
  }, [onClose]);

  const canSave = selectedDate !== null;
  const isEditing = selectedDate && overrides.find(o => o.date === selectedDate);

  return (
    <SheetModal
      visible={visible}
      onClose={handleClose}
      title={isEditing ? 'Edit Override' : 'Add Override'}
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text variant="bodySemibold" color="primary">
            Select Date
          </Text>
          <View style={styles.dateGrid}>
            {nextSevenDays.map(({ date, label, isToday }) => {
              const isSelected = selectedDate === date;
              const hasExistingOverride = existingOverrideDates.has(date);

              return (
                <Pressable
                  key={date}
                  style={[
                    styles.dateChip,
                    { backgroundColor: theme.surface.elevated },
                    isSelected && { backgroundColor: theme.accent.orange },
                    hasExistingOverride && !isSelected && { backgroundColor: theme.accent.warning + '20' },
                  ]}
                  onPress={() => handleDateSelect(date)}
                >
                  <Text
                    variant="caption"
                    color={isSelected ? 'onAccent' : 'primary'}
                  >
                    {label}
                  </Text>
                  {hasExistingOverride && (
                    <Text variant="captionSmall" color="tertiary">
                      (has override)
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="bodySemibold" color="primary">
            What to Schedule
          </Text>

          <Pressable
            style={[
              styles.optionCard,
              { backgroundColor: theme.surface.elevated },
              isRest && { borderColor: theme.accent.orange, borderWidth: 2 },
            ]}
            onPress={() => handleWorkoutSelect(null)}
          >
            <IconSymbol
              name="bedtime"
              size={24}
              color={isRest ? theme.accent.orange : theme.text.primary}
            />
            <View style={styles.optionContent}>
              <Text variant="bodySemibold" color="primary">
                Rest Day
              </Text>
              <Text variant="bodySemibold" color="primary">
                Take the day off from training
              </Text>
            </View>
          </Pressable>

          <View style={styles.workoutList}>
            {allWorkouts.map((workout) => {
              const isSelected = !isRest && selectedWorkoutId === workout.id;

              return (
                <Pressable
                  key={workout.id}
                  style={[
                    styles.optionCard,
                    { backgroundColor: theme.surface.elevated },
                    isSelected && { borderColor: theme.accent.orange, borderWidth: 2 },
                  ]}
                  onPress={() => handleWorkoutSelect(workout.id)}
                >
                  <IconSymbol
                    name="fitness-center"
                    size={24}
                    color={isSelected ? theme.accent.orange : theme.text.tertiary}
                  />
                  <View style={styles.optionContent}>
                    <Text variant="bodySemibold" color="primary">
                      {workout.name}
                    </Text>
                    <Text variant="caption" color="secondary">
                      {workout.source}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {isEditing && (
          <Button
            label="Remove Override"
            variant="ghost"
            size="md"
            onPress={handleRemove}
            textColor={colors.accent.warning}
            style={styles.removeButton}
          />
        )}
        <Button
          label={isEditing ? 'Update' : 'Add Override'}
          variant="primary"
          size="lg"
          onPress={handleSave}
          disabled={!canSave}
        />
      </View>
    </SheetModal>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dateChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent.orange,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent.orange,
    gap: spacing.md,
  },
  optionContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  workoutList: {
    gap: spacing.sm,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.light,
    gap: spacing.sm,
  },
  removeButton: {
    alignSelf: 'center',
  },
});
