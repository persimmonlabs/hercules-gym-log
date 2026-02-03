-- Migration: Add weekly cardio goal columns to profiles table
-- Run this in Supabase SQL Editor

-- Add weekly cardio time goal (stored in seconds)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS weekly_cardio_time_goal INTEGER DEFAULT NULL;

-- Add weekly cardio distance goal (stored in miles for consistency with existing distance storage)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS weekly_cardio_distance_goal DOUBLE PRECISION DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN profiles.weekly_cardio_time_goal IS 'Weekly cardio time goal in seconds. NULL means no goal set.';
COMMENT ON COLUMN profiles.weekly_cardio_distance_goal IS 'Weekly cardio distance goal in miles. NULL means no goal set.';

-- Grant appropriate permissions (adjust based on your RLS policies)
-- The existing RLS policies on profiles should already handle this
