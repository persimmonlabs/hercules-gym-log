/**
 * Analytics Types for Hercules
 * Defines types for chart data, tier levels, and premium status
 */

// Muscle hierarchy tier levels
export type TierLevel = 'high' | 'mid' | 'low' | 'detailed';

// Chart data structures
export interface ChartSlice {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface BarChartData {
  label: string;
  value: number;
  displayLabel?: string;
}

export interface PieChartData {
  slices: ChartSlice[];
  total: number;
}

// Volume data by tier
export interface TieredVolumeData {
  high: Record<string, number>;  // Upper Body, Lower Body, Core
  mid: Record<string, number>;   // Chest, Back, Shoulders, Arms, Quads, etc.
  low: Record<string, number>;   // Upper Chest, Lats, Front Delts, etc.
}

// Set distribution data by tier
export interface TieredSetData {
  high: ChartSlice[];
  mid: ChartSlice[];
  low: ChartSlice[];
}

// Weekly volume data
export interface WeeklyVolumeData {
  high: BarChartData[];
  byBodyPart: {
    upper: BarChartData[];
    lower: BarChartData[];
    core: BarChartData[];
  };
}

// Time range for analytics
// 'week' = last 7 days, 'month' = since first of current month, 'year' = since first of current year, 'all' = all time
export type TimeRange = 'week' | 'month' | 'year' | 'all';

// Time range display labels
export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  week: '7-Day',
  month: 'Month',
  year: 'Year',
  all: 'All Time',
};

// Time range subtitle descriptions
export const TIME_RANGE_SUBTITLES: Record<TimeRange, string> = {
  week: 'Last 7 days',
  month: 'This month',
  year: 'Year to date',
  all: 'All time',
};

// Trend data point
export interface TrendPoint {
  date: string;
  value: number;
}

// Trendline data for premium features
export interface TrendlineData {
  points: TrendPoint[];
  change: number;        // Percentage change
  changeDirection: 'up' | 'down' | 'flat';
}

// Volume comparison (this week vs last week)
export interface VolumeComparison {
  current: number;
  previous: number;
  change: number;
  changeDirection: 'up' | 'down' | 'flat';
}

// Balance assessment (push/pull, etc.)
export interface BalanceRatio {
  category: string;
  ratio: number;         // 0-1, where 0.5 is perfect balance
  assessment: 'balanced' | 'slight-imbalance' | 'imbalanced';
  primarySide: string;   // Which side is dominant
  secondarySide: string;
}

// Exercise insights
export interface ExerciseInsight {
  exerciseName: string;
  totalSets: number;
  totalVolume: number;
  lastPerformed: string | null;
  frequency: number;     // Times per week average
}

// Streak and consistency data
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  workoutsThisWeek: number;
  workoutsThisMonth: number;
  averagePerWeek: number;
}

// Cardio statistics
export interface CardioStats {
  totalDuration: number;              // Total seconds across all cardio
  totalDistanceByType: Record<string, number>;  // exerciseName -> total distance
  sessionCount: number;               // Number of workouts containing cardio
}

// Muscle detail for drill-down
export interface MuscleDetail {
  name: string;
  tier: TierLevel;
  parent: string | null;
  children: string[];
  totalVolume: number;
  totalSets: number;
  topExercises: ExerciseInsight[];
  trendline?: TrendlineData;
}

// Premium feature status
export interface PremiumStatus {
  isPremium: boolean;
  expiresAt: string | null;
  tier: 'free' | 'pro' | 'lifetime';
}

// Analytics screen navigation params
export interface AnalyticsNavigationParams {
  VolumeAnalytics: undefined;
  DistributionAnalytics: undefined;
  MuscleDetail: { muscleName: string; tier: TierLevel };
}

// Hierarchical drill-down navigation path
export interface DrillDownPath {
  name: string;
  level: 'root' | 'high' | 'mid' | 'low' | 'detailed';
}

// Hierarchical set distribution data for drill-down
export interface HierarchicalSetData {
  // Root level: Body Regions (Upper Body, Lower Body, Core)
  root: ChartSlice[];
  // Grouped by parent: e.g., "Upper Body" -> [Chest, Back, Shoulders, Arms]
  byParent: Record<string, ChartSlice[]>;
}

// Chart wrapper states
export type ChartState = 'loading' | 'empty' | 'error' | 'ready';

export interface ChartWrapperProps {
  state: ChartState;
  emptyMessage?: string;
  errorMessage?: string;
  children: React.ReactNode;
}
