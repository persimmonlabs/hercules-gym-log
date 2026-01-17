import { executeAction } from './actions.ts';
import { getUserIdFromRequest, isPremiumUser } from './auth.ts';
import { buildUserContext } from './context.ts';
import {
  OPENROUTER_MODEL,
  WEEKLY_MESSAGE_LIMIT,
  WEEKLY_TOKEN_LIMIT,
} from './constants.ts';
import { createJsonResponse, corsHeaders } from './cors.ts';
import { searchKnowledgeBase } from './kb.ts';
import {
  createActionRequest,
  createChatSession,
  fetchRecentMessages,
  getChatSession,
  insertChatMessage,
} from './messages.ts';
import { callOpenRouter, type ToolCall, type OpenRouterUsage } from './openrouter.ts';
import { buildContextMessage, SYSTEM_PROMPT } from './prompts.ts';
import { parseAssistantResponse } from './response.ts';
import { executeStatFunction, type StatFunction } from './stats.ts';
import { createSupabaseAdmin } from './supabase.ts';
import { STAT_TOOLS } from './tools.ts';
import type { ChatMessage, ChatRole } from './types.ts';
import { getOrCreateUsage, incrementUsage, isUsageExceeded } from './usage.ts';

interface ChatRequestBody {
  sessionId?: string;
  message?: string;
  title?: string;
  timezone?: string;
}

interface ActionDecisionRequestBody {
  actionRequestId?: string;
  decision?: 'approve' | 'reject';
}

interface ChatResponseBody {
  sessionId: string;
  message: string;
  action: { id: string; actionType: string; payload: Record<string, unknown> } | null;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  model: string;
}

interface ActionDecisionResponseBody {
  actionRequestId: string;
  status: 'rejected' | 'executed';
  summary: string;
  data: Record<string, unknown> | null;
}

interface UsageResponseBody {
  tokensUsed: number;
  messagesUsed: number;
  tokensLimit: number;
  messagesLimit: number;
  periodEnd: string;
}

interface ActionRequestRow {
  id: string;
  session_id: string;
  action_type: string;
  payload: Record<string, unknown>;
  status: string;
}

const getRouteSegment = (url: string): string => {
  const { pathname } = new URL(url);
  const segments = pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? '';
};

