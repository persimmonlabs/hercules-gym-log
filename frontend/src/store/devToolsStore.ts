import { create } from 'zustand';

type PremiumOverride = 'default' | 'free' | 'premium';

interface DevToolsState {
  forceEmptyAnalytics: boolean;
  premiumOverride: PremiumOverride;
  setForceEmptyAnalytics: (value: boolean) => void;
  toggleForceEmptyAnalytics: () => void;
  setPremiumOverride: (value: PremiumOverride) => void;
  reset: () => void;
}

export const useDevToolsStore = create<DevToolsState>((set, get) => ({
  forceEmptyAnalytics: false,
  premiumOverride: 'default',
  setForceEmptyAnalytics: (value) => set({ forceEmptyAnalytics: value }),
  toggleForceEmptyAnalytics: () => set({ forceEmptyAnalytics: !get().forceEmptyAnalytics }),
  setPremiumOverride: (value) => set({ premiumOverride: value }),
  reset: () => set({ forceEmptyAnalytics: false, premiumOverride: 'default' }),
}));

export type { PremiumOverride };
