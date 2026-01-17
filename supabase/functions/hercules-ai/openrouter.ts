import { getEnv } from './env.ts';
import {
  OPENROUTER_BASE_URL,
  OPENROUTER_MAX_TOKENS,
  OPENROUTER_MODEL,
  OPENROUTER_TEMPERATURE,
} from './constants.ts';
import type { ChatMessage } from './types.ts';
import type { ToolDefinition } from './tools.ts';

export interface OpenRouterUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenRouterResult {
  content: string | null;
  toolCalls: ToolCall[];
  usage: OpenRouterUsage | null;
  finishReason: string;
}

const buildUsage = (usage: Record<string, unknown> | null | undefined): OpenRouterUsage => {
  const promptTokens = Number(usage?.prompt_tokens ?? 0);
  const completionTokens = Number(usage?.completion_tokens ?? 0);
  const totalTokens = Number(usage?.total_tokens ?? promptTokens + completionTokens);

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
};

export interface CallOpenRouterOptions {
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

export const callOpenRouter = async (
  messages: ChatMessage[],
  options?: CallOpenRouterOptions
): Promise<OpenRouterResult> => {
  const apiKey = getEnv('OPENROUTER_API_KEY');
  const payload: Record<string, unknown> = {
    model: OPENROUTER_MODEL,
    messages,
    temperature: OPENROUTER_TEMPERATURE,
    max_tokens: OPENROUTER_MAX_TOKENS,
  };

  if (options?.tools && options.tools.length > 0) {
    payload.tools = options.tools;
    payload.tool_choice = options.toolChoice ?? 'auto';
  }

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://hercules.app',
      'X-Title': 'Hercules AI',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data?.error?.message ?? response.statusText;
    throw new Error(`[HerculesAI] OpenRouter error: ${errorMessage}`);
  }

  const choice = data?.choices?.[0];
  const message = choice?.message;
  const finishReason = choice?.finish_reason ?? 'stop';

  const content = message?.content ?? null;
  const toolCalls: ToolCall[] = message?.tool_calls ?? [];

  if (!content && toolCalls.length === 0) {
    throw new Error('[HerculesAI] OpenRouter response missing content and tool calls');
  }

  return {
    content,
    toolCalls,
    usage: data?.usage ? buildUsage(data.usage) : null,
    finishReason,
  };
};
