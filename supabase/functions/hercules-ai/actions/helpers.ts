import type { SupabaseClient } from '@supabase/supabase-js';
import { EXERCISE_CATALOG } from '../stats.ts';

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

export const getString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const getNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getArray = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
};

export const ensurePlanId = async (
  supabase: SupabaseClient,
  userId: string,
  planId: unknown
): Promise<string | null> => {
  const candidate = getString(planId);
  if (!candidate) return null;

  const { data } = await supabase
    .from('plans')
    .select('id')
    .eq('id', candidate)
    .eq('user_id', userId)
    .maybeSingle();

  return data?.id ?? null;
};

export const normalizeExercises = (value: unknown): Record<string, unknown>[] => {
  return getArray(value).filter(isRecord);
};

export const normalizeScheduleData = (value: unknown): Record<string, unknown> | null => {
  if (!isRecord(value)) return null;
  const type = getString(value.type);
  if (type !== 'weekly' && type !== 'rotating') return null;
  return value;
};

/**
 * Returns true if the content inside parentheses looks like an instruction or
 * annotation rather than a legitimate exercise name qualifier.
 * e.g. "3 sets of 10 reps" → true, "30 seconds each side" → true,
 *      "Bodyweight" → false, "EZ Bar" → false
 */
const isInstructionAnnotation = (content: string): boolean => {
  const lower = content.toLowerCase().trim();
  return (
    // Set/rep patterns: "3 sets", "10 reps", "3x10", "3 × 10", "sets of"
    /\d+\s*(sets?|reps?|rounds?)\b/i.test(lower) ||
    /\bsets?\s*(of|x)\s*\d+/i.test(lower) ||
    /\d+\s*[x×]\s*\d+/i.test(lower) ||
    // Duration patterns: "30 seconds", "60 sec", "2 minutes", "30s", "1 min"
    /\d+\s*(seconds?|sec|s|minutes?|min|m)\b/i.test(lower) ||
    // Per-side/per-limb patterns: "each side", "per side", "per leg", "per arm"
    /\b(each|per)\s+(side|leg|arm|hand)\b/i.test(lower) ||
    // Exercise type annotations the AI sometimes appends (never part of canonical names)
    /^(bodyweight|weight|assisted|cardio|duration|reps.only)$/i.test(lower) ||
    // Standalone instruction words
    /^(optional|superset|dropset|drop set|warmup|warm-up|burnout|to failure|amrap|emom)$/i.test(lower) ||
    // Source annotations (existing patterns, kept for completeness)
    /\bfrom existing\b/i.test(lower) ||
    /^existing\b/i.test(lower) ||
    /\bfrom\s+\w/i.test(lower) ||
    /^new$/i.test(lower) ||
    /^keep$/i.test(lower)
  );
};

/**
 * Strips parenthetical annotations the AI sometimes appends to exercise names.
 * Removes parenthetical content that looks like instructions, annotations,
 * or exercise type labels (e.g. "(Bodyweight)", "(Weight)").
 *
 * e.g. "Bench Press (3 sets of 10 reps)" → "Bench Press"
 *      "Plank (30 seconds each side)" → "Plank"
 *      "Cable Fly (from existing Push Day)" → "Cable Fly"
 *      "Dips (Bodyweight)" → "Dips" (type annotation stripped)
 */
export const stripExerciseAnnotations = (name: string): string => {
  // Match all trailing parenthetical groups and strip ones that are instructions
  return name
    .replace(/\s*\(([^)]*)\)/g, (_match, content: string) => {
      return isInstructionAnnotation(content) ? '' : _match;
    })
    .trim();
};

/**
 * Resolves an exercise name to { id, name } from EXERCISE_CATALOG.
 * Uses exact match first, then fuzzy (contains) match.
 * Returns null if no match found.
 */
export const resolveExerciseByName = (exerciseName: string): { id: string; name: string } | null => {
  if (!exerciseName || exerciseName.trim().length < 3) return null;
  // CRITICAL: Strip AI annotations before matching
  const cleaned = stripExerciseAnnotations(exerciseName);
  if (cleaned.length < 3) return null;
  const searchName = cleaned.toLowerCase();

  // 1. Exact match
  const exact = EXERCISE_CATALOG.find(e => e.name.toLowerCase() === searchName);
  if (exact) return { id: exact.id, name: exact.name };

  // 2. Fuzzy contains match (catalog name includes search or vice-versa)
  const fuzzy = EXERCISE_CATALOG.find(e => {
    const catalogName = e.name.toLowerCase();
    return catalogName.includes(searchName) || searchName.includes(catalogName);
  });
  if (fuzzy) return { id: fuzzy.id, name: fuzzy.name };

  // 3. Word overlap — at least 2 significant words must match
  const searchWords = searchName.split(/\s+/).filter(w => w.length > 2);
  if (searchWords.length >= 2) {
    const wordMatch = EXERCISE_CATALOG.find(e => {
      const catalogWords = e.name.toLowerCase().split(/\s+/);
      const matchCount = searchWords.filter(sw => catalogWords.some(cw => cw.includes(sw) || sw.includes(cw))).length;
      return matchCount >= 2;
    });
    if (wordMatch) return { id: wordMatch.id, name: wordMatch.name };
  }

  return null;
};

