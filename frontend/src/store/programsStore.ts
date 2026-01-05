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
import type {
  PremadeProgram,
  UserProgram,
  RotationSchedule,
  ProgramWorkout,
  PremadeWorkout,
  PlanScheduleConfig,
  WeeklyScheduleConfig,
} from '@/types/premadePlan';
import premadeData from '@/data/premadePrograms.json';
import premadeWorkoutsData from '@/data/premadeWorkouts.json';
import { supabaseClient } from '@/lib/supabaseClient';
import {
  fetchUserPlans,
  createUserPlan,
  updateUserPlan,
  deleteUserPlan,
  setActivePlan as setActivePlanInDB,
  updateRotationState,
  type RotationStateDB,
} from '@/lib/supabaseQueries';
import { usePlansStore } from '@/store/plansStore';
import { canAddPlan, canAddWorkout, getProgramLimitType, FREE_LIMITS, getTotalUniqueWorkoutCount } from '@/utils/premiumLimits';

interface ProgramsState {
  premadePrograms: PremadeProgram[];
  premadeWorkouts: PremadeWorkout[];
  userPrograms: UserProgram[];
  activeRotation: RotationSchedule | null;
  isLoading: boolean;

  // Actions
  loadPremadePrograms: () => void;
  addUserProgram: (program: UserProgram) => Promise<string | null>;
  clonePremadeProgram: (premadeId: string) => Promise<UserProgram | null>;
  updateUserProgram: (program: UserProgram) => Promise<void>;
  deleteUserProgram: (id: string) => Promise<void>;
  updateWorkoutInProgram: (programId: string, workoutId: string, workoutUpdates: Partial<ProgramWorkout>) => Promise<void>;
  deleteWorkoutFromProgram: (programId: string, workoutId: string) => Promise<void>;
  addWorkoutToProgram: (programId: string, workout: ProgramWorkout) => Promise<void>;
  reorderWorkoutsInProgram: (programId: string, workoutIds: string[]) => Promise<void>;

  // Schedule Management
  updateProgramSchedule: (programId: string, schedule: PlanScheduleConfig) => Promise<void>;
  getActivePlan: () => UserProgram | null;
  setActivePlan: (programId: string | null) => Promise<void>;
  getTodayWorkout: () => ProgramWorkout | null;

  // Active Plan ID
  activePlanId: string | null;

  // Rotation Management
  setActiveRotation: (rotation: RotationSchedule | null) => Promise<void>;
  advanceRotation: () => Promise<void>;
  getCurrentRotationWorkout: () => string | null; // Returns workout ID
  updateWorkoutsByName: (name: string, workoutUpdates: Partial<ProgramWorkout>) => Promise<void>;

  // Helper Functions
  generateUniqueWorkoutName: (baseName: string) => string;

  hydratePrograms: (userId?: string) => Promise<void>;
}

