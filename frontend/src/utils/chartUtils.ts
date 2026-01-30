/**
 * Chart Utilities
 * Helper functions for data aggregation and transformation in charts
 */

export interface DataPoint {
  date: string;
  value: number;
}

export interface AggregatedPoint {
  date: string;
  value: number;
  label: string;
  hasData: boolean;
}

/**
 * Format a date as YYYY-MM-DD in LOCAL timezone (not UTC)
 * This prevents timezone shift issues when comparing with stored date keys
 */
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Aggregate data into N-day buckets (e.g., 3-day averages)
 * This reduces the number of data points instead of smoothing daily values.
 * @param data Array of daily data points sorted by date
 * @param bucketSize Number of days per bucket
 * @returns Array of aggregated points (one per bucket)
 */
export const aggregateByNDays = (
  data: AggregatedPoint[],
  bucketSize: number
): AggregatedPoint[] => {
  if (data.length === 0) return [];
  if (bucketSize <= 1) return data;

  const buckets: AggregatedPoint[] = [];
  
  for (let i = 0; i < data.length; i += bucketSize) {
    const bucketPoints = data.slice(i, Math.min(i + bucketSize, data.length));
    const pointsWithData = bucketPoints.filter(p => p.hasData);
    
    // Use the middle point's date/label for the bucket
    const midIndex = Math.floor(bucketPoints.length / 2);
    const representativePoint = bucketPoints[midIndex] || bucketPoints[0];
    
    if (pointsWithData.length === 0) {
      buckets.push({
        ...representativePoint,
        value: 0,
        hasData: false,
      });
    } else {
      const sum = pointsWithData.reduce((acc, p) => acc + p.value, 0);
      const avg = Math.round(sum / pointsWithData.length);
      
      buckets.push({
        ...representativePoint,
        value: avg,
        hasData: true,
      });
    }
  }
  
  return buckets;
};

/**
 * Calculate rolling average for a dataset (DEPRECATED - use aggregateByNDays for cleaner charts)
 * @param data Array of data points sorted by date
 * @param windowSize Number of days to include in the rolling window
 * @returns Array of data points with rolling average values
 */
export const calculateRollingAverage = (
  data: AggregatedPoint[],
  windowSize: number
): AggregatedPoint[] => {
  if (data.length === 0) return [];
  if (windowSize <= 1) return data;

  return data.map((point, index) => {
    // Calculate the start of the window (look back windowSize-1 days)
    const startIdx = Math.max(0, index - windowSize + 1);
    const windowPoints = data.slice(startIdx, index + 1);
    
    // Only include points with data in the average
    const pointsWithData = windowPoints.filter(p => p.hasData);
    
    if (pointsWithData.length === 0) {
      return { ...point, value: 0 };
    }
    
    const sum = pointsWithData.reduce((acc, p) => acc + p.value, 0);
    const avg = Math.round(sum / pointsWithData.length);
    
    return {
      ...point,
      value: avg,
      hasData: avg > 0,
    };
  });
};

/**
 * Get the Monday of the week for a given date (ISO week start)
 */
export const getWeekStartDate = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust to Monday (day 1). If Sunday (0), go back 6 days
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Aggregate daily volume data by week
 * @param volumeByDate Raw daily volume data (YYYY-MM-DD -> volume)
 * @param startDate Start of the time range
 * @param endDate End of the time range
 * @returns Array of weekly aggregated points
 */
export const aggregateByWeek = (
  volumeByDate: Record<string, number>,
  startDate: Date,
  endDate: Date
): AggregatedPoint[] => {
  const weeklyData: Map<string, { total: number; weekStart: Date }> = new Map();
  
  // Get the Monday of the start week
  const firstWeekStart = getWeekStartDate(startDate);
  
  // Iterate through each week from start to end
  const currentWeek = new Date(firstWeekStart);
  while (currentWeek <= endDate) {
    const weekKey = formatLocalDate(currentWeek);
    weeklyData.set(weekKey, { total: 0, weekStart: new Date(currentWeek) });
    currentWeek.setDate(currentWeek.getDate() + 7);
  }
  
  // Sum volumes into their respective weeks
  Object.entries(volumeByDate).forEach(([dateKey, volume]) => {
    const date = new Date(dateKey + 'T12:00:00'); // Parse at noon to avoid timezone issues
    const weekStart = getWeekStartDate(date);
    const weekKey = formatLocalDate(weekStart);
    
    const weekData = weeklyData.get(weekKey);
    if (weekData) {
      weekData.total += volume;
    }
  });
  
  // Convert to array of points
  const points: AggregatedPoint[] = [];
  weeklyData.forEach((data, weekKey) => {
    const weekStart = data.weekStart;
    points.push({
      date: weekKey,
      value: Math.round(data.total),
      label: weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      hasData: data.total > 0,
    });
  });
  
  // Sort by date
  return points.sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Aggregate daily volume data by month
 * @param volumeByDate Raw daily volume data (YYYY-MM-DD -> volume)
 * @param startDate Start of the time range
 * @param endDate End of the time range
 * @returns Array of monthly aggregated points
 */
export const aggregateByMonth = (
  volumeByDate: Record<string, number>,
  startDate: Date,
  endDate: Date
): AggregatedPoint[] => {
  const monthlyData: Map<string, { total: number; monthStart: Date }> = new Map();
  
  // Iterate through each month from start to end
  const currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  
  while (currentMonth <= lastMonth) {
    const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
    monthlyData.set(monthKey, { total: 0, monthStart: new Date(currentMonth) });
    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }
  
  // Sum volumes into their respective months
  Object.entries(volumeByDate).forEach(([dateKey, volume]) => {
    const date = new Date(dateKey);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    
    const monthData = monthlyData.get(monthKey);
    if (monthData) {
      monthData.total += volume;
    }
  });
  
  // Convert to array of points
  const points: AggregatedPoint[] = [];
  monthlyData.forEach((data, _monthKey) => {
    const monthStart = data.monthStart;
    points.push({
      date: formatLocalDate(monthStart),
      value: Math.round(data.total),
      label: monthStart.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
      hasData: data.total > 0,
    });
  });
  
  // Sort by date
  return points.sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Calculate smart tick interval to keep ~6-8 ticks max
 * @param totalPoints Total number of data points
 * @param targetTicks Desired number of ticks (default 6-8)
 * @returns Interval between ticks
 */
export const getSmartTickInterval = (
  totalPoints: number,
  targetTicks: number = 7
): number => {
  if (totalPoints <= targetTicks) return 1;
  return Math.ceil(totalPoints / targetTicks);
};

/**
 * Build daily points for a date range
 * @param volumeByDate Raw daily volume data
 * @param startDate Start date
 * @param endDate End date
 * @returns Array of daily points
 */
export const buildDailyPoints = (
  volumeByDate: Record<string, number>,
  startDate: Date,
  endDate: Date
): AggregatedPoint[] => {
  const points: AggregatedPoint[] = [];
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateKey = formatLocalDate(new Date(d));
    const volume = volumeByDate[dateKey] || 0;
    
    points.push({
      date: dateKey,
      value: Math.round(volume),
      label: d.getDate().toString(),
      hasData: volume > 0,
    });
  }
  
  return points;
};
