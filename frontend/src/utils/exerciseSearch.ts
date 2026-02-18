/**
 * exerciseSearch
 * Unified exercise search utility with strict matching and relevance ranking.
 */

import type { Exercise, ExerciseCatalogItem } from '@/types/exercise';
import { normalizeSearchText } from '@/utils/strings';

type SearchableExercise = Exercise | ExerciseCatalogItem;

interface SearchOptions {
  limit?: number;
  excludeIds?: string[];
}

/**
 * Synonym map: maps common search terms to related muscle/body part terms.
 * When a user searches "arms", we also match against biceps, triceps, forearms, etc.
 */
const SEARCH_SYNONYMS: Record<string, string[]> = {
  arms: ['biceps', 'triceps', 'forearms', 'forearm', 'bicep', 'tricep', 'curl', 'arm'],
  legs: ['quads', 'quadriceps', 'hamstrings', 'hamstring', 'glutes', 'glute', 'calves', 'calf', 'leg'],
  core: ['abs', 'abdominals', 'obliques', 'oblique', 'abdominal', 'plank', 'crunch'],
  abs: ['abdominals', 'abdominal', 'obliques', 'oblique', 'core', 'crunch', 'plank'],
  back: ['lats', 'latissimus', 'rhomboids', 'trapezius', 'traps', 'erector', 'row', 'pull'],
  chest: ['pectorals', 'pectoral', 'pecs', 'bench', 'press', 'fly'],
  shoulders: ['deltoids', 'deltoid', 'delts', 'delt', 'shoulder', 'lateral raise', 'overhead'],
  shoulder: ['deltoids', 'deltoid', 'delts', 'delt', 'shoulders', 'lateral raise', 'overhead'],
  glutes: ['glute', 'gluteus', 'hip thrust', 'hip', 'butt'],
  calves: ['calf', 'gastrocnemius', 'soleus'],
  push: ['chest', 'shoulders', 'triceps', 'bench', 'press'],
  pull: ['back', 'biceps', 'row', 'pulldown', 'pullup'],
};

const expandTokensWithSynonyms = (tokens: string[]): string[] => {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const synonyms = SEARCH_SYNONYMS[token];
    if (synonyms) {
      for (const syn of synonyms) {
        expanded.add(syn);
      }
    }
  }
  return Array.from(expanded);
};

/**
 * Check if a field starts with a token (word-boundary aware).
 * e.g., "barbell row" starts with "row" at word boundary.
 */
const startsWithToken = (field: string, token: string): boolean => {
  if (field.startsWith(token)) return true;
  return field.includes(` ${token}`);
};

/**
 * Check if a field contains a token as a complete word or word prefix.
 * More strict than simple includes() to avoid partial matches like "r" in "barbell".
 */
const containsTokenStrict = (field: string, token: string): boolean => {
  if (token.length <= 2) {
    return field.startsWith(token) || field.includes(` ${token}`);
  }
  return field.includes(token);
};

/**
 * Calculates a relevance score for an exercise based on search tokens.
 * Higher scores = better matches. Uses strict matching to avoid noise.
 */
const scoreExercise = <T extends SearchableExercise>(
  exercise: T,
  originalTokens: string[],
  normalizedQuery: string,
): number => {
  if (originalTokens.length === 0) {
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
  let hasDirectMatch = false;

  // Bonus for full phrase matching (prioritize exact and prefix matches)
  if (normalizedName === normalizedQuery) {
    score += 100;
    hasDirectMatch = true;
  } else if (normalizedName.startsWith(normalizedQuery)) {
    score += 60;
    hasDirectMatch = true;
  } else if (startsWithToken(normalizedName, normalizedQuery)) {
    score += 50;
    hasDirectMatch = true;
  } else if (normalizedName.includes(normalizedQuery)) {
    score += 40;
    hasDirectMatch = true;
  }

  // Token-based scoring using original tokens
  for (const token of originalTokens) {
    if (!token) continue;

    if (normalizedName === token) {
      score += 25;
      hasDirectMatch = true;
    } else if (normalizedName.startsWith(token)) {
      score += 20;
      hasDirectMatch = true;
    } else if (startsWithToken(normalizedName, token)) {
      score += 18;
      hasDirectMatch = true;
    } else if (containsTokenStrict(normalizedName, token)) {
      score += 15;
      hasDirectMatch = true;
    } else if (containsTokenStrict(muscleGroup, token) || containsTokenStrict(filterMuscleGroup, token)) {
      score += 8;
    } else if (secondaryMuscleGroups.some((target) => containsTokenStrict(target, token))) {
      score += 6;
    } else if (equipment.some((item) => containsTokenStrict(item, token))) {
      score += 6;
    } else if (containsTokenStrict(movementPattern, token)) {
      score += 5;
    } else if (token === 'compound' && exercise.isCompound) {
      score += 8;
    } else if (token === 'bodyweight' && exercise.isBodyweight) {
      score += 8;
    } else if (token.length >= 3 && containsTokenStrict(searchIndex, token)) {
      score += 3;
    }
  }

  // Synonym expansion: check expanded tokens against muscle groups and searchIndex
  const expandedTokens = expandTokensWithSynonyms(originalTokens);
  if (expandedTokens.length > originalTokens.length) {
    const synonymOnlyTokens = expandedTokens.filter(t => !originalTokens.includes(t));
    for (const syn of synonymOnlyTokens) {
      if (containsTokenStrict(muscleGroup, syn) || containsTokenStrict(filterMuscleGroup, syn)) {
        score += 6;
      } else if (secondaryMuscleGroups.some((target) => containsTokenStrict(target, syn))) {
        score += 4;
      } else if (containsTokenStrict(normalizedName, syn)) {
        score += 5;
      } else if (syn.length >= 3 && containsTokenStrict(searchIndex, syn)) {
        score += 2;
      }
    }
  }

  if (!hasDirectMatch && score === 0) {
    return 0;
  }

  return score;
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

  const originalTokens = normalizedQuery.split(' ').filter(Boolean);
  const excluded = new Set(excludeIds);

  const scored = exercises
    .filter((exercise) => !excluded.has(exercise.id))
    .map((exercise) => ({ exercise, score: scoreExercise(exercise, originalTokens, normalizedQuery) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
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

  const originalTokens = normalizedQuery.split(' ').filter(Boolean);
  return scoreExercise(exercise, originalTokens, normalizedQuery) > 0;
};
