# Exercise Name Migration Guide

## Overview

When you update an exercise name in `src/data/exercises.json`, existing workout data in the database still references the old name. This guide explains how the app handles this automatically and how to ensure all data stays up-to-date.

## How It Works

The app uses a migration system that:

1. **Automatically migrates on read**: When workouts or plans are fetched from the database, exercise names are automatically updated to match the current names in `exercises.json`
2. **One-time database migration**: You can run a script to permanently update all data in the database

## Quick Start: Updating an Exercise Name

### Step 1: Update exercises.json

Update the exercise name in `src/data/exercises.json`:

```json
{
  "id": "exercise_017",
  "name": "Hip Adductor",  // Changed from "Thigh Adductor"
  ...
}
```

### Step 2: Add Migration Mapping

Add the old → new name mapping to `src/utils/exerciseMigration.ts`:

```typescript
const EXERCISE_NAME_MIGRATIONS: Record<string, string> = {
  'Thigh Adductor': 'Hip Adductor',
  'Thigh Abductor': 'Hip Abductor',
  // Add your new migrations here
};
```

### Step 3: Update Premade Workouts (if needed)

If the exercise appears in `src/data/premadeWorkouts.json`, update the name there as well:

```json
{
  "id": "exercise_017",
  "name": "Hip Adductor",
  "sets": 3
}
```

### Step 4: Run Migration Script (Optional but Recommended)

To permanently update all data in the database, run the migration script:

```bash
cd frontend
npx tsx src/scripts/migrateExerciseNames.ts
```

Or for a specific user:

```bash
npx tsx src/scripts/migrateExerciseNames.ts <userId>
```

## How the Automatic Migration Works

### On Data Read

When the app fetches data from the database:

1. `fetchWorkoutSessions()` - Automatically migrates exercise names in all workout sessions
2. `fetchUserPlans()` - Automatically migrates exercise names in all plans

This happens transparently, so users see the updated names immediately without any action.

### Example

```typescript
// Old data in database:
{ name: "Thigh Adductor", sets: [...] }

// Automatically becomes:
{ name: "Hip Adductor", sets: [...] }
```

## Migration Script Details

The migration script updates the database permanently for:

- **Workout Sessions**: All exercises in completed workouts
- **Plans**: All exercises in saved plans and templates

### Running the Script

```bash
# Migrate all users (requires admin database access)
npx tsx src/scripts/migrateExerciseNames.ts

# Migrate specific user
npx tsx src/scripts/migrateExerciseNames.ts abc123-user-id
```

### What It Does

1. Fetches all workout sessions for the user
2. For each session, checks if any exercises have old names
3. Updates the database with new names
4. Repeats for all plans

## Best Practices

### When to Run the Migration Script

- **Immediately after changing exercise names**: To clean up the database
- **Before a major release**: To ensure all historical data is up-to-date
- **After bulk imports**: If you've imported workouts with old names

### When NOT to Run the Migration Script

- **During active development**: The automatic migration on read is sufficient
- **Without testing**: Always test the migration mapping first

### Testing Your Migration

1. Add the mapping to `exerciseMigration.ts`
2. Test in development by loading workouts/plans with the old name
3. Verify the new names appear correctly in the UI
4. Run the migration script on a test account first
5. Check the database to confirm changes

## Troubleshooting

### Exercise Names Still Show Old Values

**Problem**: You updated exercises.json but still see the old name

**Solution**: 
1. Check if you added the migration mapping to `exerciseMigration.ts`
2. Refresh the app to clear any cached data
3. Check browser console for any errors

### Migration Script Fails

**Problem**: Script exits with an error

**Solution**:
1. Check your database connection settings
2. Verify you have access to the tables (`workout_sessions`, `plans`)
3. Look at the console error for specifics
4. Ensure the user ID exists if running for a specific user

### Partial Migration

**Problem**: Some workouts updated but not others

**Solution**:
1. Run the migration script again - it's idempotent (safe to run multiple times)
2. Check for any errors in the script output
3. Verify the migration mapping is correct

## Technical Details

### Files Involved

- `src/utils/exerciseMigration.ts` - Core migration logic and mappings
- `src/scripts/migrateExerciseNames.ts` - Manual migration script
- `src/lib/supabaseQueries.ts` - Database queries with automatic migration
- `src/data/exercises.json` - Exercise definitions
- `src/data/premadeWorkouts.json` - Premade workout templates

### Data Structure

Exercise names are stored in these places:

1. **Workout Sessions** (in database):
```json
{
  "exercises": [
    {
      "name": "Hip Adductor",
      "sets": [...]
    }
  ]
}
```

2. **Plans** (in database):
```json
{
  "exercises": [
    {
      "id": "exercise_017",
      "name": "Hip Adductor",
      "sets": 3
    }
  ]
}
```

## Future Exercise Name Changes

To ensure smooth updates when you change exercise names in the future:

1. **Always add a migration mapping** in `exerciseMigration.ts`
2. **Update premadeWorkouts.json** if the exercise appears there
3. **Run the migration script** to update the database
4. **Test thoroughly** with existing user data

## Example: Complete Migration Flow

```bash
# 1. Update exercises.json
vim src/data/exercises.json

# 2. Add migration mapping
vim src/utils/exerciseMigration.ts

# 3. Update premade workouts (if needed)
vim src/data/premadeWorkouts.json

# 4. Test locally
npm run dev

# 5. Run migration script
npx tsx src/scripts/migrateExerciseNames.ts

# 6. Verify changes
# - Check a workout with the old exercise name
# - Verify it now shows the new name
# - Check the database directly to confirm permanent update
```

## FAQ

**Q: Will this affect historical workout data?**
A: No, the migration preserves all set data, dates, and metrics. Only the exercise name changes.

**Q: Do I need to run the migration script every time?**
A: No, the automatic migration on read is sufficient for day-to-day use. Run the script to permanently clean up the database.

**Q: Can I undo a migration?**
A: Yes, add a reverse mapping and run the script again. For example:
```typescript
'Hip Adductor': 'Thigh Adductor'  // Reverses the change
```

**Q: What if I delete an exercise?**
A: Historical data will still show the exercise name. Users can still view their past workouts, but they won't be able to add that exercise to new workouts.

**Q: How do I migrate multiple exercises at once?**
A: Add all mappings to the `EXERCISE_NAME_MIGRATIONS` object and run the script once. It will migrate all of them.
