-- AI Credits System Migration
-- Adds purchased_credits column to ai_usage for rollover credit system
-- Normal credits (messages_used) reset weekly; purchased_credits roll over

-- Add purchased_credits to ai_usage
ALTER TABLE ai_usage
  ADD COLUMN IF NOT EXISTS purchased_credits INTEGER NOT NULL DEFAULT 0;

-- Add a rate limiting table for per-minute abuse prevention
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT ai_rate_limits_unique_window UNIQUE (user_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_user_id ON ai_rate_limits(user_id);

ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits" ON ai_rate_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rate limits" ON ai_rate_limits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rate limits" ON ai_rate_limits
  FOR UPDATE USING (auth.uid() = user_id);

-- Cleanup old rate limit rows (run periodically or via cron)
-- DELETE FROM ai_rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
