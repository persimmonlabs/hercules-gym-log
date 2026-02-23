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
 * Resolves an exercise name to { id, name } from EXERCISE_CATALOG.
 * Uses exact match first, then fuzzy (contains) match.
 * Returns null if no match found.
 */
export const resolveExerciseByName = (exerciseName: string): { id: string; name: string } | null => {
  if (!exerciseName || exerciseName.trim().length < 3) return null;
  const searchName = exerciseName.trim().toLowerCase();

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
