/**
 * Node.js Migration Script for Exercise Names
 * 
 * This script can be run manually to migrate all exercise names in the database
 * for all users or a specific user.
 * 
 * Usage (from frontend directory):
 *   node src/scripts/migrateExerciseNamesNode.js [userId]
 * 
 * If userId is not provided, it will migrate for all users (requires admin access).
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration for Node.js (using service role key for admin access)
const SUPABASE_URL = process.env.HERCULES_SUPABASE_URL || 'https://rzhkagmwhtsvkbjnecfm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.HERCULES_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Debug: Check if environment variable is set
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('Set it in your .env file or export it before running:');
  console.log('export HERCULES_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.log('Or in PowerShell:');
  console.log('$env:HERCULES_SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"');
  console.log('\nDebug info:');
  console.log('HERCULES_SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.HERCULES_SUPABASE_SERVICE_ROLE_KEY);
  console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  process.exit(1);
}

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Map of old exercise names to new exercise names.
 * Add entries here whenever you rename an exercise in exercises.json.
 */
const EXERCISE_NAME_MIGRATIONS = {
  // Format: 'Old Name': 'New Name'
  'Thigh Adductor': 'Hip Adductor',
  'Thigh Abductor': 'Hip Abductor',
};

/**
 * Updates exercise names in workout sessions for a user
 */
async function migrateWorkoutSessions(userId) {
  console.log(`  Migrating workout sessions for user ${userId}...`);
  
  const { data: sessions, error } = await supabaseClient
    .from('workout_sessions')
    .select('id, exercises')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Error fetching workout sessions: ${error.message}`);
  }

  if (!sessions || sessions.length === 0) {
    console.log(`    No workout sessions found for user ${userId}`);
    return 0;
  }

  let migratedCount = 0;

  for (const session of sessions) {
    if (!session.exercises) continue;

    const exercises = Array.isArray(session.exercises) ? session.exercises : [];
    let hasChanges = false;

    // Update exercise names
    const updatedExercises = exercises.map(exercise => {
      const oldName = exercise.name;
      const newName = EXERCISE_NAME_MIGRATIONS[oldName];
      
      if (newName && oldName !== newName) {
        console.log(`    Updating exercise: "${oldName}" -> "${newName}"`);
        hasChanges = true;
        return { ...exercise, name: newName };
      }
      return exercise;
    });

    if (hasChanges) {
      const { error: updateError } = await supabaseClient
        .from('workout_sessions')
        .update({ exercises: updatedExercises })
        .eq('id', session.id);

      if (updateError) {
        console.error(`    Error updating session ${session.id}: ${updateError.message}`);
      } else {
        migratedCount++;
      }
    }
  }

  return migratedCount;
}

/**
 * Updates exercise names in plans for a user
 */
async function migratePlans(userId) {
  console.log(`  Migrating plans for user ${userId}...`);
  
  const { data: plans, error } = await supabaseClient
    .from('plans')
    .select('id, workouts')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Error fetching plans: ${error.message}`);
  }

  if (!plans || plans.length === 0) {
    console.log(`    No plans found for user ${userId}`);
    return 0;
  }

  let migratedCount = 0;

  for (const plan of plans) {
    if (!plan.workouts) continue;

    const workouts = Array.isArray(plan.workouts) ? plan.workouts : [];
    let hasChanges = false;

    // Update exercise names in workouts
    const updatedWorkouts = workouts.map(workout => {
      if (!workout.exercises) return workout;

      const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];
      const updatedExercises = exercises.map(exercise => {
        const oldName = exercise.name;
        const newName = EXERCISE_NAME_MIGRATIONS[oldName];
        
        if (newName && oldName !== newName) {
          console.log(`    Updating exercise in workout: "${oldName}" -> "${newName}"`);
          hasChanges = true;
          return { ...exercise, name: newName };
        }
        return exercise;
      });

      return { ...workout, exercises: updatedExercises };
    });

    if (hasChanges) {
      const { error: updateError } = await supabaseClient
        .from('plans')
        .update({ workouts: updatedWorkouts })
        .eq('id', plan.id);

      if (updateError) {
        console.error(`    Error updating plan ${plan.id}: ${updateError.message}`);
      } else {
        migratedCount++;
      }
    }
  }

  return migratedCount;
}

/**
 * Runs all exercise migrations for a specific user
 */
async function runExerciseMigrations(userId) {
  const workoutSessions = await migrateWorkoutSessions(userId);
  const plans = await migratePlans(userId);
  
  return { workoutSessions, plans };
}

async function migrateAllUsers() {
  console.log('='.repeat(60));
  console.log('EXERCISE NAME MIGRATION - ALL USERS');
  console.log('='.repeat(60));

  try {
    // Fetch all user IDs from workout_sessions
    const { data: sessions, error } = await supabaseClient
      .from('workout_sessions')
      .select('user_id')
      .order('user_id');

    if (error) {
      console.error('Error fetching user IDs:', error);
      process.exit(1);
    }

    if (!sessions || sessions.length === 0) {
      console.log('No workout sessions found. Nothing to migrate.');
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(sessions.map(s => s.user_id))];
    console.log(`Found ${userIds.length} users with workout data\n`);

    let totalWorkoutsMigrated = 0;
    let totalPlansMigrated = 0;

    for (const userId of userIds) {
      console.log(`\nMigrating data for user: ${userId}`);
      try {
        const results = await runExerciseMigrations(userId);
        totalWorkoutsMigrated += results.workoutSessions;
        totalPlansMigrated += results.plans;
        console.log(`  ✓ Migrated ${results.workoutSessions} workouts, ${results.plans} plans`);
      } catch (error) {
        console.error(`  ✗ Error migrating user ${userId}:`, error);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total workouts migrated: ${totalWorkoutsMigrated}`);
    console.log(`Total plans migrated: ${totalPlansMigrated}`);
    console.log(`Users processed: ${userIds.length}`);

  } catch (error) {
    console.error('Fatal error during migration:', error);
    process.exit(1);
  }
}

async function migrateSingleUser(userId) {
  console.log('='.repeat(60));
  console.log(`EXERCISE NAME MIGRATION - USER: ${userId}`);
  console.log('='.repeat(60));

  try {
    const results = await runExerciseMigrations(userId);
    
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Workouts migrated: ${results.workoutSessions}`);
    console.log(`Plans migrated: ${results.plans}`);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Main execution
const userId = process.argv[2];

if (userId) {
  console.log('Running migration for specific user...\n');
  migrateSingleUser(userId)
    .then(() => {
      console.log('\nMigration script completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\nMigration script failed:', error);
      process.exit(1);
    });
} else {
  console.log('Running migration for all users...\n');
  migrateAllUsers()
    .then(() => {
      console.log('\nMigration script completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\nMigration script failed:', error);
      process.exit(1);
    });
}
