/**
 * premadePlan.ts
 * Type definitions for Plans (collections of workouts).
 * 
 * TERMINOLOGY:
 * - Exercise: An individual movement (e.g., "Bench Press", "Squat")
 * - Workout: A collection of exercises (e.g., "Push Day", "Pull Day")
 * - Plan: A collection of workouts (e.g., "PPL", "Bro Split")
 * - Program: Legacy term for Plan (used interchangeably)
 * 
 * This file defines types for Plans and their components.
 */
import type { PlanExercise } from '@/types/plan';

/** Equipment requirement options */
export type EquipmentType = 'full-gym' | 'dumbbells-only' | 'bodyweight' | 'minimal';

/** User experience levels */
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

/** Training goals */
export type TrainingGoal = 'build-muscle' | 'lose-fat' | 'strength' | 'general-fitness';

/** Schedule type - weekly or rotation */
export type ScheduleType = 'weekly' | 'rotation';

/** A single workout template within a plan */
export interface PlanWorkout {
  id: string;
  name: string; // e.g., "Push Day", "Day 1"
  exercises: PlanExercise[];
}

/** Metadata for filtering/recommendations */
export interface PlanMetadata {
  goal: TrainingGoal;
  experienceLevel: ExperienceLevel;
  equipment: EquipmentType;
  daysPerWeek: number; // 2-7
  durationWeeks?: number; // Optional program length
  description: string;
  tags?: string[];
}

/** A complete premade plan (collection of workouts) */
export interface PremadePlan {
  id: string;
  name: string;
  workouts: PlanWorkout[];
  metadata: PlanMetadata;
  scheduleType: ScheduleType;
  /** For weekly: suggested day assignments. For rotation: workout order */
  suggestedSchedule?: {
    weekly?: Record<string, string | null>; // dayKey → workoutId
    rotation?: string[]; // ordered workoutIds
  };
  isPremade: true;
}

/** A standalone premade workout (not part of a plan) */
export interface PremadeWorkout extends PlanWorkout {
  metadata: Omit<PlanMetadata, 'daysPerWeek' | 'durationWeeks'> & {
    durationMinutes: number; // Estimated time to complete
  };
  isPremade: true;
}

/** User's saved plan (cloned from premade or custom) */
export interface UserPlan extends Omit<PremadePlan, 'isPremade'> {
  isPremade: false;
  sourceId?: string; // Original premade program ID if cloned
  createdAt: number;
  modifiedAt: number;
}

/** Rotation schedule state */
export interface RotationSchedule {
  id: string;
  name: string;
  programId: string; // ID of the plan/program this rotation belongs to
  workoutSequence: string[]; // Ordered list of workout IDs
  currentIndex: number; // Points to next workout
  lastAdvancedAt?: number; // Timestamp of last auto-advance
}

// Backward-compatible type aliases (deprecated - use new names)
/** @deprecated Use PlanWorkout instead */
export type ProgramWorkout = PlanWorkout;
/** @deprecated Use PlanMetadata instead */
export type ProgramMetadata = PlanMetadata;
/** @deprecated Use PremadePlan instead */
export type PremadeProgram = PremadePlan;
/** @deprecated Use UserPlan instead */
export type UserProgram = UserPlan;
