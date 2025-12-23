export type ScheduleDayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface ScheduleWeekdayAssignment {
  monday: string | null;
  tuesday: string | null;
  wednesday: string | null;
  thursday: string | null;
  friday: string | null;
  saturday: string | null;
  sunday: string | null;
}

export type ScheduleType = 'weekly' | 'rotating';

export interface RotatingDay {
  id: string;
  dayNumber: number;
  planId: string | null;
}

export interface RotatingScheduleConfig {
  days: RotatingDay[];
  startDate: number | null;
}

export interface Schedule {
  id: string;
  name: string;
  type: ScheduleType;
  weekdays: ScheduleWeekdayAssignment;
  rotating?: RotatingScheduleConfig;
}
