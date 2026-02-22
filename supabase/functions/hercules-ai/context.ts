import type { SupabaseClient } from '@supabase/supabase-js';

export interface HerculesAIContext {
  profile: Record<string, unknown> | null;
  aiProfile: Record<string, unknown> | null;
  workoutSessions: Record<string, unknown>[];
  plans: Record<string, unknown>[];
  planWorkouts: Record<string, unknown>[];
  workoutTemplates: Record<string, unknown>[];
  schedules: Record<string, unknown>[];
  customExercises: Record<string, unknown>[];
  generatedAt: string;
}

const safeArray = (data: unknown[] | null | undefined): Record<string, unknown>[] => {
  if (!Array.isArray(data)) return [];
  return data as Record<string, unknown>[];
};

export const buildUserContext = async (
  supabase: SupabaseClient,
  userId: string
): Promise<HerculesAIContext> => {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, first_name, height_feet, height_inches, weight_lbs, is_pro, date_of_birth, gender, experience_level, primary_goal, available_equipment, training_days_per_week, weight_unit, distance_unit, size_unit, weekly_cardio_time_goal, weekly_cardio_distance_goal')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.warn('[HerculesAI] Profile fetch failed', profileError.message);
  }

  const { data: sessionsData, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select('id, name, date, start_time, end_time, duration, exercises')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(10);

  if (sessionsError) {
    console.warn('[HerculesAI] Workout sessions fetch failed', sessionsError.message);
  }

  const { data: aiProfileData, error: aiProfileError } = await supabase
    .from('ai_profile')
    .select('goals, experience_level, equipment, time_availability, injuries, units, preferences')
    .eq('user_id', userId)
    .maybeSingle();

  if (aiProfileError) {
    console.warn('[HerculesAI] AI profile fetch failed', aiProfileError.message);
  }

  const { data: plansData, error: plansError } = await supabase
    .from('plans')
    .select('id, name, schedule_type, schedule_config, is_active, rotation_state, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (plansError) {
    console.warn('[HerculesAI] Plans fetch failed', plansError.message);
  }

  const planIds = (plansData || []).map((plan) => plan.id as string);
  let planWorkoutsData: Record<string, unknown>[] = [];

  if (planIds.length > 0) {
    const { data: workoutsData, error: workoutsError } = await supabase
      .from('plan_workouts')
      .select('id, plan_id, name, exercises, order_index')
      .in('plan_id', planIds)
      .order('order_index', { ascending: true });

    if (workoutsError) {
      console.warn('[HerculesAI] Plan workouts fetch failed', workoutsError.message);
    } else {
      planWorkoutsData = safeArray(workoutsData);
    }
  }

  const { data: templatesData, error: templatesError } = await supabase
    .from('workout_templates')
    .select('id, name, exercises, source, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (templatesError) {
    console.warn('[HerculesAI] Workout templates fetch failed', templatesError.message);
  }

  const { data: schedulesData, error: schedulesError } = await supabase
    .from('schedules')
    .select('id, name, schedule_data, is_active, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (schedulesError) {
    console.warn('[HerculesAI] Schedules fetch failed', schedulesError.message);
  }

  const { data: customExercisesData, error: customExercisesError } = await supabase
    .from('custom_exercises')
    .select('id, name, exercise_type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (customExercisesError) {
    console.warn('[HerculesAI] Custom exercises fetch failed', customExercisesError.message);
  }

  return {
    profile: profileData ?? null,
    aiProfile: aiProfileData ?? null,
    workoutSessions: safeArray(sessionsData),
    plans: safeArray(plansData),
    planWorkouts: planWorkoutsData,
    workoutTemplates: safeArray(templatesData),
    schedules: safeArray(schedulesData),
    customExercises: safeArray(customExercisesData),
    generatedAt: new Date().toISOString(),
  };
};
