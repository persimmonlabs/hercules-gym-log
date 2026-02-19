import rawExercises from '@/data/exercises.json';
import hierarchyData from '@/data/hierarchy.json';
import { normalizeSearchText } from '@/utils/strings';
import {
  type DifficultyLevel,
  type EquipmentType,
  type ExerciseCatalogItem,
  type ExerciseType,
  type MovementPattern,
  type MuscleGroup,
  type FilterMuscleGroup,
  FILTER_MUSCLE_GROUPS,
  FILTER_EQUIPMENT,
  FILTER_DIFFICULTY,
} from '@/types/exercise';

interface RawExercise {
  id: string;
  name: string;
  muscles: Record<string, number>;
  equipment: EquipmentType[];
  movement_pattern: MovementPattern;
  difficulty: DifficultyLevel;
  is_compound: boolean;
  // New fields for exercise types
  exercise_type?: ExerciseType;
  distance_unit?: 'miles' | 'meters' | 'floors';
  // For outdoor cardio exercises - enables GPS-based tracking
  supports_gps_tracking?: boolean;
  // Fraction of bodyweight that contributes to volume (0–1)
  effectiveBodyweightMultiplier?: number;
}

// --- Hierarchy Mapping Logic ---

const MAP_L2_TO_MUSCLE_GROUP: Record<string, MuscleGroup> = {
  Chest: 'Chest',
  Back: 'Back',
  Shoulders: 'Shoulders',
  Arms: 'Arms',
  Quads: 'Legs',
  Hamstrings: 'Legs',
  Calves: 'Legs',
  Glutes: 'Glutes',
  'Hips': 'Legs',
  Adductors: 'Legs',
  Abductors: 'Legs',
  Abs: 'Core',
  Obliques: 'Core',
  'Lower Back': 'Core',
};

interface MuscleMeta {
  muscleGroup: MuscleGroup;
  filterGroup: FilterMuscleGroup;
}

const buildMuscleMetaMap = (): Record<string, MuscleMeta> => {
  const map: Record<string, MuscleMeta> = {};
  const hierarchy = hierarchyData.muscle_hierarchy as Record<string, any>;

  Object.entries(hierarchy).forEach(([l1Name, l1Data]) => {
    const filterGroup = l1Name as FilterMuscleGroup;

    if (l1Data.muscles) {
      Object.entries(l1Data.muscles).forEach(([l2Name, l2Data]: [string, any]) => {
        const muscleGroup = MAP_L2_TO_MUSCLE_GROUP[l2Name] || ('Full Body' as MuscleGroup); // Fallback
        
        // Map L2 itself (e.g., Chest, Back, Arms, Calves)
        map[l2Name] = { muscleGroup, filterGroup };

        // Map L3s (e.g., Upper Chest, Biceps, Medial Head for Calves)
        if (l2Data.muscles) {
          Object.entries(l2Data.muscles).forEach(([l3Name, l3Data]: [string, any]) => {
            map[l3Name] = { muscleGroup, filterGroup };
            
            // Map L4s (detailed level, e.g., Long Head under Biceps)
            if (l3Data.muscles) {
              Object.keys(l3Data.muscles).forEach((l4Name) => {
                map[l4Name] = { muscleGroup, filterGroup };
              });
            }
          });
        }
      });
    }
  });
  return map;
};

const MUSCLE_META_MAP = buildMuscleMetaMap();

// --- Validation ---

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isValidRawExercise = (candidate: unknown): candidate is RawExercise => {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  const exercise = candidate as Partial<RawExercise>;

  return (
    typeof exercise.id === 'string' &&
    typeof exercise.name === 'string' &&
    typeof exercise.muscles === 'object' &&
    exercise.muscles !== null &&
    isStringArray(exercise.equipment) &&
    typeof exercise.movement_pattern === 'string' &&
    typeof exercise.difficulty === 'string' &&
    typeof exercise.is_compound === 'boolean'
  );
};

// --- Transformation ---

const buildSearchIndex = (
  exercise: RawExercise,
  primaryMuscle: string,
  muscleGroup: MuscleGroup,
  filterGroup: FilterMuscleGroup,
  secondaryGroups: MuscleGroup[]
): string => {
  const parts: string[] = [
    exercise.name,
    primaryMuscle,
    muscleGroup,
    filterGroup,
    ...secondaryGroups,
    ...exercise.equipment,
    exercise.movement_pattern,
    exercise.difficulty,
  ];

  // Add all specific muscle names from the muscles object
  parts.push(...Object.keys(exercise.muscles));

  if (exercise.is_compound) {
    parts.push('compound');
  }

  if (exercise.equipment.length === 1 && exercise.equipment[0] === 'Bodyweight') {
    parts.push('bodyweight');
  }

  // Add exercise type to search index
  if (exercise.exercise_type) {
    parts.push(exercise.exercise_type);
  }

  return normalizeSearchText(parts.join(' '));
};