/**
 * Check if a reference is a rest day (null in schedule).
 */
export const isRestDayRef = (ref: unknown): boolean => {
  if (ref === null || ref === undefined) return true;
  if (typeof ref !== 'string') return true;
  const lower = ref.trim().toLowerCase();
  return (
    lower === '' ||
    lower === 'rest' ||
    lower === 'rest day' ||
    lower === 'restday' ||
    lower === 'off' ||
    lower === 'recovery' ||
    lower === 'recovery day' ||
    lower === 'off day'
  );
};

/**
 * Build a lookup function that resolves workout references (name or ID) to real IDs.
 * Loads all workout_templates and plan_workouts upfront for efficiency.
 */
export const buildWorkoutLookup = async (
  supabase: SupabaseClient,
  userId: string
): Promise<(ref: string) => string | null> => {
  const [templatesResult, planWorkoutsResult] = await Promise.all([
    supabase.from('workout_templates').select('id, name').eq('user_id', userId),
    supabase.from('plan_workouts').select('id, name').eq('user_id', userId),
  ]);

  const allWorkouts: { id: string; name: string }[] = [];
  if (templatesResult.data) allWorkouts.push(...(templatesResult.data as { id: string; name: string }[]));
  if (planWorkoutsResult.data) allWorkouts.push(...(planWorkoutsResult.data as { id: string; name: string }[]));

  return (ref: string): string | null => {
    if (!ref || ref.trim().length === 0) return null;
    const trimmed = ref.trim();

    // 1. Exact ID match
    const byId = allWorkouts.find((w) => w.id === trimmed);
    if (byId) return byId.id;

    // 2. Exact name match (case-insensitive)
    const byName = allWorkouts.find((w) => w.name.toLowerCase() === trimmed.toLowerCase());
    if (byName) return byName.id;

    // 3. Fuzzy (contains) match
    const fuzzy = allWorkouts.find(
      (w) =>
        w.name.toLowerCase().includes(trimmed.toLowerCase()) ||
        trimmed.toLowerCase().includes(w.name.toLowerCase())
    );
    if (fuzzy) return fuzzy.id;

    return null;
  };
};

/**
 * Resolve a plan reference (name or ID) to its plan ID.
 */
export const resolvePlanRef = async (
  supabase: SupabaseClient,
  userId: string,
  ref: string
): Promise<string | null> => {
  if (!ref || ref.trim().length === 0) return null;
  const trimmed = ref.trim();

  // 1. Exact ID match
  const { data: planById } = await supabase
    .from('plans')
    .select('id')
    .eq('id', trimmed)
    .eq('user_id', userId)
    .maybeSingle();
  if (planById) return planById.id as string;

  // 2. Name match (case-insensitive)
  const { data: plans } = await supabase
    .from('plans')
    .select('id, name')
    .eq('user_id', userId);

  if (plans) {
    const exact = plans.find((p) => (p.name as string).toLowerCase() === trimmed.toLowerCase());
    if (exact) return exact.id as string;

    const fuzzy = plans.find(
      (p) =>
        (p.name as string).toLowerCase().includes(trimmed.toLowerCase()) ||
        trimmed.toLowerCase().includes((p.name as string).toLowerCase())
    );
    if (fuzzy) return fuzzy.id as string;
  }

  return null;
};

export const updateScheduleIds = (
  schedule: Record<string, unknown>,
  idMap: Map<string, string>
): { schedule: Record<string, unknown>; updated: boolean } => {
  let updated = false;
  const nextSchedule: Record<string, unknown> = { ...schedule };

  if (isRecord(nextSchedule.weekly)) {
    const weekly = { ...nextSchedule.weekly } as Record<string, unknown>;
    Object.keys(weekly).forEach((day) => {
      const workoutId = weekly[day];
      if (typeof workoutId === 'string' && idMap.has(workoutId)) {
        weekly[day] = idMap.get(workoutId) ?? workoutId;
        updated = true;
      }
    });
    nextSchedule.weekly = weekly;
  }

  if (isRecord(nextSchedule.rotation) && Array.isArray(nextSchedule.rotation.workoutOrder)) {
    const rotation = { ...nextSchedule.rotation } as Record<string, unknown>;
    rotation.workoutOrder = (rotation.workoutOrder as unknown[]).map((id) => {
      if (typeof id === 'string' && idMap.has(id)) {
        updated = true;
        return idMap.get(id) ?? id;
      }
      return id;
    });
    nextSchedule.rotation = rotation;
  }

  return { schedule: nextSchedule, updated };
};
