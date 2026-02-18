/**
 * Supabase Database Queries
 * Centralized functions for interacting with Supabase tables
 */

import { supabaseClient } from './supabaseClient';
import type { Workout } from '@/types/workout';
import type { UserPlan, PlanWorkout } from '@/types/premadePlan';
import { migrateWorkoutExercises, migrateExerciseName } from '@/utils/exerciseMigration';

// ============================================================================
// RETRY UTILITY & ERROR HANDLING
// ============================================================================

interface RetryOptions {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
};

/**
 * Checks if an error is a network-related error that should be retried
 */
function isNetworkError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const networkErrorPatterns = [
        'network request failed',
        'network error',
        'failed to fetch',
        'fetch failed',
        'timeout',
        'econnrefused',
        'econnreset',
        'enotfound',
        'socket hang up',
        'aborted',
        'network is offline',
        'internet connection',
    ];

    const message = error.message.toLowerCase();
    return networkErrorPatterns.some(pattern => message.includes(pattern));
}

/**
 * Checks if an error is an auth error that should NOT be retried
 */
function isAuthError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const authErrorPatterns = ['jwt', 'auth', 'unauthorized', '401', 'token'];
    const message = error.message.toLowerCase();
    return authErrorPatterns.some(pattern => message.includes(pattern));
}

/**
 * Retries an async function with exponential backoff
 * Automatically retries on network errors, skips retry on auth errors
 * @param fn The async function to retry
 * @param options Retry configuration options
 * @returns The result of the function
 */
async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: unknown;
    let delay = opts.initialDelayMs;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry on auth errors
            if (isAuthError(error)) {
                console.warn('[Supabase] Auth error detected, not retrying:', error);
                throw error;
            }

            // Last attempt - throw the error
            if (attempt === opts.maxAttempts) {
                console.error(`[Supabase] All ${opts.maxAttempts} attempts failed:`, error);
                throw error;
            }

            // Log retry attempt with more context
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const isNetwork = isNetworkError(error);
            console.log(
                `[Supabase] Attempt ${attempt}/${opts.maxAttempts} failed (${isNetwork ? 'network' : 'other'} error: ${errorMessage}), retrying in ${delay}ms...`
            );

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));

            // Increase delay for next attempt
            delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
        }
    }

    throw lastError;
}

/**
 * Wraps a Supabase operation with retry logic and graceful error handling
 * Returns null/empty array on failure instead of throwing (for non-critical operations)
 * Silently handles network errors to prevent user-facing error messages
 */
async function withGracefulRetry<T>(
    fn: () => Promise<T>,
    fallback: T,
    operationName: string,
    options: RetryOptions = {}
): Promise<T> {
    try {
        return await withRetry(fn, options);
    } catch (error) {
        // Use console.warn for network errors to avoid alarming error messages
        // These are expected during app startup or poor connectivity
        if (isNetworkError(error)) {
            console.warn(`[Supabase] ${operationName} failed (network issue), using fallback`);
        } else {
            console.warn(`[Supabase] ${operationName} failed after retries, using fallback`);
        }
        return fallback;
    }
}

// ============================================================================
// WORKOUT SESSIONS
// ============================================================================

export async function fetchWorkoutSessions(userId: string): Promise<Workout[]> {
    console.log('[Supabase] Fetching workout sessions for user:', userId);

    return withGracefulRetry(
        async () => {
            const { data, error } = await supabaseClient
                .from('workout_sessions')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false });

            if (error) {
                throw error;
            }

            console.log('[Supabase] Successfully fetched', data?.length ?? 0, 'workout sessions');

            // Transform from DB format to app format and migrate exercise names
            return (data || []).map((row) => ({
                id: row.id,
                planId: row.plan_id,
                name: row.name,
                date: row.date,
                startTime: row.start_time,
                endTime: row.end_time,
                duration: row.duration,
                exercises: migrateWorkoutExercises(row.exercises || []),
            }));
        },
        [], // fallback to empty array
        'fetchWorkoutSessions'
    );
}

