/**
 * navigationStore
 * Tracks navigation context for tab highlighting and navigation flow.
 */
import { create } from 'zustand';

export type NavigationSource = 'dashboard' | 'calendar' | null;

export interface NavigationState {
  workoutDetailSource: NavigationSource;
  setWorkoutDetailSource: (source: NavigationSource) => void;
  clearWorkoutDetailSource: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  workoutDetailSource: null,
  setWorkoutDetailSource: (source) => set({ workoutDetailSource: source }),
  clearWorkoutDetailSource: () => set({ workoutDetailSource: null }),
}));
