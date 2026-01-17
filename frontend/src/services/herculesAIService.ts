/**
 * Hercules AI Service
 * API helpers for communicating with the Hercules AI Edge Function
 */

import { supabaseClient } from '@/lib/supabaseClient';
import type {
  ChatRequestBody,
  ChatResponseBody,
  ActionDecisionRequestBody,
  ActionDecisionResponseBody,
  UsageResponseBody,
  ChatSessionSummary,
  ChatHistoryMessage,
} from '@/types/herculesAI';

const FUNCTION_NAME = 'hercules-ai';

export interface HerculesAIError {
  message: string;
  code?: string;
}

const parseFunctionError = async (
  error: unknown,
  response?: Response
): Promise<HerculesAIError> => {
  let message = error instanceof Error ? error.message : 'Unknown error occurred';
  let code = 'INVOKE_ERROR';

  if (response) {
    code = `HTTP_${response.status}`;
    try {
      const data = await response.clone().json();
      if (data?.error) {
        message = data.error;
      }
    } catch {
      try {
        const text = await response.clone().text();
        if (text) {
          message = text;
        }
      } catch {
        // Ignore response parsing errors
      }
    }
  }

  return { message, code };
};

/**
 * Send a chat message to Hercules AI
 */
export async function sendChatMessage(
  message: string,
  sessionId?: string
): Promise<{ data: ChatResponseBody | null; error: HerculesAIError | null }> {
  try {
    const body: ChatRequestBody = {
      message,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    if (sessionId) {
      body.sessionId = sessionId;
    }

    const { data, error, response } = await supabaseClient.functions.invoke<ChatResponseBody>(
      FUNCTION_NAME,
      {
        body,
        method: 'POST',
      }
    );

    if (error) {
      const parsedError = await parseFunctionError(error, response);
      return { data: null, error: parsedError };
    }

    return { data, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return { data: null, error: { message: errorMessage, code: 'NETWORK_ERROR' } };
  }
}

/**
 * Submit an action decision (approve or reject)
 */
export async function submitActionDecision(
  actionRequestId: string,
  decision: 'approve' | 'reject'
): Promise<{ data: ActionDecisionResponseBody | null; error: HerculesAIError | null }> {
  try {
    const body: ActionDecisionRequestBody = { actionRequestId, decision };

    const { data, error, response } = await supabaseClient.functions.invoke<ActionDecisionResponseBody>(
      FUNCTION_NAME,
      {
        body,
        method: 'POST',
      }
    );

    if (error) {
      const parsedError = await parseFunctionError(error, response);
      return { data: null, error: parsedError };
    }

    return { data, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return { data: null, error: { message: errorMessage, code: 'NETWORK_ERROR' } };
  }
}

/**
 * Fetch current usage stats for the user
 */
export async function fetchUsageStats(): Promise<{
  data: UsageResponseBody | null;
  error: HerculesAIError | null;
}> {
  try {
    const { data, error, response } = await supabaseClient.functions.invoke<UsageResponseBody>(
      FUNCTION_NAME,
      {
        body: { action: 'getUsage' },
        method: 'POST',
      }
    );

    if (error) {
      const parsedError = await parseFunctionError(error, response);
      return { data: null, error: parsedError };
    }

    return { data, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return { data: null, error: { message: errorMessage, code: 'NETWORK_ERROR' } };
  }
}

/**
 * Fetch all chat sessions for the current user
 */
export async function fetchChatSessions(): Promise<{
  data: ChatSessionSummary[] | null;
  error: HerculesAIError | null;
}> {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'Not authenticated', code: 'AUTH_ERROR' } };
    }

    const { data, error } = await supabaseClient
      .from('ai_chat_sessions')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return { data: null, error: { message: error.message, code: 'DB_ERROR' } };
    }

    const sessions: ChatSessionSummary[] = (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      lastMessageAt: null,
    }));

    return { data: sessions, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return { data: null, error: { message: errorMessage, code: 'NETWORK_ERROR' } };
  }
}

/**
 * Fetch messages for a specific chat session
 */
export async function fetchChatMessages(sessionId: string): Promise<{
  data: ChatHistoryMessage[] | null;
  error: HerculesAIError | null;
}> {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'Not authenticated', code: 'AUTH_ERROR' } };
    }

    const { data, error } = await supabaseClient
      .from('ai_chat_messages')
      .select('id, role, content, created_at')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: { message: error.message, code: 'DB_ERROR' } };
    }

    const messages: ChatHistoryMessage[] = (data || [])
      .filter((row) => row.role === 'user' || row.role === 'assistant')
      .map((row) => ({
        id: row.id,
        role: row.role as 'user' | 'assistant',
        content: row.content,
        createdAt: row.created_at,
      }));

    return { data: messages, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return { data: null, error: { message: errorMessage, code: 'NETWORK_ERROR' } };
  }
}

/**
 * Delete a chat session
 */
export async function deleteChatSession(sessionId: string): Promise<{
  success: boolean;
  error: HerculesAIError | null;
}> {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return { success: false, error: { message: 'Not authenticated', code: 'AUTH_ERROR' } };
    }

    const { error } = await supabaseClient
      .from('ai_chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: { message: error.message, code: 'DB_ERROR' } };
    }

    return { success: true, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return { success: false, error: { message: errorMessage, code: 'NETWORK_ERROR' } };
  }
}
