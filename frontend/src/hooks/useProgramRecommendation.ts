import { useCallback } from 'react';
import { useProgramsStore } from '@/store/programsStore';
import type { PremadeProgram, PremadeWorkout, TrainingGoal, ExperienceLevel, EquipmentType } from '@/types/premadePlan';

export interface QuizPreferences {
  goal: TrainingGoal | null;
  experienceLevel: ExperienceLevel | null;
  equipment: EquipmentType | null;
  daysPerWeek: number | null;
}

export const useProgramRecommendation = () => {
  const { premadePrograms, premadeWorkouts } = useProgramsStore();

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
      if (m.experienceLevel !== prefs.experienceLevel) return false;

      // 4. Relaxed match on Days (+/- 1 day)
      const diff = Math.abs(m.daysPerWeek - prefs.daysPerWeek!);
      if (diff > 1) return false;

      return true;
    });
  }, [premadePrograms]);

  const getWorkoutRecommendations = useCallback((prefs: Omit<QuizPreferences, 'daysPerWeek'>): PremadeWorkout[] => {
    if (!prefs.goal || !prefs.experienceLevel || !prefs.equipment) {
      return [];
    }

    return premadeWorkouts.filter((workout) => {
      const m = workout.metadata;

      // 1. Strict match on Goal
      if (m.goal !== prefs.goal) return false;

      // 2. Strict match on Equipment
      const equipLevels = ['bodyweight', 'minimal', 'dumbbells-only', 'full-gym'];
      const userLevel = equipLevels.indexOf(prefs.equipment!);
      const progLevel = equipLevels.indexOf(m.equipment);
      
      if (progLevel > userLevel) return false;

      // 3. Relaxed match on Experience
      if (m.experienceLevel !== prefs.experienceLevel) return false;

      return true;
    });
  }, [premadeWorkouts]);

  return {
    getRecommendations,
    getWorkoutRecommendations,
  };
};
