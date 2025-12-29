/**
 * WeeklyScheduleEditor
 * Edit weekly schedule - assign workouts to days of the week.
 */
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing } from '@/constants/theme';
import type { WeeklyScheduleConfig, Weekday, ProgramWorkout } from '@/types/premadePlan';

interface WeeklyScheduleEditorProps {
  schedule: WeeklyScheduleConfig;
  workouts: ProgramWorkout[];
  onChange: (schedule: WeeklyScheduleConfig) => void;
}

const WEEKDAYS: { key: Weekday; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  dayRow: {
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
  dayLabel: {
    minWidth: 80,
  },
  workoutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  restDay: {
    opacity: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.scrim,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.primary.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  modalList: {
    paddingHorizontal: spacing.lg,
  },
  workoutOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  workoutOptionSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.surface.tint,
  },
  restOption: {
    borderStyle: 'dashed',
  },
});

export const WeeklyScheduleEditor: React.FC<WeeklyScheduleEditorProps> = ({
  schedule,
  workouts,
  onChange,
}) => {
  const [selectedDay, setSelectedDay] = useState<Weekday | null>(null);

  const handleDayPress = useCallback((day: Weekday) => {
    void Haptics.selectionAsync();
    setSelectedDay(day);
  }, []);

  const handleSelectWorkout = useCallback((workoutId: string | null) => {
    if (!selectedDay) return;
    
    void Haptics.selectionAsync();
    onChange({
      ...schedule,
      [selectedDay]: workoutId,
    });
    setSelectedDay(null);
  }, [selectedDay, schedule, onChange]);

  const getWorkoutName = useCallback((workoutId: string | null) => {
    if (!workoutId) return 'Rest Day';
    const workout = workouts.find(w => w.id === workoutId);
    return workout?.name || 'Unknown';
  }, [workouts]);

  return (
    <View style={styles.container}>
      {WEEKDAYS.map(({ key, label }) => {
        const workoutId = schedule[key];
        const isRest = !workoutId;

        return (
          <Pressable
            key={key}
            style={styles.dayRow}
            onPress={() => handleDayPress(key)}
          >
            <Text variant="bodySemibold" color="primary" style={styles.dayLabel}>
              {label}
            </Text>
            <View style={styles.workoutButton}>
              <Text 
                variant="bodySemibold" 
                color="primary"
                numberOfLines={1}
              >
                {getWorkoutName(workoutId)}
              </Text>
              <IconSymbol 
                name="chevron-right" 
                size={16} 
                color={colors.text.primary} 
              />
            </View>
          </Pressable>
        );
      })}

      <Modal
        visible={selectedDay !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDay(null)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setSelectedDay(null)}
        >
          <Pressable 
            style={styles.modalContent}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text variant="heading3" color="primary">
                {selectedDay ? WEEKDAYS.find(d => d.key === selectedDay)?.label : ''}
              </Text>
              <Pressable onPress={() => setSelectedDay(null)} hitSlop={8}>
                <IconSymbol name="close" size={24} color={colors.text.secondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalList}>
              {/* Rest Day Option */}
              <Pressable
                style={[
                  styles.workoutOption,
                  styles.restOption,
                  selectedDay && !schedule[selectedDay] && styles.workoutOptionSelected,
                ]}
                onPress={() => handleSelectWorkout(null)}
              >
                <Text variant="body" color="primary">Rest Day</Text>
                {selectedDay && !schedule[selectedDay] && (
                  <IconSymbol name="check" size={20} color={colors.accent.primary} />
                )}
              </Pressable>

              {/* Workout Options */}
              {workouts
                .filter(w => w.exercises.length > 0) // Filter out "Rest Day" placeholders
                .map(workout => {
                const isSelected = selectedDay && schedule[selectedDay] === workout.id;
                
                return (
                  <Pressable
                    key={workout.id}
                    style={[
                      styles.workoutOption,
                      isSelected && styles.workoutOptionSelected,
                    ]}
                    onPress={() => handleSelectWorkout(workout.id)}
                  >
                    <View>
                      <Text variant="bodySemibold" color="primary">
                        {workout.name}
                      </Text>
                      <Text variant="caption" color="secondary">
                        {workout.exercises.length} exercises
                      </Text>
                    </View>
                    {isSelected && (
                      <IconSymbol name="check" size={20} color={colors.accent.primary} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};
