/**
 * ProgramBuilderProvider
 * Shares create-program builder state across screens.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
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
