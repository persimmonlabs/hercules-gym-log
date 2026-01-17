# Hercules AI — Action Catalog (Draft)

## Actions (All Require Confirmation)
1. **create_workout_template**
   - Payload: name, exercises[]
   - Validates against exercise catalog.

2. **create_program_plan**
   - Payload: name, workouts[], schedule
   - Must ensure unique workout names.

3. **create_schedule**
   - Payload: name, weekly/rotating config

4. **edit_workout_session**
   - Payload: session_id, changes

5. **add_workout_session**
   - Payload: session data

6. **delete_workout_session**
   - Payload: session_id

7. **update_profile**
   - Payload: ai_profile updates

## Validation Rules
- Exercises must exist in catalog or be added explicitly via custom exercise creation.
- Muscle weightings (if AI creates custom exercise) must sum to 1.000 and use leaf muscles only.
- Never mutate without explicit confirmation.
