/**
 * settingsStore
 * Zustand store for user settings with AsyncStorage persistence.
 * Handles granular unit preferences for weight, distance, and size.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UnitSystem = 'imperial' | 'metric';
export type WeightUnit = 'lbs' | 'kg';
export type DistanceUnit = 'mi' | 'km';
export type SizeUnit = 'in' | 'cm';
export type ThemePreference = 'light' | 'dark' | 'system';

interface SettingsState {
  /** Legacy unit system preference (for backward compatibility) */
  unitSystem: UnitSystem;
  /** Granular weight unit preference: 'lbs' or 'kg' */
  weightUnit: WeightUnit;
  /** Granular distance unit preference: 'mi' or 'km' */
  distanceUnit: DistanceUnit;
  /** Granular size unit preference: 'in' or 'cm' (for body height) */
  sizeUnit: SizeUnit;
  /** Theme preference: 'light', 'dark', or 'system' */
  themePreference: ThemePreference;
  /** Set the legacy unit system preference (updates all granular units) */
  setUnitSystem: (system: UnitSystem) => void;
  /** Set theme preference */
  setThemePreference: (preference: ThemePreference) => void;
  /** Set individual weight unit preference */
  setWeightUnit: (unit: WeightUnit) => void;
  /** Set individual distance unit preference */
  setDistanceUnit: (unit: DistanceUnit) => void;
  /** Set individual size unit preference */
  setSizeUnit: (unit: SizeUnit) => void;
  /** Get weight unit label */
  getWeightUnit: () => string;
  /** Get height unit label */
  getHeightUnit: () => string;
  /** Get distance unit label */
  getDistanceUnit: () => string;
  /** Get distance unit abbreviation (mi or km) */
  getDistanceUnitShort: () => string;
  /** Convert weight from lbs to current unit */
  convertWeight: (lbs: number) => number;
  /** Convert weight from current unit to lbs (for storage) */
  convertWeightToLbs: (value: number) => number;
  /** Convert distance from miles to current unit */
  convertDistance: (miles: number) => number;
  /** Convert distance from current unit to miles (for storage) */
  convertDistanceToMiles: (value: number) => number;
  /** Format weight with unit label (e.g., "135 lbs" or "61.2 kg") */
  formatWeight: (lbs: number, decimals?: number) => string;
  /** Format weight without unit (just the number) */
  formatWeightValue: (lbs: number, decimals?: number) => string;
  /** Format distance with unit label (e.g., "3.5 mi" or "5.6 km") */
  formatDistance: (miles: number, decimals?: number) => string;
  /** Format distance without unit (just the number) */
  formatDistanceValue: (miles: number, decimals?: number) => string;
}

// Conversion constants
const LBS_TO_KG = 0.453592;
const KG_TO_LBS = 2.20462;
const MILES_TO_KM = 1.60934;
const KM_TO_MILES = 0.621371;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      unitSystem: 'imperial',
      weightUnit: 'lbs',
      distanceUnit: 'mi',
      sizeUnit: 'in',
      themePreference: 'light',

      setUnitSystem: (system: UnitSystem) => {
        // Update all granular units when legacy system is changed
        set({
          unitSystem: system,
          weightUnit: system === 'metric' ? 'kg' : 'lbs',
          distanceUnit: system === 'metric' ? 'km' : 'mi',
          sizeUnit: system === 'metric' ? 'cm' : 'in',
        });
      },

      setThemePreference: (preference: ThemePreference) => {
        set({ themePreference: preference });
      },

      setWeightUnit: (unit: WeightUnit) => {
        set({ weightUnit: unit });
      },

      setDistanceUnit: (unit: DistanceUnit) => {
        set({ distanceUnit: unit });
      },

      setSizeUnit: (unit: SizeUnit) => {
        set({ sizeUnit: unit });
      },

      getWeightUnit: () => {
        return get().weightUnit === 'kg' ? 'kg' : 'lbs';
      },

      getHeightUnit: () => {
        return get().sizeUnit === 'cm' ? 'cm' : 'in';
      },

      getDistanceUnit: () => {
        return get().distanceUnit === 'km' ? 'kilometers' : 'miles';
      },

      getDistanceUnitShort: () => {
        return get().distanceUnit === 'km' ? 'km' : 'mi';
      },

      convertWeight: (lbs: number) => {
        if (get().weightUnit === 'kg') {
          return Math.round(lbs * LBS_TO_KG * 10) / 10; // Round to 1 decimal
        }
        return lbs;
      },

      convertWeightToLbs: (value: number) => {
        if (get().weightUnit === 'kg') {
          return Math.round(value * KG_TO_LBS);
        }
        return value;
      },

      convertDistance: (miles: number) => {
        if (get().distanceUnit === 'km') {
          return Math.round(miles * MILES_TO_KM * 100) / 100; // Round to 2 decimals
        }
        return miles;
      },

      convertDistanceToMiles: (value: number) => {
        if (get().distanceUnit === 'km') {
          return Math.round(value * KM_TO_MILES * 100) / 100;
        }
        return value;
      },

      formatWeight: (lbs: number, decimals: number = 0) => {
        const unit = get().getWeightUnit();
        const value = get().convertWeight(lbs);
        const formatted = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
        return `${formatted} ${unit}`;
      },

      formatWeightValue: (lbs: number, decimals: number = 0) => {
        const value = get().convertWeight(lbs);
        return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
      },

      formatDistance: (miles: number, decimals: number = 1) => {
        const unit = get().getDistanceUnitShort();
        const value = get().convertDistance(miles);
        return `${value.toFixed(decimals)} ${unit}`;
      },

      formatDistanceValue: (miles: number, decimals: number = 1) => {
        const value = get().convertDistance(miles);
        return value.toFixed(decimals);
      },
    }),
    {
      name: 'hercules-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        unitSystem: state.unitSystem,
        weightUnit: state.weightUnit,
        distanceUnit: state.distanceUnit,
        sizeUnit: state.sizeUnit,
        themePreference: state.themePreference,
      }),
    }
  )
);
