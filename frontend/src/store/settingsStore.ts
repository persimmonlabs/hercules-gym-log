/**
 * settingsStore
 * Zustand store for user settings with AsyncStorage persistence.
 * Handles granular unit preferences for weight, distance, and size.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabaseClient } from '@/lib/supabaseClient';

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
  /** Whether user has Hercules Pro access */
  isPro: boolean;
  /** Weekly cardio time goal in seconds (null = no goal set) */
  weeklyCardioTimeGoal: number | null;
  /** Weekly cardio distance goal in miles (null = no goal set) */
  weeklyCardioDistanceGoal: number | null;
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
  /** Set Pro status */
  setPro: (isPro: boolean) => void;
  /** Set weekly cardio time goal (in seconds) */
  setWeeklyCardioTimeGoal: (seconds: number | null) => void;
  /** Set weekly cardio distance goal (in miles) */
  setWeeklyCardioDistanceGoal: (miles: number | null) => void;
  /** Whether haptics are enabled globally */
  hapticsEnabled: boolean;
  /** Set haptics enabled status */
  setHapticsEnabled: (enabled: boolean) => void;
  /** Whether smart set suggestions are enabled */
  smartSuggestionsEnabled: boolean;
  /** Set smart suggestions enabled status */
  setSmartSuggestionsEnabled: (enabled: boolean) => void;
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
  /** Format number with commas for better readability */
  formatNumberWithCommas: (num: number) => string;
  /** Get distance unit for a specific exercise (handles meter override for Rowing Machine) */
  getDistanceUnitForExercise: (distanceUnit?: 'miles' | 'meters' | 'floors') => string;
  /** Convert distance for display (handles meter override for Rowing Machine) */
  convertDistanceForExercise: (miles: number, distanceUnit?: 'miles' | 'meters' | 'floors') => number;
  /** Convert distance from display to storage (handles meter override for Rowing Machine) */
  convertDistanceToMilesForExercise: (value: number, distanceUnit?: 'miles' | 'meters' | 'floors') => number;
  /** Format distance with unit for a specific exercise (handles meter override) */
  formatDistanceForExercise: (miles: number, distanceUnit?: 'miles' | 'meters' | 'floors', decimals?: number) => string;
  /** Format distance value for a specific exercise (handles meter override) */
  formatDistanceValueForExercise: (miles: number, distanceUnit?: 'miles' | 'meters' | 'floors', decimals?: number) => string;
  /** Sync settings from Supabase */
  syncFromSupabase: () => Promise<void>;
}

