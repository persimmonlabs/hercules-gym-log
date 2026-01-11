/**
 * useSemanticExerciseSearch
 * Lightweight semantic-ish lookup with synonyms + fuzzy scoring.
 */
import { useMemo } from 'react';

import type { ExerciseCatalogItem } from '@/constants/exercises';
import { normalizeSearchText } from '@/utils/strings';

interface UseSemanticExerciseSearchOptions {
  limit?: number;
  excludeIds?: string[];
}

const TOKEN_SYNONYMS: Record<string, string[]> = {
  chest: ['pec', 'pectorals', 'push', 'bench'],
  pec: ['chest'],
  back: ['pull', 'lats', 'posterior', 'lat'],
  legs: ['lower', 'quads', 'glutes', 'squat', 'hamstrings', 'calves'],
  shoulders: ['delts', 'press', 'overhead', 'military'],
  hamstrings: ['posterior', 'hinge', 'legs'],
  glutes: ['posterior', 'hips', 'butt', 'legs'],
  full: ['total', 'compound'],
  press: ['push', 'bench', 'overhead'],
  row: ['pull', 'cable', 'back'],
  squat: ['legs', 'quads', 'lower'],
  deadlift: ['hinge', 'posterior', 'dl', 'back'],
  dl: ['deadlift'],
  hinge: ['posterior', 'deadlift'],
  lunge: ['single', 'split', 'legs'],
  carry: ['farmer', 'loaded'],
  rotation: ['anti-rotation', 'twist', 'core'],
  olympic: ['power', 'explosive', 'clean', 'snatch'],
  arms: ['biceps', 'triceps', 'curls', 'extensions'],
  biceps: ['arms', 'curl'],
  triceps: ['arms', 'extension', 'pressdown'],
  bike: ['cycling', 'stationary', 'bicycle', 'cardio'],
  cycling: ['bike', 'cardio'],
  run: ['running', 'jog', 'treadmill', 'cardio', 'sprint'],
  walk: ['walking', 'cardio', 'treadmill'],
  abs: ['core', 'abdominal', 'obliques', 'stomach'],
  core: ['abs', 'abdominal', 'obliques', 'stomach', 'plank'],
  pullup: ['chinup', 'back', 'lats', 'pull'],
  chinup: ['pullup', 'back', 'lats', 'pull'],
  bench: ['chest', 'press'],
  fly: ['pec', 'chest'],
  curl: ['bicep', 'arms'],
  extension: ['tricep', 'leg', 'arms'],
  cardio: ['run', 'walk', 'bike', 'cycling', 'elliptical', 'stair', 'rowing', 'hiit'],
  weight: ['dumbbell', 'barbell', 'kettlebell', 'db', 'bb', 'kb'],
  db: ['dumbbell', 'weight'],
  bb: ['barbell', 'weight'],
  kb: ['kettlebell', 'weight'],
  cable: ['pulley', 'machine'],
  machine: ['cable', 'lever', 'selectorized'],
  trap: ['traps', 'shrug', 'neck', 'back'],
  lat: ['back', 'pull', 'pullup', 'latissimus'],
  calf: ['calves', 'legs', 'lower'],
  hiit: ['cardio', 'intervals'],
  plyo: ['plyometric', 'jump', 'explosive'],
};

const expandTokens = (tokens: string[]): string[] => {
  const expanded = new Set(tokens);

  tokens.forEach((token) => {
    const synonyms = TOKEN_SYNONYMS[token];

    if (synonyms) {
      synonyms.forEach((synonym) => expanded.add(synonym));
    }
  });

  return Array.from(expanded);
};

const scoreExercise = (
  exercise: ExerciseCatalogItem,
  tokens: string[],
  normalizedQuery: string,
): number => {
  if (tokens.length === 0) {
    return 0;
  }

  const normalizedName = normalizeSearchText(exercise.name);
  const muscleGroup = normalizeSearchText(exercise.muscleGroup);
  const filterMuscleGroup = normalizeSearchText(exercise.filterMuscleGroup);
  const secondaryMuscleGroups = exercise.secondaryMuscleGroups.map(normalizeSearchText);
  const equipment = exercise.equipment.map(normalizeSearchText);
  const movementPattern = normalizeSearchText(exercise.movementPattern);
  const searchIndex = exercise.searchIndex;

  let score = 0;

  // Bonus for full phrase matching (prioritize "Chest Press" -> "Chest Press Machine")
  if (normalizedName === normalizedQuery) {
    score += 50; // Exact name match is king
  } else if (normalizedName.startsWith(normalizedQuery)) {
    score += 30; // Starts with query is very strong
  } else if (normalizedName.includes(normalizedQuery)) {
    score += 20; // Contains full query is strong
  }

  return tokens.reduce((acc, token) => {
    if (!token) {
      return acc;
    }

    if (normalizedName === token) {
      return acc + 10;
    }

    if (normalizedName.startsWith(token)) {
      return acc + 7;
    }

    if (normalizedName.includes(token)) {
      return acc + 6;
    }

    if (muscleGroup.includes(token) || filterMuscleGroup.includes(token)) {
      return acc + 5;
    }

    if (secondaryMuscleGroups.some((target) => target.includes(token))) {
      return acc + 4;
    }

    if (equipment.some((item) => item.includes(token))) {
      return acc + 4;
    }

    if (movementPattern.includes(token)) {
      return acc + 3;
    }

    if (token === 'compound' && exercise.isCompound) {
      return acc + 5;
    }

    if (token === 'bodyweight' && exercise.isBodyweight) {
      return acc + 5;
    }

    if (searchIndex.includes(token)) {
      return acc + 2;
    }

    return acc;
  }, score);
};

export const useSemanticExerciseSearch = (
  query: string,
  exercises: ExerciseCatalogItem[],
  options?: UseSemanticExerciseSearchOptions,
): ExerciseCatalogItem[] => {
  const { limit = 6, excludeIds = [] } = options ?? {};

  const excludeKey = useMemo(() => excludeIds.slice().sort().join('|'), [excludeIds]);

  return useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);

    if (!normalizedQuery) {
      return [];
    }

    const tokens = expandTokens(normalizedQuery.split(' ').filter(Boolean));
    const excluded = new Set(excludeIds);

    return exercises
      .filter((exercise) => !excluded.has(exercise.id))
      .map((exercise) => ({ exercise, score: scoreExercise(exercise, tokens, normalizedQuery) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.exercise);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises, query, limit, excludeKey]);
};
