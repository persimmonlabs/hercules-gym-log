/**
 * useTimer
 * Custom hook for managing a timer with start/pause/stop functionality
 */
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseTimerReturn {
  elapsedSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
}

export const useTimer = (initialSeconds: number = 0): UseTimerReturn => {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  const start = useCallback(() => {
    if (isRunning) return;
    
    startTimeRef.current = Date.now();
    pausedTimeRef.current = elapsedSeconds;
    setIsRunning(true);
    setIsPaused(false);
  }, [isRunning, elapsedSeconds]);

  const pause = useCallback(() => {
    if (!isRunning || isPaused) return;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPaused(true);
  }, [isRunning, isPaused]);

  const resume = useCallback(() => {
    if (!isRunning || !isPaused) return;
    
    startTimeRef.current = Date.now();
    pausedTimeRef.current = elapsedSeconds;
    setIsPaused(false);
  }, [isRunning, isPaused, elapsedSeconds]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setElapsedSeconds(0);
    setIsRunning(false);
    setIsPaused(false);
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
  }, []);

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current) / 1000);
        setElapsedSeconds(pausedTimeRef.current + elapsed);
      }, 100); // Update every 100ms for smooth display

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [isRunning, isPaused]);

  return {
    elapsedSeconds,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    stop,
    reset,
  };
};
