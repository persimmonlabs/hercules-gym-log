/**
 * schedulesStore
 * Zustand store managing user workout schedules.
 * 
 * Storage: Supabase (schedules table)
 */
import { create } from 'zustand';

import type { Schedule, ScheduleType, RotatingScheduleConfig } from '@/types/schedule';
import { supabaseClient } from '@/lib/supabaseClient';
import {
  fetchSchedules,
  createSchedule,
  updateSchedule as updateScheduleDB,
  deleteSchedule as deleteScheduleDB,
  type ScheduleDataFull,
} from '@/lib/supabaseQueries';

interface SchedulesState {
  schedules: Schedule[];
  isLoading: boolean;
  addSchedule: (schedule: Schedule) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  updateSchedule: (schedule: Schedule) => Promise<void>;
  getSchedules: () => Schedule[];
  hydrateSchedules: (userId?: string) => Promise<void>;
}

const scheduleToDBFormat = (schedule: Schedule): ScheduleDataFull => {
  return {
    type: schedule.type,
    weekly: schedule.type === 'weekly' ? schedule.weekdays : undefined,
    rotating: schedule.type === 'rotating' ? schedule.rotating : undefined,
  };
};

const dbToScheduleFormat = (dbSchedule: any): Schedule => {
  const scheduleData = dbSchedule.schedule_data;
  
  // Handle legacy format (direct weekday keys) or new format (type + weekly/rotating)
  const isNewFormat = scheduleData && 'type' in scheduleData;
  
  if (isNewFormat) {
    const type: ScheduleType = scheduleData.type || 'weekly';
    return {
      id: dbSchedule.id,
      name: dbSchedule.name,
      type,
      weekdays: scheduleData.weekly || {
        monday: null,
        tuesday: null,
        wednesday: null,
        thursday: null,
        friday: null,
        saturday: null,
        sunday: null,
      },
      rotating: scheduleData.rotating,
    };
  }
  
  // Legacy format: direct weekday keys
  return {
    id: dbSchedule.id,
    name: dbSchedule.name,
    type: 'weekly',
    weekdays: {
      monday: scheduleData?.monday ?? null,
      tuesday: scheduleData?.tuesday ?? null,
      wednesday: scheduleData?.wednesday ?? null,
      thursday: scheduleData?.thursday ?? null,
      friday: scheduleData?.friday ?? null,
      saturday: scheduleData?.saturday ?? null,
      sunday: scheduleData?.sunday ?? null,
    },
  };
};

export const useSchedulesStore = create<SchedulesState>((set, get) => ({
  schedules: [],
  isLoading: false,

  addSchedule: async (schedule) => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        console.error('[schedulesStore] No authenticated user');
        return;
      }

      // Create in Supabase
      const newId = await createSchedule(user.id, {
        name: schedule.name,
        scheduleData: scheduleToDBFormat(schedule),
      });

      // Update local state with the new ID from Supabase
      const scheduleWithId: Schedule = {
        ...schedule,
        id: newId,
      };

      set((state) => ({
        schedules: [scheduleWithId, ...state.schedules],
      }));

      console.log('[schedulesStore] Schedule added to Supabase with ID:', newId);
    } catch (error) {
      console.error('[schedulesStore] Failed to add schedule', error);
      await get().hydrateSchedules();
    }
  },

  deleteSchedule: async (id) => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        console.error('[schedulesStore] No authenticated user');
        return;
      }

      // Optimistic update
      set((state) => ({
        schedules: state.schedules.filter((schedule) => schedule.id !== id),
      }));

      // Sync to Supabase
      await deleteScheduleDB(user.id, id);
      console.log('[schedulesStore] Schedule deleted from Supabase');
    } catch (error) {
      console.error('[schedulesStore] Failed to delete schedule', error);
      await get().hydrateSchedules();
    }
  },

  updateSchedule: async (schedule) => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        console.error('[schedulesStore] No authenticated user');
        return;
      }

      // Optimistic update
      set((state) => ({
        schedules: state.schedules.map((existing) =>
          existing.id === schedule.id ? schedule : existing
        ),
      }));

      // Sync to Supabase
      await updateScheduleDB(user.id, schedule.id, {
        name: schedule.name,
        scheduleData: scheduleToDBFormat(schedule),
      });

      console.log('[schedulesStore] Schedule updated in Supabase');
    } catch (error) {
      console.error('[schedulesStore] Failed to update schedule', error);
      await get().hydrateSchedules();
    }
  },

  getSchedules: () => {
    return get().schedules;
  },

  hydrateSchedules: async (userId?: string) => {
    try {
      set({ isLoading: true });

      // Use provided userId or fetch from auth
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        uid = user?.id;
      }
      
      if (!uid) {
        console.log('[schedulesStore] No authenticated user, skipping hydration');
        set({ schedules: [], isLoading: false });
        return;
      }

      console.log('[schedulesStore] HYDRATING SCHEDULES from Supabase');
      const dbSchedules = await fetchSchedules(uid);

      const schedules: Schedule[] = dbSchedules.map(dbToScheduleFormat);

      set({ schedules, isLoading: false });
      console.log('[schedulesStore] Hydrated', schedules.length, 'schedules from Supabase');
    } catch (error) {
      // Silently handle hydration failures - network issues are expected during app startup
      console.warn('[schedulesStore] Hydration failed, using empty state');
      set({ schedules: [], isLoading: false });
    }
  },
}));

export type { SchedulesState };
