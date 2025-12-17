/**
 * SimpleVolumeChart
 * High-tier only bar chart for dashboard (Upper/Lower/Core)
 * Simplified version without carousel for the main Performance screen
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTheme } from 'victory-native';

import { Text } from '@/components/atoms/Text';
import { ChartWrapper } from '@/components/atoms/ChartWrapper';
import { colors, spacing, radius } from '@/constants/theme';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { TIME_RANGE_SUBTITLES } from '@/types/analytics';
import { useSettingsStore } from '@/store/settingsStore';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.xl * 2 - spacing.md * 2;
const CHART_HEIGHT = 200;

interface SimpleVolumeChartProps {
  timeRange?: 'week' | 'month' | 'year' | 'all';
}

export const SimpleVolumeChart: React.FC<SimpleVolumeChartProps> = ({ timeRange = 'week' }) => {
  const { weeklyVolume, hasFilteredData } = useAnalyticsData({ timeRange });
  const weightUnit = useSettingsStore((state) => state.weightUnit);

  const data = weeklyVolume.high;

  // Calculate Y-axis ticks
  const rawMax = Math.max(...data.map((d) => d.value), 0);
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

  const xCategories = data.map((d) => d.label.replace('\n', ' '));
  const chartData = data.map((d, index) => ({
    x: index + 1,
    y: d.value,
  }));
  const chartState = !hasFilteredData ? 'empty' : 'ready';
  const emptyMessage = `No workout data for ${TIME_RANGE_SUBTITLES[timeRange].toLowerCase()}.`;

  return (
    <ChartWrapper
      state={chartState}
      emptyMessage={emptyMessage}
      minHeight={CHART_HEIGHT + 40}
    >
      <View style={styles.container}>
        <View style={styles.chartContainer}>
          <VictoryChart
            theme={VictoryTheme.material}
            domainPadding={{ x: 30 }}
            padding={{ top: 30, bottom: 40, left: 20, right: 20 }}
            height={CHART_HEIGHT}
            width={CHART_WIDTH}
          >
            <VictoryAxis
              tickValues={chartData.map((d) => d.x)}
              tickFormat={(t, index) => xCategories[index] || ''}
              style={{
                axis: { stroke: 'none' },
                tickLabels: { fill: colors.text.primary, fontSize: 11, padding: 5 },
                grid: { stroke: 'none' },
              }}
            />
            <VictoryAxis
              dependentAxis
              tickValues={yTickValues}
              tickFormat={() => ''}
              style={{
                axis: { stroke: 'none' },
                ticks: { stroke: 'none' },
                tickLabels: { fill: 'transparent' },
                grid: { stroke: 'none' },
              }}
            />
            <VictoryBar
              data={chartData}
              labels={({ datum }) =>
                datum.y > 0
                  ? datum.y >= 1000
                    ? `${(datum.y / 1000).toFixed(1)}k`
                    : Math.round(datum.y).toString()
                  : ''
              }
              style={{
                data: {
                  fill: colors.accent.orange,
                  width: Math.min(32, (CHART_WIDTH - 100) / chartData.length - 8),
                },
                labels: {
                  fill: colors.text.primary,
                  fontSize: 10,
                  fontWeight: '600',
                },
              }}
              cornerRadius={{ top: 4 }}
            />
          </VictoryChart>
        </View>
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
