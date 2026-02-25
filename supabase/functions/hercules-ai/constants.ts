import { getOptionalEnv, getOptionalNumber } from './env.ts';

export const OPENROUTER_BASE_URL = getOptionalEnv(
  'OPENROUTER_BASE_URL',
  'https://openrouter.ai/api/v1/chat/completions'
);

export const OPENROUTER_MODEL = getOptionalEnv(
  'OPENROUTER_MODEL',
  'google/gemini-2.5-flash'
);

export const OPENROUTER_MAX_TOKENS = getOptionalNumber(
  'OPENROUTER_MAX_TOKENS',
  4000
);

export const OPENROUTER_TEMPERATURE = getOptionalNumber(
  'OPENROUTER_TEMPERATURE',
  0.3
);

export const COST_PER_1K_TOKENS = getOptionalNumber(
  'HERCULES_AI_COST_PER_1K_TOKENS',
  0.001
);

export const WEEKLY_TOKEN_LIMIT = getOptionalNumber(
  'HERCULES_AI_WEEKLY_TOKEN_LIMIT',
  100000
);

export const WEEKLY_MESSAGE_LIMIT = getOptionalNumber(
  'HERCULES_AI_WEEKLY_MESSAGE_LIMIT',
  100
);

export const RATE_LIMIT_WINDOW_SECONDS = getOptionalNumber(
  'HERCULES_AI_RATE_LIMIT_WINDOW_SECONDS',
  60
);

export const RATE_LIMIT_MAX_REQUESTS = getOptionalNumber(
  'HERCULES_AI_RATE_LIMIT_MAX_REQUESTS',
  10
);

export const MAX_CONTEXT_MESSAGES = getOptionalNumber(
  'HERCULES_AI_MAX_CONTEXT_MESSAGES',
  50
);

export const MAX_RECENT_SESSIONS = getOptionalNumber(
  'HERCULES_AI_RECENT_SESSIONS',
  6
);

export const KB_TOP_K = getOptionalNumber('HERCULES_AI_KB_TOP_K', 6);
