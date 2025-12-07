/**
 * exerciseFilters
 * Helper utilities for plan builder exercise filtering logic.
 */

import hierarchyData from '@/data/hierarchy.json';
import type {
  DifficultyLevel,
  EquipmentType,
  Exercise,
  ExerciseFilters,
  ExerciseType,
  FilterDifficulty,
  FilterEquipment,
  FilterMuscleGroup,
  MuscleGroup,
} from '@/types/exercise';
import { EXERCISE_TYPE_LABELS } from '@/types/exercise';

const MUSCLE_HIERARCHY = hierarchyData.muscle_hierarchy as unknown as Record<string, { muscles: Record<string, any> }>;

export const createDefaultExerciseFilters = (): ExerciseFilters => ({
  muscleGroups: [],
  specificMuscles: [],
  equipment: [],
  difficulty: [],
  bodyweightOnly: false,
  compoundOnly: false,
  exerciseTypes: [],
});

export const toggleFilterValue = <T extends string>(values: T[], value: T): T[] => {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }

  return [...values, value];
};

const matchesArrayFilter = <T extends string>(selected: T[], predicate: () => boolean): boolean => {
  if (selected.length === 0) {
    return true;
  }

  return predicate();
};

const matchesMuscleGroup = (exercise: Exercise, filters: ExerciseFilters): boolean => {
  const { muscleGroups, specificMuscles } = filters;
  
  // If no broad groups selected, verify if any specific muscles selected (if filter logic allows specific without broad, though UI might prevent this).
  // If specific muscles are selected but no broad groups, standard OR logic for specific muscles.
  if (muscleGroups.length === 0) {
    return matchesArrayFilter(specificMuscles, () => {
       return specificMuscles.includes(exercise.muscleGroup) || 
              exercise.secondaryMuscleGroups.some(m => specificMuscles.includes(m));
    });
  }

  // If broad groups are selected, we apply the "Refinement" logic:
  // For each selected broad group (e.g. Upper Body):
  //   - If ANY specific muscles belonging to this broad group are selected (e.g. Chest), match ONLY those specific muscles.
  //   - If NO specific muscles of this broad group are selected, match the WHOLE broad group.
  // The result is the UNION of matches for each selected broad group.
  
  return muscleGroups.some(broadGroup => {
    // 1. Does this exercise belong to this broad group?
    if (exercise.filterMuscleGroup !== broadGroup) {
      return false;
    }
    
    // 2. Get specific muscles for this broad group from hierarchy
    const hierarchyMuscles = Object.keys(MUSCLE_HIERARCHY[broadGroup]?.muscles || {});
    
    // 3. Check if any of these are selected in specificMuscles
    const selectedSpecificsForGroup = specificMuscles.filter(m => hierarchyMuscles.includes(m));
    
    if (selectedSpecificsForGroup.length > 0) {
      // Refined: Exercise must match one of the selected specific muscles
      return selectedSpecificsForGroup.includes(exercise.muscleGroup) ||
             exercise.secondaryMuscleGroups.some(m => selectedSpecificsForGroup.includes(m));
    }
    
    // Unrefined: Match because it's in the broad group (checked in step 1)
    return true;
  });
};

const matchesEquipment = (exercise: Exercise, selected: FilterEquipment[]): boolean => {
  return matchesArrayFilter(selected, () => {
    return selected.some((filter) => {
      // Direct match for explicitly listed equipment
      if (exercise.equipment.includes(filter as EquipmentType)) {
        return true;
      }
      
      // Special handling for Squat Rack (inferred from Barbell + Movement Pattern)
      if (filter === 'Squat Rack') {
        const needsRackPatterns = ['Squat', 'Lunge', 'Hinge', 'Vertical Push'];
        const hasBarbell = exercise.equipment.includes('Barbell');
        const hasRackPattern = needsRackPatterns.includes(exercise.movementPattern);
        return (hasBarbell && hasRackPattern) || exercise.equipment.includes('Smith Machine');
      }
      
      return false;
    });
  });
};

const matchesDifficulty = (exercise: Exercise, selected: FilterDifficulty[]): boolean => {
  return matchesArrayFilter(selected, () => selected.includes(exercise.difficulty as FilterDifficulty));
};

const matchesExerciseType = (exercise: Exercise, selected: ExerciseType[]): boolean => {
  if (selected.length === 0) return true;
  return selected.includes(exercise.exerciseType);
};

export const matchesExerciseFilters = (exercise: Exercise, filters: ExerciseFilters): boolean => {
  if (filters.bodyweightOnly && !exercise.isBodyweight) {
    return false;
  }

  if (filters.compoundOnly && !exercise.isCompound) {
    return false;
  }

  if (!matchesMuscleGroup(exercise, filters)) {
    return false;
  }

  if (!matchesEquipment(exercise, filters.equipment)) {
    return false;
  }

  if (!matchesDifficulty(exercise, filters.difficulty)) {
    return false;
  }

  if (!matchesExerciseType(exercise, filters.exerciseTypes)) {
    return false;
  }

  return true;
};

export const countActiveFilters = (filters: ExerciseFilters): number => {
  let count = 0;
  count += filters.muscleGroups.length;
  count += filters.equipment.length;
  count += filters.difficulty.length;
  count += filters.exerciseTypes.length;
  if (filters.bodyweightOnly) count += 1;
  if (filters.compoundOnly) count += 1;
  return count;
};

export const getActiveFilterLabels = (filters: ExerciseFilters): string[] => {
  const labels: string[] = [];
  labels.push(...filters.muscleGroups);
  labels.push(...filters.specificMuscles);
  labels.push(...filters.equipment);
  labels.push(...filters.difficulty);
  labels.push(...filters.exerciseTypes.map(t => EXERCISE_TYPE_LABELS[t]));
  if (filters.bodyweightOnly) labels.push('Bodyweight');
  if (filters.compoundOnly) labels.push('Compound');
  return labels;
};
