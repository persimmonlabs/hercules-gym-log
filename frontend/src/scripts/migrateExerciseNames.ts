/**
 * Manual Migration Script for Exercise Names
 * 
 * This script can be run manually to migrate all exercise names in the database
 * for all users or a specific user.
 * 
 * Usage (from frontend directory):
 *   npx tsx src/scripts/migrateExerciseNames.ts [userId]
 * 
 * If userId is not provided, it will migrate for all users (requires admin access).
 */

import { supabaseClient } from '../lib/supabaseClient';
import { runExerciseMigrations } from '../utils/exerciseMigration';

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

async function migrateSingleUser(userId: string) {
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
