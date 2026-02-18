/**
 * userProfileStore
 * Zustand store for centralized user profile state management.
 * Ensures real-time updates across the app when profile data changes.
 */

import { create } from 'zustand';
import { supabaseClient } from '@/lib/supabaseClient';

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type PrimaryGoal = 'build-muscle' | 'lose-fat' | 'gain-strength' | 'general-fitness' | 'improve-endurance';
export type AvailableEquipment = 'full-gym' | 'dumbbells-only' | 'bodyweight' | 'home-gym' | 'resistance-bands';

interface UserProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  heightFeet?: number;
  heightInches?: number;
  weightLbs?: number;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  experienceLevel?: ExperienceLevel | null;
  primaryGoal?: PrimaryGoal | null;
  availableEquipment?: AvailableEquipment | null;
  trainingDaysPerWeek?: number | null;
  onboardingCompleted?: boolean;
}

interface UserProfileState {
  /** User profile data */
  profile: UserProfile | null;
  /** Loading state for initial fetch */
  isLoading: boolean;
  /** Fetch profile from database */
  fetchProfile: (userId: string) => Promise<void>;
  /** Update profile in store and database */
  updateProfile: (firstName: string, lastName: string) => Promise<void>;
  /** Update body metrics (height/weight) */
  updateBodyMetrics: (heightFeet: number, heightInches: number, weightLbs: number) => Promise<void>;
  /** Update a single profile field and sync to Supabase */
  updateProfileField: (field: string, value: any) => Promise<void>;
  /** Clear profile (on logout) */
  clearProfile: () => void;
  /** Get user initial (first letter of first name) */
  getUserInitial: () => string | null;
  /** Get body weight in lbs for volume calculations */
  getBodyWeightLbs: () => number | null;
}

export const useUserProfileStore = create<UserProfileState>((set, get) => ({
  profile: null,
  isLoading: false,

  fetchProfile: async (userId: string) => {
    set({ isLoading: true });

    try {
      // Note: height_feet, height_inches, weight_lbs columns may not exist yet in Supabase
      // Fetch only the columns that are guaranteed to exist
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('first_name, last_name, full_name, height_feet, height_inches, weight_lbs, date_of_birth, gender, experience_level, primary_goal, available_equipment, training_days_per_week, onboarding_completed')
        .eq('id', userId)
        .single();

      if (error) {
        // Silently handle fetch failures - network issues are expected during app startup
        console.warn('[UserProfileStore] Profile fetch failed, continuing with empty profile');
        set({ profile: null, isLoading: false });
        return;
      }

      if (data) {
        set({
          profile: {
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            fullName: data.full_name || '',
            heightFeet: data.height_feet,
            heightInches: data.height_inches,
            weightLbs: data.weight_lbs,
            dateOfBirth: data.date_of_birth,
            gender: data.gender as Gender | null,
            experienceLevel: data.experience_level as ExperienceLevel | null,
            primaryGoal: data.primary_goal as PrimaryGoal | null,
            availableEquipment: data.available_equipment as AvailableEquipment | null,
            trainingDaysPerWeek: data.training_days_per_week,
            onboardingCompleted: data.onboarding_completed ?? false,
          },
          isLoading: false,
        });
      } else {
        set({ profile: null, isLoading: false });
      }
    } catch (error) {
      // Silently handle fetch failures - network issues are expected during app startup
      console.warn('[UserProfileStore] Profile fetch failed, continuing with empty profile');
      set({ profile: null, isLoading: false });
    }
  },

  updateProfile: async (firstName: string, lastName: string) => {
    const currentProfile = get().profile;
    const fullName = `${firstName} ${lastName}`.trim();

    set({
      profile: {
        ...currentProfile,
        firstName,
        lastName,
        fullName,
      } as UserProfile,
    });
  },

  updateBodyMetrics: async (heightFeet: number, heightInches: number, weightLbs: number) => {
    const currentProfile = get().profile;

    set({
      profile: {
        ...currentProfile,
        heightFeet,
        heightInches,
        weightLbs,
      } as UserProfile,
    });

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        await supabaseClient
          .from('profiles')
          .update({ height_feet: heightFeet, height_inches: heightInches, weight_lbs: weightLbs })
          .eq('id', user.id);
      }
    } catch (error) {
      console.warn('[UserProfileStore] Error updating body metrics:', error);
    }
  },

  updateProfileField: async (field: string, value: any) => {
    const currentProfile = get().profile;
    set({ profile: { ...currentProfile, [field]: value } as UserProfile });

    const fieldMap: Record<string, string> = {
      dateOfBirth: 'date_of_birth',
      gender: 'gender',
      experienceLevel: 'experience_level',
      primaryGoal: 'primary_goal',
      availableEquipment: 'available_equipment',
      trainingDaysPerWeek: 'training_days_per_week',
      onboardingCompleted: 'onboarding_completed',
    };
    const dbColumn = fieldMap[field];
    if (!dbColumn) return;

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        await supabaseClient.from('profiles').update({ [dbColumn]: value }).eq('id', user.id);
      }
    } catch (error) {
      console.warn(`[UserProfileStore] Error updating ${field}:`, error);
    }
  },

  clearProfile: () => {
    set({ profile: null, isLoading: false });
  },

  getUserInitial: () => {
    const { profile } = get();
    if (profile?.firstName && profile.firstName.length > 0) {
      return profile.firstName.charAt(0).toUpperCase();
    }
    return null;
  },

  getBodyWeightLbs: () => {
    const { profile } = get();
    return profile?.weightLbs ?? null;
  },
}));
