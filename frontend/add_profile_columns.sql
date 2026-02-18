-- Add profiling columns to the profiles table
-- Run this in the Supabase SQL Editor

-- Step 1: Add new columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS primary_goal TEXT CHECK (primary_goal IN ('build-muscle', 'lose-fat', 'gain-strength', 'general-fitness', 'improve-endurance')),
  ADD COLUMN IF NOT EXISTS available_equipment TEXT CHECK (available_equipment IN ('full-gym', 'dumbbells-only', 'bodyweight', 'home-gym', 'resistance-bands')),
  ADD COLUMN IF NOT EXISTS training_days_per_week INTEGER CHECK (training_days_per_week >= 1 AND training_days_per_week <= 7),
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Step 2: Mark ALL existing users as onboarding-complete so they skip it.
-- New signups after this migration will get the DEFAULT FALSE and see onboarding.
UPDATE profiles SET onboarding_completed = TRUE WHERE onboarding_completed IS NOT TRUE;
