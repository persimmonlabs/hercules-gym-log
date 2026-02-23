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
import { parseAssistantResponse, constructActionFromMessage } from './response.ts';
import { executeStatFunction, type StatFunction } from './stats.ts';
import { createSupabaseAdmin } from './supabase.ts';
import { STAT_TOOLS } from './tools.ts';
import type { ChatMessage, ChatRole } from './types.ts';
import { getOrCreateUsage, incrementUsage, isUsageExceeded, getNextResetDate, addPurchasedCredits, checkRateLimit } from './usage.ts';
import { getOptionalEnv } from './env.ts';

interface AppStats {
  totalVolume: number;
  totalWorkouts: number;
  totalSets: number;
  totalReps: number;
  muscleGroupVolume: Record<string, number>;
  weightUnit: string;
}

interface ChatRequestBody {
  sessionId?: string;
  message?: string;
  title?: string;
  timezone?: string;
  appStats?: AppStats;
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
  purchasedCredits: number;
  periodEnd: string;
  nextResetAt: string;
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
        purchasedCredits: usage.purchasedCredits,
        periodEnd: usage.periodEnd,
        nextResetAt: getNextResetDate(),
      };

      return createJsonResponse(responseBody);
    }

    // Handle credit purchase
    if (requestBody.action === 'purchaseCredits') {
      const credits = requestBody.credits ?? 100;
      const usage = await addPurchasedCredits(supabase, userId, credits);
      const responseBody: UsageResponseBody = {
        tokensUsed: usage.tokensUsed,
        messagesUsed: usage.messagesUsed,
        tokensLimit: WEEKLY_TOKEN_LIMIT,
        messagesLimit: WEEKLY_MESSAGE_LIMIT,
        purchasedCredits: usage.purchasedCredits,
        periodEnd: usage.periodEnd,
        nextResetAt: getNextResetDate(),
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

      console.log('[HerculesAI] Processing action decision:', {
        actionRequestId,
        decision,
        actionType: actionRequest.action_type,
        payloadKeys: Object.keys(actionRequest.payload || {}),
      });

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
        console.log('[HerculesAI] Executing action:', actionRequest.action_type);
        console.log('[HerculesAI] Action payload:', JSON.stringify(actionRequest.payload, null, 2));
        
        const result = await executeAction(
          supabase,
          userId,
          actionRequest.action_type,
          actionRequest.payload
        );
        
        console.log('[HerculesAI] Action execution result:', result);

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

    // Dev mode bypass — skip usage and rate limits during development
    const isDev = getOptionalEnv('HERCULES_ENV', 'production') === 'development';

    // Rate limit check (skip in dev)
    if (!isDev) {
      const isRateLimited = await checkRateLimit(supabase, userId);
      if (isRateLimited) {
        return createJsonResponse(
          {
            error: 'Too many requests. Please wait a moment before trying again.',
            code: 'RATE_LIMITED',
          },
          429
        );
      }
    }

    const usage = await getOrCreateUsage(supabase, userId);
    if (!isDev && isUsageExceeded(usage)) {
      const nextReset = getNextResetDate();
      const normalRemaining = Math.max(0, WEEKLY_MESSAGE_LIMIT - usage.messagesUsed);
      return createJsonResponse(
        {
          error: 'credits_exhausted',
          message: `You've used all your AI credits for this week. Your free credits will reset on ${new Date(nextReset).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at midnight UTC.`,
          code: 'CREDITS_EXHAUSTED',
          normalCreditsUsed: usage.messagesUsed,
          normalCreditsLimit: WEEKLY_MESSAGE_LIMIT,
          purchasedCreditsRemaining: usage.purchasedCredits,
          nextResetAt: nextReset,
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
      buildChatMessage('system', buildContextMessage(context, body.timezone, body.appStats)),
      ...kbMessages,
      ...recentMessages,
      buildChatMessage('user', message),
    ];

    // Tool calling loop - execute stat functions until we get a final response
    let totalUsage: OpenRouterUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let finalContent: string | null = null;
    let lastFinishReason = 'stop';
    const MAX_TOOL_ITERATIONS = 5;

    console.log(`[HerculesAI] Starting chat with ${STAT_TOOLS.length} tools available`);

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      console.log(`[HerculesAI] Tool iteration ${iteration + 1}/${MAX_TOOL_ITERATIONS}`);
      // Note: Don't use forceJson when tools are present - some models don't support both
      const result = await callOpenRouter(modelMessages, { tools: STAT_TOOLS });

      console.log(`[HerculesAI] Response: finishReason=${result.finishReason}, toolCalls=${result.toolCalls.length}, hasContent=${!!result.content}`);
      lastFinishReason = result.finishReason;

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
        const statResult = await executeStatFunction(supabase, userId, functionName, args, body.timezone, body.appStats);

        const toolMessage: ChatMessage = {
          role: 'tool',
          content: JSON.stringify(statResult),
          tool_call_id: toolCall.id,
        };
        modelMessages.push(toolMessage);
      }

      // If this was the last iteration and we still have tool calls, get final response
      if (iteration === MAX_TOOL_ITERATIONS - 1) {
        // toolChoice: 'none' means no tools will be called, so we can use forceJson
        const finalResult = await callOpenRouter(modelMessages, { toolChoice: 'none', forceJson: true });
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

    let parsed = parseAssistantResponse(finalContent);

    // CRITICAL: If message looks like a proposal but has no action, try to construct it.
    // Also detect when user confirmed ("yes", "create it") but AI responded without action.
    if (parsed.type === 'message' && !parsed.action) {
      const lowerMessage = parsed.message.toLowerCase();
      const lowerUserMessage = message.toLowerCase().trim();

      // Detect if user's message was a confirmation
      const userIsConfirming = /^(yes|yeah|yep|yup|sure|ok|okay|go ahead|do it|create it|sounds good|looks good|perfect|let'?s? do it|proceed|approve|confirm|make it|build it|go for it|please|yes please|y)\b/i.test(lowerUserMessage)
        && lowerUserMessage.length < 40;

      // Detect if AI's response looks like it's trying to create/execute without action payload
      const looksLikeProposal = lowerMessage.includes('would you like me to create') ||
        lowerMessage.includes('would you like me to set up') ||
        lowerMessage.includes('shall i create') ||
        lowerMessage.includes('tap approve') ||
        lowerMessage.includes('click approve') ||
        (lowerMessage.includes('day 1') && lowerMessage.includes('day 2'));

      const looksLikeExecution = lowerMessage.includes('creating your') ||
        lowerMessage.includes('creating the') ||
        lowerMessage.includes("i'll create") ||
        lowerMessage.includes('i will create') ||
        lowerMessage.includes('let me create') ||
        lowerMessage.includes('setting up your') ||
        lowerMessage.includes('building your') ||
        (lowerMessage.includes('creating') && (lowerMessage.includes('program') || lowerMessage.includes('plan') || lowerMessage.includes('workout'))) ||
        (lowerMessage.includes('here') && lowerMessage.includes('program') && lowerMessage.includes('workout'));

      // CRITICAL: Detect if AI listed exercises (numbered list) — strongest signal of a proposal
      // Matches patterns like "1. Barbell Bench Press" or "1. Something\n2. Something"
      const hasNumberedExerciseList = /\b1\.\s+[A-Z]/.test(parsed.message) && /\b2\.\s+[A-Z]/.test(parsed.message);
      const looksLikeWorkoutProposal = hasNumberedExerciseList && (
        lowerMessage.includes('workout') || lowerMessage.includes('program') ||
        lowerMessage.includes('plan') || lowerMessage.includes('push') ||
        lowerMessage.includes('pull') || lowerMessage.includes('leg') ||
        lowerMessage.includes('chest') || lowerMessage.includes('back') ||
        lowerMessage.includes('shoulder') || lowerMessage.includes('day')
      );

      // Also trigger when user confirmed but AI just responded with a message (no action)
      const userConfirmedButNoAction = userIsConfirming && (
        looksLikeExecution ||
        lowerMessage.includes('program') ||
        lowerMessage.includes('plan') ||
        lowerMessage.includes('workout') ||
        lowerMessage.includes('schedule')
      );

      const shouldRetry = looksLikeProposal || looksLikeExecution || userConfirmedButNoAction || looksLikeWorkoutProposal;

      if (shouldRetry) {
        const reason = looksLikeWorkoutProposal ? 'numbered_exercise_list_without_action'
          : looksLikeProposal ? 'proposal_without_action'
          : looksLikeExecution ? 'execution_without_action'
          : 'user_confirmed_no_action';
        console.warn(`[HerculesAI] Missing action payload detected (${reason}) - attempting recovery`);
        
        // Determine likely action type
        let likelyActionType: string | null = null;
        if (lowerMessage.includes('program') || lowerMessage.includes('plan') || 
            (lowerMessage.includes('day 1') && lowerMessage.includes('day 2'))) {
          likelyActionType = 'create_program_plan';
        } else if (lowerMessage.includes('schedule') || lowerMessage.includes('weekly')) {
          likelyActionType = 'create_schedule';
        } else if (lowerMessage.includes('workout') || lowerMessage.includes('exercise')) {
          likelyActionType = 'create_workout_template';
        }
        
        // Try to construct the action from the message content
        const constructedAction = constructActionFromMessage(parsed.message, likelyActionType);
        if (constructedAction) {
          console.log('[HerculesAI] Successfully constructed action from message:', constructedAction.actionType);
          parsed = {
            ...parsed,
            type: 'action',
            action: constructedAction,
          };
        } else {
          console.warn('[HerculesAI] Could not construct action from message - retrying with AI');
          
          // Build a targeted retry instruction based on the failure mode
          let retryInstruction: string;
          if (userConfirmedButNoAction) {
            retryInstruction = 'SYSTEM: The user confirmed they want to proceed, but your response is missing the action payload. The user CANNOT see Approve/Reject buttons without it and is now STUCK. You MUST re-read the entire conversation history above, find the program/workout/schedule you previously described, and output a complete JSON response with type: "action" and a full action object containing actionType and payload with ALL workouts and exercises. Do NOT just say "creating..." — you must include the actual data.';
          } else {
            retryInstruction = 'SYSTEM: Your previous response proposed creating something but forgot to include the action payload. The user CANNOT see Accept/Reject buttons without it. Please re-output your response as valid JSON with the action field included. Use type: "action" and include the full action object with actionType and payload containing ALL workouts and exercises.';
          }

          const retryMessages: ChatMessage[] = [
            ...modelMessages,
            buildChatMessage('assistant', finalContent),
            buildChatMessage('user', retryInstruction),
          ];
          
          try {
            const retryResult = await callOpenRouter(retryMessages, { forceJson: true });
            if (retryResult.content) {
              const retryParsed = parseAssistantResponse(retryResult.content);
              if (retryParsed.action) {
                console.log('[HerculesAI] Retry successful - action payload now present');
                parsed = retryParsed;
                if (retryResult.usage) {
                  totalUsage.promptTokens += retryResult.usage.promptTokens;
                  totalUsage.completionTokens += retryResult.usage.completionTokens;
                  totalUsage.totalTokens += retryResult.usage.totalTokens;
                }
              } else {
                console.error('[HerculesAI] Retry failed - still no action payload');
              }
            }
          } catch (retryError) {
            console.error('[HerculesAI] Retry call failed:', retryError);
          }
        }
      }
    }

    // Ensure type is 'action' if we have an action payload
    if (parsed.action && parsed.type !== 'action') {
      console.log('[HerculesAI] Correcting type to action since action payload is present');
      parsed = { ...parsed, type: 'action' };
    }

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
