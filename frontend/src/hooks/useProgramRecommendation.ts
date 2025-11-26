import { useCallback } from 'react';
import { useProgramsStore } from '@/store/programsStore';
import type { PremadeProgram, TrainingGoal, ExperienceLevel, EquipmentType } from '@/types/premadePlan';

export interface QuizPreferences {
  goal: TrainingGoal | null;
  experienceLevel: ExperienceLevel | null;
  equipment: EquipmentType | null;
  daysPerWeek: number | null;
}

export const useProgramRecommendation = () => {
  const { premadePrograms } = useProgramsStore();

  const getRecommendations = useCallback((prefs: QuizPreferences): PremadeProgram[] => {
    if (!prefs.goal || !prefs.experienceLevel || !prefs.equipment || !prefs.daysPerWeek) {
      return [];
    }

    return premadePrograms.filter((program) => {
      const m = program.metadata;

      // 1. Strict match on Goal
      if (m.goal !== prefs.goal) return false;

      // 2. Strict match on Equipment (unless program requires LESS)
      // Simple hierarchy: bodyweight < minimal < dumbbells-only < full-gym
      const equipLevels = ['bodyweight', 'minimal', 'dumbbells-only', 'full-gym'];
      const userLevel = equipLevels.indexOf(prefs.equipment!);
      const progLevel = equipLevels.indexOf(m.equipment);
      
      if (progLevel > userLevel) return false;

      // 3. Relaxed match on Experience
      // If user is Advanced, they can see Intermediate. If Intermediate, can see Beginner.
      // But usually people want their exact level. Let's do exact match for now, 
      // or allow +/- 1 level if strict match fails (TODO).
      if (m.experienceLevel !== prefs.experienceLevel) return false;

      // 4. Relaxed match on Days (+/- 1 day)
      const diff = Math.abs(m.daysPerWeek - prefs.daysPerWeek!);
      if (diff > 1) return false;

      return true;
    });
  }, [premadePrograms]);

  return {
    getRecommendations,
  };
};
