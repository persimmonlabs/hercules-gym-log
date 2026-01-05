import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

import {
  exercises as baseExercises,
  exerciseFilterOptions,
  type Exercise,
  type ExerciseCatalogItem,
  createCustomExerciseCatalogItem,
} from '@/constants/exercises';
import { usePlansStore, type Plan } from '@/store/plansStore';
import { useProgramsStore } from '@/store/programsStore';
import { useCustomExerciseStore } from '@/store/customExerciseStore';
import { useSemanticExerciseSearch } from '@/hooks/useSemanticExerciseSearch';
import {
  type ExerciseFilters,
  type FilterDifficulty,
  type FilterEquipment,
  type FilterMuscleGroup,
  type MuscleGroup,
} from '@/types/exercise';
import {
  createDefaultExerciseFilters,
  matchesExerciseFilters,
  toggleFilterValue,
  countActiveFilters,
} from '@/utils/exerciseFilters';
import { normalizeSearchText } from '@/utils/strings';

interface PlanBuilderState {
  planName: string;
  setPlanName: (value: string) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedExercises: Exercise[];
  isEditing: boolean;
  isEditingPlanMissing: boolean;
  isLoading: boolean;
  suggestions: Exercise[];
  availableExercises: Exercise[];
  filteredAvailableExercises: Exercise[];
  headerTitle: string;
  headerSubtitle: string;
  handleAddExercise: (exercise: Exercise) => void;
  handleAddExercises: (exercisesToAdd: Exercise[]) => void;
  handleRemoveExercise: (exerciseId: string) => void;
  handleReorderExercise: (exerciseId: string, direction: 1 | -1) => void;
  handleReorderExercises: (fromIndex: number, toIndex: number) => void;
  resetBuilder: () => void;
  editingPlanCreatedAt: number | null;
  filters: ExerciseFilters;
  toggleMuscleGroupFilter: (value: FilterMuscleGroup) => void;
  toggleSpecificMuscleFilter: (value: MuscleGroup) => void;
  toggleEquipmentFilter: (value: FilterEquipment) => void;
  toggleDifficultyFilter: (value: FilterDifficulty) => void;
  toggleBodyweightOnly: () => void;
  toggleCompoundOnly: () => void;
  resetFilters: () => void;
  updateFilters: (newFilters: ExerciseFilters) => void;
  filterOptions: typeof exerciseFilterOptions;
  setIsLoading: (loading: boolean) => void;
}

