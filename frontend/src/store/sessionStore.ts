/**
 * sessionStore
 * Manages the in-progress workout session with AsyncStorage persistence.
 * Session data persists across app closes, switches, and restarts.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Workout, WorkoutExercise } from '@/types/workout';

interface SessionDraft {
  planId: string | null;
  name: string | null;
  startTime: number;
  exercises: WorkoutExercise[];
  historySetCounts: Record<string, number>;
}

export interface SessionState {
  currentSession: SessionDraft | null;
  isSessionActive: boolean;
  startSession: (planId: string | null, exercises?: WorkoutExercise[], name?: string | null, historySetCounts?: Record<string, number>) => void;
  addExercise: (exercise: WorkoutExercise, historySetCount?: number) => void;
  getHistorySetCount: (exerciseName: string) => number;
  updateExercise: (exerciseName: string, updatedExercise: WorkoutExercise) => void;
  removeExercise: (exerciseName: string) => void;
  endSession: () => Workout | null;
  clearSession: () => void;
  getCurrentSession: () => SessionDraft | null;
  isCompletionOverlayVisible: boolean;
  setCompletionOverlayVisible: (visible: boolean) => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

const generateWorkoutId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      currentSession: null,
      isSessionActive: false,
      isCompletionOverlayVisible: false,
      _hasHydrated: false,
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
      startSession: (planId, exercises = [], name = null, historySetCounts = {}) => {
        const nextSession: SessionDraft = {
          planId,
          name,
          startTime: Date.now(),
          exercises: [...exercises],
          historySetCounts: { ...historySetCounts },
        };

        set({ currentSession: nextSession, isSessionActive: true, isCompletionOverlayVisible: false });
      },
      addExercise: (exercise, historySetCount = 0) => {
        const { currentSession } = get();

        if (!currentSession) {
          return;
        }

        const nextSession: SessionDraft = {
          ...currentSession,
          exercises: [...currentSession.exercises, exercise],
          historySetCounts: {
            ...currentSession.historySetCounts,
            [exercise.name]: historySetCount,
          },
        };

        set({ currentSession: nextSession });
      },
      getHistorySetCount: (exerciseName) => {
        const { currentSession } = get();
        return currentSession?.historySetCounts[exerciseName] ?? 0;
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
    }),
    {
      name: 'hercules-workout-session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentSession: state.currentSession,
        isSessionActive: state.isSessionActive,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
