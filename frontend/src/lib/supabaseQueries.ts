/**
 * Supabase Database Queries
 * Centralized functions for interacting with Supabase tables
 */

import { supabaseClient } from './supabaseClient';
import type { Workout } from '@/types/workout';
import type { UserPlan, PlanWorkout } from '@/types/premadePlan';

// ============================================================================
// WORKOUT SESSIONS
// ============================================================================

export async function fetchWorkoutSessions(userId: string): Promise<Workout[]> {
    const { data, error } = await supabaseClient
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

    if (error) {
        console.error('[Supabase] Error fetching workout sessions:', error);
        throw error;
    }

    // Transform from DB format to app format
    return (data || []).map((row) => ({
        id: row.id,
        planId: row.plan_id,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        duration: row.duration,
        exercises: row.exercises || [],
    }));
}

export async function createWorkoutSession(userId: string, workout: Workout): Promise<string> {
    const { data, error } = await supabaseClient
        .from('workout_sessions')
        .insert({
            user_id: userId,
            plan_id: workout.planId,
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
}

export async function updateWorkoutSession(userId: string, workout: Workout): Promise<void> {
    const { error } = await supabaseClient
        .from('workout_sessions')
        .update({
            plan_id: workout.planId,
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
}

export async function deleteWorkoutSession(userId: string, workoutId: string): Promise<void> {
    const { error } = await supabaseClient
        .from('workout_sessions')
        .delete()
        .eq('id', workoutId)
        .eq('user_id', userId);

    if (error) {
        console.error('[Supabase] Error deleting workout session:', error);
        throw error;
    }
}

// ============================================================================
// PLANS (User Programs)
// ============================================================================

export async function fetchUserPlans(userId: string): Promise<UserPlan[]> {
    const { data: plansData, error: plansError } = await supabaseClient
        .from('plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (plansError) {
        console.error('[Supabase] Error fetching plans:', plansError);
        throw plansError;
    }

    if (!plansData || plansData.length === 0) {
        return [];
    }

    // Fetch workouts for all plans
    const planIds = plansData.map((p) => p.id);
    const { data: workoutsData, error: workoutsError } = await supabaseClient
        .from('plan_workouts')
        .select('*')
        .in('plan_id', planIds)
        .order('order_index', { ascending: true });

    if (workoutsError) {
        console.error('[Supabase] Error fetching plan workouts:', workoutsError);
        throw workoutsError;
    }

    // Group workouts by plan_id
    const workoutsByPlan = (workoutsData || []).reduce((acc, workout) => {
        if (!acc[workout.plan_id]) {
            acc[workout.plan_id] = [];
        }
        acc[workout.plan_id].push({
            id: workout.id,
            name: workout.name,
            exercises: workout.exercises || [],
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
}

export async function createUserPlan(userId: string, plan: UserPlan): Promise<string> {
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

        const { error: workoutsError } = await supabaseClient
            .from('plan_workouts')
            .insert(workoutsToInsert);

        if (workoutsError) {
            console.error('[Supabase] Error creating plan workouts:', workoutsError);
            throw workoutsError;
        }
    }

    return newPlanId;
}

export async function updateUserPlan(userId: string, plan: UserPlan): Promise<void> {
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
}

export async function deleteUserPlan(userId: string, planId: string): Promise<void> {
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
}

export async function setActivePlan(userId: string, planId: string | null): Promise<void> {
    // First, set all plans to inactive
    await supabaseClient
        .from('plans')
        .update({ is_active: false })
        .eq('user_id', userId);

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
    const { error } = await supabaseClient
        .from('plans')
        .update({ rotation_state: rotationState })
        .eq('id', planId)
        .eq('user_id', userId);

    if (error) {
        console.error('[Supabase] Error updating rotation state:', error);
        throw error;
    }
}

// ============================================================================
// WORKOUT TEMPLATES (standalone workout templates like "Push Day")
// ============================================================================

export interface WorkoutTemplateDB {
    id: string;
    name: string;
    exercises: Array<{ id: string; name: string; sets?: number }>;
    created_at: string;
    updated_at: string;
}

export async function fetchWorkoutTemplates(userId: string): Promise<WorkoutTemplateDB[]> {
    const { data, error } = await supabaseClient
        .from('workout_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Supabase] Error fetching workout templates:', error);
        throw error;
    }

    return (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        exercises: row.exercises || [],
        created_at: row.created_at,
        updated_at: row.updated_at,
    }));
}

export async function createWorkoutTemplate(
    userId: string,
    template: { name: string; exercises: Array<{ id: string; name: string; sets?: number }> }
): Promise<string> {
    const { data, error } = await supabaseClient
        .from('workout_templates')
        .insert({
            user_id: userId,
            name: template.name,
            exercises: template.exercises,
        })
        .select('id')
        .single();

    if (error) {
        console.error('[Supabase] Error creating workout template:', error);
        throw error;
    }

    return data.id;
}

export async function updateWorkoutTemplate(
    userId: string,
    templateId: string,
    updates: { name?: string; exercises?: Array<{ id: string; name: string; sets?: number }> }
): Promise<void> {
    const { error } = await supabaseClient
        .from('workout_templates')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .eq('user_id', userId);

    if (error) {
        console.error('[Supabase] Error updating workout template:', error);
        throw error;
    }
}

export async function deleteWorkoutTemplate(userId: string, templateId: string): Promise<void> {
    const { error } = await supabaseClient
        .from('workout_templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', userId);

    if (error) {
        console.error('[Supabase] Error deleting workout template:', error);
        throw error;
    }
}

// ============================================================================
// SCHEDULES
// ============================================================================

export interface ScheduleDB {
    id: string;
    name: string;
    schedule_data: {
        monday: string | null;
        tuesday: string | null;
        wednesday: string | null;
        thursday: string | null;
        friday: string | null;
        saturday: string | null;
        sunday: string | null;
    };
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export async function fetchSchedules(userId: string): Promise<ScheduleDB[]> {
    const { data, error } = await supabaseClient
        .from('schedules')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Supabase] Error fetching schedules:', error);
        throw error;
    }

    return (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        schedule_data: row.schedule_data || {},
        is_active: row.is_active || false,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }));
}

export async function createSchedule(
    userId: string,
    schedule: { name: string; weekdays: ScheduleDB['schedule_data'] }
): Promise<string> {
    const { data, error } = await supabaseClient
        .from('schedules')
        .insert({
            user_id: userId,
            name: schedule.name,
            schedule_data: schedule.weekdays,
        })
        .select('id')
        .single();

    if (error) {
        console.error('[Supabase] Error creating schedule:', error);
        throw error;
    }

    return data.id;
}

export async function updateSchedule(
    userId: string,
    scheduleId: string,
    updates: { name?: string; weekdays?: ScheduleDB['schedule_data']; is_active?: boolean }
): Promise<void> {
    const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.weekdays !== undefined) updateData.schedule_data = updates.weekdays;
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
}

export async function deleteSchedule(userId: string, scheduleId: string): Promise<void> {
    const { error } = await supabaseClient
        .from('schedules')
        .delete()
        .eq('id', scheduleId)
        .eq('user_id', userId);

    if (error) {
        console.error('[Supabase] Error deleting schedule:', error);
        throw error;
    }
}
