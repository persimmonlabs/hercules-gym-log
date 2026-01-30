/**
 * VolumeTrendChart
 * Line chart showing total volume trends over time
 * Displays volume progression for selected time ranges (7-day, month, year, all time)
 * 
 * Adaptive bucketing strategy:
 * - Week: Daily data (7 points)
 * - Month: Daily data with 3-day rolling average line
 * - Year: Weekly totals (aggregated by week)
 * - All Time: Weekly totals (≤90 days) or Monthly totals (>90 days)
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme, VictoryScatter, VictoryLabel } from 'victory-native';

import { Text } from '@/components/atoms/Text';
import { ChartWrapper } from '@/components/atoms/ChartWrapper';
import { colors, spacing } from '@/constants/theme';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { TIME_RANGE_SUBTITLES } from '@/types/analytics';
import { useSettingsStore } from '@/store/settingsStore';
import {
  aggregateByNDays,
  aggregateByWeek,
  aggregateByMonth,
  formatLocalDate,
  type AggregatedPoint,
} from '@/utils/chartUtils';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.xl * 2 - spacing.md * 2;
const CHART_HEIGHT = 220;

// Target max ticks for clean x-axis
const MAX_TICKS = 7;

interface VolumeTrendChartProps {
  timeRange?: 'week' | 'month' | 'year' | 'all';
}

export const VolumeTrendChart: React.FC<VolumeTrendChartProps> = ({ timeRange = 'week' }) => {
  const { volumeTrendData, hasFilteredData } = useAnalyticsData({ timeRange });
  const weightUnit = useSettingsStore((state) => state.weightUnit);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!volumeTrendData || Object.keys(volumeTrendData).length === 0) {
    const emptyMessage = `No workout data for ${TIME_RANGE_SUBTITLES[timeRange].toLowerCase()}.`;
    return (
      <ChartWrapper
        state={!hasFilteredData ? 'empty' : 'ready'}
        emptyMessage={emptyMessage}
        minHeight={CHART_HEIGHT + 40}
      >
        <View />
      </ChartWrapper>
    );
  }

  // Handle partial week - calculate projection based on days elapsed
  const handlePartialWeekProjection = (
    points: AggregatedPoint[],
    now: Date
  ): { points: AggregatedPoint[]; projected: AggregatedPoint | null } => {
    if (points.length === 0) return { points, projected: null };
    
    const lastPoint = points[points.length - 1];
    const lastWeekStart = new Date(lastPoint.date);
    
    // Calculate days elapsed in the current week (Monday = 1, Sunday = 7)
    const dayOfWeek = now.getDay();
    const daysElapsed = dayOfWeek === 0 ? 7 : dayOfWeek; // Sunday = 7 days elapsed
    
    // Check if the last point is from the current week
    const weekStart = new Date(now);
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart.setDate(now.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    
    const isCurrentWeek = lastWeekStart.toISOString().split('T')[0] === weekStart.toISOString().split('T')[0];
    
    if (isCurrentWeek && daysElapsed < 7 && lastPoint.hasData) {
      // Project the weekly total based on current pace
      const projectedValue = Math.round((lastPoint.value / daysElapsed) * 7);
      
      // Return points without the partial week, plus a projected point
      const solidPoints = points.slice(0, -1);
      const projected: AggregatedPoint = {
        ...lastPoint,
        value: projectedValue,
        hasData: true,
      };
      
      // If we only have the current week, still show it but as projected
      if (solidPoints.length === 0) {
        return { points: [], projected };
      }
      
      return { points: solidPoints, projected };
    }
    
    return { points, projected: null };
  };

  // Handle partial month - calculate projection based on days elapsed
  const handlePartialMonthProjection = (
    points: AggregatedPoint[],
    now: Date
  ): { points: AggregatedPoint[]; projected: AggregatedPoint | null } => {
    if (points.length === 0) return { points, projected: null };
    
    const lastPoint = points[points.length - 1];
    const lastMonthDate = new Date(lastPoint.date);
    
    // Check if the last point is from the current month
    const isCurrentMonth = 
      lastMonthDate.getFullYear() === now.getFullYear() && 
      lastMonthDate.getMonth() === now.getMonth();
    
    if (isCurrentMonth && lastPoint.hasData) {
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      
      // Only project if we're less than 80% through the month
      if (dayOfMonth < daysInMonth * 0.8) {
        const projectedValue = Math.round((lastPoint.value / dayOfMonth) * daysInMonth);
        
        const solidPoints = points.slice(0, -1);
        const projected: AggregatedPoint = {
          ...lastPoint,
          value: projectedValue,
          hasData: true,
        };
        
        if (solidPoints.length === 0) {
          return { points: [], projected };
        }
        
        return { points: solidPoints, projected };
      }
    }
    
    return { points, projected: null };
  };

  // Build data with adaptive bucketing based on time range
  // Returns: { primaryData, secondaryData (for month view), projectedPoint (for year/all) }
  const buildChartData = (): {
    primaryData: AggregatedPoint[];
    secondaryData: AggregatedPoint[] | null;
    projectedPoint?: AggregatedPoint | null;
  } => {
    if (Object.keys(volumeTrendData).length === 0) {
      return { primaryData: [], secondaryData: null };
    }

    const now = new Date();

    switch (timeRange) {
      case 'week': {
        // Last 7 days including today - daily points
        const points: AggregatedPoint[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
          const dateKey = formatLocalDate(date);
          const volume = volumeTrendData[dateKey] || 0;
          
          points.push({
            date: dateKey,
            value: Math.round(volume),
            label: date.toLocaleDateString(undefined, { weekday: 'short' }),
            hasData: volume > 0,
          });
        }
        return { primaryData: points, secondaryData: null };
      }

      case 'month': {
        // Current month - progressive display based on day of month
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayOfMonth = today.getDate();
        
        // Build daily data for the month
        const dailyPoints: AggregatedPoint[] = [];
        for (let d = new Date(firstOfMonth); d <= today; d.setDate(d.getDate() + 1)) {
          const dateKey = formatLocalDate(new Date(d));
          const volume = volumeTrendData[dateKey] || 0;
          
          dailyPoints.push({
            date: dateKey,
            value: Math.round(volume),
            label: d.getDate().toString(),
            hasData: volume > 0,
          });
        }
        
        // Phase 1: Days 1-7 - use daily values
        if (dayOfMonth <= 7) {
          return { primaryData: dailyPoints, secondaryData: null };
        }
        
        // Phase 2 & 3: Days 8+ - use 3-day buckets
        // Data points at: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28...
        const bucketedPoints: AggregatedPoint[] = [];
        
        // First point: just day 1
        if (dailyPoints.length > 0) {
          bucketedPoints.push({
            ...dailyPoints[0],
            label: '1',
          });
        }
        
        // Subsequent points: 3-day averages ending at 4, 7, 10, 13...
        for (let endDay = 4; endDay <= dayOfMonth; endDay += 3) {
          const startIdx = endDay - 3; // days are 1-indexed, array is 0-indexed
          const endIdx = endDay - 1;
          
          if (startIdx >= 0 && endIdx < dailyPoints.length) {
            const windowPoints = dailyPoints.slice(startIdx, endIdx + 1);
            const pointsWithData = windowPoints.filter(p => p.hasData);
            
            if (pointsWithData.length > 0) {
              const sum = pointsWithData.reduce((acc, p) => acc + p.value, 0);
              const avg = Math.round(sum / pointsWithData.length);
              
              bucketedPoints.push({
                date: dailyPoints[endIdx].date,
                value: avg,
                label: endDay.toString(),
                hasData: true,
              });
            } else {
              bucketedPoints.push({
                date: dailyPoints[endIdx].date,
                value: 0,
                label: endDay.toString(),
                hasData: false,
              });
            }
          }
        }
        
        return { primaryData: bucketedPoints, secondaryData: null };
      }

      case 'year': {
        // Year view - progressive data aggregation based on day of year
        const firstOfYear = new Date(now.getFullYear(), 0, 1);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayOfYear = Math.floor((today.getTime() - firstOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        // Phase 1: Days 1-7 - Daily data
        if (dayOfYear <= 7) {
          const dailyPoints: AggregatedPoint[] = [];
          for (let i = 0; i < dayOfYear; i++) {
            const date = new Date(now.getFullYear(), 0, i + 1);
            const dateKey = formatLocalDate(date);
            const volume = volumeTrendData[dateKey] || 0;
            
            dailyPoints.push({
              date: dateKey,
              value: Math.round(volume),
              label: (i + 1).toString(),
              hasData: volume > 0,
            });
          }
          return { primaryData: dailyPoints, secondaryData: null, projectedPoint: null };
        }
        
        // Phase 2: Days 8-31 (Jan 8-31) - 3-day averages
        if (dayOfYear <= 31) {
          const dailyPoints: AggregatedPoint[] = [];
          for (let i = 0; i < dayOfYear; i++) {
            const date = new Date(now.getFullYear(), 0, i + 1);
            const dateKey = formatLocalDate(date);
            const volume = volumeTrendData[dateKey] || 0;
            
            dailyPoints.push({
              date: dateKey,
              value: Math.round(volume),
              label: (i + 1).toString(),
              hasData: volume > 0,
            });
          }
          
          // Create 3-day buckets: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31
          const bucketedPoints: AggregatedPoint[] = [];
          
          // First point: just day 1
          if (dailyPoints.length > 0) {
            bucketedPoints.push({
              ...dailyPoints[0],
              label: '1',
            });
          }
          
          // Subsequent points: 3-day averages ending at 4, 7, 10, 13...
          for (let endDay = 4; endDay <= dayOfYear; endDay += 3) {
            const startIdx = endDay - 3;
            const endIdx = endDay - 1;
            
            if (startIdx >= 0 && endIdx < dailyPoints.length) {
              const windowPoints = dailyPoints.slice(startIdx, endIdx + 1);
              const pointsWithData = windowPoints.filter(p => p.hasData);
              
              if (pointsWithData.length > 0) {
                const sum = pointsWithData.reduce((acc, p) => acc + p.value, 0);
                const avg = Math.round(sum / pointsWithData.length);
                
                bucketedPoints.push({
                  date: dailyPoints[endIdx].date,
                  value: avg,
                  label: endDay.toString(),
                  hasData: true,
                });
              } else {
                bucketedPoints.push({
                  date: dailyPoints[endIdx].date,
                  value: 0,
                  label: endDay.toString(),
                  hasData: false,
                });
              }
            }
          }
          
          return { primaryData: bucketedPoints, secondaryData: null, projectedPoint: null };
        }
        
        // Phase 3+: Feb onwards - Weekly totals
        const weeklyPoints = aggregateByWeek(volumeTrendData, firstOfYear, today);
        
        // Filter out any weeks that start before Jan 1 (due to week alignment)
        const filteredPoints = weeklyPoints.filter(point => {
          const pointDate = new Date(point.date + 'T12:00:00');
          return pointDate.getFullYear() === now.getFullYear();
        });
        
        // Labels show week start date for phases 3-4, month for phases 5-6
        const currentMonth = now.getMonth(); // 0-indexed
        filteredPoints.forEach((point) => {
          const date = new Date(point.date + 'T12:00:00');
          if (currentMonth < 3) {
            // Phases 3-4 (Feb-Mar): Show date
            point.label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          } else {
            // Phases 5-6 (Apr onwards): Show month
            point.label = date.toLocaleDateString(undefined, { month: 'short' });
          }
        });
        
        return { primaryData: filteredPoints, secondaryData: null, projectedPoint: null };
      }

      case 'all': {
        // All time - progressive data aggregation based on data span
        const sortedDates = Object.keys(volumeTrendData).sort();
        
        if (sortedDates.length === 0) {
          return { primaryData: [], secondaryData: null };
        }
        
        const firstDate = new Date(sortedDates[0] + 'T12:00:00');
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const daysDiff = Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        // Phase 1: 1-7 days - Daily data
        if (daysDiff <= 7) {
          const dailyPoints: AggregatedPoint[] = [];
          for (let d = new Date(firstDate); d <= today; d.setDate(d.getDate() + 1)) {
            const dateKey = formatLocalDate(new Date(d));
            const volume = volumeTrendData[dateKey] || 0;
            
            dailyPoints.push({
              date: dateKey,
              value: Math.round(volume),
              label: d.toLocaleDateString(undefined, { weekday: 'short' }),
              hasData: volume > 0,
            });
          }
          return { primaryData: dailyPoints, secondaryData: null, projectedPoint: null };
        }
        
        // Phase 2: 8-21 days - 3-day averages
        if (daysDiff <= 21) {
          const dailyPoints: AggregatedPoint[] = [];
          for (let d = new Date(firstDate); d <= today; d.setDate(d.getDate() + 1)) {
            const dateKey = formatLocalDate(new Date(d));
            const volume = volumeTrendData[dateKey] || 0;
            
            dailyPoints.push({
              date: dateKey,
              value: Math.round(volume),
              label: d.getDate().toString(),
              hasData: volume > 0,
            });
          }
          
          // Create 3-day buckets
          const bucketedPoints = aggregateByNDays(dailyPoints, 3);
          return { primaryData: bucketedPoints, secondaryData: null, projectedPoint: null };
        }
        
        // Phase 3-5: 22-365 days - Weekly totals
        if (daysDiff <= 365) {
          const weeklyPoints = aggregateByWeek(volumeTrendData, firstDate, today);
          return { primaryData: weeklyPoints, secondaryData: null, projectedPoint: null };
        }
        
        // Phase 6+: 366+ days - Monthly totals
        const monthlyPoints = aggregateByMonth(volumeTrendData, firstDate, today);
        return { primaryData: monthlyPoints, secondaryData: null, projectedPoint: null };
      }

      default:
        return { primaryData: [], secondaryData: null };
    }
  };

  const { primaryData: completeData, secondaryData: dailyScatterData, projectedPoint } = buildChartData();

  // Build human-readable range label under the x-axis (split into main label and descriptor)
  const { rangeLabel, rangeDescriptor } = useMemo(() => {
    const now = new Date();

    const formatDayWithWeekday = (d: Date) =>
      d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

    switch (timeRange) {
      case 'week': {
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const start = new Date(end);
        start.setDate(end.getDate() - 6);
        const startStr = formatDayWithWeekday(start);
        const endStr = formatDayWithWeekday(end);
        return { rangeLabel: `${startStr}   -   ${endStr}`, rangeDescriptor: null };
      }
      case 'month': {
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const dayOfMonth = now.getDate();
        const descriptor = dayOfMonth <= 7 ? null : '3-day avg';
        return {
          rangeLabel: firstOfMonth.toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
          }),
          rangeDescriptor: descriptor,
        };
      }
      case 'year': {
        const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        let descriptor: string | null = null;
        if (dayOfYear <= 7) {
          descriptor = null;
        } else if (dayOfYear <= 31) {
          descriptor = '3-day avg';
        } else {
          descriptor = 'Weekly totals';
        }
        return { rangeLabel: `${now.getFullYear()}`, rangeDescriptor: descriptor };
      }
      case 'all': {
        const keys = Object.keys(volumeTrendData).sort();
        if (!keys.length) return { rangeLabel: null, rangeDescriptor: null };
        const startDate = new Date(keys[0] + 'T12:00:00');
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (isNaN(startDate.getTime())) return { rangeLabel: null, rangeDescriptor: null };
        const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        let descriptor: string | null = null;
        if (daysDiff <= 7) {
          descriptor = null;
        } else if (daysDiff <= 21) {
          descriptor = '3-day avg';
        } else if (daysDiff <= 365) {
          descriptor = 'Weekly totals';
        } else {
          descriptor = 'Monthly totals';
        }
        
        const startStr = startDate.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const endStr = today.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        return { rangeLabel: `${startStr} - ${endStr}`, rangeDescriptor: descriptor };
      }
      default:
        return { rangeLabel: null, rangeDescriptor: null };
    }
  }, [timeRange, volumeTrendData]);

  // Format data for Victory - include all points for accurate line
  const chartData = completeData.map((point, index) => ({
    x: index + 1,
    y: point.value,
    date: point.date, // Keep date for tick calculations
    dateLabel: point.label,
    hasData: point.hasData,
    index,
  }));

  // Find first and last points with data
  const firstDataIndex = chartData.findIndex(d => d.hasData);
  const lastDataIndex = chartData.map((d, i) => d.hasData ? i : -1).filter(i => i >= 0).pop() ?? -1;

  // Calculate Y-axis range (only from data points, not zeros)
  // Include projected point if exists
  const dataValues = chartData.filter(d => d.hasData).map(d => d.y);
  if (projectedPoint) {
    dataValues.push(projectedPoint.value);
  }
  const rawMax = Math.max(...dataValues, 0);
  const rawMin = Math.min(...dataValues, 0);
  
  // Round to nice numbers
  const allowedIncrements = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000];
  
  let targetMax = 100;
  let increment = 25;

  if (rawMax > 0) {
    for (const inc of allowedIncrements) {
      const segs = Math.ceil(rawMax / inc);
      if (segs >= 2 && segs <= 5) {
        targetMax = segs * inc;
        increment = inc;
        break;
      }
    }
    if (targetMax < rawMax) {
      targetMax = Math.ceil(rawMax / 1000) * 1000;
      increment = targetMax / 4;
    }
  }

  const yTickValues: number[] = [];
  for (let i = 0; i <= targetMax; i += increment) {
    yTickValues.push(i);
  }

  // Format volume numbers for labels
  const formatVolume = (value: number): string => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return Math.round(value).toString();
  };

  // Calculate the effective x-axis range
  const getEffectiveXRange = (): { min: number; max: number; extendedMax: number; extendedTicks: { x: number; label: string; date: string }[] } => {
    const totalPoints = chartData.length;
    const now = new Date();
    const extendedTicks: { x: number; label: string; date: string }[] = [];
    
    if (timeRange === 'year') {
      // Year view: Only extend for phases that need it (monthly tick phases)
      if (totalPoints === 0) {
        return { min: 1, max: 1, extendedMax: 1, extendedTicks };
      }
      
      const firstOfYear = new Date(now.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((now.getTime() - firstOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Phases 1-4 (Jan through Mar): No extension needed, ticks are within data range
      if (dayOfYear <= 90) {
        return { min: 1, max: totalPoints, extendedMax: totalPoints, extendedTicks };
      }
      
      // Phases 5-6 (Apr onwards): No extension needed, monthly ticks within data range
      return { min: 1, max: totalPoints, extendedMax: totalPoints, extendedTicks };
    }
    
    if (timeRange === 'all') {
      // All time: No extension needed - ticks are calculated within data range
      // The progressive tick system handles all phases without extending
      return { min: 1, max: totalPoints, extendedMax: totalPoints, extendedTicks };
    }
    
    return { min: 1, max: totalPoints, extendedMax: totalPoints, extendedTicks };
  };
  
  const xRange = getEffectiveXRange();

  // Helper function to get monthly tick positions for All Time view
  const getMonthlyTicks = (
    data: typeof chartData,
    startDate: Date,
    endDate: Date,
    monthStep: number
  ): number[] => {
    if (data.length === 0) return [1];
    
    const ticks: number[] = [];
    const firstDataDate = data[0].date ? new Date(data[0].date + 'T12:00:00') : startDate;
    const lastDataDate = data[data.length - 1].date 
      ? new Date(data[data.length - 1].date + 'T12:00:00') 
      : endDate;
    
    const msRange = lastDataDate.getTime() - firstDataDate.getTime();
    const totalRange = data.length - 1;
    
    // Get start and end months
    const startMonth = firstDataDate.getMonth();
    const startYear = firstDataDate.getFullYear();
    const endMonth = lastDataDate.getMonth();
    const endYear = lastDataDate.getFullYear();
    
    // Iterate through months at the specified step
    let currentDate = new Date(startYear, startMonth, 1);
    while (currentDate <= lastDataDate) {
      const progress = msRange > 0 
        ? Math.max(0, Math.min(1, (currentDate.getTime() - firstDataDate.getTime()) / msRange)) 
        : 0;
      const xPos = 1 + progress * totalRange;
      
      if (xPos >= 0.5 && xPos <= data.length + 0.5) {
        ticks.push(xPos);
      }
      
      // Move to next month at step interval
      currentDate.setMonth(currentDate.getMonth() + monthStep);
    }
    
    // Ensure we have at least the first tick
    if (ticks.length === 0) {
      ticks.push(1);
    }
    
    // Limit to max 7 ticks
    if (ticks.length > 7) {
      const step = Math.ceil(ticks.length / 7);
      const reducedTicks: number[] = [];
      for (let i = 0; i < ticks.length; i += step) {
        reducedTicks.push(ticks[i]);
      }
      // Always include last tick
      if (!reducedTicks.includes(ticks[ticks.length - 1])) {
        reducedTicks.push(ticks[ticks.length - 1]);
      }
      return reducedTicks.sort((a, b) => a - b);
    }
    
    return ticks.sort((a, b) => a - b);
  };

  // Smart x-axis tick logic - keep max ~7 ticks for clean display
  const getXTickValues = (): number[] => {
    const totalPoints = chartData.length;
    
    switch (timeRange) {
      case 'week':
        // Always show all 7 days - evenly spaced
        return chartData.map((_, idx) => idx + 1);
        
      case 'month': {
        // Month view: progressive tick display based on phase
        const now = new Date();
        const dayOfMonth = now.getDate();
        
        // Phase 1 (days 1-7): Show all data points (daily)
        if (dayOfMonth <= 7) {
          return chartData.map((_, idx) => idx + 1);
        }
        
        // Phase 2 (days 8-19): Show all data points (3-day buckets, ~7 points)
        if (dayOfMonth <= 19) {
          return chartData.map((_, idx) => idx + 1);
        }
        
        // Phase 3 (days 20+): Show every other data point (ticks at 1, 7, 13, 19, 25)
        // Data points are at indices 0, 1, 2, 3, 4, 5, 6, 7, 8... (days 1, 4, 7, 10, 13, 16, 19, 22, 25...)
        // We want ticks at indices 0, 2, 4, 6, 8 (days 1, 7, 13, 19, 25)
        const ticks: number[] = [];
        for (let i = 0; i < totalPoints; i += 2) {
          ticks.push(i + 1); // x values are 1-indexed
        }
        return ticks;
      }
        
      case 'year': {
        // Year view: progressive tick display based on day of year
        const now = new Date();
        const firstOfYear = new Date(now.getFullYear(), 0, 1);
        const dayOfYear = Math.floor((now.getTime() - firstOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const currentMonth = now.getMonth(); // 0-indexed
        
        if (chartData.length === 0) return [1];
        
        // Phase 1 (Jan 1-7): All daily ticks
        if (dayOfYear <= 7) {
          return chartData.map((_, idx) => idx + 1);
        }
        
        // Phase 2a (Jan 8-19): All 3-day bucket ticks
        if (dayOfYear <= 19) {
          return chartData.map((_, idx) => idx + 1);
        }
        
        // Phase 2b (Jan 20-31): Every other 3-day bucket (ticks at 1, 7, 13, 19, 25, 31)
        if (dayOfYear <= 31) {
          const ticks: number[] = [];
          for (let i = 0; i < totalPoints; i += 2) {
            ticks.push(i + 1);
          }
          return ticks;
        }
        
        // Phase 3 (Feb 1-17): Weekly ticks, all shown (~7 ticks)
        if (dayOfYear <= 48) {
          return chartData.map((_, idx) => idx + 1);
        }
        
        // Phase 4 (Feb 18 - Mar 31): Bi-weekly ticks
        if (dayOfYear <= 90) {
          const ticks: number[] = [];
          for (let i = 0; i < totalPoints; i += 2) {
            ticks.push(i + 1);
          }
          // Ensure last point is included
          if (totalPoints > 0 && !ticks.includes(totalPoints)) {
            ticks.push(totalPoints);
          }
          return ticks;
        }
        
        // Phases 5-6: Monthly and alternating monthly ticks
        // Calculate tick positions based on month boundaries
        const firstDate = chartData[0].date ? new Date(chartData[0].date + 'T12:00:00') : firstOfYear;
        const lastDataDate = chartData[totalPoints - 1].date 
          ? new Date(chartData[totalPoints - 1].date + 'T12:00:00') 
          : now;
        
        // Determine which months to show ticks for
        let tickMonths: number[] = [];
        
        if (currentMonth < 6) {
          // Phase 5a-5c (Apr-Jun): Monthly ticks up to current+1
          // Apr (month 3): Jan, Feb, Mar, Apr, May
          // May (month 4): Jan, Feb, Mar, Apr, May, Jun
          // Jun (month 5): Jan, Feb, Mar, Apr, May, Jun, Jul
          for (let m = 0; m <= currentMonth + 1; m++) {
            tickMonths.push(m);
          }
        } else if (currentMonth < 8) {
          // Phase 6a (Jul-Aug): Alternating months Jan, Mar, May, Jul, Sep
          tickMonths = [0, 2, 4, 6, 8]; // Jan, Mar, May, Jul, Sep
        } else if (currentMonth < 10) {
          // Phase 6b (Sep-Oct): Jan, Mar, May, Jul, Sep, Nov
          tickMonths = [0, 2, 4, 6, 8, 10]; // Jan, Mar, May, Jul, Sep, Nov
        } else {
          // Phase 6c (Nov-Dec): Jan, Mar, May, Jul, Sep, Nov
          tickMonths = [0, 2, 4, 6, 8, 10]; // Jan, Mar, May, Jul, Sep, Nov
        }
        
        // Calculate x positions for each month tick
        const ticks: number[] = [];
        const msRange = lastDataDate.getTime() - firstDate.getTime();
        const totalRange = totalPoints - 1;
        
        tickMonths.forEach(m => {
          const monthStart = new Date(now.getFullYear(), m, 1);
          
          // Only include months that are within or just beyond our data range
          if (monthStart <= lastDataDate || m <= currentMonth + 1) {
            const progress = msRange > 0 ? Math.max(0, (monthStart.getTime() - firstDate.getTime()) / msRange) : 0;
            const xPos = 1 + progress * totalRange;
            
            if (xPos >= 0.5 && xPos <= totalPoints + 0.5) {
              ticks.push(xPos);
            }
          }
        });
        
        // Ensure we have at least the first tick
        if (ticks.length === 0) {
          ticks.push(1);
        }
        
        return ticks.sort((a, b) => a - b);
      }
        
      case 'all': {
        // All time: progressive tick display based on data span (max 7 ticks)
        if (chartData.length === 0) return [1];
        
        // Calculate data span in days
        const sortedDates = Object.keys(volumeTrendData).sort();
        if (sortedDates.length === 0) return [1];
        
        const firstDate = new Date(sortedDates[0] + 'T12:00:00');
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const daysDiff = Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        // Phase 1: 1-7 days - All daily ticks
        if (daysDiff <= 7) {
          return chartData.map((_, idx) => idx + 1);
        }
        
        // Phase 2: 8-21 days - All 3-day bucket ticks (~7)
        if (daysDiff <= 21) {
          return chartData.map((_, idx) => idx + 1);
        }
        
        // Phase 3: 22-49 days - All weekly ticks (≤7 weeks)
        if (daysDiff <= 49) {
          return chartData.map((_, idx) => idx + 1);
        }
        
        // Phase 4: 50-90 days - Every other week (~4-7 ticks)
        if (daysDiff <= 90) {
          const ticks: number[] = [];
          for (let i = 0; i < totalPoints; i += 2) {
            ticks.push(i + 1);
          }
          if (totalPoints > 0 && !ticks.includes(totalPoints)) {
            ticks.push(totalPoints);
          }
          return ticks;
        }
        
        // Phase 5: 91-180 days - Monthly ticks (~3-6)
        if (daysDiff <= 180) {
          return getMonthlyTicks(chartData, firstDate, today, 1); // Every month
        }
        
        // Phase 6: 181-365 days - Bi-monthly ticks (~3-6)
        if (daysDiff <= 365) {
          return getMonthlyTicks(chartData, firstDate, today, 2); // Every 2 months
        }
        
        // Phase 7: 366-730 days - Quarterly ticks (~4-8)
        if (daysDiff <= 730) {
          return getMonthlyTicks(chartData, firstDate, today, 3); // Every 3 months
        }
        
        // Phase 8: 731+ days - Every 6 months (~4-6)
        return getMonthlyTicks(chartData, firstDate, today, 6); // Every 6 months
      }
        
      default:
        return chartData.map((_, idx) => idx + 1);
    }
  };

  const xTickValues = getXTickValues();

  // Format tick labels - interpolates calendar dates for even intervals
  const getXTickLabel = (index: number): string => {
    if (index < 0) return '';
    const xPos = index + 1; // Convert 0-based index to 1-based x position
    
    // Week view: use data point labels directly (days are evenly spaced)
    if (timeRange === 'week') {
      if (index < chartData.length) {
        return chartData[index].dateLabel;
      }
      return '';
    }
    
    // Year view: use data point labels or interpolate based on phase
    if (timeRange === 'year') {
      if (chartData.length === 0) return '';
      
      const now = new Date();
      const firstOfYear = new Date(now.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((now.getTime() - firstOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Phases 1-2 (Jan): Use data point labels directly (day numbers)
      if (dayOfYear <= 31) {
        const dataIndex = Math.round(index);
        if (dataIndex >= 0 && dataIndex < chartData.length) {
          return chartData[dataIndex].dateLabel;
        }
        return '';
      }
      
      // Phases 3-4 (Feb-Mar): Use data point labels (week dates)
      if (dayOfYear <= 90) {
        const dataIndex = Math.round(index);
        if (dataIndex >= 0 && dataIndex < chartData.length) {
          return chartData[dataIndex].dateLabel;
        }
        return '';
      }
      
      // Phases 5-6 (Apr onwards): Interpolate month based on x position
      const firstDate = chartData[0].date ? new Date(chartData[0].date + 'T12:00:00') : firstOfYear;
      const lastDate = chartData[chartData.length - 1].date 
        ? new Date(chartData[chartData.length - 1].date + 'T12:00:00') 
        : now;
      
      const totalRange = chartData.length - 1;
      const progress = totalRange > 0 ? (xPos - 1) / totalRange : 0;
      const interpolatedMs = firstDate.getTime() + progress * (lastDate.getTime() - firstDate.getTime());
      const interpolatedDate = new Date(interpolatedMs);
      
      return interpolatedDate.toLocaleDateString(undefined, { month: 'short' });
    }
    
    // Month view: use data point labels directly (they contain the day number)
    if (timeRange === 'month') {
      const dataIndex = Math.round(index);
      if (dataIndex >= 0 && dataIndex < chartData.length) {
        return chartData[dataIndex].dateLabel;
      }
      return '';
    }
    
    // All Time view: use data point labels or interpolate based on phase
    if (timeRange === 'all') {
      if (chartData.length === 0) return '';
      
      // Calculate data span
      const sortedDates = Object.keys(volumeTrendData).sort();
      if (sortedDates.length === 0) return '';
      
      const firstDateAll = new Date(sortedDates[0] + 'T12:00:00');
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const daysDiff = Math.floor((today.getTime() - firstDateAll.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Phases 1-4 (≤90 days): Use data point labels directly
      if (daysDiff <= 90) {
        const dataIndex = Math.round(index);
        if (dataIndex >= 0 && dataIndex < chartData.length) {
          return chartData[dataIndex].dateLabel;
        }
        return '';
      }
      
      // Phases 5+ (>90 days): Interpolate date based on x position
      const firstDate = chartData[0].date ? new Date(chartData[0].date + 'T12:00:00') : firstDateAll;
      const lastDate = chartData[chartData.length - 1].date 
        ? new Date(chartData[chartData.length - 1].date + 'T12:00:00') 
        : today;
      
      const totalRange = chartData.length - 1;
      const progress = totalRange > 0 ? (xPos - 1) / totalRange : 0;
      const interpolatedMs = firstDate.getTime() + progress * (lastDate.getTime() - firstDate.getTime());
      const interpolatedDate = new Date(interpolatedMs);
      
      // Format based on span
      if (daysDiff <= 365) {
        return interpolatedDate.toLocaleDateString(undefined, { month: 'short' });
      } else {
        return interpolatedDate.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      }
    }
    
    // Fallback: use data point label
    if (index < chartData.length) {
      return chartData[index].dateLabel;
    }
    return '';
  };

  // Determine which scatter points to show (first, last, and selected with data)
  const visibleScatterData = chartData.filter((point, index) => {
    if (!point.hasData) return false;
    if (firstDataIndex === -1 || lastDataIndex === -1) return false;
    if (index === firstDataIndex || index === lastDataIndex) return true;
    return selectedIndex !== null && index === selectedIndex;
  });

  return (
    <ChartWrapper
      state="ready"
      minHeight={CHART_HEIGHT + 40}
    >
      <View style={styles.container}>
        <View style={styles.chartContainer}>
          <VictoryChart
            theme={VictoryTheme.material}
            domainPadding={{ x: 0, y: 20 }}
            padding={{ top: 20, bottom: 50, left: 20, right: 20 }}
            height={CHART_HEIGHT}
            width={CHART_WIDTH}
            domain={{
              x: [0.8, xRange.extendedMax + 0.2],
              y: [0, targetMax],
            }}
          >
            {/* X-axis */}
            <VictoryAxis
              tickValues={xTickValues}
              tickFormat={(t) => getXTickLabel(t - 1)}
              style={{
                axis: { stroke: colors.border.light, strokeWidth: 1 },
                tickLabels: { 
                  fill: colors.text.secondary, 
                  fontSize: 9,
                  padding: 5,
                  angle: 0,
                },
                grid: { stroke: 'none' },
              }}
            />
            
            {/* Y-axis */}
            <VictoryAxis
              dependentAxis
              tickValues={yTickValues}
              tickFormat={() => ''}
              style={{
                axis: { stroke: 'none' },
                ticks: { stroke: 'none' },
                tickLabels: { fill: 'transparent' },
                grid: { 
                  stroke: colors.border.light,
                  strokeWidth: 1,
                  strokeDasharray: '4, 4',
                },
              }}
            />

            {/* Primary line - rolling average for month, aggregated for others */}
            <VictoryLine
              data={chartData.filter(d => d.hasData)}
              style={{
                data: {
                  stroke: colors.accent.orange,
                  strokeWidth: 3,
                },
              }}
              interpolation="monotoneX"
            />


            {/* Invisible scatter to capture taps and select points */}
            <VictoryScatter
              data={chartData}
              size={12}
              style={{
                data: {
                  fill: 'transparent',
                },
              }}
              events={[
                {
                  target: 'data',
                  eventHandlers: {
                    onPressIn: (_evt, props) => {
                      const index = props.index;
                      if (chartData[index]?.hasData) {
                        setSelectedIndex((current) => (current === index ? null : index));
                      }
                      return [];
                    },
                  },
                },
              ]}
            />

            {/* Visible data points with volume labels (first, last, and selected with data) */}
            <VictoryScatter
              data={visibleScatterData}
              size={5}
              labels={({ datum }) => (datum.hasData ? formatVolume(datum.y) : '')}
              labelComponent={
                <VictoryLabel
                  dy={({ datum }) => {
                    const idx = (datum as any)?.index ?? chartData.findIndex(d => d.x === datum.x && d.y === datum.y);

                    // Find nearest previous and next *data* points (skip days with no volume)
                    let prev: typeof chartData[number] | undefined;
                    for (let i = idx - 1; i >= 0; i--) {
                      if (chartData[i].hasData) {
                        prev = chartData[i];
                        break;
                      }
                    }

                    let next: typeof chartData[number] | undefined;
                    for (let i = idx + 1; i < chartData.length; i++) {
                      if (chartData[i].hasData) {
                        next = chartData[i];
                        break;
                      }
                    }

                    const y = typeof datum?.y === 'number' ? datum.y : 0;

                    // Default offsets (no overlap with point marker) - adjusted for smaller pill
                    const aboveOffset = -14;
                    const belowOffset = 18;

                    if (!targetMax || targetMax <= 0) return aboveOffset + 2;

                    const isLeftEndpoint = idx === firstDataIndex;
                    const isRightEndpoint = idx === lastDataIndex;

                    // Endpoint logic (relative to nearest data point inwards)
                    if (isLeftEndpoint && next) {
                      if (next.y > y) return belowOffset + 2; // rising from left -> pill below
                      if (next.y < y) return aboveOffset + 2; // falling from left -> pill above
                    }

                    if (isRightEndpoint && prev) {
                      if (prev.y > y) return belowOffset + 2; // coming down into endpoint -> pill below
                      if (prev.y < y) return aboveOffset + 2; // coming up into endpoint -> pill above
                    }

                    // Interior peaks/troughs based on nearest data neighbors
                    const isPeak = () => {
                      if (!prev || !next) return false;
                      return prev.y < y && next.y < y;
                    };

                    const isTrough = () => {
                      if (!prev || !next) return false;
                      return prev.y > y && next.y > y;
                    };

                    if (isPeak()) return aboveOffset + 2;
                    if (isTrough()) return belowOffset + 2;

                    // Slope case: use height ratio as tie‑breaker (current behavior)
                    const ratio = y / targetMax;
                    return ratio < 0.35 ? belowOffset + 2 : aboveOffset + 2;
                  }}
                  backgroundPadding={{ left: 6, right: 6, top: 4, bottom: 2 }}
                  backgroundStyle={{
                    fill: '#FFFFFF',
                    opacity: 0.98,
                    stroke: colors.accent.orange,
                    strokeWidth: 0.5,
                    rx: 8,
                    ry: 8,
                  }}
                />
              }
              style={{
                data: {
                  fill: colors.accent.orange,
                },
                labels: {
                  fill: colors.text.primary,
                  fontSize: 10,
                  fontWeight: '600',
                },
              }}
            />
          </VictoryChart>
        </View>
        {rangeLabel && (
          <View style={{ marginTop: spacing.xs, alignItems: 'center' }}>
            <Text variant="caption" color="secondary">
              {rangeLabel}
            </Text>
            {rangeDescriptor && (
              <Text variant="caption" color="tertiary" style={{ marginTop: 2 }}>
                {rangeDescriptor}
              </Text>
            )}
          </View>
        )}
      </View>
    </ChartWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  chartContainer: {
    alignItems: 'center',
    position: 'relative',
  },
});
