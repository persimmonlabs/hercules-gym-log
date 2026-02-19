/**
 * useOutdoorTimer
 * Pause-aware elapsed timer for outdoor sessions.
 * Ticks every second while active, freezes while paused.
 */
import { useEffect, useRef } from 'react';

import { useOutdoorSessionStore } from '@/store/outdoorSessionStore';
import type { OutdoorSessionStatus } from '@/types/outdoor';

export const useOutdoorTimer = (): void => {
  const status = useOutdoorSessionStore((s) => s.status);
  const startTime = useOutdoorSessionStore((s) => s.startTime);
  const pausedDurationMs = useOutdoorSessionStore((s) => s.pausedDurationMs);
  const updateElapsed = useOutdoorSessionStore((s) => s.updateElapsed);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (status !== 'active' || !startTime) return;

    const tick = () => {
      const now = Date.now();
      const totalMs = now - startTime - pausedDurationMs;
      const seconds = Math.max(Math.floor(totalMs / 1000), 0);
      updateElapsed(seconds);
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, startTime, pausedDurationMs, updateElapsed]);
};
