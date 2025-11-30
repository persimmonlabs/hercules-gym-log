/**
 * Local Storage Utilities
 * 
 * NOTE: Main app data (workouts, plans, schedules) is now stored in Supabase.
 * This file only contains utilities for temporary local storage during auth flow.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { canUseAsyncStorage } from '@/utils/environment';

const PENDING_PROFILE_KEY = '@hercules/pending-profile';
const PENDING_AUTH_EMAIL_KEY = '@hercules/pending-auth-email';

export interface PendingProfileDraft {
  firstName: string;
  lastName: string;
  email: string;
}

const logError = (message: string, error: unknown) => {
  console.error(`[storage] ${message}`, error);
};

const warnAsyncStorageUnavailable = (operation: string): void => {
  console.warn(`[storage] ${operation} skipped because AsyncStorage is unavailable in this environment.`);
};

export const setPendingProfileDraft = async (profile: PendingProfileDraft): Promise<void> => {
  if (!canUseAsyncStorage()) {
    warnAsyncStorageUnavailable('setPendingProfileDraft');
    return;
  }

  try {
    await AsyncStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    logError('Failed to persist pending profile', error);
  }
};

export const getPendingProfileDraft = async (): Promise<PendingProfileDraft | null> => {
  if (!canUseAsyncStorage()) {
    return null;
  }

  try {
    const rawValue = await AsyncStorage.getItem(PENDING_PROFILE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as PendingProfileDraft;

    if (!parsed.firstName || !parsed.lastName || !parsed.email) {
      return null;
    }

    return parsed;
  } catch (error) {
    logError('Failed to load pending profile', error);
    return null;
  }
};

export const clearPendingProfileDraft = async (): Promise<void> => {
  if (!canUseAsyncStorage()) {
    warnAsyncStorageUnavailable('clearPendingProfileDraft');
    return;
  }

  try {
    await AsyncStorage.removeItem(PENDING_PROFILE_KEY);
  } catch (error) {
    logError('Failed to clear pending profile', error);
  }
};

export const setPendingAuthEmail = async (email: string): Promise<void> => {
  if (!canUseAsyncStorage()) {
    warnAsyncStorageUnavailable('setPendingAuthEmail');
    return;
  }

  try {
    await AsyncStorage.setItem(PENDING_AUTH_EMAIL_KEY, email.trim().toLowerCase());
  } catch (error) {
    logError('Failed to persist pending auth email', error);
  }
};

export const getPendingAuthEmail = async (): Promise<string | null> => {
  if (!canUseAsyncStorage()) {
    return null;
  }

  try {
    const storedEmail = await AsyncStorage.getItem(PENDING_AUTH_EMAIL_KEY);

    if (!storedEmail) {
      return null;
    }

    return storedEmail;
  } catch (error) {
    logError('Failed to load pending auth email', error);
    return null;
  }
};

export const clearPendingAuthEmail = async (): Promise<void> => {
  if (!canUseAsyncStorage()) {
    warnAsyncStorageUnavailable('clearPendingAuthEmail');
    return;
  }

  try {
    await AsyncStorage.removeItem(PENDING_AUTH_EMAIL_KEY);
  } catch (error) {
    logError('Failed to clear pending auth email', error);
  }
};
