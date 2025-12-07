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
  date: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  exercises: WorkoutExercise[];
}
