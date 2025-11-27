/**
 * PlanBuilderProvider (file: ProgramBuilderProvider.tsx)
 * Shares create-plan builder state across screens.
 * 
 * TERMINOLOGY:
 * - Plan: A collection of workouts (e.g., "PPL", "Bro Split")
 * - Workout: A collection of exercises (e.g., "Push Day", "Pull Day")
 * 
 * Note: This provider helps build Plans by selecting Workouts.
 * The "Program" naming is legacy; "Plan" is the correct term.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
// Plan here refers to a Workout (collection of exercises) - legacy naming
import type { Plan } from '@/store/plansStore';

interface ProgramBuilderProviderProps {
  children: ReactNode;
}

interface ProgramBuilderContextValue {
  programName: string;
  setProgramName: (name: string) => void;
  selectedWorkouts: Plan[];
  addWorkout: (workout: Plan) => void;
  addWorkouts: (workouts: Plan[]) => void;
  removeWorkout: (workoutId: string) => void;
  reorderWorkouts: (workouts: Plan[]) => void;
  resetBuilder: () => void;
}

const ProgramBuilderContext = createContext<ProgramBuilderContextValue | null>(null);

export const ProgramBuilderProvider: React.FC<ProgramBuilderProviderProps> = ({ children }) => {
  const [programName, setProgramName] = useState('');
  const [selectedWorkouts, setSelectedWorkouts] = useState<Plan[]>([]);

  const addWorkout = useCallback((workout: Plan) => {
    setSelectedWorkouts(prev => {
      // Don't add duplicates
      if (prev.some(w => w.id === workout.id)) {
        return prev;
      }
      return [...prev, workout];
    });
  }, []);

  const addWorkouts = useCallback((workouts: Plan[]) => {
    setSelectedWorkouts(prev => {
      const existingIds = new Set(prev.map(w => w.id));
      const newWorkouts = workouts.filter(w => !existingIds.has(w.id));
      return [...prev, ...newWorkouts];
    });
  }, []);

  const removeWorkout = useCallback((workoutId: string) => {
    setSelectedWorkouts(prev => prev.filter(w => w.id !== workoutId));
  }, []);

  const reorderWorkouts = useCallback((workouts: Plan[]) => {
    setSelectedWorkouts(workouts);
  }, []);

  const resetBuilder = useCallback(() => {
    setProgramName('');
    setSelectedWorkouts([]);
  }, []);

  const contextValue = useMemo<ProgramBuilderContextValue>(
    () => ({
      programName,
      setProgramName,
      selectedWorkouts,
      addWorkout,
      addWorkouts,
      removeWorkout,
      reorderWorkouts,
      resetBuilder,
    }),
    [programName, selectedWorkouts, addWorkout, addWorkouts, removeWorkout, reorderWorkouts, resetBuilder],
  );

  return (
    <ProgramBuilderContext.Provider value={contextValue}>
      {children}
    </ProgramBuilderContext.Provider>
  );
};

export const useProgramBuilderContext = (): ProgramBuilderContextValue => {
  const context = useContext(ProgramBuilderContext);

  if (!context) {
    throw new Error('useProgramBuilderContext must be used within ProgramBuilderProvider');
  }

  return context;
};
