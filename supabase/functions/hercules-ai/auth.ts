import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseClient } from './supabase.ts';

export const getUserIdFromRequest = async (
  _supabase: SupabaseClient,
  request: Request
): Promise<string | null> => {
  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;

  // Use anon key client to validate user token
  const userClient = createSupabaseClient(token);
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) {
    console.warn('[HerculesAI] Auth error', error?.message);
    return null;
  }

  return data.user.id;
};

export const isPremiumUser = async (
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> => {
  // TODO: Remove this dev bypass once premium is properly set up
  console.log('[HerculesAI] Dev mode: bypassing premium check for user', userId);
  return true;
  
  // const { data, error } = await supabase
  //   .from('profiles')
  //   .select('is_pro')
  //   .eq('id', userId)
  //   .maybeSingle();

  // if (error) {
  //   console.warn('[HerculesAI] Premium check failed', error.message);
  //   return false;
  // }

  // return Boolean(data?.is_pro);
};
