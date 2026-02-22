/**
 * sessionStore
 * Manages the in-progress workout session with AsyncStorage persistence.
 * Session data persists across app closes, switches, and restarts.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Workout, WorkoutExercise, SetLog } from '@/types/workout';
import type { ExerciseDataPoint } from '@/types/smartSuggestions';

interface SessionDraft {
  planId: string | null;
  name: string | null;
  startTime: number;
  exercises: WorkoutExercise[];
  historySetCounts: Record<string, number>;
  /** Original smart-suggested sets per exercise (keyed by exercise name). */
  suggestedSets: Record<string, SetLog[]>;
  /** Cached historical data points per exercise for intra-session pattern shift detection. */
  exerciseDataPoints: Record<string, ExerciseDataPoint[]>;
  /** Tracks how many intra-session pattern shifts have occurred per exercise. */
  patternShiftCounts: Record<string, number>;
}

export interface SessionState {
  currentSession: SessionDraft | null;
  isSessionActive: boolean;
  startSession: (planId: string | null, exercises?: WorkoutExercise[], name?: string | null, historySetCounts?: Record<string, number>, suggestedSets?: Record<string, SetLog[]>, exerciseDataPoints?: Record<string, ExerciseDataPoint[]>) => void;
  addExercise: (exercise: WorkoutExercise, historySetCount?: number, suggested?: SetLog[], dataPoints?: ExerciseDataPoint[]) => void;
  getHistorySetCount: (exerciseName: string) => number;
  getSuggestedSets: (exerciseName: string) => SetLog[] | null;
  getExerciseDataPoints: (exerciseName: string) => ExerciseDataPoint[];
  getPatternShiftCount: (exerciseName: string) => number;
  incrementPatternShiftCount: (exerciseName: string) => void;
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
      startSession: (planId, exercises = [], name = null, historySetCounts = {}, suggestedSets = {}, exerciseDataPoints = {}) => {
        const nextSession: SessionDraft = {
          planId,
          name,
          startTime: Date.now(),
          exercises: [...exercises],
          historySetCounts: { ...historySetCounts },
          suggestedSets: { ...suggestedSets },
          exerciseDataPoints: { ...exerciseDataPoints },
          patternShiftCounts: {},
        };

        set({ currentSession: nextSession, isSessionActive: true, isCompletionOverlayVisible: false });
      },
      addExercise: (exercise, historySetCount = 0, suggested, dataPoints) => {
        const { currentSession } = get();

        if (!currentSession) {
          return;
        }

        const nextSuggested = { ...currentSession.suggestedSets };
        if (suggested && suggested.length > 0) {
          nextSuggested[exercise.name] = suggested;
        }

        const nextDataPoints = { ...currentSession.exerciseDataPoints };
        if (dataPoints && dataPoints.length > 0) {
          nextDataPoints[exercise.name] = dataPoints;
        }

        const nextSession: SessionDraft = {
          ...currentSession,
          exercises: [...currentSession.exercises, exercise],
          historySetCounts: {
            ...currentSession.historySetCounts,
            [exercise.name]: historySetCount,
          },
          suggestedSets: nextSuggested,
          exerciseDataPoints: nextDataPoints,
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
      getExerciseDataPoints: (exerciseName) => {
        const { currentSession } = get();
        return currentSession?.exerciseDataPoints[exerciseName] ?? [];
      },
      getPatternShiftCount: (exerciseName) => {
        const { currentSession } = get();
        return currentSession?.patternShiftCounts[exerciseName] ?? 0;
      },
      incrementPatternShiftCount: (exerciseName) => {
        const { currentSession } = get();
        if (!currentSession) return;
        set({
          currentSession: {
            ...currentSession,
            patternShiftCounts: {
              ...currentSession.patternShiftCounts,
              [exerciseName]: (currentSession.patternShiftCounts[exerciseName] ?? 0) + 1,
            },
          },
        });
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
