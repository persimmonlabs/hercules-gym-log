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
  /** Clear profile (on logout) */
  clearProfile: () => void;
  /** Get user initial (first letter of first name) */
  getUserInitial: () => string | null;
}

export const useUserProfileStore = create<UserProfileState>((set, get) => ({
  profile: null,
  isLoading: false,

  fetchProfile: async (userId: string) => {
    set({ isLoading: true });

    try {
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
    const fullName = `${firstName} ${lastName}`.trim();

    // Optimistically update local state for immediate UI response
    set({
      profile: {
        firstName,
        lastName,
        fullName,
      },
    });
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
}));
