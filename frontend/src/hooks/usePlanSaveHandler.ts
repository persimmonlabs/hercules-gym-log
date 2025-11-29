/**
 * usePlanSaveHandler
 * Handles persistence logic for Create Plan screen.
 */
import { useCallback, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';

import type { Exercise } from '@/constants/exercises';
import { usePlansStore } from '@/store/plansStore';
import { useProgramsStore } from '@/store/programsStore';
import { savePlan } from '@/utils/storage';
import type { PlanExercise, WorkoutPlan } from '@/types/plan';
import type { ProgramWorkout } from '@/types/premadePlan';

const DEFAULT_PLAN_SET_COUNT = 3;

const createPlanIdentifier = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export type SubmitPlanResult = 'success' | 'missing-name' | 'no-exercises' | 'duplicate-name' | 'error';

interface UsePlanSaveHandlerParams {
  editingPlanId: string | null;
  planName: string;
  selectedExercises: Exercise[];
  editingPlanCreatedAt: number | null;
  resetBuilder: () => void;
  onSuccess?: () => void;
}

interface PlanSaveHandlerState {
  isSaving: boolean;
  saveLabel: string;
  selectedListTitle: string;
  selectedListSubtitle: string;
  isSaveDisabled: boolean;
  handleSavePlan: () => Promise<SubmitPlanResult>;
}

export const usePlanSaveHandler = ({
  editingPlanId,
  planName,
  selectedExercises,
  editingPlanCreatedAt,
  resetBuilder,
  onSuccess,
}: UsePlanSaveHandlerParams): PlanSaveHandlerState => {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const persistPlan = usePlansStore((state) => state.addPlan);
  const updatePlan = usePlansStore((state) => state.updatePlan);
  const plans = usePlansStore((state) => state.plans);
  const { updateWorkoutInProgram, userPrograms } = useProgramsStore();

  const isEditing = Boolean(editingPlanId);
  const isPremadeReview = useMemo(() => {
    if (!editingPlanId?.startsWith('premade:')) {
      return false;
    }
    const existsInPlans = plans.some(p => p.id === editingPlanId);
    return !existsInPlans;
  }, [editingPlanId, plans]);

  /**
   * Generate a unique workout name by checking both custom workouts and program workouts.
   * If name already exists, appends (2), (3), etc.
   */
  const generateUniqueName = useCallback((baseName: string, excludeId?: string): string => {
    // Collect all existing workout names (case-insensitive)
    const existingNames = new Set<string>();
    
    // Add custom workout names
    plans.forEach(p => {
      if (p.id !== excludeId) {
        existingNames.add(p.name.trim().toLowerCase());
      }
    });
    
    // Add program workout names
    userPrograms.forEach(prog => {
      prog.workouts.forEach(w => {
        existingNames.add(w.name.trim().toLowerCase());
      });
    });

    const trimmedBase = baseName.trim();
    if (!existingNames.has(trimmedBase.toLowerCase())) {
      return trimmedBase;
    }

    // Find unique suffix
    let counter = 2;
    let uniqueName = `${trimmedBase} (${counter})`;
    while (existingNames.has(uniqueName.toLowerCase())) {
      counter++;
      uniqueName = `${trimmedBase} (${counter})`;
    }
    
    return uniqueName;
  }, [plans, userPrograms]);

  const handleSavePlan = useCallback(async (): Promise<SubmitPlanResult> => {
    const trimmedName = planName.trim();

    if (!trimmedName) {
      return 'missing-name';
    }

    if (selectedExercises.length === 0) {
      return 'no-exercises';
    }

    if (isSaving) {
      return 'error';
    }

    setIsSaving(true);

    const isProgramWorkout = editingPlanId?.startsWith('program:');

    // For program workouts, allow the name change without auto-renaming
    // (the user is editing their own copy)
    let finalName = trimmedName;
    
    // For new workouts or premade reviews, auto-generate unique name if needed
    if (!isProgramWorkout && (!isEditing || isPremadeReview)) {
      finalName = generateUniqueName(trimmedName);
    } else if (!isProgramWorkout && isEditing) {
      // For editing existing custom workouts, check if name changed and needs uniqueness
      const originalPlan = plans.find(p => p.id === editingPlanId);
      const originalName = originalPlan?.name.trim().toLowerCase();
      
      // Only auto-rename if the name was actually changed to something that conflicts
      if (originalName !== trimmedName.toLowerCase()) {
        finalName = generateUniqueName(trimmedName, editingPlanId ?? undefined);
      }
    }

    const normalizedExercises: PlanExercise[] = selectedExercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      sets: DEFAULT_PLAN_SET_COUNT,
    }));

    try {
      if (isProgramWorkout && editingPlanId) {
        const [_, programId, workoutId] = editingPlanId.split(':');
        await updateWorkoutInProgram(programId, workoutId, {
          name: finalName,
          exercises: normalizedExercises,
        });

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess?.();
        return 'success';
      }

      const planIdentifier = (!isEditing || isPremadeReview) ? createPlanIdentifier() : editingPlanId!;
      const createdAtTimestamp = (!isEditing || isPremadeReview) ? Date.now() : (editingPlanCreatedAt ?? Date.now());

      const payload: WorkoutPlan = {
        id: planIdentifier,
        name: finalName,
        exercises: normalizedExercises,
        createdAt: new Date(createdAtTimestamp).toISOString(),
      };

      await savePlan(payload);

      if (isEditing && !isPremadeReview) {
        updatePlan({
          id: planIdentifier,
          name: finalName,
          exercises: selectedExercises,
          createdAt: createdAtTimestamp,
        });
      } else {
        // Creating a new plan (from scratch or from premade review)
        persistPlan({
          id: planIdentifier,
          name: finalName,
          exercises: selectedExercises,
          createdAt: createdAtTimestamp,
        });
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (!isEditing) {
        resetBuilder();
      }

      onSuccess?.();
      return 'success';
    } catch (error) {
      console.error('[usePlanSaveHandler] Failed to save plan', error);
      return 'error';
    } finally {
      setIsSaving(false);
    }
  }, [editingPlanCreatedAt, editingPlanId, generateUniqueName, isEditing, isPremadeReview, isSaving, onSuccess, persistPlan, planName, plans, resetBuilder, selectedExercises, updatePlan, updateWorkoutInProgram]);

  // Always use "Save Workout" for consistency across all modes
  const saveLabel = 'Save Workout';
  const selectedListTitle = 'Exercises';
  const selectedListSubtitle = '';
  const saveCtaLabel = 'Save Workout';

  const isSaveDisabled = useMemo(() => {
    const trimmedName = planName.trim();
    return trimmedName.length === 0 || selectedExercises.length === 0 || isSaving;
  }, [planName, selectedExercises.length, isSaving]);

  return {
    isSaving,
    saveLabel,
    selectedListTitle,
    selectedListSubtitle,
    isSaveDisabled,
    handleSavePlan,
  };
};
