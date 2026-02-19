/**
 * outdoorTrackingService
 * Global service for GPS tracking and timer that persists across navigation.
 * Manages Location subscription and timer interval independently of component lifecycle.
 */
import * as Location from 'expo-location';
import type { GpsCoordinate } from '@/types/outdoor';
import { isAccurateEnough } from '@/utils/geo';
import { useOutdoorSessionStore } from '@/store/outdoorSessionStore';

class OutdoorTrackingService {
  private locationSubscription: Location.LocationSubscription | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private isTrackingActive = false;

  async startGpsTracking(): Promise<boolean> {
    // Request permission
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[OutdoorTrackingService] Location permission denied');
        return false;
      }
    } catch (error) {
      console.error('[OutdoorTrackingService] Permission request failed:', error);
      return false;
    }

    // Stop any existing subscription
    this.stopGpsTracking();

    try {
      this.locationSubscription = await Location.watchPositionAsync(
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

          // Only add accurate coordinates
          if (!isAccurateEnough(coord, 30)) return;

          // Add to store
          const { addCoordinate } = useOutdoorSessionStore.getState();
          addCoordinate(coord);
        }
      );

      this.isTrackingActive = true;
      console.log('[OutdoorTrackingService] GPS tracking started');
      return true;
    } catch (error) {
      console.error('[OutdoorTrackingService] Failed to start GPS tracking:', error);
      return false;
    }
  }

  stopGpsTracking(): void {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
      this.isTrackingActive = false;
      console.log('[OutdoorTrackingService] GPS tracking stopped');
    }
  }

  startTimer(): void {
    // Stop any existing timer
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

  isGpsActive(): boolean {
    return this.isTrackingActive;
  }

  cleanup(): void {
    this.stopGpsTracking();
    this.stopTimer();
  }
}

// Singleton instance
export const outdoorTrackingService = new OutdoorTrackingService();
