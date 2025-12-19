export interface SetLog {
  completed: boolean;
  // Weight exercises
  weight?: number;
  reps?: number;
  // Cardio exercises
  duration?: number;      // stored as seconds
  distance?: number;      // miles, meters, or floors based on exercise
  // Assisted exercises (also uses reps)
  assistanceWeight?: number;
}

export interface WorkoutExercise {
  name: string;
  sets: SetLog[];
}

export interface Workout {
  id: string;
  planId: string | null;
  /**
   * Snapshot of the workout's display name (if started from a saved workout/program).
   * Falls back to null for scratch sessions.
   */
  name?: string | null;
  date: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  exercises: WorkoutExercise[];
}
