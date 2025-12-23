import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// Environment variables are inlined at build time by Expo/Metro
// Fallback to hardcoded values if env vars are not available (e.g., in production builds)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rzhkagmwhtsvkbjnecfm.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6aGthZ213aHRzdmtiam5lY2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0NTAwMTAsImV4cCI6MjA4MDAyNjAxMH0.5q0JUAWOpCzS-a-VWJVxyVvIjTm_0Dzv5X0CtrsM5Bw';

console.log('[Supabase] Initializing client with URL:', SUPABASE_URL);
console.log('[Supabase] Key available:', !!SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 50);

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
