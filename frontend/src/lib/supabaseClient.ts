import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// Environment variables are inlined at build time by Expo/Metro
// Fallback to hardcoded values if env vars are not available (e.g., in production builds)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rzhkagmwhtsvkbjnecfm.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6aGthZ213aHRzdmtiam5lY2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0NTAwMTAsImV4cCI6MjA4MDAyNjAxMH0.5q0JUAWOpCzS-a-VWJVxyVvIjTm_0Dzv5X0CtrsM5Bw';

console.log('[Supabase] Initializing client with URL:', SUPABASE_URL);
console.log('[Supabase] Key available:', !!SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 50);

// Custom fetch wrapper that gracefully handles network errors during startup
// This prevents noisy console errors when the app starts before network is ready
const resilientFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (error) {
    // Log as warning instead of error for network failures
    // These are expected during app startup and the auth client will retry
    if (error instanceof TypeError && error.message === 'Network request failed') {
      console.warn('[Supabase] Network request failed, will retry automatically');
    }
    throw error;
  }
};

// Custom storage adapter for Supabase Auth
// Uses AsyncStorage to avoid SecureStore's 2KB limit on Android which causes hangs
const AsyncStorageAdapter = {
  getItem: (key: string) => {
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    return AsyncStorage.removeItem(key);
  },
};

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: resilientFetch,
  },
});
