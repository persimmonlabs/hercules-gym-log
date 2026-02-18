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
import { useCustomExerciseStore } from '@/store/customExerciseStore';
import type { Workout } from '@/types/workout';
import { exercises as exerciseCatalog, getExerciseTypeByName, createCustomExerciseCatalogItem } from '@/constants/exercises';
import type { ExerciseType, ExerciseCatalogItem } from '@/types/exercise';
import { searchExercises } from '@/utils/exerciseSearch';
import { SheetModal } from '@/components/molecules/SheetModal';

export const PersonalRecordsSection: React.FC = () => {
  const { theme } = useTheme();
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

  const customExercises = useCustomExerciseStore((state) => state.customExercises);

  interface PRRecord {
    exerciseType: ExerciseType;
    distanceUnit?: 'miles' | 'meters' | 'floors';
    weight: number;
    reps: number;
    distance: number;
    duration: number;
    assistanceWeight: number;
    date: string | null;
  }

  const records = useMemo(() => {
    const trackedSet = new Set(trackedExercises);
    const recordMap = new Map<string, PRRecord>();

    trackedExercises.forEach((exerciseName) => {
      const exType = getExerciseTypeByName(exerciseName, customExercises);
      const catalogEntry = exerciseCatalog.find(e => e.name === exerciseName);
      recordMap.set(exerciseName, {
        exerciseType: exType,
        distanceUnit: catalogEntry?.distanceUnit,
        weight: 0, reps: 0, distance: 0, duration: 0, assistanceWeight: Infinity,
        date: null,
      });
    });

    workouts.forEach((workout: Workout) => {
      workout.exercises.forEach((exercise) => {
        if (!trackedSet.has(exercise.name)) return;

        const existing = recordMap.get(exercise.name);
        if (!existing) return;
        const exType = existing.exerciseType;

        exercise.sets.forEach((set) => {
          // For cardio/duration, include sets with meaningful data even if not completed
          if (!set.completed) {
            if (exType === 'cardio' || exType === 'duration') {
              const hasData = (set.duration ?? 0) > 0 || (set.distance ?? 0) > 0;
              if (!hasData) return;
            } else {
              return;
            }
          }

          switch (exType) {
            case 'cardio': {
              const dist = set.distance ?? 0;
              const dur = set.duration ?? 0;
              // Track by max distance first; if distances are equal (including both 0),
              // fall back to longest duration
              if (dist > existing.distance || (dist === existing.distance && dur > existing.duration)) {
                existing.distance = dist;
                existing.duration = dur;
                existing.date = workout.date;
              }
              break;
            }
            case 'duration': {
              const dur = set.duration ?? 0;
              if (dur > existing.duration) {
                existing.duration = dur;
                existing.date = workout.date;
              }
              break;
            }
            case 'bodyweight':
            case 'reps_only': {
              const r = set.reps ?? 0;
              if (r > existing.reps) {
                existing.reps = r;
                existing.date = workout.date;
              }
              break;
            }
            case 'assisted': {
              const assist = set.assistanceWeight ?? 0;
              const r2 = set.reps ?? 0;
              if (r2 <= 0) break;
              if (assist < existing.assistanceWeight || (assist === existing.assistanceWeight && r2 > existing.reps)) {
                existing.assistanceWeight = assist;
                existing.reps = r2;
                existing.date = workout.date;
              }
              break;
            }
            case 'weight':
            default: {
              const w = set.weight ?? 0;
              const r3 = set.reps ?? 0;
              if (w <= 0 || r3 <= 0) break;
              if (w > existing.weight || (w === existing.weight && r3 > existing.reps)) {
                existing.weight = w;
                existing.reps = r3;
                existing.date = workout.date;
              }
              break;
            }
          }
        });
      });
    });

    return trackedExercises.map((exerciseName) => {
      const record = recordMap.get(exerciseName)!;
      return {
        name: exerciseName,
        exerciseType: record.exerciseType,
        distanceUnit: record.distanceUnit,
        weight: record.weight,
        reps: record.reps,
        distance: record.distance,
        duration: record.duration,
        assistanceWeight: record.assistanceWeight === Infinity ? 0 : record.assistanceWeight,
        date: record.date,
      };
    });
  }, [workouts, trackedExercises, customExercises]);

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

  // Merge custom exercises into catalog for the exercise picker
  const allExercises = useMemo<ExerciseCatalogItem[]>(() => {
    const customCatalogItems = customExercises.map((ce) =>
      createCustomExerciseCatalogItem(ce.id, ce.name, ce.exerciseType)
    );
    return [...exerciseCatalog, ...customCatalogItems];
  }, [customExercises]);

  const filteredExercises = useMemo(() => {
    const trackedSet = new Set(trackedExercises);
    const excludeIds = allExercises
      .filter(ex => trackedSet.has(ex.name))
      .map(ex => ex.id);
    return searchExercises(searchQuery, allExercises, { excludeIds, limit: 50 });
  }, [searchQuery, trackedExercises, allExercises]);

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
              exerciseType={record.exerciseType}
              distanceUnit={record.distanceUnit}
              weight={record.weight}
              reps={record.reps}
              distance={record.distance}
              duration={record.duration}
              assistanceWeight={record.assistanceWeight}
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
              ListFooterComponent={<View style={styles.spacer} />}
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
  spacer: {
    height: spacing.xl * 2,
  },
});