const toExercise = (exercise: RawExercise): ExerciseCatalogItem => {
  const isBodyweight =
    exercise.equipment.length === 1 && exercise.equipment[0] === 'Bodyweight';

  // Derive muscle info
  const sortedMuscles = Object.entries(exercise.muscles).sort((a, b) => b[1] - a[1]);
  const primaryMuscleEntry = sortedMuscles[0];
  
  // Default to Full Body/Upper Body if no muscles defined (shouldn't happen with valid data)
  const primaryMuscleName = primaryMuscleEntry ? primaryMuscleEntry[0] : 'Full Body';
  
  const meta = MUSCLE_META_MAP[primaryMuscleName] || { 
    muscleGroup: 'Full Body' as MuscleGroup, 
    filterGroup: 'Upper Body' as FilterMuscleGroup 
  };

  const muscleGroup = meta.muscleGroup;
  const filterMuscleGroup = meta.filterGroup;

  // Derive secondary muscle groups
  const secondaryMuscleGroups = sortedMuscles
    .slice(1)
    .map(([name]) => MUSCLE_META_MAP[name]?.muscleGroup)
    .filter((g): g is MuscleGroup => !!g && g !== muscleGroup)
    // Unique
    .filter((value, index, self) => self.indexOf(value) === index);

  return {
    id: exercise.id,
    name: exercise.name,
    muscles: exercise.muscles,
    muscleGroup,
    filterMuscleGroup,
    secondaryMuscleGroups,
    equipment: exercise.equipment,
    movementPattern: exercise.movement_pattern,
    difficulty: exercise.difficulty,
    isCompound: exercise.is_compound,
    isBodyweight,
    exerciseType: exercise.exercise_type || 'weight',
    distanceUnit: exercise.distance_unit,
    supportsGpsTracking: exercise.supports_gps_tracking,
    effectiveBodyweightMultiplier: exercise.effectiveBodyweightMultiplier ?? 0,
    searchIndex: buildSearchIndex(exercise, primaryMuscleName, muscleGroup, filterMuscleGroup, secondaryMuscleGroups),
  };
};

// Handle both array and single object formats for robustness
const rawData = Array.isArray(rawExercises)
  ? rawExercises
  : [rawExercises];

const rawExerciseList = (rawData as unknown[]).filter(isValidRawExercise);

export const exercises: ExerciseCatalogItem[] = rawExerciseList.map(toExercise);

const exerciseLookup = new Map<string, ExerciseCatalogItem>(
  exercises.map((exercise) => [exercise.id, exercise]),
);

export const getExerciseById = (id: string): ExerciseCatalogItem | undefined =>
  exerciseLookup.get(id);

export const exerciseFilterOptions = {
  muscleGroups: FILTER_MUSCLE_GROUPS,
  equipment: FILTER_EQUIPMENT,
  difficulty: FILTER_DIFFICULTY,
} as const;

export type { Exercise, ExerciseCatalogItem } from '@/types/exercise';

/**
 * Creates an ExerciseCatalogItem from a custom exercise.
 * Custom exercises have minimal metadata since they're user-defined.
 */
const DEFAULT_BW_MULTIPLIER: Record<ExerciseType, number> = {
  bodyweight: 0.10,
  weight: 0.02,
  assisted: 0.02,
  cardio: 0,
  duration: 0,
  reps_only: 0,
};

export const createCustomExerciseCatalogItem = (
  id: string,
  name: string,
  exerciseType: ExerciseType,
  supportsGpsTracking: boolean = false,
): ExerciseCatalogItem => ({
  id,
  name,
  muscles: {},
  muscleGroup: 'Full Body' as MuscleGroup,
  filterMuscleGroup: 'Upper Body' as FilterMuscleGroup,
  secondaryMuscleGroups: [],
  equipment: [] as EquipmentType[],
  movementPattern: supportsGpsTracking ? 'Cardio' as MovementPattern : 'Isometric' as MovementPattern,
  difficulty: 'Intermediate' as DifficultyLevel,
  isCompound: false,
  isBodyweight: exerciseType === 'bodyweight',
  exerciseType,
  distanceUnit: supportsGpsTracking ? 'miles' : undefined,
  supportsGpsTracking,
  effectiveBodyweightMultiplier: DEFAULT_BW_MULTIPLIER[exerciseType] ?? 0,
  searchIndex: normalizeSearchText(`${name} custom${supportsGpsTracking ? ' outdoor gps' : ''}`),
});

/**
 * Checks if an exercise is a custom (user-created) exercise.
 * Custom exercise IDs are UUIDs from Supabase, while built-in exercises
 * have short alphanumeric IDs.
 */
export const isCustomExercise = (exerciseId: string): boolean => {
  // Supabase UUIDs are 36 characters with dashes
  return exerciseId.length === 36 && exerciseId.includes('-');
};

/**
 * Gets exercise type for an exercise by name, checking custom exercises first.
 */
export const getExerciseTypeByName = (
  exerciseName: string,
  customExercises: { name: string; exerciseType: ExerciseType }[]
): ExerciseType => {
  const customExercise = customExercises.find(
    (e) => e.name.toLowerCase() === exerciseName.toLowerCase()
  );
  if (customExercise) {
    return customExercise.exerciseType;
  }

  const catalogExercise = exercises.find(
    (e) => e.name.toLowerCase() === exerciseName.toLowerCase()
  );
  return catalogExercise?.exerciseType || 'weight';
};