const buildChatMessage = (role: ChatRole, content: string): ChatMessage => {
  return { role, content };
};

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return createJsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabase = createSupabaseAdmin();
    const userId = await getUserIdFromRequest(supabase, request);

    if (!userId) {
      return createJsonResponse({ error: 'Unauthorized' }, 401);
    }

    const isPremium = await isPremiumUser(supabase, userId);
    if (!isPremium) {
      return createJsonResponse({ error: 'Premium required' }, 403);
    }

    const requestBody = await request.json().catch(() => ({})) as any;
    
    // Handle usage request
    if (requestBody.action === 'getUsage') {
      const usage = await getOrCreateUsage(supabase, userId);
      const responseBody: UsageResponseBody = {
        tokensUsed: usage.tokensUsed,
        messagesUsed: usage.messagesUsed,
        tokensLimit: WEEKLY_TOKEN_LIMIT,
        messagesLimit: WEEKLY_MESSAGE_LIMIT,
        periodEnd: usage.periodEnd,
      };

      return createJsonResponse(responseBody);
    }

    // Handle action decision
    if (requestBody.actionRequestId) {
      const body = requestBody as ActionDecisionRequestBody;
      const actionRequestId = body.actionRequestId?.trim();
      const decision = body.decision;

      if (!actionRequestId || (decision !== 'approve' && decision !== 'reject')) {
        return createJsonResponse({ error: 'actionRequestId and decision are required' }, 400);
      }

      const { data, error } = await supabase
        .from('ai_action_requests')
        .select('id, session_id, action_type, payload, status')
        .eq('id', actionRequestId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) {
        return createJsonResponse({ error: 'Action request not found' }, 404);
      }

      const actionRequest = data as ActionRequestRow;
      if (actionRequest.status !== 'pending') {
        return createJsonResponse(
          { error: `Action request is already ${actionRequest.status}` },
          409
        );
      }

      if (decision === 'reject') {
        await supabase
          .from('ai_action_requests')
          .update({ status: 'rejected', error_message: 'User rejected' })
          .eq('id', actionRequestId)
          .eq('user_id', userId);

        await insertChatMessage(
          supabase,
          userId,
          actionRequest.session_id,
          'tool',
          'Action cancelled per your request.',
          0,
          {
            actionRequestId,
            actionType: actionRequest.action_type,
            status: 'rejected',
          }
        );

        const responseBody: ActionDecisionResponseBody = {
          actionRequestId,
          status: 'rejected',
          summary: 'Action cancelled per your request.',
          data: null,
        };

        return createJsonResponse(responseBody);
      }

      await supabase
        .from('ai_action_requests')
        .update({ status: 'approved', error_message: null })
        .eq('id', actionRequestId)
        .eq('user_id', userId);

      try {
        const result = await executeAction(
          supabase,
          userId,
          actionRequest.action_type,
          actionRequest.payload
        );

        await supabase
          .from('ai_action_requests')
          .update({ status: 'executed', error_message: null })
          .eq('id', actionRequestId)
          .eq('user_id', userId);

        await insertChatMessage(
          supabase,
          userId,
          actionRequest.session_id,
          'tool',
          result.summary,
          0,
          {
            actionRequestId,
            actionType: actionRequest.action_type,
            status: 'executed',
            data: result.data ?? null,
          }
        );

        const responseBody: ActionDecisionResponseBody = {
          actionRequestId,
          status: 'executed',
          summary: result.summary,
          data: result.data ?? null,
        };

        return createJsonResponse(responseBody);
      } catch (actionError) {
        const message = actionError instanceof Error
          ? actionError.message
          : 'Action execution failed';

        await supabase
          .from('ai_action_requests')
          .update({ status: 'failed', error_message: message })
          .eq('id', actionRequestId)
          .eq('user_id', userId);

        await insertChatMessage(
          supabase,
          userId,
          actionRequest.session_id,
          'tool',
          `Action failed: ${message}`,
          0,
          {
            actionRequestId,
            actionType: actionRequest.action_type,
            status: 'failed',
          }
        );

        return createJsonResponse({ error: message }, 500);
      }
    }

    // Handle chat message (default case)
    const body = requestBody as ChatRequestBody;
    const message = body.message?.trim();

    if (!message) {
      return createJsonResponse({ error: 'Message is required' }, 400);
    }

    const usage = await getOrCreateUsage(supabase, userId);
    if (isUsageExceeded(usage)) {
      return createJsonResponse(
        {
          error: `Message limit reached (${usage.messagesUsed}/${WEEKLY_MESSAGE_LIMIT})`,
          usage,
        },
        429
      );
    }

    const sessionId = body.sessionId ?? '';
    const existingSession = sessionId
      ? await getChatSession(supabase, userId, sessionId)
      : null;

    const session = existingSession
      ? existingSession
      : await createChatSession(supabase, userId, body.title ?? message.slice(0, 80));

    const recentMessages = await fetchRecentMessages(supabase, session.id);
    await insertChatMessage(supabase, userId, session.id, 'user', message);

    const context = await buildUserContext(supabase, userId);
    const kbMatches = await searchKnowledgeBase(supabase, message);
    const kbMessage = kbMatches.length
      ? `Knowledge base excerpts (JSON): ${JSON.stringify(kbMatches)}`
      : null;
    const kbMessages = kbMessage ? [buildChatMessage('system', kbMessage)] : [];
    const modelMessages: ChatMessage[] = [
      buildChatMessage('system', SYSTEM_PROMPT),
      buildChatMessage('system', buildContextMessage(context, body.timezone)),
      ...kbMessages,
      ...recentMessages,
      buildChatMessage('user', message),
    ];

    // Tool calling loop - execute stat functions until we get a final response
    let totalUsage: OpenRouterUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let finalContent: string | null = null;
    const MAX_TOOL_ITERATIONS = 5;

    console.log(`[HerculesAI] Starting chat with ${STAT_TOOLS.length} tools available`);

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      console.log(`[HerculesAI] Tool iteration ${iteration + 1}/${MAX_TOOL_ITERATIONS}`);
      const result = await callOpenRouter(modelMessages, { tools: STAT_TOOLS });

      console.log(`[HerculesAI] Response: finishReason=${result.finishReason}, toolCalls=${result.toolCalls.length}, hasContent=${!!result.content}`);

      if (result.usage) {
        totalUsage.promptTokens += result.usage.promptTokens;
        totalUsage.completionTokens += result.usage.completionTokens;
        totalUsage.totalTokens += result.usage.totalTokens;
      }

      // If no tool calls, we have the final response
      if (result.toolCalls.length === 0) {
        finalContent = result.content;
        console.log(`[HerculesAI] Final response received (no tool calls)`);
        break;
      }

      // Process tool calls
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: result.content ?? '',
        tool_calls: result.toolCalls.map((tc) => ({
          id: tc.id,
          type: tc.type,
          function: tc.function,
        })),
      };
      modelMessages.push(assistantMessage);

      for (const toolCall of result.toolCalls) {
        const functionName = toolCall.function.name as StatFunction;
        let args: Record<string, unknown> = {};

        try {
          args = JSON.parse(toolCall.function.arguments || '{}');
        } catch {
          args = {};
        }

        console.log(`[HerculesAI] Executing tool: ${functionName}`, args);
        const statResult = await executeStatFunction(supabase, userId, functionName, args);

        const toolMessage: ChatMessage = {
          role: 'tool',
          content: JSON.stringify(statResult),
          tool_call_id: toolCall.id,
        };
        modelMessages.push(toolMessage);
      }

      // If this was the last iteration and we still have tool calls, get final response
      if (iteration === MAX_TOOL_ITERATIONS - 1) {
        const finalResult = await callOpenRouter(modelMessages, { tools: STAT_TOOLS, toolChoice: 'none' });
        finalContent = finalResult.content;
        if (finalResult.usage) {
          totalUsage.promptTokens += finalResult.usage.promptTokens;
          totalUsage.completionTokens += finalResult.usage.completionTokens;
          totalUsage.totalTokens += finalResult.usage.totalTokens;
        }
      }
    }

    if (!finalContent) {
      throw new Error('[HerculesAI] Failed to get final response after tool calls');
    }

    const parsed = parseAssistantResponse(finalContent);

    const actionRequest =
      parsed.type === 'action' && parsed.action
        ? await createActionRequest(
            supabase,
            userId,
            session.id,
            parsed.action.actionType,
            parsed.action.payload
          )
        : null;

    await insertChatMessage(
      supabase,
      userId,
      session.id,
      'assistant',
      parsed.message,
      totalUsage.completionTokens,
      {
        raw: parsed.raw,
        actionType: parsed.action?.actionType ?? null,
        modelUsage: totalUsage,
      }
    );

    await incrementUsage(
      supabase,
      usage,
      totalUsage.totalTokens,
      1
    );

    const responseBody: ChatResponseBody = {
      sessionId: session.id,
      message: parsed.message,
      action: actionRequest
        ? {
            id: actionRequest.id,
            actionType: actionRequest.actionType,
            payload: actionRequest.payload,
          }
        : null,
      usage: totalUsage,
      model: OPENROUTER_MODEL,
    };

    return createJsonResponse(responseBody);
  } catch (error) {
    console.error('[HerculesAI] Handler failed', error);
    return createJsonResponse({ error: 'Internal server error' }, 500);
  }
});