// Conversion constants
const LBS_TO_KG = 0.453592;
const KG_TO_LBS = 2.20462;
const MILES_TO_KM = 1.60934;
const KM_TO_MILES = 0.621371;
const MILES_TO_METERS = 1609.34;
const METERS_TO_MILES = 0.000621371;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      unitSystem: 'imperial',
      weightUnit: 'lbs',
      distanceUnit: 'mi',
      sizeUnit: 'in',
      themePreference: 'light',
      isPro: false,
      weeklyCardioTimeGoal: null,
      weeklyCardioDistanceGoal: null,

      setUnitSystem: (system: UnitSystem) => {
        // Update all granular units when legacy system is changed
        set({
          unitSystem: system,
          weightUnit: system === 'metric' ? 'kg' : 'lbs',
          distanceUnit: system === 'metric' ? 'km' : 'mi',
          sizeUnit: system === 'metric' ? 'cm' : 'in',
        });
      },

      setThemePreference: async (preference: ThemePreference) => {
        set({ themePreference: preference });
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (user) {
            await supabaseClient.from('profiles').update({ theme_preference: preference }).eq('id', user.id);
          }
        } catch (error) {
          console.warn('Failed to sync theme preference to Supabase', error);
        }
      },

      setWeightUnit: async (unit: WeightUnit) => {
        set({ weightUnit: unit });
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (user) {
            await supabaseClient.from('profiles').update({ weight_unit: unit }).eq('id', user.id);
          }
        } catch (error) {
          console.warn('Failed to sync weight unit to Supabase', error);
        }
      },

      setDistanceUnit: async (unit: DistanceUnit) => {
        set({ distanceUnit: unit });
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (user) {
            await supabaseClient.from('profiles').update({ distance_unit: unit }).eq('id', user.id);
          }
        } catch (error) {
          console.warn('Failed to sync distance unit to Supabase', error);
        }
      },

      setSizeUnit: async (unit: SizeUnit) => {
        set({ sizeUnit: unit });
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (user) {
            await supabaseClient.from('profiles').update({ size_unit: unit }).eq('id', user.id);
          }
        } catch (error) {
          console.warn('Failed to sync size unit to Supabase', error);
        }
      },

      setPro: async (isPro: boolean) => {
        set({ isPro });
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (user) {
            await supabaseClient.from('profiles').update({ is_pro: isPro }).eq('id', user.id);
          }
        } catch (error) {
          console.warn('Failed to sync Pro status to Supabase', error);
        }
      },

      setWeeklyCardioTimeGoal: async (seconds: number | null) => {
        set({ weeklyCardioTimeGoal: seconds });
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (user) {
            await supabaseClient.from('profiles').update({ weekly_cardio_time_goal: seconds }).eq('id', user.id);
          }
        } catch (error) {
          console.warn('Failed to sync weekly cardio time goal to Supabase', error);
        }
      },

      setWeeklyCardioDistanceGoal: async (miles: number | null) => {
        set({ weeklyCardioDistanceGoal: miles });
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (user) {
            await supabaseClient.from('profiles').update({ weekly_cardio_distance_goal: miles }).eq('id', user.id);
          }
        } catch (error) {
          console.warn('Failed to sync weekly cardio distance goal to Supabase', error);
        }
      },

      hapticsEnabled: true,
      smartSuggestionsEnabled: false,

      setSmartSuggestionsEnabled: async (enabled: boolean) => {
        set({ smartSuggestionsEnabled: enabled });
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (user) {
            await supabaseClient.from('profiles').update({ smart_suggestions_enabled: enabled }).eq('id', user.id);
          }
        } catch (error) {
          // Silently handle — local persistence is sufficient
        }
      },

      setHapticsEnabled: async (enabled: boolean) => {
        set({ hapticsEnabled: enabled });
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (user) {
            // Check if column exists or handle error silently if it doesn't
            // For now assuming we might not have a DB column yet, so just local persist is fine
            // But if we want to sync, we can try:
            await supabaseClient.from('profiles').update({ haptics_enabled: enabled }).eq('id', user.id);
          }
        } catch (error) {
          // console.warn('Failed to sync haptics to Supabase', error);
        }
      },

      syncFromSupabase: async () => {
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (user) {
            const { data, error } = await supabaseClient
              .from('profiles')
              .select('unit_system, weight_unit, distance_unit, size_unit, theme_preference, is_pro, weekly_cardio_time_goal, weekly_cardio_distance_goal')
              .eq('id', user.id)
              .single();

            if (data && !error) {
              set({
                // Only update if value exists in DB
                unitSystem: (data.unit_system as UnitSystem) || get().unitSystem,
                weightUnit: (data.weight_unit as WeightUnit) || get().weightUnit,
                distanceUnit: (data.distance_unit as DistanceUnit) || get().distanceUnit,
                sizeUnit: (data.size_unit as SizeUnit) || get().sizeUnit,
                themePreference: (data.theme_preference as ThemePreference) || get().themePreference,
                isPro: (data.is_pro as boolean) ?? get().isPro,
                weeklyCardioTimeGoal: (data.weekly_cardio_time_goal as number | null) ?? get().weeklyCardioTimeGoal,
                weeklyCardioDistanceGoal: (data.weekly_cardio_distance_goal as number | null) ?? get().weeklyCardioDistanceGoal,
                // hapticsEnabled: (data.haptics_enabled as boolean) ?? get().hapticsEnabled,
              });
            }
          }
        } catch (error) {
          console.warn('Failed to sync settings from Supabase', error);
        }
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
          return Math.round(value * KG_TO_LBS * 10) / 10;
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

      formatWeight: (lbs: number, decimals?: number) => {
        const unit = get().getWeightUnit();
        const value = get().convertWeight(lbs);
        let formatted: string;

        if (decimals !== undefined) {
          formatted = value.toFixed(decimals);
        } else {
          // Show up to 1 decimal place if it's not a whole number, otherwise show whole number
          formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
        }

        // Add commas for better readability
        formatted = get().formatNumberWithCommas(parseFloat(formatted));

        return `${formatted} ${unit}`;
      },

      formatWeightValue: (lbs: number, decimals?: number) => {
        const value = get().convertWeight(lbs);

        if (decimals !== undefined) {
          return get().formatNumberWithCommas(parseFloat(value.toFixed(decimals)));
        }

        const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
        return get().formatNumberWithCommas(parseFloat(formatted));
      },

      formatNumberWithCommas: (num: number): string => {
        return num.toLocaleString('en-US');
      },

      formatDistance: (miles: number, decimals: number = 1) => {
        const unit = get().getDistanceUnitShort();
        const value = get().convertDistance(miles);
        const formatted = value.toFixed(decimals);
        return `${get().formatNumberWithCommas(parseFloat(formatted))} ${unit}`;
      },

      formatDistanceValue: (miles: number, decimals: number = 1) => {
        const value = get().convertDistance(miles);
        const formatted = value.toFixed(decimals);
        return get().formatNumberWithCommas(parseFloat(formatted));
      },

      getDistanceUnitForExercise: (distanceUnit?: 'miles' | 'meters' | 'floors') => {
        if (distanceUnit === 'meters') {
          return 'm';
        }
        if (distanceUnit === 'floors') {
          return 'floors';
        }
        return get().getDistanceUnitShort();
      },

      convertDistanceForExercise: (miles: number, distanceUnit?: 'miles' | 'meters' | 'floors') => {
        if (distanceUnit === 'meters') {
          return Math.round(miles * MILES_TO_METERS);
        }
        if (distanceUnit === 'floors') {
          return miles;
        }
        return get().convertDistance(miles);
      },

      convertDistanceToMilesForExercise: (value: number, distanceUnit?: 'miles' | 'meters' | 'floors') => {
        if (distanceUnit === 'meters') {
          return Math.round(value * METERS_TO_MILES * 100) / 100;
        }
        if (distanceUnit === 'floors') {
          return value;
        }
        return get().convertDistanceToMiles(value);
      },

      formatDistanceForExercise: (miles: number, distanceUnit?: 'miles' | 'meters' | 'floors', decimals?: number) => {
        const unit = get().getDistanceUnitForExercise(distanceUnit);
        const value = get().convertDistanceForExercise(miles, distanceUnit);
        let formatted: string;

        if (distanceUnit === 'meters') {
          formatted = Math.round(value).toString();
        } else if (decimals !== undefined) {
          formatted = value.toFixed(decimals);
        } else {
          formatted = value.toFixed(1);
        }

        return `${get().formatNumberWithCommas(parseFloat(formatted))} ${unit}`;
      },

      formatDistanceValueForExercise: (miles: number, distanceUnit?: 'miles' | 'meters' | 'floors', decimals?: number) => {
        const value = get().convertDistanceForExercise(miles, distanceUnit);
        let formatted: string;

        if (distanceUnit === 'meters') {
          formatted = Math.round(value).toString();
        } else if (decimals !== undefined) {
          formatted = value.toFixed(decimals);
        } else {
          formatted = value.toFixed(1);
        }

        return get().formatNumberWithCommas(parseFloat(formatted));
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
        isPro: state.isPro,
        hapticsEnabled: state.hapticsEnabled,
        smartSuggestionsEnabled: state.smartSuggestionsEnabled,
        weeklyCardioTimeGoal: state.weeklyCardioTimeGoal,
        weeklyCardioDistanceGoal: state.weeklyCardioDistanceGoal,
      }),
    }
  )
);
