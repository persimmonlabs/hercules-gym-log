import type { ExerciseType } from '@/types/exercise';

export interface ExerciseDisplayTagsOptions {
  maxTags?: number;
  absoluteMinWeight?: number;
  relativeMinFractionOfTop?: number;
}

interface ExerciseDisplayTagsInput {
  muscles: Record<string, number>;
  exerciseType: ExerciseType;
}

const DISPLAY_TAG_DEFINITIONS: Record<string, string[]> = {
  Chest: ['Upper Chest', 'Mid Chest', 'Lower Chest'],
  Lats: ['Lats'],
  Back: ['Mid Back', 'Upper Back', 'Lower Back'],
  Shoulders: ['Front Delts', 'Lateral Delts', 'Rear Delts'],
  Biceps: ['Biceps - Long Head', 'Biceps - Short Head', 'Brachialis'],
  Triceps: ['Triceps - Long Head', 'Triceps - Lateral Head', 'Triceps - Medial Head'],
  Forearms: ['Flexors', 'Extensors'],
  Quads: ['Quads'],
  Hamstrings: ['Hamstrings'],
  Glutes: ['Glutes'],
  Calves: ['Calves - Medial Head', 'Calves - Lateral Head', 'Soleus'],
  Adductors: ['Adductors'],
  Abductors: ['Abductors'],
  Abs: ['Upper Abs', 'Lower Abs'],
  Obliques: ['Obliques'],
};

export const getExerciseDisplayTags = (
  input: ExerciseDisplayTagsInput,
  options?: ExerciseDisplayTagsOptions
): string[] => {
  const maxTags = options?.maxTags ?? 3;
  const absoluteMinWeight = options?.absoluteMinWeight ?? 0.03;
  const relativeMinFractionOfTop = options?.relativeMinFractionOfTop ?? 0.25;

  const baseTags: string[] = input.exerciseType === 'cardio' ? ['Cardio'] : [];
  const remainingSlots = Math.max(0, maxTags - baseTags.length);
  if (remainingSlots === 0) return baseTags;

  const muscleWeights = input.muscles ?? {};

  const groupWeights = Object.entries(DISPLAY_TAG_DEFINITIONS)
    .map(([groupLabel, muscleKeys]) => {
      const total = muscleKeys.reduce((sum, key) => sum + (muscleWeights[key] ?? 0), 0);
      return { groupLabel, total };
    })
    .filter((g) => g.total > 0);

  if (groupWeights.length === 0) return baseTags;

  const topWeight = Math.max(...groupWeights.map((g) => g.total));

  const filteredGroups = groupWeights
    .filter((g) => g.total >= absoluteMinWeight)
    .filter((g) => g.total >= topWeight * relativeMinFractionOfTop)
    .sort((a, b) => b.total - a.total)
    .slice(0, remainingSlots)
    .map((g) => g.groupLabel);

  return [...baseTags, ...filteredGroups];
};

export const getExerciseDisplayTagText = (
  input: ExerciseDisplayTagsInput,
  options?: ExerciseDisplayTagsOptions
): string => {
  const tags = getExerciseDisplayTags(input, options);
  return tags.length > 0 ? tags.join(' · ') : '';
};
