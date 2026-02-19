-- Add supports_gps_tracking column to custom_exercises table
-- This allows users to create custom outdoor exercises that work with GPS tracking
ALTER TABLE public.custom_exercises
  ADD COLUMN IF NOT EXISTS supports_gps_tracking boolean NOT NULL DEFAULT false;
