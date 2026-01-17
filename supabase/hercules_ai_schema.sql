-- Hercules AI schema
-- Run this in Supabase SQL editor

-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- AI Chat Sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);

CREATE TRIGGER update_ai_chat_sessions_updated_at
  BEFORE UPDATE ON ai_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat sessions" ON ai_chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat sessions" ON ai_chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions" ON ai_chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions" ON ai_chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- AI Chat Messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_created_at
  ON ai_chat_messages(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_id ON ai_chat_messages(user_id);

ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat messages" ON ai_chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages" ON ai_chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat messages" ON ai_chat_messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages" ON ai_chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- AI Action Requests (confirmation workflow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_action_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_action_requests_user_id ON ai_action_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_action_requests_status ON ai_action_requests(status);
CREATE INDEX IF NOT EXISTS idx_ai_action_requests_session_id ON ai_action_requests(session_id);

CREATE TRIGGER update_ai_action_requests_updated_at
  BEFORE UPDATE ON ai_action_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE ai_action_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own action requests" ON ai_action_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own action requests" ON ai_action_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own action requests" ON ai_action_requests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own action requests" ON ai_action_requests
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- AI Usage (weekly caps)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  messages_used INTEGER NOT NULL DEFAULT 0,
  cost_estimate NUMERIC(10, 4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ai_usage_period_valid CHECK (period_end >= period_start),
  CONSTRAINT ai_usage_unique_period UNIQUE (user_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage(user_id);

CREATE TRIGGER update_ai_usage_updated_at
  BEFORE UPDATE ON ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON ai_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON ai_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON ai_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- AI Profile (fitness preferences & context)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  goals JSONB DEFAULT '[]'::jsonb,
  experience_level TEXT,
  equipment JSONB DEFAULT '[]'::jsonb,
  time_availability TEXT,
  injuries TEXT,
  units JSONB DEFAULT '{}'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_ai_profile_updated_at
  BEFORE UPDATE ON ai_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE ai_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai_profile" ON ai_profile
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai_profile" ON ai_profile
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai_profile" ON ai_profile
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- AI Feedback
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message_id UUID REFERENCES ai_chat_messages(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating IN (-1, 1)),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_message_id ON ai_feedback(message_id);

ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai_feedback" ON ai_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai_feedback" ON ai_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- AI Knowledge Base Docs (vector search)
-- NOTE: Embedding dimension is set to 1536 by default. Adjust if needed.
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_kb_docs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_kb_docs_source ON ai_kb_docs(source);
CREATE INDEX IF NOT EXISTS idx_ai_kb_docs_embedding
  ON ai_kb_docs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE ai_kb_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can read ai_kb_docs" ON ai_kb_docs
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert ai_kb_docs" ON ai_kb_docs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update ai_kb_docs" ON ai_kb_docs
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete ai_kb_docs" ON ai_kb_docs
  FOR DELETE USING (auth.role() = 'service_role');
