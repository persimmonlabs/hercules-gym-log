-- Add route_coordinates column to workout_sessions for outdoor GPS session data
ALTER TABLE workout_sessions
ADD COLUMN IF NOT EXISTS route_coordinates JSONB DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN workout_sessions.route_coordinates IS 'GPS route coordinates for outdoor exercise sessions. Array of {latitude, longitude, timestamp} objects.';
