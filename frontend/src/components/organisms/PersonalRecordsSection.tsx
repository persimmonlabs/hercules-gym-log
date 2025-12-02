import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Modal, FlatList, TextInput, PanResponder, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { PRCard } from '@/components/molecules/PRCard';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import type { Workout } from '@/types/workout';
import exercisesData from '@/data/exercises.json';

const DEFAULT_TRACKED_EXERCISES = [
  'Barbell Bench Press',
  'Barbell Squat',
  'Barbell Deadlift',
];

export const PersonalRecordsSection: React.FC = () => {
  const workouts = useWorkoutSessionsStore((state) => state.workouts);
  const [trackedExercises, setTrackedExercises] = useState<string[]>(DEFAULT_TRACKED_EXERCISES);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const screenHeight = Dimensions.get('window').height;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 600, // Slower duration
      useNativeDriver: true,
    }).start(() => {
      setIsModalVisible(false);
      setSelectedExerciseIndex(null);
    });
  };

  const openModal = () => {
    setIsModalVisible(true);
    // Reset position before animating in
    slideAnim.setValue(screenHeight);
    Animated.spring(slideAnim, {
      toValue: 0,
      damping: 20,
      stiffness: 90,
      mass: 1,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50) {
          closeModal();
        } else {
          // Snap back if not dragged enough
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderMove: (_, gestureState) => {
        // Allow dragging down visual feedback
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      }
    })
  ).current;

  const records = useMemo(() => {
    return trackedExercises.map((exerciseName) => {
      let maxWeight = 0;
      let associatedReps = 0;
      let recordDate: string | null = null;

      workouts.forEach((workout: Workout) => {
        const exercise = workout.exercises.find((e) => e.name === exerciseName);
        if (exercise) {
          exercise.sets.forEach((set) => {
            // Check if set is valid (weight > 0)
            if (set.weight > maxWeight) {
              maxWeight = set.weight;
              associatedReps = set.reps;
              recordDate = workout.date;
            } else if (set.weight === maxWeight && set.weight > 0) {
              // Tie breaker: more reps
              if (set.reps > associatedReps) {
                associatedReps = set.reps;
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
      const newTracked = [...trackedExercises];
      newTracked[selectedExerciseIndex] = newName;
      setTrackedExercises(newTracked);
      closeModal();
    }
  };

  const filteredExercises = useMemo(() => {
    return exercisesData.filter(ex =>
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !trackedExercises.includes(ex.name)
    );
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

        <Modal
          visible={isModalVisible}
          animationType="none"
          transparent={true}
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.modalContent,
                { transform: [{ translateY: slideAnim }] }
              ]}
            >
              <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
                <View style={styles.dragHandle} />
              </View>
              <View style={styles.modalHeader}>
                <Text variant="heading3">Replace Exercise</Text>
                <TouchableOpacity onPress={closeModal}>
                  <Ionicons name="close" size={24} color={colors.text.primary} />
                </TouchableOpacity>
              </View>

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
                    <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                  </TouchableOpacity>
                )}
                style={styles.exerciseList}
              />
            </Animated.View>
          </View>
        </Modal>
      </View >
    </SurfaceCard >
  );
};

const styles = StyleSheet.create({
  cardContent: {
    gap: spacing.lg,
  },
  headerContainer: {
    alignItems: 'center',
  },
  list: {
    gap: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    ...shadows.lg,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    height: '80%',
    gap: spacing.md,
  },
  dragHandleArea: {
    width: '100%',
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 48,
    height: 4,
    backgroundColor: colors.neutral.gray200,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchInput: {
    backgroundColor: colors.primary.bg,
    borderWidth: 1,
    borderColor: colors.accent.orange + '66',
    padding: spacing.md,
    borderRadius: radius.md,
    fontSize: 16,
    color: colors.text.primary,
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
    borderBottomColor: colors.accent.orange + '66',
  },
});
