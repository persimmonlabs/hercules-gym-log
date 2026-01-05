/**
 * useWorkoutEditor
 * Manages workout editing state: exercises, selection, and persistence.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  exercises as baseExerciseCatalog,
  type Exercise,
  type ExerciseCatalogItem,
  createCustomExerciseCatalogItem
} from '@/constants/exercises';
import type { SetLog, Workout, WorkoutExercise } from '@/types/workout';
import { usePlansStore } from '@/store/plansStore';

import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useCustomExerciseStore } from '@/store/customExerciseStore';
import { getLastCompletedSetsForExercise } from '@/utils/exerciseHistory';

interface WorkoutEditorHook {
  workout: Workout | null;
  planName: string | null;
  exerciseDrafts: WorkoutExercise[];
  expandedExercise: string | null;
  toggleExercise: (name: string) => void;
  updateExerciseSets: (name: string, sets: SetLog[]) => void;
  removeExercise: (name: string) => void;
  moveExercise: (name: string, direction: 'up' | 'down') => void;
  addExercise: (exercise: Exercise) => void;
  isPickerVisible: boolean;
  openPicker: () => void;
  closePicker: () => void;
  filteredExercises: Exercise[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  exerciseCount: number;
  saveWorkout: () => Promise<boolean>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const DEFAULT_SET_COUNT = 3;

const createDefaultSetLogs = (exerciseName: string, workouts: Workout[], currentWorkoutId?: string): SetLog[] => {
  // Filter out the current workout to avoid using incomplete data
  const historicalWorkouts = currentWorkoutId
    ? workouts.filter((w) => w.id !== currentWorkoutId)
    : workouts;

  // Try to get history for this exercise from other workouts
  const lastSets = getLastCompletedSetsForExercise(exerciseName, historicalWorkouts);

  if (lastSets && lastSets.length > 0) {
    // Use the historical sets, but mark them as not completed
    return lastSets.map((set) => ({
      reps: set.reps,
      weight: set.weight,
      completed: false,
    }));
  }

  // No history, use defaults
  return Array.from({ length: DEFAULT_SET_COUNT }, () => ({ reps: 8, weight: 0, completed: false }));
};

export const useWorkoutEditor = (workoutId?: string): WorkoutEditorHook => {
  const workouts = useWorkoutSessionsStore((state) => state.workouts);
  const hydrateWorkouts = useWorkoutSessionsStore((state) => state.hydrateWorkouts);
  const updateWorkout = useWorkoutSessionsStore((state) => state.updateWorkout);
  const plans = usePlansStore((state) => state.plans);
  const customExercises = useCustomExerciseStore((state) => state.customExercises);

  const hydratePlans = usePlansStore((state) => state.hydratePlans);
  const { convertWeight, convertWeightToLbs, weightUnit } = useSettingsStore();

  const [exerciseDrafts, setExerciseDrafts] = useState<WorkoutExercise[]>([]);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [isPickerVisible, setPickerVisible] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(!!workoutId);

  useEffect(() => {
    void hydrateWorkouts();
    void hydratePlans();
  }, [hydratePlans, hydrateWorkouts]);

  const workout = useMemo<Workout | null>(() => {
    return workouts.find((item) => item.id === workoutId) ?? null;
  }, [workouts, workoutId]);

  // Merge base catalog with custom exercises
  const allExercises = useMemo<ExerciseCatalogItem[]>(() => {
    const customCatalogItems = customExercises.map((ce) =>
      createCustomExerciseCatalogItem(ce.id, ce.name, ce.exerciseType)
    );
    return [...baseExerciseCatalog, ...customCatalogItems];
  }, [customExercises]);

  useEffect(() => {
    if (!workout) {
      setExerciseDrafts([]);
      setExpandedExercise(null);
      return;
    }

    const nextDrafts = workout.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => ({
        ...set,
        weight: convertWeight(set.weight ?? 0),
      })),
    }));

    setExerciseDrafts(nextDrafts);
    if (!exerciseDrafts.length) {
      setExpandedExercise(nextDrafts[0]?.name ?? null);
    }
    setIsLoading(false);
  }, [workout, weightUnit]);

  useEffect(() => {
    if (exerciseDrafts.length === 0) {
      setExpandedExercise(null);
      return;
    }

    setExpandedExercise((prev) => {
      if (!prev || exerciseDrafts.some((exercise) => exercise.name === prev)) {
        return prev ?? exerciseDrafts[0].name;
      }

      return exerciseDrafts[0].name;
    });
  }, [exerciseDrafts]);

  const planName = useMemo(() => {
    if (!workout?.planId) {
      return null;
    }

    return plans.find((plan) => plan.id === workout.planId)?.name ?? null;
  }, [plans, workout?.planId]);

  const toggleExercise = useCallback((name: string) => {
    setExpandedExercise((prev) => (prev === name ? null : name));
  }, []);

  const updateExerciseSets = useCallback((name: string, sets: SetLog[]) => {
    setExerciseDrafts((prev) => prev.map((exercise) => (exercise.name === name ? { ...exercise, sets } : exercise)));
  }, []);

  const removeExercise = useCallback((name: string) => {
    setExerciseDrafts((prev) => prev.filter((exercise) => exercise.name !== name));
  }, []);

  const moveExercise = useCallback((name: string, direction: 'up' | 'down') => {
    setExerciseDrafts((prev) => {
      const index = prev.findIndex((exercise) => exercise.name === name);

      if (index === -1) {
        return prev;
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }

      const next = [...prev];
      const temp = next[targetIndex];
      next[targetIndex] = next[index];
      next[index] = temp;
      return next;
    });
  }, []);

  const addExercise = useCallback((exercise: Exercise) => {
    let resolvedName = exercise.name;
    setExerciseDrafts((prev) => {
      const existingNames = new Set(prev.map((item) => item.name));
      let baseName = exercise.name;

      if (existingNames.has(baseName)) {
        let suffix = 2;
        while (existingNames.has(`${baseName} (${suffix})`)) {
          suffix += 1;
        }
        baseName = `${baseName} (${suffix})`;
      }

      // First, check if this exercise exists in the current workout with completed sets
      const currentExercise = prev.find((ex) => ex.name === baseName);
      let defaultSets: SetLog[];

      if (currentExercise && currentExercise.sets.some((set) => set.completed)) {
        // Use the current workout's data
        defaultSets = currentExercise.sets.map((set) => ({
          reps: set.reps,
          weight: set.weight,
          completed: false,
        }));
      } else {
        // Fall back to historical workouts (excluding current workout)
        defaultSets = createDefaultSetLogs(baseName, workouts, workout?.id);
      }

      // Convert default/historical sets from LBS (storage) to User Unit (display)
      const convertedSets = defaultSets.map((set) => ({
        ...set,
        weight: convertWeight(set.weight ?? 0),
      }));

      const next: WorkoutExercise = {
        name: baseName,
        sets: convertedSets,
      };

      resolvedName = baseName;
      return [...prev, next];
    });
    setPickerVisible(false);
    setSearchTerm('');
    setExpandedExercise(resolvedName);
  }, [workouts, workout, convertWeight, weightUnit]);

  const openPicker = useCallback(() => {
    setPickerVisible(true);
    setSearchTerm('');
  }, []);

  const closePicker = useCallback(() => {
    setPickerVisible(false);
    setSearchTerm('');
  }, []);

  const filteredExercises = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return allExercises;
    }

    return allExercises.filter((exercise) => (
      exercise.name.toLowerCase().includes(query) ||
      exercise.muscleGroup.toLowerCase().includes(query)
    ));
  }, [searchTerm, allExercises]);

  const exerciseCount = exerciseDrafts.length;

  const saveWorkout = useCallback(async () => {
    if (!workout) {
      return false;
    }

    try {
      // Convert exercises from User Unit (display) to LBS (storage)
      const preparedExercises = exerciseDrafts.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({
          ...set,
          weight: convertWeightToLbs(set.weight ?? 0),
        })),
      }));

      await updateWorkout({
        ...workout,
        exercises: preparedExercises,
      });
      return true;
    } catch (error) {
      console.error('[useWorkoutEditor] Failed to update workout', error);
      return false;
    }
  }, [exerciseDrafts, updateWorkout, workout]);

  return {
    workout,
    planName,
    exerciseDrafts,
    expandedExercise,
    toggleExercise,
    updateExerciseSets,
    removeExercise,
    moveExercise,
    addExercise,
    isPickerVisible,
    openPicker,
    closePicker,
    filteredExercises,
    searchTerm,
    setSearchTerm,
    exerciseCount,
    saveWorkout,
    isLoading,
    setIsLoading,
  };
};
