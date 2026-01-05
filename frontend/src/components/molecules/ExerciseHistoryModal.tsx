import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { colors, radius, spacing } from '@/constants/theme';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { SheetModal } from './SheetModal';

interface ExerciseHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  exerciseName: string | null;
}

export const ExerciseHistoryModal: React.FC<ExerciseHistoryModalProps> = ({
  visible,
  onClose,
  exerciseName,
}) => {
  const { formatWeight } = useSettingsStore();
  const workouts = useWorkoutSessionsStore((state) => state.workouts);

  const historyData = useMemo(() => {
    if (!exerciseName) return [];

    return workouts
      .filter((workout) =>
        workout.exercises.some((e) => e.name === exerciseName)
      )
      .map((workout) => {
        const exercise = workout.exercises.find((e) => e.name === exerciseName);
        // Only include completed sets in history
        const completedSets = (exercise?.sets || []).filter((set) => set.completed);
        return {
          date: workout.date,
          sets: completedSets,
        };
      })
      // Filter out workouts with no completed sets for this exercise
      .filter((item) => item.sets.length > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workouts, exerciseName]);

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={exerciseName || 'History'}
    >
      <FlatList
        data={historyData}
        keyExtractor={(item, index) => `${item.date}-${index}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.historyItem}>
            <Text variant="bodySemibold" style={styles.dateText}>
              {formatDate(item.date)}
            </Text>
            <View style={styles.setsContainer}>
              {item.sets.map((set, i) => (
                <View key={i} style={styles.setRow}>
                  <Text variant="body" color="secondary">Set {i + 1}</Text>
                  <Text variant="bodySemibold">
                    {formatWeight(set.weight ?? 0)} × {set.reps} reps
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text color="secondary">No history found for this exercise.</Text>
          </View>
        }
      />
    </SheetModal>
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  historyItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  dateText: {
    marginBottom: spacing.xs,
  },
  setsContainer: {
    gap: spacing.xs,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
});
