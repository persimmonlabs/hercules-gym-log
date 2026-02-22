/**
 * notificationService
 * Handles scheduling and managing LOCAL notifications for workout reminders.
 *
 * Local notifications work in both development builds and production.
 * Push/remote notifications are NOT used — this is local-only scheduling.
 *
 * Expo Go (SDK 53+) removed push notification support. This service detects
 * Expo Go via Constants.appOwnership and gracefully no-ops all calls so the
 * app never crashes or logs errors during development in Expo Go.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { NotificationConfig, DayOfWeek } from '@/store/notificationStore';

// Type alias for the notifications module
type NotificationsModule = typeof import('expo-notifications');

/**
 * Returns true when running inside Expo Go.
 * In Expo Go, local notification scheduling still works but the push token
 * auto-registration side-effect throws a warning. We skip initialisation
 * entirely to keep the console clean during development.
 */
const isExpoGo = (): boolean => Constants.appOwnership === 'expo';

// Cached module reference and initialisation flag
let notificationsModule: NotificationsModule | null = null;
let isInitialized = false;

/**
 * Lazily load expo-notifications and configure the foreground handler.
 * Returns null when running in Expo Go so every caller can bail out cleanly.
 */
const getNotificationsModule = async (): Promise<NotificationsModule | null> => {
  if (isExpoGo()) {
    return null;
  }

  if (!notificationsModule) {
    notificationsModule = await import('expo-notifications');
  }

  if (!isInitialized) {
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    isInitialized = true;
  }

  return notificationsModule;
};

// Day of week mapping (expo-notifications uses 1=Sunday, 2=Monday, etc.)
const DAY_MAP: Record<DayOfWeek, number> = {
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
  saturday: 7,
};

const WORKOUT_MESSAGES = [
  "Time to crush your workout! 💪",
  "Your muscles are calling! Let's go! 🏋️",
  "Ready to get stronger? Your workout awaits!",
  "No excuses! It's workout time! 🔥",
  "Your future self will thank you. Start your workout!",
  "Consistency builds champions. Time to train! 🏆",
  "Let's make today count! Workout time! 💥",
  "Your workout reminder is here! Let's do this!",
];

/**
 * Request notification permissions from the user.
 * @returns Whether permissions were granted
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[NotificationService] Permission not granted');
      return false;
    }

    // Android requires a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('workout-reminders', {
        name: 'Workout Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B4A',
      });
    }

    return true;
  } catch (error) {
    console.error('[NotificationService] Error requesting permissions:', error);
    return false;
  }
};

/**
 * Get a random workout motivation message.
 */
const getRandomMessage = (): string => {
  return WORKOUT_MESSAGES[Math.floor(Math.random() * WORKOUT_MESSAGES.length)];
};

/**
 * Schedule a weekly notification for a specific day and time.
 */
const scheduleWeeklyNotification = async (
  configId: string,
  day: DayOfWeek,
  hour: number,
  minute: number
): Promise<string | null> => {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;

  const weekday = DAY_MAP[day];

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Workout Reminder',
      body: getRandomMessage(),
      sound: true,
      data: { configId, day },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour,
      minute,
      channelId: Platform.OS === 'android' ? 'workout-reminders' : undefined,
    },
  });

  return identifier;
};

/**
 * Cancel all scheduled notifications.
 */
export const cancelAllNotifications = async (): Promise<void> => {
  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[NotificationService] All notifications cancelled');
  } catch (error) {
    console.error('[NotificationService] Error cancelling notifications:', error);
  }
};

/**
 * Schedule notifications based on config list.
 * This cancels all existing notifications and reschedules from scratch.
 */
export const scheduleNotifications = async (
  configs: NotificationConfig[]
): Promise<void> => {
  // First, cancel all existing notifications
  await cancelAllNotifications();

  // Filter to only enabled configs
  const activeConfigs = configs.filter((c) => c.enabled);

  if (activeConfigs.length === 0) {
    return;
  }

  // Schedule each notification
  for (const config of activeConfigs) {
    for (const day of config.days) {
      try {
        const id = await scheduleWeeklyNotification(
          config.id,
          day,
          config.hour,
          config.minute
        );
        if (id) {
          console.log(`[NotificationService] Scheduled: ${day} at ${config.hour}:${config.minute} (ID: ${id})`);
        }
      } catch (error) {
        console.error(`[NotificationService] Failed to schedule ${day}:`, error);
      }
    }
  }
};

/**
 * Get all currently scheduled notifications (for debugging).
 */
export const getScheduledNotifications = async () => {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return [];
  return await Notifications.getAllScheduledNotificationsAsync();
};

/**
 * Check if notifications are enabled at the system level.
 */
export const checkNotificationPermissions = async (): Promise<boolean> => {
  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return false;
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[NotificationService] Error checking permissions:', error);
    return false;
  }
};
