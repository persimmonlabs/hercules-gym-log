import type { Exercise } from '@/constants/exercises';
import type {
  ExerciseFilters,
  FilterDifficulty,
  FilterEquipment,
  FilterMuscleGroup,
  MuscleGroup,
} from '@/types/exercise';

import { usePlanBuilderState } from '@/hooks/usePlanBuilderState';
import { usePlanSaveHandler, type SubmitPlanResult } from '@/hooks/usePlanSaveHandler';

interface UseCreatePlanBuilderParams {
  editingPlanId: string | null;
  onSuccess?: () => void;
}

interface CreatePlanBuilderState {
  planName: string;
  setPlanName: (value: string) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedExercises: Exercise[];
  isEditing: boolean;
  isEditingPlanMissing: boolean;
  isLoading: boolean;
  suggestions: Exercise[];
  availableExercises: Exercise[];
  filteredAvailableExercises: Exercise[];
  headerTitle: string;
  headerSubtitle: string;
  handleAddExercise: (exercise: Exercise) => void;
  handleAddExercises: (exercisesToAdd: Exercise[]) => void;
  handleRemoveExercise: (exerciseId: string) => void;
  handleReorderExercise: (exerciseId: string, direction: 1 | -1) => void;
  handleReorderExercises: (fromIndex: number, toIndex: number) => void;
  resetBuilder: () => void;
  editingPlanCreatedAt: number | null;
  filters: ExerciseFilters;
  toggleMuscleGroupFilter: (value: FilterMuscleGroup) => void;
  toggleSpecificMuscleFilter: (value: MuscleGroup) => void;
  toggleEquipmentFilter: (value: FilterEquipment) => void;
  toggleDifficultyFilter: (value: FilterDifficulty) => void;
  toggleBodyweightOnly: () => void;
  toggleCompoundOnly: () => void;
  resetFilters: () => void;
  updateFilters: (newFilters: ExerciseFilters) => void;
  filterOptions: ReturnType<typeof usePlanBuilderState>['filterOptions'];
  setIsLoading: (loading: boolean) => void;
}

interface CreatePlanPersistenceState {
  isSaving: boolean;
  saveLabel: string;
  selectedListTitle: string;
  selectedListSubtitle: string;
  isSaveDisabled: boolean;
  handleSavePlan: () => Promise<SubmitPlanResult>;
}

export const useCreatePlanBuilder = ({
  editingPlanId,
  onSuccess,
}: UseCreatePlanBuilderParams): CreatePlanBuilderState & CreatePlanPersistenceState => {
  const builderState = usePlanBuilderState(editingPlanId);
  const persistenceState = usePlanSaveHandler({
    editingPlanId,
    onSuccess,
    planName: builderState.planName,
    selectedExercises: builderState.selectedExercises,
    editingPlanCreatedAt: builderState.editingPlanCreatedAt,
    resetBuilder: builderState.resetBuilder,
  });

  return {
    ...builderState,
    ...persistenceState,
  };
};
