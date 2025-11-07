/**
 * Dashboard utilities
 * Helper functions for generating dashboard data structures.
 */

import { WeekDayTracker } from '@/types/dashboard';

const dayLabels: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const createWeekTracker = (workoutActivity: boolean[]): WeekDayTracker[] => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(today.getDate() - today.getDay());

  return dayLabels.map((label, index) => {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + index);

    return {
      id: `${label.toLowerCase()}-${dayDate.getDate()}`,
      label,
      date: dayDate.getDate().toString(),
      hasWorkout: workoutActivity[index] ?? false,
      isToday: index === today.getDay(),
    };
  });
};
