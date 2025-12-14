/**
 * schedulesStore
 * Zustand store managing user workout schedules.
 * 
 * Storage: Supabase (schedules table)
 */
import { create } from 'zustand';

import type { Schedule } from '@/types/schedule';
import { supabaseClient } from '@/lib/supabaseClient';
import {
  fetchSchedules,
  createSchedule,
  updateSchedule as updateScheduleDB,
  deleteSchedule as deleteScheduleDB,
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
        weekdays: schedule.weekdays,
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
        weekdays: schedule.weekdays,
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

      const schedules: Schedule[] = dbSchedules.map((s) => ({
        id: s.id,
        name: s.name,
        weekdays: {
          monday: s.schedule_data?.monday ?? null,
          tuesday: s.schedule_data?.tuesday ?? null,
          wednesday: s.schedule_data?.wednesday ?? null,
          thursday: s.schedule_data?.thursday ?? null,
          friday: s.schedule_data?.friday ?? null,
          saturday: s.schedule_data?.saturday ?? null,
          sunday: s.schedule_data?.sunday ?? null,
        },
      }));

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
