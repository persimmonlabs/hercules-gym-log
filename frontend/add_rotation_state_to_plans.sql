-- Migration: Add rotation_state column to plans table
-- This stores the current rotation state for programs using rotation scheduling

-- Add rotation_state column to plans
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS rotation_state jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.plans.rotation_state IS 'Stores rotation state: { workoutSequence: string[], currentIndex: number, lastAdvancedAt: number }';
