/**
 * sessionStore
 * Manages the in-progress workout session with AsyncStorage persistence.
 * Session data persists across app closes, switches, and restarts.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Workout, WorkoutExercise, SetLog } from '@/types/workout';
import type { ExerciseDataPoint, RepRange, SessionRepIntent, PendingIntentShift } from '@/types/smartSuggestions';

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
  /** Per-exercise per-set-position rep ranges (v2). */
  exerciseRepRanges: Record<string, RepRange[]>;
  /** Detected training intent for compound exercises (v2). */
  compoundRepIntent: SessionRepIntent | null;
  /** Detected training intent for isolation exercises (v2). */
  isolationRepIntent: SessionRepIntent | null;
  /** Whether user historically splits compound/isolation rep ranges (v2). */
  hasCompoundIsolationSplit: boolean;
  /** Number of confirmed intent-shifting sets awaiting propagation (v2). */
  intentShiftConfirmations: number;
  /** Pending intent shift waiting for second confirmation (v2). */
  pendingIntentShift: PendingIntentShift | null;
}

export interface SessionState {
  currentSession: SessionDraft | null;
  isSessionActive: boolean;
  /** Completed workout awaiting Supabase sync. Persisted in AsyncStorage so data survives crashes. */
  pendingWorkoutSave: Workout | null;
  startSession: (planId: string | null, exercises?: WorkoutExercise[], name?: string | null, historySetCounts?: Record<string, number>, suggestedSets?: Record<string, SetLog[]>, exerciseDataPoints?: Record<string, ExerciseDataPoint[]>, exerciseRepRanges?: Record<string, RepRange[]>, hasCompoundIsolationSplit?: boolean) => void;
  addExercise: (exercise: WorkoutExercise, historySetCount?: number, suggested?: SetLog[], dataPoints?: ExerciseDataPoint[], repRanges?: RepRange[]) => void;
  getHistorySetCount: (exerciseName: string) => number;
  getSuggestedSets: (exerciseName: string) => SetLog[] | null;
  getExerciseDataPoints: (exerciseName: string) => ExerciseDataPoint[];
  getPatternShiftCount: (exerciseName: string) => number;
  incrementPatternShiftCount: (exerciseName: string) => void;
  getExerciseRepRanges: (exerciseName: string) => RepRange[];
  setExerciseRepRanges: (exerciseName: string, ranges: RepRange[]) => void;
  setRepIntent: (intent: SessionRepIntent, isCompound: boolean) => void;
  getPendingIntentShift: () => PendingIntentShift | null;
  recordIntentShift: (intent: SessionRepIntent, isCompound: boolean) => boolean;
  updateExerciseSuggestedSets: (exerciseName: string, sets: SetLog[]) => void;
  updateExercise: (exerciseName: string, updatedExercise: WorkoutExercise) => void;
  removeExercise: (exerciseName: string) => void;
  reorderExercises: (fromIndex: number, toIndex: number) => void;
  endSession: () => Workout | null;
  clearSession: () => void;
  getCurrentSession: () => SessionDraft | null;
  /** Store a completed workout for background Supabase sync. Persisted in AsyncStorage. */
  setPendingWorkoutSave: (workout: Workout | null) => void;
  /** Retrieve the pending workout (if any). */
  getPendingWorkoutSave: () => Workout | null;
  /** Clear the pending workout after successful Supabase sync. */
  clearPendingWorkoutSave: () => void;
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
      pendingWorkoutSave: null,
      isCompletionOverlayVisible: false,
      _hasHydrated: false,
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
      startSession: (planId, exercises = [], name = null, historySetCounts = {}, suggestedSets = {}, exerciseDataPoints = {}, exerciseRepRanges = {}, hasCompoundIsolationSplit = false) => {
        const nextSession: SessionDraft = {
          planId,
          name,
          startTime: Date.now(),
          exercises: [...exercises],
          historySetCounts: { ...historySetCounts },
          suggestedSets: { ...suggestedSets },
          exerciseDataPoints: { ...exerciseDataPoints },
          patternShiftCounts: {},
          exerciseRepRanges: { ...exerciseRepRanges },
          compoundRepIntent: null,
          isolationRepIntent: null,
          hasCompoundIsolationSplit,
          intentShiftConfirmations: 0,
          pendingIntentShift: null,
        };

        set({ currentSession: nextSession, isSessionActive: true, isCompletionOverlayVisible: false });
      },
      addExercise: (exercise, historySetCount = 0, suggested, dataPoints, repRanges) => {
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

        const nextRepRanges = { ...currentSession.exerciseRepRanges };
        if (repRanges && repRanges.length > 0) {
          nextRepRanges[exercise.name] = repRanges;
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
          exerciseRepRanges: nextRepRanges,
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
      getExerciseRepRanges: (exerciseName) => {
        const { currentSession } = get();
        return currentSession?.exerciseRepRanges[exerciseName] ?? [];
      },
      setExerciseRepRanges: (exerciseName, ranges) => {
        const { currentSession } = get();
        if (!currentSession) return;
        set({
          currentSession: {
            ...currentSession,
            exerciseRepRanges: {
              ...currentSession.exerciseRepRanges,
              [exerciseName]: ranges,
            },
          },
        });
      },
      setRepIntent: (intent, isCompound) => {
        const { currentSession } = get();
        if (!currentSession) return;
        set({
          currentSession: {
            ...currentSession,
            ...(isCompound
              ? { compoundRepIntent: intent }
              : { isolationRepIntent: intent }),
          },
        });
      },
      getPendingIntentShift: () => {
        const { currentSession } = get();
        return currentSession?.pendingIntentShift ?? null;
      },
      recordIntentShift: (intent, isCompound) => {
        const { currentSession } = get();
        if (!currentSession) return false;

        const pending = currentSession.pendingIntentShift;

        // If no pending shift, record this as the first occurrence
        if (!pending) {
          set({
            currentSession: {
              ...currentSession,
              pendingIntentShift: { intent, isCompound },
              intentShiftConfirmations: 1,
            },
          });
          return false;
        }

        // If same intent direction, this is a confirmation
        if (pending.intent === intent) {
          const newCount = currentSession.intentShiftConfirmations + 1;
          set({
            currentSession: {
              ...currentSession,
              intentShiftConfirmations: newCount,
            },
          });
          // Return true when we hit the required confirmations
          return newCount >= 2;
        }

        // Different intent — replace the pending shift
        set({
          currentSession: {
            ...currentSession,
            pendingIntentShift: { intent, isCompound },
            intentShiftConfirmations: 1,
          },
        });
        return false;
      },
      updateExerciseSuggestedSets: (exerciseName, sets) => {
        const { currentSession } = get();
        if (!currentSession) return;
        set({
          currentSession: {
            ...currentSession,
            suggestedSets: {
              ...currentSession.suggestedSets,
              [exerciseName]: sets,
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
      setPendingWorkoutSave: (workout) => {
        set({ pendingWorkoutSave: workout });
      },
      getPendingWorkoutSave: () => {
        return get().pendingWorkoutSave;
      },
      clearPendingWorkoutSave: () => {
        set({ pendingWorkoutSave: null });
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
        pendingWorkoutSave: state.pendingWorkoutSave,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
