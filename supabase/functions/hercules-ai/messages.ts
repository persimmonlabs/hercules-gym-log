import type { SupabaseClient } from '@supabase/supabase-js';

import { MAX_CONTEXT_MESSAGES } from './constants.ts';
import type { ChatMessage, ChatRole } from './types.ts';

export interface ChatSession {
  id: string;
  title: string | null;
}

export interface ActionRequest {
  id: string;
  actionType: string;
  payload: Record<string, unknown>;
}

export const createChatSession = async (
  supabase: SupabaseClient,
  userId: string,
  title: string | null
): Promise<ChatSession> => {
  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .insert({
      user_id: userId,
      title,
    })
    .select('id, title')
    .single();

  if (error || !data) {
    throw new Error('[HerculesAI] Failed to create chat session');
  }

  return {
    id: data.id,
    title: data.title ?? null,
  };
};

export const getChatSession = async (
  supabase: SupabaseClient,
  userId: string,
  sessionId: string
): Promise<ChatSession | null> => {
  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .select('id, title')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[HerculesAI] Session lookup failed', error.message);
  }

  if (!data) return null;

  return {
    id: data.id,
    title: data.title ?? null,
  };
};

export const insertChatMessage = async (
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  role: ChatRole,
  content: string,
  tokenCount = 0,
  metadata: Record<string, unknown> = {}
): Promise<void> => {
  const { error } = await supabase
    .from('ai_chat_messages')
    .insert({
      user_id: userId,
      session_id: sessionId,
      role,
      content,
      token_count: tokenCount,
      metadata,
    });

  if (error) {
    throw new Error('[HerculesAI] Failed to insert chat message');
  }

  await pruneMessages(supabase, sessionId, MAX_CONTEXT_MESSAGES);
};

export const fetchRecentMessages = async (
  supabase: SupabaseClient,
  sessionId: string,
  limit = MAX_CONTEXT_MESSAGES
): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .in('role', ['user', 'assistant']) // Only fetch user and assistant messages, not tool messages
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[HerculesAI] Failed to fetch chat messages', error.message);
    return [];
  }

  return (data || [])
    .map((row) => ({
      role: row.role as ChatRole,
      content: row.content as string,
    }))
    .filter((msg) => msg.content && msg.content.trim().length > 0) // Filter out empty messages
    .reverse();
};

export const pruneMessages = async (
  supabase: SupabaseClient,
  sessionId: string,
  keepCount: number
): Promise<void> => {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('id')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .range(keepCount, keepCount + 200);

  if (error) {
    console.warn('[HerculesAI] Message prune query failed', error.message);
    return;
  }

  const ids = (data || []).map((row) => row.id as string);
  if (ids.length === 0) return;

  const { error: deleteError } = await supabase
    .from('ai_chat_messages')
    .delete()
    .in('id', ids);

  if (deleteError) {
    console.warn('[HerculesAI] Message prune delete failed', deleteError.message);
  }
};

export const createActionRequest = async (
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  actionType: string,
  payload: Record<string, unknown>
): Promise<ActionRequest> => {
  const { data, error } = await supabase
    .from('ai_action_requests')
    .insert({
      user_id: userId,
      session_id: sessionId,
      action_type: actionType,
      payload,
      status: 'pending',
    })
    .select('id, action_type, payload')
    .single();

  if (error || !data) {
    throw new Error('[HerculesAI] Failed to create action request');
  }

  return {
    id: data.id,
    actionType: data.action_type,
    payload: data.payload as Record<string, unknown>,
  };
};
