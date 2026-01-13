-- Migration: Add missing columns to profiles table
-- These columns are referenced in settingsStore but may not exist in the database

-- Add is_pro column for premium status tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;

-- Add haptics_enabled column for haptic feedback preference
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS haptics_enabled boolean DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.is_pro IS 'Whether the user has Hercules Pro (premium) access';
COMMENT ON COLUMN public.profiles.haptics_enabled IS 'Whether haptic feedback is enabled for this user';
