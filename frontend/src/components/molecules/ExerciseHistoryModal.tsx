import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { colors, radius, spacing } from '@/constants/theme';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { SheetModal } from './SheetModal';
import type { ExerciseType } from '@/types/exercise';
import { exercises as exerciseCatalog } from '@/constants/exercises';

interface ExerciseHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  exerciseName: string | null;
  exerciseType?: ExerciseType;
  distanceUnit?: 'miles' | 'meters' | 'floors';
}

// Format duration for display (e.g., "5:30" or "1:05:30")
const formatDurationDisplay = (totalSeconds: number): string => {
  if (!totalSeconds || totalSeconds === 0) return '0:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const ExerciseHistoryModal: React.FC<ExerciseHistoryModalProps> = ({
  visible,
  onClose,
  exerciseName,
  exerciseType = 'weight',
  distanceUnit,
}) => {
  // Subscribe to unit values to trigger re-renders when units change
  const weightUnitPref = useSettingsStore((state) => state.weightUnit);
  const distanceUnitPref = useSettingsStore((state) => state.distanceUnit);
  const { formatWeight, formatDistanceForExercise } = useSettingsStore();
  
  // Look up distanceUnit from catalog if not provided
  const effectiveDistanceUnit = distanceUnit ?? exerciseCatalog.find(e => e.name === exerciseName)?.distanceUnit;
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
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        nestedScrollEnabled={true}
        scrollEnabled={true}
        bounces={true}
        alwaysBounceVertical={true}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="automatic"
      >
        {historyData.length === 0 ? (
          <View style={styles.emptyState}>
            <Text color="secondary">No history found for this exercise.</Text>
          </View>
        ) : (
          <View style={styles.contentWrapper}>
            {historyData.map((item, index) => (
              <View key={`${item.date}-${index}`} style={styles.historyItem}>
                <Text variant="bodySemibold" style={styles.dateText}>
                  {formatDate(item.date)}
                </Text>
                <View style={styles.setsContainer}>
                  {item.sets.map((set, i) => (
                    <View key={i} style={styles.setRow}>
                      <Text variant="body" color="secondary">Set {i + 1}</Text>
                      <Text variant="bodySemibold">
                        {exerciseType === 'duration' && (
                          formatDurationDisplay(set.duration ?? 0)
                        )}
                        {exerciseType === 'cardio' && (() => {
                          const distance = set.distance ?? 0;
                          const duration = set.duration ?? 0;
                          const distanceStr = formatDistanceForExercise(distance, effectiveDistanceUnit);
                          const durationStr = formatDurationDisplay(duration);
                          
                          // Calculate pace if both distance and duration exist
                          if (distance > 0 && duration > 0) {
                            const hours = duration / 3600;
                            const paceMinPerMile = hours / distance * 60;
                            const pacePerUnit = distanceUnitPref === 'km' ? paceMinPerMile * 1.60934 : paceMinPerMile;
                            const mins = Math.floor(pacePerUnit);
                            const secs = Math.floor((pacePerUnit - mins) * 60);
                            const paceUnit = distanceUnitPref === 'km' ? '/km' : '/mi';
                            const paceStr = `${mins}:${secs.toString().padStart(2, '0')} ${paceUnit}`;
                            return `${distanceStr} • ${durationStr} • ${paceStr}`;
                          }
                          
                          return `${distanceStr} • ${durationStr}`;
                        })()}
                        {(exerciseType === 'bodyweight' || exerciseType === 'reps_only') && (
                          `${set.reps ?? 0} reps`
                        )}
                        {exerciseType === 'assisted' && (
                          `${formatWeight(set.assistanceWeight ?? 0)} assist × ${set.reps ?? 0} reps`
                        )}
                        {exerciseType === 'weight' && (
                          `${formatWeight(set.weight ?? 0)} × ${set.reps ?? 0} reps`
                        )}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SheetModal>
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    flexGrow: 1,
  },
  contentWrapper: {
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
