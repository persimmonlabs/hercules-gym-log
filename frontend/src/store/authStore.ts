/**
 * authStore
 * Tracks authentication state and onboarding flow triggers
 */

import { create } from 'zustand';

interface AuthState {
  /** Flag set to true when user just signed up (to force onboarding) */
  justSignedUp: boolean;
  setJustSignedUp: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  justSignedUp: false,
  setJustSignedUp: (value: boolean) => set({ justSignedUp: value }),
}));
