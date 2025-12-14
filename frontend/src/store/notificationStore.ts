/**
 * notificationStore
 * Zustand store for notification preferences with AsyncStorage persistence.
 * Manages workout reminder configurations.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface NotificationConfig {
  /** Unique identifier for this notification config */
  id: string;
  /** Hour in 24-hour format (0-23) */
  hour: number;
  /** Minute (0-59) */
  minute: number;
  /** Days of the week when this notification should fire */
  days: DayOfWeek[];
  /** Whether this notification config is enabled */
  enabled: boolean;
}

interface NotificationState {
  /** Whether notifications are enabled globally */
  notificationsEnabled: boolean;
  /** List of notification configurations */
  configs: NotificationConfig[];
  /** Toggle global notifications */
  setNotificationsEnabled: (enabled: boolean) => void;
  /** Add a new notification config */
  addConfig: (config: Omit<NotificationConfig, 'id'>) => void;
  /** Update an existing notification config */
  updateConfig: (id: string, updates: Partial<Omit<NotificationConfig, 'id'>>) => void;
  /** Remove a notification config */
  removeConfig: (id: string) => void;
  /** Toggle a specific config's enabled state */
  toggleConfig: (id: string) => void;
  /** Get all active (enabled) configs */
  getActiveConfigs: () => NotificationConfig[];
}

const generateId = (): string => {
  return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notificationsEnabled: false,
      configs: [],

      setNotificationsEnabled: (enabled: boolean) => {
        set({ notificationsEnabled: enabled });
      },

      addConfig: (config: Omit<NotificationConfig, 'id'>) => {
        const newConfig: NotificationConfig = {
          ...config,
          id: generateId(),
        };
        set((state) => ({
          configs: [...state.configs, newConfig],
        }));
      },

      updateConfig: (id: string, updates: Partial<Omit<NotificationConfig, 'id'>>) => {
        set((state) => ({
          configs: state.configs.map((config) =>
            config.id === id ? { ...config, ...updates } : config
          ),
        }));
      },

      removeConfig: (id: string) => {
        set((state) => ({
          configs: state.configs.filter((config) => config.id !== id),
        }));
      },

      toggleConfig: (id: string) => {
        set((state) => ({
          configs: state.configs.map((config) =>
            config.id === id ? { ...config, enabled: !config.enabled } : config
          ),
        }));
      },

      getActiveConfigs: () => {
        const state = get();
        if (!state.notificationsEnabled) return [];
        return state.configs.filter((config) => config.enabled);
      },
    }),
    {
      name: 'hercules-notifications',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        notificationsEnabled: state.notificationsEnabled,
        configs: state.configs,
      }),
    }
  )
);
