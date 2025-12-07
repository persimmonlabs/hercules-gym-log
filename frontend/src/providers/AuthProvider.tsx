import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as Linking from 'expo-linking';
import { Session, User } from '@supabase/supabase-js';

import { supabaseClient } from '@/lib/supabaseClient';
import { usePlansStore } from '@/store/plansStore';
import { useSchedulesStore } from '@/store/schedulesStore';
import { useProgramsStore } from '@/store/programsStore';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

interface AuthContextValue {
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  signInWithOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Global hydration state to prevent duplicate calls across renders
let hydrationPromise: Promise<void> | null = null;
let hydratedUserId: string | null = null;

/**
 * Hydrate all stores with the given user ID
 * Uses promise-based deduplication to prevent multiple simultaneous hydrations
 */
const hydrateAllStores = async (userId: string): Promise<void> => {
  // If already hydrated for this user, skip
  if (hydratedUserId === userId) {
    console.log('[AuthProvider] Stores already hydrated for user:', userId);
    return;
  }

  // If hydration is in progress, wait for it
  if (hydrationPromise) {
    console.log('[AuthProvider] Hydration already in progress, waiting...');
    return hydrationPromise;
  }

  console.log('[AuthProvider] Hydrating all stores for user:', userId);
  
  hydrationPromise = (async () => {
    try {
      // Use Promise.allSettled to ensure all stores attempt hydration
      // even if some fail - this prevents one failure from blocking others
      // This is critical for network errors - we don't want one failed request
      // to prevent the entire app from loading
      const results = await Promise.allSettled([
        usePlansStore.getState().hydratePlans(userId),
        useSchedulesStore.getState().hydrateSchedules(userId),
        useProgramsStore.getState().hydratePrograms(userId),
        useWorkoutSessionsStore.getState().hydrateWorkouts(userId),
      ]);

      // Log any failures but don't throw - app should still work with partial data
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.warn('[AuthProvider] Some stores failed to hydrate (network issues?):', 
          failures.map(f => {
            const reason = (f as PromiseRejectedResult).reason;
            return reason instanceof Error ? reason.message : String(reason);
          }));
        // Still mark as hydrated - the stores will have empty/default data
        // User can retry by refreshing or the app will retry on next action
      }

      hydratedUserId = userId;
      console.log('[AuthProvider] Store hydration complete (some may have failed)');
    } catch (error) {
      // This catch block handles unexpected errors in the hydration logic itself
      // Individual store failures are handled by Promise.allSettled above
      console.error('[AuthProvider] Unexpected error during hydration:', error);
      // Still mark as hydrated to prevent infinite loading
      hydratedUserId = userId;
    } finally {
      hydrationPromise = null;
    }
  })();

  return hydrationPromise;
};

/**
 * Reset hydration state (called on sign out)
 */
const resetHydrationState = () => {
  hydrationPromise = null;
  hydratedUserId = null;
};

/**
 * AuthProvider
 * Wraps the application with Supabase authentication state management.
 * Fetches the persisted session on mount and exposes helpers for OTP sign-in and sign-out.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data, error } = await supabaseClient.auth.getSession();

        if (!isMounted) {
          return;
        }

        if (error) {
          // Log but don't throw - network errors during session fetch shouldn't crash the app
          console.error('[AuthProvider] getSession error (may be network issue):', error);
          // Continue with null session - user will need to sign in again
        }

        setSession(data?.session ?? null);

        // Hydrate stores if user is already logged in
        // The hydrateAllStores function handles deduplication internally
        // and uses Promise.allSettled to handle individual failures gracefully
        if (data?.session?.user) {
          try {
            await hydrateAllStores(data.session.user.id);
          } catch (hydrateError) {
            // Log but don't throw - partial data is better than no app
            console.error('[AuthProvider] Hydration failed (network issue?):', hydrateError);
          }
        }
      } catch (error) {
        // Catch any unexpected errors to prevent app crash
        console.error('[AuthProvider] initializeAuth error:', error);
        // Set session to null to trigger sign-in flow
        setSession(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initializeAuth();

    const { data: listener } = supabaseClient.auth.onAuthStateChange(
      async (event, nextSession) => {
        console.log('[AuthProvider] Auth state changed:', event);
        setSession(nextSession);

        // Only hydrate on SIGNED_IN event (not on INITIAL_SESSION or TOKEN_REFRESHED)
        // The hydrateAllStores function handles deduplication internally
        if (event === 'SIGNED_IN' && nextSession?.user) {
          await hydrateAllStores(nextSession.user.id);
        }

        // Clear hydration state on sign out so next sign in will hydrate fresh
        if (event === 'SIGNED_OUT') {
          resetHydrationState();
        }
      },
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithOtp = useCallback(async (email: string) => {
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: Linking.createURL('/auth/callback'),
      },
    });

    if (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    resetHydrationState();
    await supabaseClient.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      session,
      user: session?.user ?? null,
      signInWithOtp,
      signOut,
    }),
    [isLoading, session, signInWithOtp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
