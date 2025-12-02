import rawExercises from '@/data/exercises.json';
import hierarchyData from '@/data/hierarchy.json';
import { normalizeSearchText } from '@/utils/strings';
import {
  type DifficultyLevel,
  type EquipmentType,
  type Exercise,
  type ExerciseCatalogItem,
  type MovementPattern,
  type MuscleGroup,
  type FilterMuscleGroup,
  DIFFICULTY_LEVELS,
  EQUIPMENT_TYPES,
  MOVEMENT_PATTERNS,
  MUSCLE_GROUPS,
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
  'Hip Stabilizers': 'Legs',
  Adductors: 'Legs',
  Abductors: 'Legs',
  Abs: 'Core',
  Obliques: 'Core',
  'Lower Back': 'Core',
};

// Map for muscles that exist at mid level but have detailed children (no low level)
// These muscles should be treated as valid leaf nodes in exercises.json
const MID_LEVEL_LEAF_MUSCLES = ['Calves'];

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

