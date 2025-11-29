/**
 * programsStore
 * Zustand store managing training plans (programs).
 * 
 * TERMINOLOGY:
 * - Plan/Program: A collection of workouts (e.g., "PPL", "Bro Split")
 * - Workout: A collection of exercises (e.g., "Push Day", "Pull Day")
 * - Exercise: An individual movement (e.g., "Bench Press", "Squat")
 * 
 * Note: "Program" and "Plan" are used interchangeably in this codebase.
 * Both refer to a collection of workouts.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PremadeProgram, UserProgram, RotationSchedule, ProgramWorkout, PremadeWorkout } from '@/types/premadePlan';
import premadeData from '@/data/premadePrograms.json';
import premadeWorkoutsData from '@/data/premadeWorkouts.json';

const USER_PROGRAMS_KEY = '@hercules/user-programs';
const ACTIVE_ROTATION_KEY = '@hercules/active-rotation';

interface ProgramsState {
  premadePrograms: PremadeProgram[];
  premadeWorkouts: PremadeWorkout[];
  userPrograms: UserProgram[];
  activeRotation: RotationSchedule | null;
  
  // Actions
  loadPremadePrograms: () => void;
  addUserProgram: (program: UserProgram) => Promise<void>;
  clonePremadeProgram: (premadeId: string) => Promise<UserProgram | null>;
  updateUserProgram: (program: UserProgram) => Promise<void>;
  deleteUserProgram: (id: string) => Promise<void>;
  updateWorkoutInProgram: (programId: string, workoutId: string, workoutUpdates: Partial<ProgramWorkout>) => Promise<void>;
  deleteWorkoutFromProgram: (programId: string, workoutId: string) => Promise<void>;
  
  // Rotation Management
  setActiveRotation: (rotation: RotationSchedule | null) => Promise<void>;
  advanceRotation: () => Promise<void>;
  getCurrentRotationWorkout: () => string | null; // Returns workout ID
  
  hydratePrograms: () => Promise<void>;
}

export const useProgramsStore = create<ProgramsState>((set, get) => ({
  premadePrograms: [],
  premadeWorkouts: [],
  userPrograms: [],
  activeRotation: null,
  
  loadPremadePrograms: () => {
    // Deep clone premade data to prevent accidental mutations
    // The premade library should ALWAYS show the original, unmodified versions
    const clonedPrograms = JSON.parse(JSON.stringify(premadeData.programs)) as PremadeProgram[];
    const clonedWorkouts = JSON.parse(JSON.stringify(premadeWorkoutsData.workouts)) as PremadeWorkout[];
    
    set({ 
      premadePrograms: clonedPrograms,
      premadeWorkouts: clonedWorkouts
    });
  },

  hydratePrograms: async () => {
    try {
      // Load Premade
      get().loadPremadePrograms();

      // Load User Programs
      const storedPrograms = await AsyncStorage.getItem(USER_PROGRAMS_KEY);
      if (storedPrograms) {
        set({ userPrograms: JSON.parse(storedPrograms) });
      }

      // Load Active Rotation
      const storedRotation = await AsyncStorage.getItem(ACTIVE_ROTATION_KEY);
      if (storedRotation) {
        set({ activeRotation: JSON.parse(storedRotation) });
      }
      
      console.log('[programsStore] Hydrated successfully');
    } catch (error) {
      console.error('[programsStore] Failed to hydrate:', error);
    }
  },
  
  addUserProgram: async (program) => {
    const nextPrograms = [program, ...get().userPrograms];
    set({ userPrograms: nextPrograms });
    await AsyncStorage.setItem(USER_PROGRAMS_KEY, JSON.stringify(nextPrograms));
  },

  clonePremadeProgram: async (premadeId) => {
    const premade = get().premadePrograms.find(p => p.id === premadeId);
    if (!premade) return null;
    
    // Auto-rename if duplicate program name
    const existingNames = new Set(get().userPrograms.map(p => p.name));
    let newName = premade.name;
    let suffix = '';
    let counter = 2;
    while (existingNames.has(newName)) {
      suffix = ` (${counter})`;
      newName = `${premade.name}${suffix}`;
      counter++;
    }
    
    // Generate unique IDs for each workout to prevent ID collisions
    // This ensures each cloned workout is independent from the premade source
    const workouts = premade.workouts.map(w => ({
      ...w,
      id: `workout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: suffix ? `${w.name}${suffix}` : w.name,
      sourceWorkoutId: w.id, // Keep reference to original for potential "reset" feature
    }));
    
    const userProgram: UserProgram = {
      ...premade,
      name: newName,
      workouts,
      id: `prog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      isPremade: false,
      sourceId: premade.id,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
    
    await get().addUserProgram(userProgram);
    return userProgram;
  },

  updateUserProgram: async (program) => {
    const nextPrograms = get().userPrograms.map(p => 
      p.id === program.id ? { ...program, modifiedAt: Date.now() } : p
    );
    set({ userPrograms: nextPrograms });
    await AsyncStorage.setItem(USER_PROGRAMS_KEY, JSON.stringify(nextPrograms));
  },

  deleteUserProgram: async (id) => {
    const nextPrograms = get().userPrograms.filter(p => p.id !== id);
    set({ userPrograms: nextPrograms });
    await AsyncStorage.setItem(USER_PROGRAMS_KEY, JSON.stringify(nextPrograms));
  },

  updateWorkoutInProgram: async (programId, workoutId, workoutUpdates) => {
    const programs = get().userPrograms;
    const programIndex = programs.findIndex(p => p.id === programId);
    if (programIndex === -1) return;

    const program = programs[programIndex];
    const workouts = program.workouts.map(w => 
      w.id === workoutId ? { ...w, ...workoutUpdates } : w
    );

    const updatedProgram = { ...program, workouts, modifiedAt: Date.now() };
    await get().updateUserProgram(updatedProgram);
  },

  deleteWorkoutFromProgram: async (programId, workoutId) => {
    const programs = get().userPrograms;
    const programIndex = programs.findIndex(p => p.id === programId);
    if (programIndex === -1) return;

    const program = programs[programIndex];
    const workouts = program.workouts.filter(w => w.id !== workoutId);

    const updatedProgram = { ...program, workouts, modifiedAt: Date.now() };
    await get().updateUserProgram(updatedProgram);
    
    // Also update rotation sequence if needed
    const rotation = get().activeRotation;
    if (rotation && rotation.programId === programId) {
       const sequence = rotation.workoutSequence.filter(id => id !== workoutId);
       const newIndex = rotation.currentIndex >= sequence.length ? 0 : rotation.currentIndex;
       await get().setActiveRotation({ ...rotation, workoutSequence: sequence, currentIndex: newIndex });
    }
  },
  
  setActiveRotation: async (rotation) => {
    set({ activeRotation: rotation });
    if (rotation) {
      await AsyncStorage.setItem(ACTIVE_ROTATION_KEY, JSON.stringify(rotation));
    } else {
      await AsyncStorage.removeItem(ACTIVE_ROTATION_KEY);
    }
  },

  advanceRotation: async () => {
    const rotation = get().activeRotation;
    if (!rotation) return;

    const nextIndex = (rotation.currentIndex + 1) % rotation.workoutSequence.length;
    const updatedRotation = {
      ...rotation,
      currentIndex: nextIndex,
      lastAdvancedAt: Date.now()
    };

    await get().setActiveRotation(updatedRotation);
  },

  getCurrentRotationWorkout: () => {
    const rotation = get().activeRotation;
    if (!rotation || rotation.workoutSequence.length === 0) return null;
    return rotation.workoutSequence[rotation.currentIndex];
  }
}));

// Auto-hydration
const hydrateProgramsOnStartup = () => {
  void useProgramsStore.getState().hydratePrograms();
};

// Execute immediately
hydrateProgramsOnStartup();