export const useProgramsStore = create<ProgramsState>((set, get) => ({
  premadePrograms: [],
  premadeWorkouts: [],
  userPrograms: [],
  activeRotation: null,
  activePlanId: null,
  isLoading: false,

  /**
   * Generate a unique workout name by checking both custom workouts and program workouts.
   * If name already exists, appends (2), (3), etc.
   */
  generateUniqueWorkoutName: (baseName: string): string => {
    // Collect all existing workout names (case-insensitive)
    const existingNames = new Set<string>();

    // Add custom workout names from plansStore
    const customPlans = usePlansStore.getState().plans;
    customPlans.forEach(p => {
      existingNames.add(p.name.trim().toLowerCase());
    });

    // Add program workout names
    get().userPrograms.forEach(prog => {
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
  },

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

  hydratePrograms: async (userId?: string) => {
    try {
      set({ isLoading: true });

      // Load Premade
      get().loadPremadePrograms();

      // Use provided userId or fetch from auth
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        uid = user?.id;
      }

      if (!uid) {
        console.log('[programsStore] No authenticated user, skipping user programs');
        set({ userPrograms: [], activePlanId: null, isLoading: false });
        return;
      }

      const userPrograms = await fetchUserPlans(uid);

      // Find active plan
      const activePlan = userPrograms.find(p => (p as any).is_active);
      const activePlanId = activePlan?.id || null;

      // Load Active Rotation from the active plan's rotation_state
      let activeRotation: RotationSchedule | null = null;
      if (activePlan && (activePlan as any).rotation_state) {
        const rotState = (activePlan as any).rotation_state as RotationStateDB;
        activeRotation = {
          id: `rot-${activePlan.id}`,
          name: activePlan.name,
          programId: activePlan.id,
          workoutSequence: rotState.workoutSequence || [],
          currentIndex: rotState.currentIndex || 0,
          lastAdvancedAt: rotState.lastAdvancedAt,
        };
      }

      set({
        userPrograms,
        activePlanId,
        activeRotation,
        isLoading: false
      });

      console.log('[programsStore] Hydrated successfully from Supabase');
    } catch (error) {
      // Silently handle hydration failures - network issues are expected during app startup
      console.warn('[programsStore] Hydration failed, using empty state');
      set({ userPrograms: [], activePlanId: null, activeRotation: null, isLoading: false });
    }
  },

  addUserProgram: async (program): Promise<string | null> => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        console.error('[programsStore] No authenticated user');
        return null;
      }

      // Free user limit: max 1 plan
      const currentPlanCount = get().userPrograms.length;
      if (!canAddPlan(currentPlanCount)) {
        throw new Error('FREE_LIMIT_REACHED');
      }

      // Create in Supabase and get the generated UUIDs
      const { id: newPlanId, workouts: mappedWorkouts } = await createUserPlan(user.id, program);

      // Create a map of old IDs to new IDs for schedule correction
      const idMap = new Map<string, string>();
      program.workouts.forEach((pw, idx) => {
        if (mappedWorkouts[idx]) {
          idMap.set(pw.id, mappedWorkouts[idx].id);
        }
      });

      // Update schedule if it exists
      let finalSchedule = program.schedule;
      if (finalSchedule) {
        finalSchedule = JSON.parse(JSON.stringify(finalSchedule));
        if (finalSchedule && finalSchedule.rotation?.workoutOrder) {
          finalSchedule.rotation.workoutOrder = finalSchedule.rotation.workoutOrder.map(
            oldId => idMap.get(oldId) || oldId
          );
        }
        if (finalSchedule && finalSchedule.weekly) {
          Object.keys(finalSchedule.weekly).forEach(day => {
            const oldId = finalSchedule!.weekly![day as keyof WeeklyScheduleConfig];
            if (oldId && idMap.has(oldId)) {
              (finalSchedule!.weekly as any)[day] = idMap.get(oldId);
            }
          });
        }
      }

      // Update the program with the Supabase-generated IDs
      const programWithId: UserProgram = {
        ...program,
        id: newPlanId,
        workouts: mappedWorkouts,
        schedule: finalSchedule
      };

      // Update local state
      const nextPrograms = [programWithId, ...get().userPrograms];
      set({ userPrograms: nextPrograms });

      console.log('[programsStore] Program added to Supabase with ID:', newPlanId);
      return newPlanId;
    } catch (error: any) {
      // Don't log FREE_LIMIT_REACHED errors - they're handled in the UI
      if (error?.message !== 'FREE_LIMIT_REACHED') {
        console.error('[programsStore] Failed to add program', error);
        await get().hydratePrograms();
      }
      // Re-throw to let UI handle it
      throw error;
    }
  },

  clonePremadeProgram: async (premadeId) => {
    const premade = get().premadePrograms.find(p => p.id === premadeId);
    if (!premade) return null;

    // Check free user limits
    const currentPlanCount = get().userPrograms.length;
    const currentWorkoutCount = getTotalUniqueWorkoutCount();
    const programWorkoutCount = premade.workouts.filter(w => w.exercises.length > 0).length;
    
    console.log('[programsStore] Program limit check:', { 
      currentPlanCount, 
      currentWorkoutCount, 
      programWorkoutCount,
      totalAfterAdding: currentWorkoutCount + programWorkoutCount,
      limit: 7 
    });
    
    // Determine which limit would be exceeded
    const limitType = getProgramLimitType(currentPlanCount, currentWorkoutCount, programWorkoutCount);
    if (limitType === 'plan') {
      throw new Error('FREE_LIMIT_REACHED');
    } else if (limitType === 'workout') {
      throw new Error('WORKOUT_LIMIT_REACHED');
    }

    // Auto-rename if duplicate program name
    const existingProgramNames = new Set(get().userPrograms.map(p => p.name));
    let newProgramName = premade.name;
    let programSuffix = '';
    let programCounter = 2;
    while (existingProgramNames.has(newProgramName)) {
      programSuffix = ` (${programCounter})`;
      newProgramName = `${premade.name}${programSuffix}`;
      programCounter++;
    }

    // Generate unique IDs for each workout to prevent ID collisions
    // This ensures each cloned workout is independent from the premade source
    const workoutIdMap = new Map<string, string>();
    const workouts = premade.workouts.map(w => {
      const newId = `workout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      workoutIdMap.set(w.id, newId);
      
      // Generate unique name for each individual workout
      const uniqueWorkoutName = get().generateUniqueWorkoutName(w.name);
      
      return {
        ...w,
        id: newId,
        name: uniqueWorkoutName,
        sourceWorkoutId: w.id, // Keep reference to original for potential "reset" feature
      };
    });

    // Build Schedule
    let schedule: PlanScheduleConfig | undefined;
    const programId = `prog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (premade.suggestedSchedule) {
      if (premade.scheduleType === 'rotation' && premade.suggestedSchedule.rotation) {
        const newOrder = premade.suggestedSchedule.rotation.map(oldId => workoutIdMap.get(oldId) || oldId);
        schedule = {
          type: 'rotation',
          rotation: {
            workoutOrder: newOrder,
            startDate: Date.now(), // Default to today
          },
          currentRotationIndex: 0,
          lastUsedAt: Date.now(),
        };


      } else if (premade.scheduleType === 'weekly' && premade.suggestedSchedule.weekly) {
        const newWeekly: any = {};
        for (const [day, oldId] of Object.entries(premade.suggestedSchedule.weekly)) {
          if (oldId) {
            newWeekly[day] = workoutIdMap.get(oldId) || oldId;
          } else {
            newWeekly[day] = null;
          }
        }
        schedule = {
          type: 'weekly',
          weekly: newWeekly,
          lastUsedAt: Date.now(),
        };
        // Clear active rotation if switching to weekly
        await get().setActiveRotation(null);
      }
    }

    const userProgram: UserProgram = {
      ...premade,
      name: newProgramName,
      workouts,
      id: programId, // Temporary - will be replaced
      isPremade: false,
      sourceId: premade.id,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      schedule: schedule,
    };

    // Add to Supabase and get the real UUID
    try {
      const realProgramId = await get().addUserProgram(userProgram);

    // Set as active using the real ID from Supabase
    if (realProgramId) {
      await get().setActivePlan(realProgramId);

      // Set rotation with real ID if needed
      if (premade.scheduleType === 'rotation' && premade.suggestedSchedule?.rotation && schedule) {
        const rotationSchedule: RotationSchedule = {
          id: `rot-${Date.now()}`,
          name: newProgramName,
          programId: realProgramId,
          workoutSequence: schedule.rotation?.workoutOrder || [],
          currentIndex: 0,
          lastAdvancedAt: Date.now(),
        };
        await get().setActiveRotation(rotationSchedule);
      }

      return { ...userProgram, id: realProgramId };
    }

      return null;
    } catch (error: any) {
      // Re-throw to let UI handle it (don't log here, addUserProgram already handles it)
      throw error;
    }
  },

  updateUserProgram: async (program) => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        console.error('[programsStore] No authenticated user');
        return;
      }

      const updatedProgram = { ...program, modifiedAt: Date.now() };
      const nextPrograms = get().userPrograms.map(p =>
        p.id === program.id ? updatedProgram : p
      );
      set({ userPrograms: nextPrograms });

      await updateUserPlan(user.id, updatedProgram);
      console.log('[programsStore] Program updated in Supabase');
    } catch (error) {
      console.error('[programsStore] Failed to update program', error);
      await get().hydratePrograms();
    }
  },

  deleteUserProgram: async (id) => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        console.error('[programsStore] No authenticated user');
        return;
      }

      const nextPrograms = get().userPrograms.filter(p => p.id !== id);
      set({ userPrograms: nextPrograms });

      // Clear active plan if it was the deleted one
      if (get().activePlanId === id) {
        await get().setActivePlan(null);
      }

      // Clear active rotation if it was the deleted one
      if (get().activeRotation?.programId === id) {
        await get().setActiveRotation(null);
      }

      await deleteUserPlan(user.id, id);
      console.log('[programsStore] Program deleted from Supabase');
    } catch (error) {
      console.error('[programsStore] Failed to delete program', error);
      await get().hydratePrograms();
    }
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

    // Update schedule to remove all references to this workout
    let updatedSchedule = program.schedule;
    if (updatedSchedule) {
      updatedSchedule = JSON.parse(JSON.stringify(updatedSchedule));
      if (updatedSchedule!.rotation?.workoutOrder) {
        updatedSchedule!.rotation.workoutOrder = updatedSchedule!.rotation.workoutOrder.filter(id => id !== workoutId);
      }
      if (updatedSchedule!.weekly) {
        Object.keys(updatedSchedule!.weekly).forEach(day => {
          if (updatedSchedule!.weekly![day as keyof WeeklyScheduleConfig] === workoutId) {
            (updatedSchedule!.weekly as any)[day] = null;
          }
        });
      }
    }

    const updatedProgram = {
      ...program,
      workouts,
      schedule: updatedSchedule,
      modifiedAt: Date.now()
    };
    await get().updateUserProgram(updatedProgram);

    // Also update rotation sequence if needed
    const rotation = get().activeRotation;
    if (rotation && rotation.programId === programId) {
      const sequence = rotation.workoutSequence.filter(id => id !== workoutId);
      const newIndex = rotation.currentIndex >= sequence.length ? 0 : rotation.currentIndex;
      await get().setActiveRotation({ ...rotation, workoutSequence: sequence, currentIndex: newIndex });
    }
  },

  addWorkoutToProgram: async (programId, workout) => {
    const programs = get().userPrograms;
    const programIndex = programs.findIndex(p => p.id === programId);
    if (programIndex === -1) return;

    const program = programs[programIndex];
    const workouts = [...program.workouts, workout];

    // Update schedule to include this workout in rotation by default
    let updatedSchedule = program.schedule;
    if (updatedSchedule && updatedSchedule.type === 'rotation' && updatedSchedule.rotation) {
      updatedSchedule = {
        ...updatedSchedule,
        rotation: {
          ...updatedSchedule.rotation,
          workoutOrder: [...updatedSchedule.rotation.workoutOrder, workout.id]
        }
      };
    }

    const updatedProgram = {
      ...program,
      workouts,
      schedule: updatedSchedule,
      modifiedAt: Date.now(),
      metadata: {
        ...program.metadata,
        daysPerWeek: workouts.length,
      }
    };
    await get().updateUserProgram(updatedProgram);
  },

  reorderWorkoutsInProgram: async (programId, workoutIds) => {
    const programs = get().userPrograms;
    const programIndex = programs.findIndex(p => p.id === programId);
    if (programIndex === -1) return;

    const program = programs[programIndex];
    // Reorder workouts according to workoutIds order
    const reorderedWorkouts = workoutIds
      .map(id => program.workouts.find(w => w.id === id))
      .filter((w): w is ProgramWorkout => w !== undefined);

    const updatedProgram = { ...program, workouts: reorderedWorkouts, modifiedAt: Date.now() };
    await get().updateUserProgram(updatedProgram);

    // Also update rotation sequence if this program is active
    const rotation = get().activeRotation;
    if (rotation && rotation.programId === programId) {
      await get().setActiveRotation({ ...rotation, workoutSequence: workoutIds });
    }
  },

  updateProgramSchedule: async (programId, schedule) => {
    const programs = get().userPrograms;
    const programIndex = programs.findIndex(p => p.id === programId);
    if (programIndex === -1) return;

    const program = programs[programIndex];
    const updatedProgram = {
      ...program,
      schedule,
      scheduleType: schedule.type,
      modifiedAt: Date.now()
    };
    await get().updateUserProgram(updatedProgram);
  },

  getActivePlan: () => {
    const activePlanId = get().activePlanId;
    if (!activePlanId) return null;
    return get().userPrograms.find(p => p.id === activePlanId) || null;
  },

  setActivePlan: async (programId) => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        console.error('[programsStore] No authenticated user');
        return;
      }

      set({ activePlanId: programId });
      await setActivePlanInDB(user.id, programId);
      console.log('[programsStore] Active plan set in Supabase');
    } catch (error) {
      console.error('[programsStore] Failed to set active plan', error);
    }
  },

  getTodayWorkout: () => {
    const activePlan = get().getActivePlan();
    if (!activePlan || !activePlan.schedule) return null;

    const schedule = activePlan.schedule;

    if (schedule.type === 'weekly' && schedule.weekly) {
      // Get today's day of the week
      const days: (keyof WeeklyScheduleConfig)[] = [
        'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
      ];
      const today = days[new Date().getDay()];
      const workoutId = schedule.weekly[today];

      if (!workoutId) return null;
      return activePlan.workouts.find(w => w.id === workoutId) || null;
    }

    if (schedule.type === 'rotation' && schedule.rotation) {
      // If no start date is set, use the stored index
      if (!schedule.rotation.startDate) {
        const currentIndex = schedule.currentRotationIndex || 0;
        const workoutId = schedule.rotation.workoutOrder[currentIndex];
        if (!workoutId) return null;
        return activePlan.workouts.find(w => w.id === workoutId) || null;
      }

      // Calculate based on start date
      const now = new Date();
      const start = new Date(schedule.rotation.startDate);

      // Reset to midnight to compare dates only
      now.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);

      const diffTime = now.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // If start date is in the future, return null (rest day)
      if (diffDays < 0) {
        return null;
      }

      // Calculate which day of the rotation we're on
      const currentIndex = diffDays % schedule.rotation.workoutOrder.length;
      const workoutId = schedule.rotation.workoutOrder[currentIndex];
      if (!workoutId) return null;
      return activePlan.workouts.find(w => w.id === workoutId) || null;
    }

    return null;
  },

  setActiveRotation: async (rotation) => {
    set({ activeRotation: rotation });

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        console.error('[programsStore] No authenticated user for rotation update');
        return;
      }

      if (rotation) {
        // Save rotation state to the plan's rotation_state column
        // Skip if programId is temporary (starts with "prog-") - wait for real ID
        if (rotation.programId.startsWith('prog-')) {
          console.log('[programsStore] Skipping rotation sync for temporary program ID');
          return;
        }

        const rotationState: RotationStateDB = {
          workoutSequence: rotation.workoutSequence,
          currentIndex: rotation.currentIndex,
          lastAdvancedAt: rotation.lastAdvancedAt || Date.now(),
        };
        await updateRotationState(user.id, rotation.programId, rotationState);
        console.log('[programsStore] Rotation state saved to Supabase');
      } else {
        // Clear rotation state from the active plan
        const activePlanId = get().activePlanId;
        if (activePlanId) {
          await updateRotationState(user.id, activePlanId, null);
          console.log('[programsStore] Rotation state cleared in Supabase');
        }
      }
    } catch (error) {
      console.error('[programsStore] Failed to save rotation state:', error);
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
  },

  updateWorkoutsByName: async (name, workoutUpdates) => {
    const nameKey = name.trim().toLowerCase();
    const programs = get().userPrograms;
    const affectedPrograms: UserProgram[] = [];

    programs.forEach(prog => {
      let hasChange = false;
      const nextWorkouts = prog.workouts.map(w => {
        if (w.name.trim().toLowerCase() === nameKey) {
          hasChange = true;
          return { ...w, ...workoutUpdates };
        }
        return w;
      });

      if (hasChange) {
        affectedPrograms.push({ ...prog, workouts: nextWorkouts });
      }
    });

    if (affectedPrograms.length > 0) {
      // Update all affected programs in parallel
      await Promise.all(affectedPrograms.map(p => get().updateUserProgram(p)));
      console.log(`[programsStore] Updated ${affectedPrograms.length} programs containing workout: ${name}`);
    }
  }
}));

// Note: Hydration is now triggered by auth state changes in _layout.tsx
// This prevents hydration before the user is authenticated
