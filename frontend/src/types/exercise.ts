export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Arms'
  | 'Legs'
  | 'Glutes'
  | 'Core'
  | 'Full Body'
  | 'Power / Olympic'
  | 'Mobility';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Glutes',
  'Core',
  'Full Body',
  'Power / Olympic',
  'Mobility',
];

export type EquipmentType =
  | 'Barbell'
  | 'Dumbbell'
  | 'Cable'
  | 'Machine'
  | 'Bodyweight'
  | 'Kettlebell'
  | 'Bands'
  | 'Smith Machine'
  | 'Trap Bar'
  | 'Bench'
  | 'Cardio Machine';

export const EQUIPMENT_TYPES: EquipmentType[] = [
  'Barbell',
  'Dumbbell',
  'Cable',
  'Machine',
  'Bodyweight',
  'Kettlebell',
  'Bands',
  'Smith Machine',
  'Trap Bar',
  'Bench',
  'Cardio Machine',
];

export type MovementPattern =
  | 'Horizontal Push'
  | 'Horizontal Pull'
  | 'Vertical Push'
  | 'Vertical Pull'
  | 'Squat'
  | 'Hinge'
  | 'Lunge'
  | 'Carry'
  | 'Rotation'
  | 'Anti-Rotation'
  | 'Cardio'
  | 'Flexion'
  | 'Isometric'
  | 'Lateral';

export const MOVEMENT_PATTERNS: MovementPattern[] = [
  'Horizontal Push',
  'Horizontal Pull',
  'Vertical Push',
  'Vertical Pull',
  'Squat',
  'Hinge',
  'Lunge',
  'Carry',
  'Rotation',
  'Anti-Rotation',
  'Cardio',
  'Flexion',
  'Isometric',
  'Lateral',
];

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export const DIFFICULTY_LEVELS: DifficultyLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

// Exercise input types - determines what fields are shown in set editor
export type ExerciseType = 'weight' | 'cardio' | 'bodyweight' | 'assisted' | 'reps_only' | 'duration';

export const EXERCISE_TYPES: ExerciseType[] = [
  'weight',
  'cardio',
  'bodyweight',
  'assisted',
  'reps_only',
  'duration',
];

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  weight: 'Weight',
  cardio: 'Cardio',
  bodyweight: 'Bodyweight',
  assisted: 'Assisted',
  reps_only: 'Resistance Band',
  duration: 'Timed',
};

export type FilterMuscleGroup = 'Upper Body' | 'Lower Body' | 'Core';

export const FILTER_MUSCLE_GROUPS: FilterMuscleGroup[] = [
  'Upper Body',
  'Lower Body',
  'Core',
];

export type FilterEquipment =
  | 'Barbell'
  | 'Dumbbell'
  | 'Machine'
  | 'Bench'
  | 'Squat Rack'
  | 'Cable';

export const FILTER_EQUIPMENT: FilterEquipment[] = [
  'Barbell',
  'Dumbbell',
  'Machine',
  'Bench',
  'Squat Rack',
  'Cable',
];

export type FilterDifficulty = 'Beginner' | 'Intermediate';

export const FILTER_DIFFICULTY: FilterDifficulty[] = ['Beginner', 'Intermediate'];

export interface Exercise {
  id: string;
  name: string;
  muscles: Record<string, number>;
  muscleGroup: MuscleGroup;
  filterMuscleGroup: FilterMuscleGroup;
  secondaryMuscleGroups: MuscleGroup[];
  equipment: EquipmentType[];
  movementPattern: MovementPattern;
  difficulty: DifficultyLevel;
  isCompound: boolean;
  isBodyweight: boolean;
  // Exercise type determines input fields in set editor
  exerciseType: ExerciseType;
  // For cardio exercises - unit for distance tracking
  distanceUnit?: 'miles' | 'meters' | 'floors';
}

export interface ExerciseCatalogItem extends Exercise {
  searchIndex: string;
}

export interface ExerciseFilters {
  muscleGroups: FilterMuscleGroup[];
  specificMuscles: MuscleGroup[];
  equipment: FilterEquipment[];
  difficulty: FilterDifficulty[];
  bodyweightOnly: boolean;
  compoundOnly: boolean;
  exerciseTypes: ExerciseType[];
}