export const usePlanBuilderState = (editingPlanId: string | null): PlanBuilderState => {
  const [planName, setPlanName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [filters, setFilters] = useState<ExerciseFilters>(() => createDefaultExerciseFilters());
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start with loading true to prevent flash, will be corrected immediately if not editing
  const hasInitializedFromPlan = useRef<boolean>(false);

  useLayoutEffect(() => {
    hasInitializedFromPlan.current = false;
    // Always start with loading true when editingPlanId changes
    // This ensures loading state is active immediately when entering review mode
    if (editingPlanId) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [editingPlanId]);

  const plans = usePlansStore((state) => state.plans);
  const arePlansLoading = usePlansStore((state) => state.isLoading);
  const { userPrograms, premadeWorkouts, isLoading: areProgramsLoading } = useProgramsStore();
  const customExercises = useCustomExerciseStore((state) => state.customExercises);

  // Merge base catalog with custom exercises
  const allExercises = useMemo<ExerciseCatalogItem[]>(() => {
    const customCatalogItems = customExercises.map((ce) =>
      createCustomExerciseCatalogItem(ce.id, ce.name, ce.exerciseType)
    );
    return [...baseExercises, ...customCatalogItems];
  }, [customExercises]);

  const editingPlan = useMemo<Plan | null>(() => {
    if (!editingPlanId) {
      return null;
    }

    if (editingPlanId.startsWith('program:')) {
      const [_, programId, workoutId] = editingPlanId.split(':');
      const program = userPrograms.find(p => p.id === programId);
      const workout = program?.workouts.find(w => w.id === workoutId);

      if (workout) {
        // Create fresh copies of exercises to prevent mutations affecting the program data
        const mappedExercises = workout.exercises
          .map(ex => {
            const found = allExercises.find(e => e.name === ex.name);
            return found ? { ...found } : null;
          })
          .filter((e): e is ExerciseCatalogItem => e !== null);

        return {
          id: workout.id,
          name: workout.name,
          exercises: mappedExercises,
          createdAt: Date.now(),
        } as Plan;
      }
      return null;
    }

    if (editingPlanId.startsWith('premade:')) {
      const [_, premadeId] = editingPlanId.split(':');
      const workout = premadeWorkouts.find(w => w.id === premadeId);

      if (workout) {
        // Create fresh copies of exercises to prevent mutations affecting the original premade data
        const mappedExercises = workout.exercises
          .map(ex => {
            const found = allExercises.find(e => e.id === ex.id);
            return found ? { ...found } : null;
          })
          .filter((e): e is ExerciseCatalogItem => e !== null);

        return {
          id: workout.id,
          name: workout.name,
          exercises: mappedExercises,
          createdAt: Date.now(),
        } as Plan;
      }
      return null;
    }

    const plan = plans.find((p) => p.id === editingPlanId);
    if (!plan) return null;

    // Resolve exercises from all available (including custom)
    const resolvedExercises = plan.exercises.map(ex => {
      const found = allExercises.find(e => e.name === ex.name);
      return found ? { ...found } : ex;
    });

    return {
      ...plan,
      exercises: resolvedExercises,
    };
  }, [editingPlanId, plans, userPrograms, premadeWorkouts, allExercises]);

  const isEditing = Boolean(editingPlanId);
  const isPremadeReview = useMemo(() => {
    if (!editingPlanId?.startsWith('premade:')) {
      return false;
    }
    const existsInPlans = plans.some(p => p.id === editingPlanId);
    return !existsInPlans;
  }, [editingPlanId, plans]);

  const hasActiveFilters = useMemo<boolean>(() => countActiveFilters(filters) > 0, [filters]);

  // Handle the actual data loading and completion
  useEffect(() => {
    if (!editingPlanId) {
      // Not editing, ensure loading is false
      setIsLoading(false);
      return;
    }

    if (editingPlan && !hasInitializedFromPlan.current) {
      // We have the plan data and haven't initialized yet
      // Small delay to ensure smooth loading experience
      const delay = editingPlanId.startsWith('premade:') ? 150 : 100;

      setTimeout(() => {
        setPlanName(editingPlan.name);
        setSelectedExercises(editingPlan.exercises);
        setSearchTerm('');
        setFilters(createDefaultExerciseFilters());
        hasInitializedFromPlan.current = true;
        setIsLoading(false);
      }, delay);
    } else if (!arePlansLoading && !areProgramsLoading && !editingPlan && !hasInitializedFromPlan.current) {
      // Stores are loaded but plan is missing, show error state
      setIsLoading(false);
    }
  }, [editingPlan, editingPlanId, arePlansLoading, areProgramsLoading]);

  // Safety timeout: If loading takes too long (e.g. race condition or stuck state), force exit
  useEffect(() => {
    if (isLoading) {
      const timeoutId = setTimeout(() => {
        console.warn('[usePlanBuilderState] Loading timeout reached, forcing completion');
        setIsLoading(false);
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [isLoading]);

  const resetBuilder = useCallback(() => {
    if (isEditing) {
      return;
    }

    setPlanName('');
    setSelectedExercises([]);
    setSearchTerm('');
    setFilters(createDefaultExerciseFilters());
    setIsLoading(false);
  }, [isEditing]);

  const updateFilters = useCallback((newFilters: ExerciseFilters) => {
    setFilters(newFilters);
  }, []);

  const toggleMuscleGroupFilter = useCallback((value: FilterMuscleGroup) => {
    setFilters((prev: ExerciseFilters) => ({
      ...prev,
      muscleGroups: toggleFilterValue(prev.muscleGroups, value),
    }));
  }, []);

  const toggleSpecificMuscleFilter = useCallback((value: MuscleGroup) => {
    setFilters((prev: ExerciseFilters) => ({
      ...prev,
      specificMuscles: toggleFilterValue(prev.specificMuscles, value),
    }));
  }, []);

  const toggleEquipmentFilter = useCallback((value: FilterEquipment) => {
    setFilters((prev: ExerciseFilters) => ({
      ...prev,
      equipment: toggleFilterValue(prev.equipment, value),
    }));
  }, []);

  const toggleDifficultyFilter = useCallback((value: FilterDifficulty) => {
    setFilters((prev: ExerciseFilters) => ({
      ...prev,
      difficulty: toggleFilterValue(prev.difficulty, value),
    }));
  }, []);

  const toggleBodyweightOnly = useCallback(() => {
    setFilters((prev: ExerciseFilters) => ({ ...prev, bodyweightOnly: !prev.bodyweightOnly }));
  }, []);

  const toggleCompoundOnly = useCallback(() => {
    setFilters((prev: ExerciseFilters) => ({ ...prev, compoundOnly: !prev.compoundOnly }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(createDefaultExerciseFilters());
  }, []);

  const availableCatalogExercises = useMemo<ExerciseCatalogItem[]>(() => {
    const selectedIds = new Set(selectedExercises.map((exercise) => exercise.id));
    return allExercises.filter((exercise) => !selectedIds.has(exercise.id));
  }, [selectedExercises, allExercises]);

  const catalogFilteredByFilters = useMemo<ExerciseCatalogItem[]>(
    () => availableCatalogExercises.filter((exercise) => matchesExerciseFilters(exercise, filters)),
    [availableCatalogExercises, filters],
  );

  const normalizedSearchQuery = useMemo(() => normalizeSearchText(searchTerm), [searchTerm]);

  const hasSearchTerm = normalizedSearchQuery.length > 0;

  const searchTokens = useMemo(() => {
    if (!normalizedSearchQuery) {
      return [] as string[];
    }

    return normalizedSearchQuery.split(' ').filter(Boolean);
  }, [normalizedSearchQuery]);

  const matchesSearchTokens = useCallback(
    (exercise: ExerciseCatalogItem) => {
      if (searchTokens.length === 0) {
        return true;
      }

      const normalizedName = normalizeSearchText(exercise.name);

      return searchTokens.every((token) => {
        if (token.length <= 1) {
          return normalizedName.startsWith(token);
        }

        return normalizedName.includes(token) || exercise.searchIndex.includes(token);
      });
    },
    [searchTokens],
  );

  const semanticFilteredAvailable = useSemanticExerciseSearch(searchTerm, catalogFilteredByFilters, {
    limit: catalogFilteredByFilters.length,
  });

  const filteredAvailableExercises = useMemo<Exercise[]>(() => {
    let result: Exercise[];

    if (searchTokens.length === 0) {
      result = catalogFilteredByFilters;
    } else {
      const tokenMatches = catalogFilteredByFilters.filter(matchesSearchTokens);

      if (semanticFilteredAvailable.length === 0) {
        result = tokenMatches;
      } else if (tokenMatches.length === 0) {
        result = semanticFilteredAvailable;
      } else {
        const tokenMatchIds = new Set(tokenMatches.map((exercise) => exercise.id));
        const intersection = semanticFilteredAvailable.filter((exercise) => tokenMatchIds.has(exercise.id));

        if (intersection.length > 0) {
          result = intersection;
        } else {
          result = semanticFilteredAvailable;
        }
      }
    }

    // Sort alphabetically A-Z by name
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [
    catalogFilteredByFilters,
    matchesSearchTokens,
    searchTokens,
    semanticFilteredAvailable,
  ]);

  const suggestions = useMemo<Exercise[]>(
    () => {
      if (hasSearchTerm) {
        return filteredAvailableExercises;
      }

      if (hasActiveFilters) {
        return catalogFilteredByFilters;
      }

      return availableCatalogExercises;
    },
    [
      availableCatalogExercises,
      catalogFilteredByFilters,
      filteredAvailableExercises,
      hasActiveFilters,
      hasSearchTerm,
    ],
  );

  const handleAddExercise = useCallback((exercise: Exercise) => {
    setSelectedExercises((prev) => (prev.some((item) => item.id === exercise.id) ? prev : [...prev, exercise]));
  }, []);

  const handleAddExercises = useCallback((exercisesToAdd: Exercise[]) => {
    if (exercisesToAdd.length === 0) {
      return;
    }

    setSelectedExercises((prev) => {
      const existingIds = new Set(prev.map((exercise) => exercise.id));
      const next = [...prev];

      exercisesToAdd.forEach((exercise) => {
        if (!existingIds.has(exercise.id)) {
          existingIds.add(exercise.id);
          next.push(exercise);
        }
      });

      return next;
    });
  }, []);

  const handleRemoveExercise = useCallback((exerciseId: string) => {
    setSelectedExercises((prev) => prev.filter((exercise) => exercise.id !== exerciseId));
  }, []);

  const handleReorderExercise = useCallback((exerciseId: string, direction: 1 | -1) => {
    setSelectedExercises((prev) => {
      const currentIndex = prev.findIndex((exercise) => exercise.id === exerciseId);

      if (currentIndex === -1) {
        return prev;
      }

      const nextIndex = currentIndex + direction;

      if (nextIndex < 0 || nextIndex >= prev.length) {
        return prev;
      }

      const next = [...prev];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(nextIndex, 0, moved);
      return next;
    });
  }, []);

  const handleReorderExercises = useCallback((fromIndex: number, toIndex: number) => {
    setSelectedExercises((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) {
        return prev;
      }

      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  let headerTitle = 'Create Workout';
  let headerSubtitle = 'Build your workout template';

  if (isEditing) {
    if (isPremadeReview) {
      headerTitle = 'Review Workout';
      headerSubtitle = 'Review and customize this workout template';
    } else {
      headerTitle = 'Edit Workout';
      headerSubtitle = 'Update your workout template';
    }
  }
  const editingPlanCreatedAt = editingPlan?.createdAt ?? null;
  const isEditingPlanMissing = isEditing && !editingPlan;

  return {
    planName,
    setPlanName,
    searchTerm,
    setSearchTerm,
    selectedExercises,
    isEditing,
    isEditingPlanMissing,
    isLoading,
    suggestions,
    availableExercises: availableCatalogExercises,
    filteredAvailableExercises,
    headerTitle,
    headerSubtitle,
    handleAddExercise,
    handleAddExercises,
    handleRemoveExercise,
    handleReorderExercise,
    handleReorderExercises,
    resetBuilder,
    editingPlanCreatedAt,
    filters,
    toggleMuscleGroupFilter,
    toggleSpecificMuscleFilter,
    toggleEquipmentFilter,
    toggleDifficultyFilter,
    toggleBodyweightOnly,
    toggleCompoundOnly,
    resetFilters,
    updateFilters,
    filterOptions: exerciseFilterOptions,
    setIsLoading,
  };
};
