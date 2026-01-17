-- Cleanup script for corrupted workout templates created by AI
-- This removes workout templates with invalid exercise IDs

-- First, let's see what we're dealing with (run this to inspect)
-- SELECT id, name, exercises, created_at 
-- FROM workout_templates 
-- WHERE created_at > NOW() - INTERVAL '7 days'
-- ORDER BY created_at DESC;

-- Delete workout templates where exercises have invalid IDs
-- (IDs that don't exist in the exercises table)
DELETE FROM workout_templates
WHERE id IN (
  SELECT wt.id
  FROM workout_templates wt,
  LATERAL jsonb_array_elements(wt.exercises) AS ex
  WHERE NOT EXISTS (
    SELECT 1 FROM exercises e 
    WHERE e.id = (ex->>'id')
  )
);

-- Alternative: If you want to just delete recent AI-created templates
-- DELETE FROM workout_templates
-- WHERE source = 'custom' 
-- AND created_at > NOW() - INTERVAL '1 day';
