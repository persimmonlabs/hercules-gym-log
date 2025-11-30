import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';


// TODO: Replace these with your actual Supabase project details if not using .env
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

console.log('[Supabase] Initializing client with URL:', SUPABASE_URL);
console.log('[Supabase] Key length:', SUPABASE_ANON_KEY?.length);

// Custom storage adapter for Supabase Auth
// Uses SecureStore on mobile for better security, and AsyncStorage on web
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
});
