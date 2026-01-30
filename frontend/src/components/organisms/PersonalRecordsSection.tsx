import React, { useState, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { PRCard } from '@/components/molecules/PRCard';
import { colors, spacing, radius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { usePersonalRecordsStore } from '@/store/personalRecordsStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { Workout } from '@/types/workout';
import { exercises as exerciseCatalog } from '@/constants/exercises';
import { searchExercises } from '@/utils/exerciseSearch';
import { SheetModal } from '@/components/molecules/SheetModal';

export const PersonalRecordsSection: React.FC = () => {
  const { theme } = useTheme();
  const { weightUnit } = useSettingsStore(); // Force re-render on unit change
  const workouts = useWorkoutSessionsStore((state) => state.workouts);
  const trackedExercises = usePersonalRecordsStore((state) => state.trackedExercises);
  const replaceTrackedExercise = usePersonalRecordsStore((state) => state.replaceTrackedExercise);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedExerciseIndex(null);
  };

  const openModal = () => {
    setIsModalVisible(true);
  };

  const records = useMemo(() => {
    return trackedExercises.map((exerciseName) => {
      let maxWeight = 0;
      let associatedReps = 0;
      let recordDate: string | null = null;

      workouts.forEach((workout: Workout) => {
        const exercise = workout.exercises.find((e) => e.name === exerciseName);
        if (exercise) {
          exercise.sets.forEach((set) => {
            const setWeight = set.weight ?? 0;
            const setReps = set.reps ?? 0;
            // Check if set is valid (weight > 0)
            if (setWeight > maxWeight) {
              maxWeight = setWeight;
              associatedReps = setReps;
              recordDate = workout.date;
            } else if (setWeight === maxWeight && setWeight > 0) {
              // Tie breaker: more reps
              if (setReps > associatedReps) {
                associatedReps = setReps;
                recordDate = workout.date;
              }
            }
          });
        }
      });

      return {
        name: exerciseName,
        weight: maxWeight,
        reps: associatedReps,
        date: recordDate,
      };
    });
  }, [workouts, trackedExercises]);

  const handleReplaceExercise = (index: number) => {
    setSelectedExerciseIndex(index);
    setSearchQuery('');
    openModal();
  };

  const handleSelectNewExercise = (newName: string) => {
    if (selectedExerciseIndex !== null) {
      replaceTrackedExercise(selectedExerciseIndex, newName);
      closeModal();
    }
  };

  const filteredExercises = useMemo(() => {
    const excludeIds = exerciseCatalog
      .filter(ex => trackedExercises.includes(ex.name))
      .map(ex => ex.id);
    return searchExercises(searchQuery, exerciseCatalog, { excludeIds, limit: 50 });
  }, [searchQuery, trackedExercises]);

  return (
    <SurfaceCard tone="neutral" padding="xl" showAccentStripe={false}>
      <View style={styles.cardContent}>
        <View style={styles.headerContainer}>
          <Text variant="heading3" color="primary">
            Personal Records
          </Text>
        </View>

        <View style={styles.list}>
          {records.map((record, index) => (
            <PRCard
              key={`${record.name}-${index}`}
              exerciseName={record.name}
              weight={record.weight}
              reps={record.reps}
              date={record.date}
              onReplace={() => handleReplaceExercise(index)}
            />
          ))}
        </View>

        <SheetModal
          visible={isModalVisible}
          onClose={closeModal}
          title="Replace Exercise"
        >
          <View style={styles.modalContent}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.text.tertiary}
            />

            <FlatList
              data={filteredExercises}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.exerciseItem}
                  onPress={() => handleSelectNewExercise(item.name)}
                >
                  <Text variant="body">{item.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.text.tertiary} />
                </TouchableOpacity>
              )}
              style={styles.exerciseList}
            />
          </View>
        </SheetModal>
      </View >
    </SurfaceCard >
  );
};

const styles = StyleSheet.create({
  cardContent: {
    gap: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  headerContainer: {
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  list: {
    gap: spacing.lg,
  },
  modalContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    flex: 1,
  },
  searchInput: {
    backgroundColor: colors.primary.bg,
    borderWidth: 1,
    borderColor: colors.border.medium,
    padding: spacing.md,
    borderRadius: radius.md,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  exerciseList: {
    flex: 1,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
  },
});