export async function createWorkoutSession(userId: string, workout: Workout): Promise<string> {
    return withRetry(async () => {
        // Validate planId exists in the plans table before inserting
        // planId could be a workout_templates.id which would violate the foreign key constraint
        let validPlanId: string | null = null;

        if (workout.planId) {
            const { data: planExists } = await supabaseClient
                .from('plans')
                .select('id')
                .eq('id', workout.planId)
                .single();

            if (planExists) {
                validPlanId = workout.planId;
            }
        }

        const { data, error } = await supabaseClient
            .from('workout_sessions')
            .insert({
                user_id: userId,
                plan_id: validPlanId,
                name: workout.name,
                date: workout.date,
                start_time: workout.startTime,
                end_time: workout.endTime,
                duration: workout.duration,
                exercises: workout.exercises,
            })
            .select('id')
            .single();

        if (error) {
            console.error('[Supabase] Error creating workout session:', error);
            throw error;
        }

        return data.id;
    });
}

export async function updateWorkoutSession(userId: string, workout: Workout): Promise<void> {
    return withRetry(async () => {
        // Validate planId exists in the plans table before updating
        let validPlanId: string | null = null;

        if (workout.planId) {
            const { data: planExists } = await supabaseClient
                .from('plans')
                .select('id')
                .eq('id', workout.planId)
                .single();

            if (planExists) {
                validPlanId = workout.planId;
            }
        }

        const { error } = await supabaseClient
            .from('workout_sessions')
            .update({
                plan_id: validPlanId,
                name: workout.name,
                date: workout.date,
                start_time: workout.startTime,
                end_time: workout.endTime,
                duration: workout.duration,
                exercises: workout.exercises,
            })
            .eq('id', workout.id)
            .eq('user_id', userId);

        if (error) {
            console.error('[Supabase] Error updating workout session:', error);
            throw error;
        }
    });
}

export async function deleteWorkoutSession(userId: string, workoutId: string): Promise<void> {
    return withRetry(async () => {
        const { error } = await supabaseClient
            .from('workout_sessions')
            .delete()
            .eq('id', workoutId)
            .eq('user_id', userId);

        if (error) {
            console.error('[Supabase] Error deleting workout session:', error);
            throw error;
        }
    });
}

// ============================================================================
// PLANS (User Programs)
// ============================================================================

export async function fetchUserPlans(userId: string): Promise<UserPlan[]> {
    console.log('[Supabase] Fetching user plans for user:', userId);

    return withGracefulRetry(
        async () => {
            const { data: plansData, error: plansError } = await supabaseClient
                .from('plans')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (plansError) {
                throw plansError;
            }

            if (!plansData || plansData.length === 0) {
                console.log('[Supabase] No plans found for user');
                return [];
            }

            console.log('[Supabase] Found', plansData.length, 'plans, fetching workouts...');

            // Fetch workouts for all plans
            const planIds = plansData.map((p) => p.id);
            const { data: workoutsData, error: workoutsError } = await supabaseClient
                .from('plan_workouts')
                .select('*')
                .in('plan_id', planIds)
                .order('order_index', { ascending: true });

            if (workoutsError) {
                throw workoutsError;
            }

            console.log('[Supabase] Successfully fetched', workoutsData?.length ?? 0, 'plan workouts');

            // Group workouts by plan_id and migrate exercise names
            const workoutsByPlan = (workoutsData || []).reduce((acc, workout) => {
                if (!acc[workout.plan_id]) {
                    acc[workout.plan_id] = [];
                }
                const exercises = workout.exercises || [];
                // Migrate exercise names in the exercises array
                const migratedExercises = exercises.map((ex: any) => ({
                    ...ex,
                    name: migrateExerciseName(ex.name),
                }));
                acc[workout.plan_id].push({
                    id: workout.id,
                    name: workout.name,
                    exercises: migratedExercises,
                    sourceWorkoutId: workout.source_workout_id,
                });
                return acc;
            }, {} as Record<string, PlanWorkout[]>);

            // Combine plans with their workouts
            return plansData.map((plan) => ({
                id: plan.id,
                name: plan.name,
                workouts: workoutsByPlan[plan.id] || [],
                metadata: plan.metadata || {},
                scheduleType: plan.schedule_type,
                schedule: plan.schedule_config,
                isPremade: false,
                sourceId: plan.source_id,
                createdAt: plan.created_at,
                modifiedAt: plan.updated_at,
                is_active: plan.is_active || false,
                rotation_state: plan.rotation_state || null,
            }));
        },
        [], // fallback to empty array
        'fetchUserPlans'
    );
}

