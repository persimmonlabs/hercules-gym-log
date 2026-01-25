/**
 * useSemanticExerciseSearch
 * Exercise search with strict matching and relevance ranking.
 */
import { useMemo } from 'react';

import type { ExerciseCatalogItem } from '@/constants/exercises';
import { normalizeSearchText } from '@/utils/strings';

interface UseSemanticExerciseSearchOptions {
  limit?: number;
  excludeIds?: string[];
}

/**
 * Check if a field starts with a token (word-boundary aware).
 * e.g., "barbell row" starts with "row" at word boundary.
 */
const startsWithToken = (field: string, token: string): boolean => {
  if (field.startsWith(token)) return true;
  // Check for word boundary: space followed by token
  return field.includes(` ${token}`);
};

/**
 * Check if a field contains a token as a complete word or word prefix.
 * More strict than simple includes() to avoid partial matches like "r" in "barbell".
 */
const containsTokenStrict = (field: string, token: string): boolean => {
  // For very short tokens (1-2 chars), require word-start match
  if (token.length <= 2) {
    return field.startsWith(token) || field.includes(` ${token}`);
  }
  // For longer tokens, standard includes is fine
  return field.includes(token);
};

const scoreExercise = (
  exercise: ExerciseCatalogItem,
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
  const searchIndex = exercise.searchIndex;

  let score = 0;
  let hasDirectMatch = false;

  // Bonus for full phrase matching (prioritize "Chest Press" -> "Chest Press Machine")
  if (normalizedName === normalizedQuery) {
    score += 100; // Exact name match is king
    hasDirectMatch = true;
  } else if (normalizedName.startsWith(normalizedQuery)) {
    score += 60; // Starts with query is very strong
    hasDirectMatch = true;
  } else if (startsWithToken(normalizedName, normalizedQuery)) {
    score += 50; // Word in name starts with query
    hasDirectMatch = true;
  } else if (normalizedName.includes(normalizedQuery)) {
    score += 40; // Contains full query
    hasDirectMatch = true;
  }

  // Score each original token (not expanded synonyms)
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
      // Only match searchIndex for tokens 3+ chars to avoid noise
      score += 3;
    }
  }

  // If no direct match on the exercise name/attributes from original query,
  // require at least one synonym to match meaningfully
  if (!hasDirectMatch && score === 0) {
    return 0;
  }

  return score;
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

    const originalTokens = normalizedQuery.split(' ').filter(Boolean);
    const excluded = new Set(excludeIds);

    // Score using original tokens (synonyms are used for fallback matching, not primary)
    const scored = exercises
      .filter((exercise) => !excluded.has(exercise.id))
      .map((exercise) => ({ exercise, score: scoreExercise(exercise, originalTokens, normalizedQuery) }))
      .filter((entry) => entry.score > 0);

    // Sort by score descending, then alphabetically for ties
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.exercise.name.localeCompare(b.exercise.name);
    });

    return scored.slice(0, limit).map((entry) => entry.exercise);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises, query, limit, excludeKey]);
};
