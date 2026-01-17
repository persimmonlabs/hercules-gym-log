import type { SupabaseClient } from '@supabase/supabase-js';

import {
  COST_PER_1K_TOKENS,
  WEEKLY_MESSAGE_LIMIT,
  WEEKLY_TOKEN_LIMIT,
} from './constants.ts';

export interface UsageRecord {
  id: string;
  periodStart: string;
  periodEnd: string;
  tokensUsed: number;
  messagesUsed: number;
  costEstimate: number;
}

const formatDate = (date: Date): string => date.toISOString().split('T')[0];

export const getWeekRange = (now = new Date()): { start: string; end: string } => {
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekday = utcNow.getUTCDay();
  const diffToMonday = (weekday + 6) % 7;
  const startDate = new Date(utcNow);
  startDate.setUTCDate(startDate.getUTCDate() - diffToMonday);
  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + 6);

  return {
    start: formatDate(startDate),
    end: formatDate(endDate),
  };
};

export const getOrCreateUsage = async (
  supabase: SupabaseClient,
  userId: string
): Promise<UsageRecord> => {
  const { start, end } = getWeekRange();

  const { data, error } = await supabase
    .from('ai_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('period_start', start)
    .eq('period_end', end)
    .maybeSingle();

  if (error) {
    console.warn('[HerculesAI] Failed to read usage', error.message);
  }

  if (data) {
    return {
      id: data.id,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      tokensUsed: data.tokens_used ?? 0,
      messagesUsed: data.messages_used ?? 0,
      costEstimate: Number(data.cost_estimate ?? 0),
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('ai_usage')
    .insert({
      user_id: userId,
      period_start: start,
      period_end: end,
      tokens_used: 0,
      messages_used: 0,
      cost_estimate: 0,
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    throw new Error('[HerculesAI] Failed to create usage row');
  }

  return {
    id: inserted.id,
    periodStart: inserted.period_start,
    periodEnd: inserted.period_end,
    tokensUsed: inserted.tokens_used ?? 0,
    messagesUsed: inserted.messages_used ?? 0,
    costEstimate: Number(inserted.cost_estimate ?? 0),
  };
};

export const isUsageExceeded = (usage: UsageRecord): boolean => {
  const messagesExceeded = usage.messagesUsed >= WEEKLY_MESSAGE_LIMIT;
  
  if (messagesExceeded) {
    console.log(`[HerculesAI] Message limit exceeded: ${usage.messagesUsed}/${WEEKLY_MESSAGE_LIMIT}`);
  }
  
  return messagesExceeded;
};

export const incrementUsage = async (
  supabase: SupabaseClient,
  usage: UsageRecord,
  deltaTokens: number,
  deltaMessages: number
): Promise<UsageRecord> => {
  const tokenCost = (deltaTokens / 1000) * COST_PER_1K_TOKENS;
  const nextTokens = usage.tokensUsed + deltaTokens;
  const nextMessages = usage.messagesUsed + deltaMessages;
  const nextCost = usage.costEstimate + tokenCost;

  const { data, error } = await supabase
    .from('ai_usage')
    .update({
      tokens_used: nextTokens,
      messages_used: nextMessages,
      cost_estimate: nextCost,
    })
    .eq('id', usage.id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('[HerculesAI] Failed to update usage row');
  }

  return {
    id: data.id,
    periodStart: data.period_start,
    periodEnd: data.period_end,
    tokensUsed: data.tokens_used ?? nextTokens,
    messagesUsed: data.messages_used ?? nextMessages,
    costEstimate: Number(data.cost_estimate ?? nextCost),
  };
};
