/**
 * sessionStore
 * Manages the in-progress workout session with AsyncStorage persistence.
 * Session data persists across app closes, switches, and restarts.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Workout, WorkoutExercise, SetLog } from '@/types/workout';

interface SessionDraft {
  planId: string | null;
  name: string | null;
  startTime: number;
  exercises: WorkoutExercise[];
  historySetCounts: Record<string, number>;
  /** Original smart-suggested sets per exercise (keyed by exercise name). */
  suggestedSets: Record<string, SetLog[]>;
}

export interface SessionState {
  currentSession: SessionDraft | null;
  isSessionActive: boolean;
  startSession: (planId: string | null, exercises?: WorkoutExercise[], name?: string | null, historySetCounts?: Record<string, number>, suggestedSets?: Record<string, SetLog[]>) => void;
  addExercise: (exercise: WorkoutExercise, historySetCount?: number, suggested?: SetLog[]) => void;
  getHistorySetCount: (exerciseName: string) => number;
  getSuggestedSets: (exerciseName: string) => SetLog[] | null;
  updateExercise: (exerciseName: string, updatedExercise: WorkoutExercise) => void;
  removeExercise: (exerciseName: string) => void;
  reorderExercises: (fromIndex: number, toIndex: number) => void;
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
      startSession: (planId, exercises = [], name = null, historySetCounts = {}, suggestedSets = {}) => {
        const nextSession: SessionDraft = {
          planId,
          name,
          startTime: Date.now(),
          exercises: [...exercises],
          historySetCounts: { ...historySetCounts },
          suggestedSets: { ...suggestedSets },
        };

        set({ currentSession: nextSession, isSessionActive: true, isCompletionOverlayVisible: false });
      },
      addExercise: (exercise, historySetCount = 0, suggested) => {
        const { currentSession } = get();

        if (!currentSession) {
          return;
        }

        const nextSuggested = { ...currentSession.suggestedSets };
        if (suggested && suggested.length > 0) {
          nextSuggested[exercise.name] = suggested;
        }

        const nextSession: SessionDraft = {
          ...currentSession,
          exercises: [...currentSession.exercises, exercise],
          historySetCounts: {
            ...currentSession.historySetCounts,
            [exercise.name]: historySetCount,
          },
          suggestedSets: nextSuggested,
        };

        set({ currentSession: nextSession });
      },
      getHistorySetCount: (exerciseName) => {
        const { currentSession } = get();
        return currentSession?.historySetCounts[exerciseName] ?? 0;
      },
      getSuggestedSets: (exerciseName) => {
        const { currentSession } = get();
        return currentSession?.suggestedSets[exerciseName] ?? null;
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
      reorderExercises: (fromIndex, toIndex) => {
        const { currentSession } = get();

        if (!currentSession) {
          return;
        }

        const exercises = [...currentSession.exercises];
        const [movedExercise] = exercises.splice(fromIndex, 1);
        exercises.splice(toIndex, 0, movedExercise);

        const nextSession: SessionDraft = {
          ...currentSession,
          exercises,
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

        // Generate session name if null and only one exercise
        let sessionName = currentSession.name;
        if (!sessionName && currentSession.exercises.length === 1) {
          sessionName = currentSession.exercises[0].name;
        }

        const workout: Workout = {
          id: generateWorkoutId(),
          planId: currentSession.planId,
          name: sessionName,
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
