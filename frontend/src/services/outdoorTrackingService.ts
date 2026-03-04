/**
 * outdoorTrackingService
 * Global service for GPS tracking and timer that persists across navigation.
 * Uses expo-task-manager for background location updates so the route
 * continues to be recorded when the app is backgrounded or the phone is locked.
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import type { GpsCoordinate } from '@/types/outdoor';
import { isAccurateEnough } from '@/utils/geo';
import { useOutdoorSessionStore } from '@/store/outdoorSessionStore';

const BACKGROUND_LOCATION_TASK = 'hercules-background-location';

/**
 * Background task definition — must be called at module level (outside of any
 * component or class) so the JS runtime registers it before the OS delivers events.
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundLocation] Task error:', error.message);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const { addCoordinate, status } = useOutdoorSessionStore.getState();

    if (status !== 'active') return;

    for (const loc of locations) {
      const coord: GpsCoordinate = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        altitude: loc.coords.altitude ?? undefined,
        accuracy: loc.coords.accuracy ?? undefined,
        timestamp: loc.timestamp,
      };

      if (!isAccurateEnough(coord, 30)) continue;
      addCoordinate(coord);
    }
  }
});

class OutdoorTrackingService {
  private foregroundSubscription: Location.LocationSubscription | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private isTrackingActive = false;
  private backgroundRunning = false;

  /**
   * Request both foreground and background location permissions.
   * Returns true only if at least foreground is granted.
   */
  private async ensurePermissions(): Promise<{ foreground: boolean; background: boolean }> {
    try {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (fg.status !== 'granted') {
        console.warn('[OutdoorTrackingService] Foreground permission denied');
        return { foreground: false, background: false };
      }

      const bg = await Location.requestBackgroundPermissionsAsync();
      return { foreground: true, background: bg.status === 'granted' };
    } catch (error) {
      console.error('[OutdoorTrackingService] Permission request failed:', error);
      return { foreground: false, background: false };
    }
  }

  /**
   * Start the foreground location watcher (high-frequency updates while app is visible).
   */
  private async startForegroundWatcher(): Promise<void> {
    this.stopForegroundWatcher();

    try {
      this.foregroundSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 3,
        },
        (location) => {
          const coord: GpsCoordinate = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude ?? undefined,
            accuracy: location.coords.accuracy ?? undefined,
            timestamp: location.timestamp,
          };

          if (!isAccurateEnough(coord, 30)) return;

          const { addCoordinate } = useOutdoorSessionStore.getState();
          addCoordinate(coord);
        }
      );
    } catch (error) {
      console.error('[OutdoorTrackingService] Failed to start foreground watcher:', error);
    }
  }

  private stopForegroundWatcher(): void {
    if (this.foregroundSubscription) {
      this.foregroundSubscription.remove();
      this.foregroundSubscription = null;
    }
  }

  /**
   * Start background location updates via TaskManager.
   */
  private async startBackgroundUpdates(): Promise<void> {
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (isRunning) return;

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 3,
        deferredUpdatesInterval: 3000,
        showsBackgroundLocationIndicator: true,
        activityType: Location.ActivityType.Fitness,
        foregroundService: {
          notificationTitle: 'Hercules — Tracking Route',
          notificationBody: 'Your outdoor activity is being recorded.',
          notificationColor: '#FF6B4A',
        },
      });

      this.backgroundRunning = true;
      console.log('[OutdoorTrackingService] Background location updates started');
    } catch (error) {
      console.error('[OutdoorTrackingService] Failed to start background updates:', error);
    }
  }

  private async stopBackgroundUpdates(): Promise<void> {
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (isRunning) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch {
      // Task may not be registered — safe to ignore
    }
    this.backgroundRunning = false;
  }

  /**
   * Start GPS tracking (foreground watcher + background task).
   */
  async startGpsTracking(): Promise<boolean> {
    const perms = await this.ensurePermissions();
    if (!perms.foreground) return false;

    await this.stopGpsTracking();

    await this.startForegroundWatcher();

    if (perms.background) {
      await this.startBackgroundUpdates();
    } else {
      console.warn('[OutdoorTrackingService] Background permission not granted — tracking will pause when app is backgrounded');
    }

    this.isTrackingActive = true;
    console.log('[OutdoorTrackingService] GPS tracking started');
    return true;
  }

  /**
   * Stop all GPS tracking (foreground + background).
   */
  async stopGpsTracking(): Promise<void> {
    this.stopForegroundWatcher();
    await this.stopBackgroundUpdates();
    this.isTrackingActive = false;
    console.log('[OutdoorTrackingService] GPS tracking stopped');
  }

  startTimer(): void {
    this.stopTimer();

    const tick = () => {
      const { status, startTime, pausedDurationMs, updateElapsed } = useOutdoorSessionStore.getState();
      
      if (status !== 'active' || !startTime) {
        this.stopTimer();
        return;
      }

      const now = Date.now();
      const totalMs = now - startTime - pausedDurationMs;
      const seconds = Math.max(Math.floor(totalMs / 1000), 0);
      updateElapsed(seconds);
    };

    tick();
    this.timerInterval = setInterval(tick, 1000);
    console.log('[OutdoorTrackingService] Timer started');
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      console.log('[OutdoorTrackingService] Timer stopped');
    }
  }

  /**
   * Restart only the foreground watcher without touching the background task.
   * Called when the app returns to foreground so the background task continues
   * uninterrupted while the foreground watcher provides high-frequency updates.
   */
  async restartForegroundWatcher(): Promise<void> {
    if (!this.isTrackingActive) return;
    await this.startForegroundWatcher();
    console.log('[OutdoorTrackingService] Foreground watcher restarted (background task untouched)');
  }

  isGpsActive(): boolean {
    return this.isTrackingActive;
  }

  async cleanup(): Promise<void> {
    await this.stopGpsTracking();
    this.stopTimer();
  }
}

// Singleton instance
export const outdoorTrackingService = new OutdoorTrackingService();
