/**
 * usePlanSaveHandler
 * Handles persistence logic for Create Plan screen.
 */
import { useCallback, useMemo, useState } from 'react';
import { triggerHaptic } from '@/utils/haptics';
import { useGlobalSearchParams } from 'expo-router';

import type { Exercise } from '@/constants/exercises';
import { usePlansStore } from '@/store/plansStore';
import { useProgramsStore } from '@/store/programsStore';
import type { PlanExercise } from '@/types/plan';

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
  const globalSearchParams = useGlobalSearchParams<{ source?: 'library' | 'recommended' }>();

  const isEditing = Boolean(editingPlanId);

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

    // NOTE: Auto-renaming is disabled to allow users to use the same workout name 
    // across multiple plans, which the UI now groups and tags automatically.
    // if (!isProgramWorkout && (!isEditing || isPremadeReview)) {
    //   finalName = generateUniqueName(trimmedName);
    // } else if (!isProgramWorkout && isEditing) {
    //   const originalPlan = plans.find(p => p.id === editingPlanId);
    //   const originalName = originalPlan?.name.trim().toLowerCase();
    //   if (originalName !== trimmedBase.toLowerCase()) {
    //     finalName = generateUniqueName(trimmedName, editingPlanId ?? undefined);
    //   }
    // }


    const normalizedExercises: PlanExercise[] = selectedExercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      sets: DEFAULT_PLAN_SET_COUNT,
    }));

    // Get the name of the workout BEFORE it was edited to find matches in other plans
    const originalPlan = plans.find(p => p.id === editingPlanId);
    const originalName = isProgramWorkout ? planName : (originalPlan?.name || finalName);

    try {
      if (isProgramWorkout && editingPlanId) {
        const [_, programId, workoutId] = editingPlanId.split(':');

        // Sync across ALL programs that have a workout with this name
        const { updateWorkoutsByName } = useProgramsStore.getState();
        await updateWorkoutsByName(originalName, {
          name: finalName,
          exercises: normalizedExercises,
        });

        // Also sync to standalone template if it exists with same name
        const standaloneMatch = plans.find(p => p.name.trim().toLowerCase() === originalName.trim().toLowerCase());
        if (standaloneMatch) {
          await updatePlan({
            id: standaloneMatch.id,
            name: finalName,
            exercises: selectedExercises,
            createdAt: standaloneMatch.createdAt,
          });
        }

        await triggerHaptic('success');
        onSuccess?.();
        return 'success';
      }

      const createdAtTimestamp = !isEditing ? Date.now() : (editingPlanCreatedAt ?? Date.now());

      if (isEditing) {
        // Update existing standalone template
        await updatePlan({
          id: editingPlanId!,
          name: finalName,
          exercises: selectedExercises,
          createdAt: createdAtTimestamp,
        });

        // Also sync to all programs that used this template
        const { updateWorkoutsByName } = useProgramsStore.getState();
        await updateWorkoutsByName(originalName, {
          name: finalName,
          exercises: normalizedExercises,
        });
      } else {
        // Creating a new standalone template
        // Determine source from URL parameters
        let workoutSource: 'premade' | 'custom' | 'library' | 'recommended' = 'custom';

        const sourceParam = globalSearchParams.source;
        if (sourceParam === 'library' || sourceParam === 'recommended') {
          workoutSource = sourceParam;
        }

        await persistPlan({
          name: finalName,
          exercises: selectedExercises,
          createdAt: createdAtTimestamp,
          source: workoutSource,
        });

        // Even for new ones, check if they should sync to existing plans with same name
        const { updateWorkoutsByName } = useProgramsStore.getState();
        await updateWorkoutsByName(finalName, {
          name: finalName,
          exercises: normalizedExercises,
        });
      }

      await triggerHaptic('success');

      if (!isEditing) {
        resetBuilder();
      }

      onSuccess?.();
      return 'success';
    } catch (error: any) {
      // Re-throw limit errors so UI can handle them
      if (error?.message === 'FREE_LIMIT_REACHED') {
        throw error;
      }
      console.error('[usePlanSaveHandler] Failed to save plan', error);
      return 'error';
    } finally {
      setIsSaving(false);
    }
  }, [editingPlanCreatedAt, editingPlanId, isEditing, isSaving, onSuccess, persistPlan, planName, plans, resetBuilder, selectedExercises, updatePlan]);


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