export async function createUserPlan(userId: string, plan: UserPlan): Promise<{ id: string; workouts: PlanWorkout[] }> {
    return withRetry(async () => {
        // Insert the plan (let Supabase generate UUID)
        const { data: planData, error: planError } = await supabaseClient
            .from('plans')
            .insert({
                user_id: userId,
                name: plan.name,
                metadata: plan.metadata,
                schedule_type: plan.scheduleType,
                schedule_config: plan.schedule,
                is_active: false,
                source_id: plan.sourceId,
            })
            .select('id')
            .single();

        if (planError) {
            console.error('[Supabase] Error creating plan:', planError);
            throw planError;
        }

        const newPlanId = planData.id;
        let finalWorkouts: PlanWorkout[] = [];

        // Insert workouts (let Supabase generate UUIDs)
        if (plan.workouts && plan.workouts.length > 0) {
            const workoutsToInsert = plan.workouts.map((workout, index) => ({
                plan_id: newPlanId,
                user_id: userId,
                name: workout.name,
                exercises: workout.exercises,
                order_index: index,
                source_workout_id: workout.sourceWorkoutId,
            }));

            const { data: insertedWorkouts, error: workoutsError } = await supabaseClient
                .from('plan_workouts')
                .insert(workoutsToInsert)
                .select('*');

            if (workoutsError) {
                console.error('[Supabase] Error creating plan workouts:', workoutsError);
                throw workoutsError;
            }

            if (insertedWorkouts) {
                // Map temporary IDs to new UUIDs
                const idMap = new Map<string, string>();

                // Sort by order_index to match original array order
                const sortedInserted = [...insertedWorkouts].sort((a, b) => a.order_index - b.order_index);

                sortedInserted.forEach((row, index) => {
                    const originalWorkout = plan.workouts[index];
                    if (originalWorkout) {
                        idMap.set(originalWorkout.id, row.id);
                        finalWorkouts.push({
                            id: row.id,
                            name: row.name,
                            exercises: row.exercises || [],
                            sourceWorkoutId: row.source_workout_id,
                        });
                    }
                });

                // Crucial: Update the schedule_config in the DB if it contains original IDs
                if (plan.schedule) {
                    let updatedSchedule = JSON.parse(JSON.stringify(plan.schedule));
                    let needsUpdate = false;

                    if (updatedSchedule.rotation?.workoutOrder) {
                        updatedSchedule.rotation.workoutOrder = updatedSchedule.rotation.workoutOrder.map(
                            (id: string) => {
                                const newId = idMap.get(id);
                                if (newId) needsUpdate = true;
                                return newId || id;
                            }
                        );
                    }

                    if (updatedSchedule.weekly) {
                        Object.keys(updatedSchedule.weekly).forEach(day => {
                            const oldId = updatedSchedule.weekly[day];
                            if (oldId && idMap.has(oldId)) {
                                updatedSchedule.weekly[day] = idMap.get(oldId);
                                needsUpdate = true;
                            }
                        });
                    }

                    if (needsUpdate) {
                        await supabaseClient
                            .from('plans')
                            .update({ schedule_config: updatedSchedule })
                            .eq('id', newPlanId);
                    }
                }
            }
        }

        return { id: newPlanId, workouts: finalWorkouts };
    });
}

