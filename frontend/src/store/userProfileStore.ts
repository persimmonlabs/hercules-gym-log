/**
 * userProfileStore
 * Zustand store for centralized user profile state management.
 * Ensures real-time updates across the app when profile data changes.
 */

import { create } from 'zustand';
import { supabaseClient } from '@/lib/supabaseClient';

interface UserProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  // Body metrics for analytics
  heightFeet?: number;
  heightInches?: number;
  weightLbs?: number;
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
        .select('first_name, last_name, full_name')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[UserProfileStore] Error fetching profile:', error);
        set({ isLoading: false });
        return;
      }

      if (data) {
        set({
          profile: {
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            fullName: data.full_name || '',
            // Body metrics stored locally until DB schema is updated
            heightFeet: undefined,
            heightInches: undefined,
            weightLbs: undefined,
          },
          isLoading: false,
        });
      } else {
        set({ profile: null, isLoading: false });
      }
    } catch (error) {
      console.error('[UserProfileStore] Error fetching profile:', error);
      set({ isLoading: false });
    }
  },

  updateProfile: async (firstName: string, lastName: string) => {
    const currentProfile = get().profile;
    const fullName = `${firstName} ${lastName}`.trim();

    // Optimistically update local state for immediate UI response
    set({
      profile: {
        firstName,
        lastName,
        fullName,
        // Preserve existing body metrics
        heightFeet: currentProfile?.heightFeet,
        heightInches: currentProfile?.heightInches,
        weightLbs: currentProfile?.weightLbs,
      },
    });
  },

  updateBodyMetrics: async (heightFeet: number, heightInches: number, weightLbs: number) => {
    const currentProfile = get().profile;

    // Update local state (stored in memory for now)
    // TODO: Add height_feet, height_inches, weight_lbs columns to Supabase profiles table
    // then uncomment the Supabase persistence below
    set({
      profile: {
        firstName: currentProfile?.firstName || '',
        lastName: currentProfile?.lastName || '',
        fullName: currentProfile?.fullName || '',
        heightFeet,
        heightInches,
        weightLbs,
      },
    });

    // Note: Supabase persistence disabled until DB schema is updated
    // To enable, run this SQL in Supabase:
    // ALTER TABLE profiles ADD COLUMN height_feet INTEGER;
    // ALTER TABLE profiles ADD COLUMN height_inches INTEGER;
    // ALTER TABLE profiles ADD COLUMN weight_lbs INTEGER;
    /*
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        const { error } = await supabaseClient
          .from('profiles')
          .update({
            height_feet: heightFeet,
            height_inches: heightInches,
            weight_lbs: weightLbs,
          })
          .eq('id', user.id);

        if (error) {
          console.error('[UserProfileStore] Error updating body metrics:', error);
        }
      }
    } catch (error) {
      console.error('[UserProfileStore] Error updating body metrics:', error);
    }
    */
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
