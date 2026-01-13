-- Migration: Add source column to workout_templates table
-- This tracks whether a workout came from the premade library, was custom-created, etc.

-- Add source column to workout_templates
ALTER TABLE public.workout_templates 
ADD COLUMN IF NOT EXISTS source text CHECK (source IN ('premade', 'custom', 'library', 'recommended'));

-- Set default value for existing rows (they're all custom since premade tracking wasn't working)
UPDATE public.workout_templates 
SET source = 'custom' 
WHERE source IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.workout_templates.source IS 'Tracks the origin of the workout: premade (from library), custom (user-created), library (legacy), recommended (from quiz)';
