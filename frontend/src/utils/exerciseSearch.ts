/**
 * exerciseSearch
 * Unified exercise search utility with fuzzy matching, synonym expansion, and relevance ranking.
 * Industry-standard search that ranks close matches first.
 */

import type { Exercise, ExerciseCatalogItem } from '@/types/exercise';
import { normalizeSearchText } from '@/utils/strings';

type SearchableExercise = Exercise | ExerciseCatalogItem;

interface SearchOptions {
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

/**
 * Expands search tokens with synonyms for broader matching.
 */
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

/**
 * Calculates a relevance score for an exercise based on search tokens.
 * Higher scores = better matches.
 */
const scoreExercise = <T extends SearchableExercise>(
  exercise: T,
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
  const searchIndex = 'searchIndex' in exercise ? exercise.searchIndex : '';

  let score = 0;

  // Bonus for full phrase matching (prioritize exact and prefix matches)
  if (normalizedName === normalizedQuery) {
    score += 50; // Exact name match is king
  } else if (normalizedName.startsWith(normalizedQuery)) {
    score += 30; // Starts with query is very strong
  } else if (normalizedName.includes(normalizedQuery)) {
    score += 20; // Contains full query is strong
  }

  // Token-based scoring
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

/**
 * Searches and ranks exercises by relevance to the query.
 * Returns exercises sorted by score (highest first).
 * 
 * @param query - The search query string
 * @param exercises - Array of exercises to search through
 * @param options - Optional limit and exclude IDs
 * @returns Sorted array of matching exercises
 */
export const searchExercises = <T extends SearchableExercise>(
  query: string,
  exercises: T[],
  options?: SearchOptions,
): T[] => {
  const { limit, excludeIds = [] } = options ?? {};
  const normalizedQuery = normalizeSearchText(query);

  // If no query, return all exercises (optionally limited) sorted alphabetically
  if (!normalizedQuery) {
    const filtered = excludeIds.length > 0
      ? exercises.filter((e) => !excludeIds.includes(e.id))
      : exercises;
    const sorted = filtered.sort((a, b) => a.name.localeCompare(b.name));
    return limit ? sorted.slice(0, limit) : sorted;
  }

  const tokens = expandTokens(normalizedQuery.split(' ').filter(Boolean));
  const excluded = new Set(excludeIds);

  const scored = exercises
    .filter((exercise) => !excluded.has(exercise.id))
    .map((exercise) => ({ exercise, score: scoreExercise(exercise, tokens, normalizedQuery) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      // Primary: sort by score descending
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Secondary: alphabetical for same scores
      return a.exercise.name.localeCompare(b.exercise.name);
    });

  const results = scored.map((entry) => entry.exercise);
  return limit ? results.slice(0, limit) : results;
};

/**
 * Quick check if an exercise matches a search query (for filtering).
 * Returns true if the exercise has any relevance to the query.
 */
export const exerciseMatchesQuery = <T extends SearchableExercise>(
  exercise: T,
  query: string,
): boolean => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return true;
  }

  const tokens = expandTokens(normalizedQuery.split(' ').filter(Boolean));
  return scoreExercise(exercise, tokens, normalizedQuery) > 0;
};
