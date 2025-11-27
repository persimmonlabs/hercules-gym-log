import type { PlanExercise } from '@/types/plan';

/** Equipment requirement options */
export type EquipmentType = 'full-gym' | 'dumbbells-only' | 'bodyweight' | 'minimal';

/** User experience levels */
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

/** Training goals */
export type TrainingGoal = 'build-muscle' | 'lose-fat' | 'strength' | 'general-fitness';

/** Schedule type - weekly or rotation */
export type ScheduleType = 'weekly' | 'rotation';

/** A single workout template within a program */
export interface ProgramWorkout {
  id: string;
  name: string; // e.g., "Push Day", "Day 1"
  exercises: PlanExercise[];
}

/** Metadata for filtering/recommendations */
export interface ProgramMetadata {
  goal: TrainingGoal;
  experienceLevel: ExperienceLevel;
  equipment: EquipmentType;
  daysPerWeek: number; // 2-7
  durationWeeks?: number; // Optional program length
  description: string;
  tags?: string[];
}

/** A complete premade workout program */
export interface PremadeProgram {
  id: string;
  name: string;
  workouts: ProgramWorkout[];
  metadata: ProgramMetadata;
  scheduleType: ScheduleType;
  /** For weekly: suggested day assignments. For rotation: workout order */
  suggestedSchedule?: {
    weekly?: Record<string, string | null>; // dayKey → workoutId
    rotation?: string[]; // ordered workoutIds
  };
  isPremade: true;
}

/** A standalone premade workout (not part of a program) */
export interface PremadeWorkout extends ProgramWorkout {
  metadata: Omit<ProgramMetadata, 'daysPerWeek' | 'durationWeeks'> & {
    durationMinutes: number; // Estimated time to complete
  };
  isPremade: true;
}

/** User's saved program (cloned from premade or custom) */
export interface UserProgram extends Omit<PremadeProgram, 'isPremade'> {
  isPremade: false;
  sourceId?: string; // Original premade program ID if cloned
  createdAt: number;
  modifiedAt: number;
}

/** Rotation schedule state */
export interface RotationSchedule {
  id: string;
  name: string;
  programId: string;
  workoutSequence: string[]; // Ordered list of workout IDs
  currentIndex: number; // Points to next workout
  lastAdvancedAt?: number; // Timestamp of last auto-advance
}
