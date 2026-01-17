import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { getOptionalEnv } from './env.ts';

export const createSupabaseAdmin = (): SupabaseClient => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl) {
    throw new Error('Missing environment variable: SUPABASE_URL');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export const createSupabaseClient = (authToken: string): SupabaseClient => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl) {
    throw new Error('Missing environment variable: SUPABASE_URL');
  }

  if (!anonKey) {
    throw new Error('Missing environment variable: SUPABASE_ANON_KEY');
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  });
};
