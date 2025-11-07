import { MainTabRoute } from '@/constants/navigation';

export interface WeekDayTracker {
  id: string;
  label: string;
  date: string;
  hasWorkout: boolean;
  isToday: boolean;
}

export interface QuickLinkItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: MainTabRoute;
  variant?: 'primary' | 'secondary';
}

export interface RecentWorkoutSummary {
  id: string;
  date: string;
  exercise: string;
  volume: string;
}
