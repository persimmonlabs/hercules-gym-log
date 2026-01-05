/**
 * PlanBuilderProvider
 * Shares create-plan builder state across screens.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useCreatePlanBuilder } from '@/hooks/useCreatePlanBuilder';

interface PlanBuilderProviderProps {
  children: ReactNode;
}

interface PlanBuilderContextValue extends ReturnType<typeof useCreatePlanBuilder> {
  editingPlanId: string | null;
  setEditingPlanId: (planId: string | null) => void;
  resetSession: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const PlanBuilderContext = createContext<PlanBuilderContextValue | null>(null);

export const PlanBuilderProvider: React.FC<PlanBuilderProviderProps> = ({ children }) => {
  const [editingPlanId, setEditingPlanIdState] = useState<string | null>(null);

  const builderState = useCreatePlanBuilder({
    editingPlanId,
    onSuccess: undefined,
  });

  useEffect(() => {
    if (editingPlanId) {
      return;
    }

    builderState.resetBuilder();
  }, [builderState.resetBuilder, editingPlanId]);

  const setEditingPlanId = useCallback((planId: string | null) => {
    setEditingPlanIdState(planId);
    if (planId) {
      builderState.setIsLoading(true);
    }
  }, [builderState.setIsLoading]);

  const resetSession = useCallback(() => {
    setEditingPlanIdState(null);
    builderState.resetBuilder();
  }, [builderState.resetBuilder]);

  const contextValue = useMemo<PlanBuilderContextValue>(
    () => ({
      ...builderState,
      editingPlanId,
      setEditingPlanId,
      resetSession,
      isLoading: builderState.isLoading || false,
      setIsLoading: builderState.setIsLoading,
    }),
    [builderState, editingPlanId, resetSession, setEditingPlanId],
  );

  return <PlanBuilderContext.Provider value={contextValue}>{children}</PlanBuilderContext.Provider>;
};

export const usePlanBuilderContext = (): PlanBuilderContextValue => {
  const context = useContext(PlanBuilderContext);

  if (!context) {
    throw new Error('usePlanBuilderContext must be used within PlanBuilderProvider');
  }

  return context;
};
