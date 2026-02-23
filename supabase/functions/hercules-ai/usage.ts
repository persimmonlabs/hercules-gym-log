import type { SupabaseClient } from '@supabase/supabase-js';

import {
  COST_PER_1K_TOKENS,
  WEEKLY_MESSAGE_LIMIT,
  WEEKLY_TOKEN_LIMIT,
  RATE_LIMIT_WINDOW_SECONDS,
  RATE_LIMIT_MAX_REQUESTS,
} from './constants.ts';

export interface UsageRecord {
  id: string;
  periodStart: string;
  periodEnd: string;
  tokensUsed: number;
  messagesUsed: number;
  purchasedCredits: number;
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

/**
 * Returns ISO string for next Monday 00:00 UTC (when credits reset)
 */
export const getNextResetDate = (): string => {
  const now = new Date();
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekday = utcNow.getUTCDay();
  const daysUntilMonday = weekday === 0 ? 1 : (8 - weekday);
  const nextMonday = new Date(utcNow);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);
  return nextMonday.toISOString();
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
      purchasedCredits: data.purchased_credits ?? 0,
      costEstimate: Number(data.cost_estimate ?? 0),
    };
  }

  // New week — carry over purchased credits from previous period
  const { data: prevWeek } = await supabase
    .from('ai_usage')
    .select('purchased_credits')
    .eq('user_id', userId)
    .order('period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  const carryOverCredits = prevWeek?.purchased_credits ?? 0;

  const { data: inserted, error: insertError } = await supabase
    .from('ai_usage')
    .insert({
      user_id: userId,
      period_start: start,
      period_end: end,
      tokens_used: 0,
      messages_used: 0,
      purchased_credits: carryOverCredits,
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
    purchasedCredits: inserted.purchased_credits ?? carryOverCredits,
    costEstimate: Number(inserted.cost_estimate ?? 0),
  };
};

/**
 * Checks if both normal and purchased credits are exhausted.
 * Normal credits = WEEKLY_MESSAGE_LIMIT - messagesUsed
 * Purchased credits only consumed after normal credits are depleted.
 */
export const isUsageExceeded = (usage: UsageRecord): boolean => {
  const normalRemaining = Math.max(0, WEEKLY_MESSAGE_LIMIT - usage.messagesUsed);
  const totalRemaining = normalRemaining + usage.purchasedCredits;

  if (totalRemaining <= 0) {
    console.log(
      `[HerculesAI] All credits exhausted: normal=${usage.messagesUsed}/${WEEKLY_MESSAGE_LIMIT}, purchased=${usage.purchasedCredits}`
    );
    return true;
  }

  return false;
};

/**
 * Increments usage and deducts from the correct credit pool.
 * Normal credits are consumed first; purchased credits only when normal = 0.
 */
export const incrementUsage = async (
  supabase: SupabaseClient,
  usage: UsageRecord,
  deltaTokens: number,
  deltaMessages: number
): Promise<UsageRecord> => {
  const tokenCost = (deltaTokens / 1000) * COST_PER_1K_TOKENS;
  const nextTokens = usage.tokensUsed + deltaTokens;
  let nextMessages = usage.messagesUsed;
  let nextPurchased = usage.purchasedCredits;

  // Deduct from normal credits first, then purchased
  let remaining = deltaMessages;
  const normalRemaining = Math.max(0, WEEKLY_MESSAGE_LIMIT - usage.messagesUsed);

  if (remaining <= normalRemaining) {
    nextMessages += remaining;
  } else {
    // Use up remaining normal credits, then dip into purchased
    nextMessages = WEEKLY_MESSAGE_LIMIT;
    const fromPurchased = remaining - normalRemaining;
    nextPurchased = Math.max(0, usage.purchasedCredits - fromPurchased);
  }

  const nextCost = usage.costEstimate + tokenCost;

  const { data, error } = await supabase
    .from('ai_usage')
    .update({
      tokens_used: nextTokens,
      messages_used: nextMessages,
      purchased_credits: nextPurchased,
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
    purchasedCredits: data.purchased_credits ?? nextPurchased,
    costEstimate: Number(data.cost_estimate ?? nextCost),
  };
};

/**
 * Adds purchased credits to the current usage period.
 */
export const addPurchasedCredits = async (
  supabase: SupabaseClient,
  userId: string,
  credits: number
): Promise<UsageRecord> => {
  const usage = await getOrCreateUsage(supabase, userId);
  const nextPurchased = usage.purchasedCredits + credits;

  const { data, error } = await supabase
    .from('ai_usage')
    .update({ purchased_credits: nextPurchased })
    .eq('id', usage.id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('[HerculesAI] Failed to add purchased credits');
  }

  return {
    id: data.id,
    periodStart: data.period_start,
    periodEnd: data.period_end,
    tokensUsed: data.tokens_used ?? usage.tokensUsed,
    messagesUsed: data.messages_used ?? usage.messagesUsed,
    purchasedCredits: data.purchased_credits ?? nextPurchased,
    costEstimate: Number(data.cost_estimate ?? usage.costEstimate),
  };
};

/**
 * Per-minute rate limiter to prevent burst abuse.
 * Returns true if the request should be blocked.
 */
export const checkRateLimit = async (
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> => {
  const now = new Date();
  // Truncate to the start of the current minute window
  const windowStart = new Date(
    Math.floor(now.getTime() / (RATE_LIMIT_WINDOW_SECONDS * 1000)) *
      (RATE_LIMIT_WINDOW_SECONDS * 1000)
  );

  const { data, error } = await supabase
    .from('ai_rate_limits')
    .select('request_count')
    .eq('user_id', userId)
    .eq('window_start', windowStart.toISOString())
    .maybeSingle();

  if (error) {
    console.warn('[HerculesAI] Rate limit check failed:', error.message);
    return false; // Fail open — don't block on DB errors
  }

  if (data) {
    if (data.request_count >= RATE_LIMIT_MAX_REQUESTS) {
      console.log(
        `[HerculesAI] Rate limited: ${data.request_count}/${RATE_LIMIT_MAX_REQUESTS} in window`
      );
      return true;
    }

    await supabase
      .from('ai_rate_limits')
      .update({ request_count: data.request_count + 1 })
      .eq('user_id', userId)
      .eq('window_start', windowStart.toISOString());
  } else {
    await supabase
      .from('ai_rate_limits')
      .insert({
        user_id: userId,
        window_start: windowStart.toISOString(),
        request_count: 1,
      });
  }

  return false;
};