export async function updateUserPlan(userId: string, plan: UserPlan): Promise<void> {
    return withRetry(async () => {
        const { error } = await supabaseClient
            .from('plans')
            .update({
                name: plan.name,
                metadata: plan.metadata,
                schedule_type: plan.scheduleType,
                schedule_config: plan.schedule,
                source_id: plan.sourceId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', plan.id)
            .eq('user_id', userId);

        if (error) {
            console.error('[Supabase] Error updating plan:', error);
            throw error;
        }
    });
}

export async function deleteUserPlan(userId: string, planId: string): Promise<void> {
    return withRetry(async () => {
        // Workouts will be deleted automatically due to CASCADE
        const { error } = await supabaseClient
            .from('plans')
            .delete()
            .eq('id', planId)
            .eq('user_id', userId);

        if (error) {
            console.error('[Supabase] Error deleting plan:', error);
            throw error;
        }
    });
}

export async function setActivePlan(userId: string, planId: string | null): Promise<void> {
    return withRetry(async () => {
        // First, set all plans to inactive
        const { error: deactivateError } = await supabaseClient
            .from('plans')
            .update({ is_active: false })
            .eq('user_id', userId);

        if (deactivateError) {
            console.error('[Supabase] Error deactivating plans:', deactivateError);
            throw deactivateError;
        }

        // Then set the selected plan to active
        if (planId) {
            const { error } = await supabaseClient
                .from('plans')
                .update({ is_active: true })
                .eq('id', planId)
                .eq('user_id', userId);

            if (error) {
                console.error('[Supabase] Error setting active plan:', error);
                throw error;
            }
        }
    });
}

// ============================================================================
// ROTATION STATE (stored in plans table)
// ============================================================================

export interface RotationStateDB {
    workoutSequence: string[];
    currentIndex: number;
    lastAdvancedAt: number;
}

export async function updateRotationState(
    userId: string,
    planId: string,
    rotationState: RotationStateDB | null
): Promise<void> {
    return withRetry(async () => {
        const { error } = await supabaseClient
            .from('plans')
            .update({ rotation_state: rotationState })
            .eq('id', planId)
            .eq('user_id', userId);

        if (error) {
            console.error('[Supabase] Error updating rotation state:', error);
            throw error;
        }
    });
}

// ============================================================================
// WORKOUT TEMPLATES (standalone workout templates like "Push Day")
// ============================================================================

export interface WorkoutTemplateDB {
    id: string;
    name: string;
    exercises: { id: string; name: string; sets?: number }[];
    source?: 'premade' | 'custom' | 'library' | 'recommended';
    created_at: string;
    updated_at: string;
}

export async function fetchWorkoutTemplates(userId: string): Promise<WorkoutTemplateDB[]> {
    console.log('[Supabase] Fetching workout templates for user:', userId);

    return withGracefulRetry(
        async () => {
            const { data, error } = await supabaseClient
                .from('workout_templates')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            console.log('[Supabase] Successfully fetched', data?.length ?? 0, 'workout templates');

            return (data || []).map((row) => {
                // Validate and sanitize the data
                const exercises = Array.isArray(row.exercises) ? row.exercises : [];
                const sanitizedExercises = exercises.filter((ex: any) => {
                    // Filter out invalid exercise objects
                    if (!ex || typeof ex !== 'object') return false;
                    if (typeof ex.id !== 'string') return false;
                    return true;
                }).map((ex: any) => ({
                    id: String(ex.id),
                    name: String(ex.name || ''),
                    sets: typeof ex.sets === 'number' ? ex.sets : 3,
                }));

                return {
                    id: String(row.id),
                    name: String(row.name || 'Untitled'),
                    exercises: sanitizedExercises,
                    source: row.source,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                };
            });
        },
        [], // fallback to empty array
        'fetchWorkoutTemplates'
    );
}

export async function createWorkoutTemplate(
    userId: string,
    template: { name: string; exercises: { id: string; name: string; sets?: number }[]; source?: 'premade' | 'custom' | 'library' | 'recommended' }
): Promise<string> {
    return withRetry(async () => {
        const { data, error } = await supabaseClient
            .from('workout_templates')
            .insert({
                user_id: userId,
                name: template.name,
                exercises: template.exercises,
                source: template.source || 'custom',
            })
            .select('id')
            .single();

        if (error) {
            console.error('[Supabase] Error creating workout template:', error);
            throw error;
        }

        return data.id;
    });
}

export async function updateWorkoutTemplate(
    userId: string,
    templateId: string,
    updates: { name?: string; exercises?: { id: string; name: string; sets?: number }[] }
): Promise<void> {
    console.log('[Supabase] updateWorkoutTemplate called with:', {
        userId,
        templateId,
        updates: {
            name: updates.name,
            exerciseCount: updates.exercises?.length
        }
    });

    return withRetry(async () => {
        const { data, error } = await supabaseClient
            .from('workout_templates')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', templateId)
            .eq('user_id', userId)
            .select();

        if (error) {
            console.error('[Supabase] Error updating workout template:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            console.warn('[Supabase] updateWorkoutTemplate: No rows matched!', { templateId, userId });
        } else {
            console.log('[Supabase] updateWorkoutTemplate success:', {
                rowsUpdated: data.length,
                exercisesInDB: data[0]?.exercises?.length
            });
        }
    });
}

export async function deleteWorkoutTemplate(userId: string, templateId: string): Promise<void> {
    return withRetry(async () => {
        const { error } = await supabaseClient
            .from('workout_templates')
            .delete()
            .eq('id', templateId)
            .eq('user_id', userId);

        if (error) {
            console.error('[Supabase] Error deleting workout template:', error);
            throw error;
        }
    });
}

/**
 * Update an individual workout within a plan (stored in plan_workouts table)
 * This is the critical function for persisting workout edits within programs.
 */
export async function updatePlanWorkout(
    userId: string,
    workoutId: string,
    updates: { name?: string; exercises?: { id: string; name: string; sets?: number }[] }
): Promise<void> {
    console.log('[Supabase] updatePlanWorkout called with:', {
        userId,
        workoutId,
        updates: {
            name: updates.name,
            exerciseCount: updates.exercises?.length
        }
    });

    return withRetry(async () => {
        const { data, error, count } = await supabaseClient
            .from('plan_workouts')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', workoutId)
            .eq('user_id', userId)
            .select();

        if (error) {
            console.error('[Supabase] Error updating plan workout:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            console.warn('[Supabase] updatePlanWorkout: No rows matched!', { workoutId, userId });
        } else {
            console.log('[Supabase] updatePlanWorkout success:', {
                rowsUpdated: data.length,
                exercisesInDB: data[0]?.exercises?.length
            });
        }
    });
}

/**
 * Delete an individual workout from a plan (stored in plan_workouts table)
 */
export async function deletePlanWorkout(
    userId: string,
    workoutId: string
): Promise<void> {
    return withRetry(async () => {
        const { error } = await supabaseClient
            .from('plan_workouts')
            .delete()
            .eq('id', workoutId)
            .eq('user_id', userId);

        if (error) {
            console.error('[Supabase] Error deleting plan workout:', error);
            throw error;
        }
    });
}

// ============================================================================
// SCHEDULES
// ============================================================================

export interface ScheduleDataWeekly {
    monday: string | null;
    tuesday: string | null;
    wednesday: string | null;
    thursday: string | null;
    friday: string | null;
    saturday: string | null;
    sunday: string | null;
}

export interface RotatingDayDB {
    id: string;
    dayNumber: number;
    planId: string | null;
}

export interface ScheduleDataRotating {
    days: RotatingDayDB[];
    startDate: number | null;
}

export interface ScheduleDataFull {
    type: 'weekly' | 'rotating';
    weekly?: ScheduleDataWeekly;
    rotating?: ScheduleDataRotating;
}

export interface ScheduleDB {
    id: string;
    name: string;
    schedule_data: ScheduleDataFull | ScheduleDataWeekly;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export async function fetchSchedules(userId: string): Promise<ScheduleDB[]> {
    console.log('[Supabase] Fetching schedules for user:', userId);

    return withGracefulRetry(
        async () => {
            const { data, error } = await supabaseClient
                .from('schedules')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            console.log('[Supabase] Successfully fetched', data?.length ?? 0, 'schedules');

            return (data || []).map((row) => ({
                id: row.id,
                name: row.name,
                schedule_data: row.schedule_data || {},
                is_active: row.is_active || false,
                created_at: row.created_at,
                updated_at: row.updated_at,
            }));
        },
        [], // fallback to empty array
        'fetchSchedules'
    );
}

export async function createSchedule(
    userId: string,
    schedule: { name: string; scheduleData: ScheduleDataFull }
): Promise<string> {
    return withRetry(async () => {
        const { data, error } = await supabaseClient
            .from('schedules')
            .insert({
                user_id: userId,
                name: schedule.name,
                schedule_data: schedule.scheduleData,
            })
            .select('id')
            .single();

        if (error) {
            console.error('[Supabase] Error creating schedule:', error);
            throw error;
        }

        return data.id;
    });
}

export async function updateSchedule(
    userId: string,
    scheduleId: string,
    updates: { name?: string; scheduleData?: ScheduleDataFull; is_active?: boolean }
): Promise<void> {
    return withRetry(async () => {
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.scheduleData !== undefined) updateData.schedule_data = updates.scheduleData;
        if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

        const { error } = await supabaseClient
            .from('schedules')
            .update(updateData)
            .eq('id', scheduleId)
            .eq('user_id', userId);

        if (error) {
            console.error('[Supabase] Error updating schedule:', error);
            throw error;
        }
    });
}

export async function deleteSchedule(userId: string, scheduleId: string): Promise<void> {
    return withRetry(async () => {
        const { error } = await supabaseClient
            .from('schedules')
            .delete()
            .eq('id', scheduleId)
            .eq('user_id', userId);

        if (error) {
            console.error('[Supabase] Error deleting schedule:', error);
            throw error;
        }
    });
}

// ============================================================================
// CUSTOM EXERCISES
// ============================================================================

export interface CustomExerciseDB {
    id: string;
    name: string;
    exercise_type: string;
    created_at: string;
    updated_at: string;
}

export async function fetchCustomExercises(userId: string): Promise<CustomExerciseDB[]> {
    console.log('[Supabase] Fetching custom exercises for user:', userId);

    return withGracefulRetry(
        async () => {
            const { data, error } = await supabaseClient
                .from('custom_exercises')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            console.log('[Supabase] Successfully fetched', data?.length ?? 0, 'custom exercises');

            return (data || []).map((row) => ({
                id: row.id,
                name: row.name,
                exercise_type: row.exercise_type,
                created_at: row.created_at,
                updated_at: row.updated_at,
            }));
        },
        [],
        'fetchCustomExercises'
    );
}

export async function createCustomExercise(
    userId: string,
    exercise: { name: string; exerciseType: string }
): Promise<string> {
    return withRetry(async () => {
        const { data, error } = await supabaseClient
            .from('custom_exercises')
            .insert({
                user_id: userId,
                name: exercise.name,
                exercise_type: exercise.exerciseType,
            })
            .select('id')
            .single();

        if (error) {
            console.error('[Supabase] Error creating custom exercise:', error);
            throw error;
        }

        return data.id;
    });
}

export async function deleteCustomExercise(userId: string, exerciseId: string): Promise<void> {
    return withRetry(async () => {
        const { error } = await supabaseClient
            .from('custom_exercises')
            .delete()
            .eq('id', exerciseId)
            .eq('user_id', userId);

        if (error) {
            console.error('[Supabase] Error deleting custom exercise:', error);
            throw error;
        }
    });
}
