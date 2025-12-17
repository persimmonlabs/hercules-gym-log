import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const DEFAULT_TRACKED_EXERCISES: string[] = [
  'Barbell Bench Press',
  'Barbell Squat',
  'Barbell Deadlift',
];

interface PersonalRecordsState {
  trackedExercises: string[];
  setTrackedExercises: (names: string[]) => void;
  replaceTrackedExercise: (index: number, name: string) => void;
  resetTrackedExercises: () => void;
}

const normalizeTrackedExercises = (names: string[]): string[] => {
  const uniqueInOrder: string[] = [];
  names.forEach((name) => {
    if (name.trim().length === 0) {
      return;
    }

    if (!uniqueInOrder.includes(name)) {
      uniqueInOrder.push(name);
    }
  });

  const next: string[] = uniqueInOrder.slice(0, 3);

  DEFAULT_TRACKED_EXERCISES.forEach((fallback) => {
    if (next.length >= 3) {
      return;
    }

    if (!next.includes(fallback)) {
      next.push(fallback);
    }
  });

  return next;
};

export const usePersonalRecordsStore = create<PersonalRecordsState>()(
  persist(
    (set, get) => ({
      trackedExercises: DEFAULT_TRACKED_EXERCISES,

      setTrackedExercises: (names: string[]) => {
        set({ trackedExercises: normalizeTrackedExercises(names) });
      },

      replaceTrackedExercise: (index: number, name: string) => {
        const current = get().trackedExercises;
        const next = [...current];
        next[index] = name;
        set({ trackedExercises: normalizeTrackedExercises(next) });
      },

      resetTrackedExercises: () => {
        set({ trackedExercises: DEFAULT_TRACKED_EXERCISES });
      },
    }),
    {
      name: 'hercules-personal-records',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        trackedExercises: state.trackedExercises,
      }),
    }
  )
);
