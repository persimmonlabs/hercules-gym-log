import type { SupabaseClient } from '@supabase/supabase-js';

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
