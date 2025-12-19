/**
 * sessionStore
 * Manages the in-progress workout session prior to persistence.
 */
import { create } from 'zustand';

import type { Workout, WorkoutExercise } from '@/types/workout';

interface SessionDraft {
  planId: string | null;
  name: string | null;
  startTime: number;
  exercises: WorkoutExercise[];
}

export interface SessionState {
  currentSession: SessionDraft | null;
  isSessionActive: boolean;
  startSession: (planId: string | null, exercises?: WorkoutExercise[], name?: string | null) => void;
  addExercise: (exercise: WorkoutExercise) => void;
  updateExercise: (exerciseName: string, updatedExercise: WorkoutExercise) => void;
  removeExercise: (exerciseName: string) => void;
  endSession: () => Workout | null;
  clearSession: () => void;
  getCurrentSession: () => SessionDraft | null;
  isCompletionOverlayVisible: boolean;
  setCompletionOverlayVisible: (visible: boolean) => void;
}

const generateWorkoutId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  currentSession: null,
  isSessionActive: false,
  isCompletionOverlayVisible: false,
  startSession: (planId, exercises = [], name = null) => {
    const nextSession: SessionDraft = {
      planId,
      name,
      startTime: Date.now(),
      exercises: [...exercises],
    };

    set({ currentSession: nextSession, isSessionActive: true, isCompletionOverlayVisible: false });
  },
  addExercise: (exercise) => {
    const { currentSession } = get();

    if (!currentSession) {
      return;
    }

    const nextSession: SessionDraft = {
      ...currentSession,
      exercises: [...currentSession.exercises, exercise],
    };

    set({ currentSession: nextSession });
  },
  updateExercise: (exerciseName, updatedExercise) => {
    const { currentSession } = get();

    if (!currentSession) {
      return;
    }

    const nextSession: SessionDraft = {
      ...currentSession,
      exercises: currentSession.exercises.map((exercise) => {
        if (exercise.name !== exerciseName) {
          return exercise;
        }

        return { ...updatedExercise };
      }),
    };

    set({ currentSession: nextSession });
  },
  removeExercise: (exerciseName) => {
    const { currentSession } = get();

    if (!currentSession) {
      return;
    }

    const nextSession: SessionDraft = {
      ...currentSession,
      exercises: currentSession.exercises.filter((exercise) => exercise.name !== exerciseName),
    };

    set({ currentSession: nextSession });
  },
  endSession: () => {
    const { currentSession } = get();

    if (!currentSession) {
      return null;
    }

    const endTime = Date.now();
    const durationMilliseconds = endTime - currentSession.startTime;
    const durationSeconds = Math.max(Math.floor(durationMilliseconds / 1000), 0);

    const workout: Workout = {
      id: generateWorkoutId(),
      planId: currentSession.planId,
      name: currentSession.name,
      date: new Date(currentSession.startTime).toISOString(),
      startTime: currentSession.startTime,
      endTime,
      duration: durationSeconds,
      exercises: currentSession.exercises,
    };

    set({ currentSession: null, isSessionActive: false });

    return workout;
  },
  clearSession: () => {
    set({ currentSession: null, isSessionActive: false, isCompletionOverlayVisible: false });
  },
  getCurrentSession: () => {
    return get().currentSession;
  },
  setCompletionOverlayVisible: (visible) => {
    set({ isCompletionOverlayVisible: visible });
  },
}));
