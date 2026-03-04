-- =============================================================================
-- PRODUCTION SECURITY HARDENING
-- Run this in Supabase SQL Editor BEFORE publishing to Play Store
-- =============================================================================

-- ============================================================================
-- 1. FIX PROFILES TABLE: Overly permissive SELECT policy
--    Currently: "Public profiles are viewable by everyone" using (true)
--    Fix: Users can only read their OWN profile
-- ============================================================================

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a secure SELECT policy: users can only view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. ENSURE RLS ON workout_templates TABLE
--    (Table created via dashboard or prior migration without RLS in repo)
-- ============================================================================

ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts, then recreate
DROP POLICY IF EXISTS "Users can view own workout templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Users can insert own workout templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Users can update own workout templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Users can delete own workout templates" ON public.workout_templates;

CREATE POLICY "Users can view own workout templates"
  ON public.workout_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout templates"
  ON public.workout_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout templates"
  ON public.workout_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout templates"
  ON public.workout_templates
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 3. ENSURE RLS ON schedules TABLE
-- ============================================================================

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can insert own schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can update own schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can delete own schedules" ON public.schedules;

CREATE POLICY "Users can view own schedules"
  ON public.schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedules"
  ON public.schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
  ON public.schedules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules"
  ON public.schedules
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 4. ENSURE RLS ON active_schedule TABLE
-- ============================================================================

ALTER TABLE public.active_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own active schedule" ON public.active_schedule;
DROP POLICY IF EXISTS "Users can insert own active schedule" ON public.active_schedule;
DROP POLICY IF EXISTS "Users can update own active schedule" ON public.active_schedule;
DROP POLICY IF EXISTS "Users can delete own active schedule" ON public.active_schedule;

CREATE POLICY "Users can view own active schedule"
  ON public.active_schedule
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own active schedule"
  ON public.active_schedule
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own active schedule"
  ON public.active_schedule
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own active schedule"
  ON public.active_schedule
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 5. VERIFY: Audit all tables for RLS status
--    Run this query to check — every table should show rls_enabled = true
-- ============================================================================

-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- ============================================================================
-- 6. RESTRICT REALTIME PUBLICATIONS
--    Only publish tables that genuinely need real-time updates.
--    Sensitive tables like profiles, ai_usage, ai_rate_limits should NOT be
--    in publications unless absolutely needed.
-- ============================================================================

-- Check current publications:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- If sensitive tables are published, remove them:
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.ai_usage;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.ai_rate_limits;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.ai_chat_messages;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.feedback;

-- ============================================================================
-- 7. Add DELETE policy for ai_usage (currently missing — only SELECT, INSERT, UPDATE)
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own usage" ON public.ai_usage;

CREATE POLICY "Users can delete own usage"
  ON public.ai_usage
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 8. Add DELETE policy for ai_rate_limits (currently missing)
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own rate limits" ON public.ai_rate_limits;

CREATE POLICY "Users can delete own rate limits"
  ON public.ai_rate_limits
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 9. Add DELETE policy for feedback table (currently missing)
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own feedback" ON public.feedback;

CREATE POLICY "Users can delete own feedback"
  ON public.feedback
  FOR DELETE USING (auth.uid() = user_id);
