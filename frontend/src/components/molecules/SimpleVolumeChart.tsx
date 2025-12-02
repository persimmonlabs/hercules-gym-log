/**
 * SimpleVolumeChart
 * High-tier only bar chart for dashboard (Upper/Lower/Core)
 * Simplified version without carousel for the main Performance screen
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTheme } from 'victory-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { ChartWrapper } from '@/components/atoms/ChartWrapper';
import { colors, spacing, radius } from '@/constants/theme';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { TIME_RANGE_SUBTITLES } from '@/types/analytics';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.xl * 2 - spacing.md * 2;
const CHART_HEIGHT = 200;

interface SimpleVolumeChartProps {
  timeRange?: 'week' | 'month' | 'year' | 'all';
}

export const SimpleVolumeChart: React.FC<SimpleVolumeChartProps> = ({ timeRange = 'week' }) => {
  const { weeklyVolume, hasFilteredData } = useAnalyticsData({ timeRange });
  const [selectedBar, setSelectedBar] = useState<{ label: string; value: number } | null>(null);

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

  const chartData = data.map((d) => ({ x: d.label, y: d.value }));
  const chartState = !hasFilteredData ? 'empty' : 'ready';
  const emptyMessage = `No workout data for ${TIME_RANGE_SUBTITLES[timeRange].toLowerCase()}.`;

  const handleBarPress = useCallback((label: string, value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBar((prev) => (prev?.label === label ? null : { label, value }));
  }, []);

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
            domainPadding={{ x: 40 }}
            padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
            height={CHART_HEIGHT}
            width={CHART_WIDTH}
          >
            <VictoryAxis
              tickValues={data.map((d) => d.label)}
              style={{
                axis: { stroke: 'none' },
                tickLabels: { fill: colors.text.primary, fontSize: 10, padding: 5 },
                grid: { stroke: 'none' },
              }}
            />
            <VictoryAxis
              dependentAxis
              tickValues={yTickValues}
              tickFormat={(t) => `${Math.round(t)}`}
              style={{
                axis: { stroke: 'none' },
                tickLabels: { fill: colors.text.secondary, fontSize: 10, padding: 5 },
                grid: { stroke: colors.neutral.gray200, strokeDasharray: '4, 4' },
              }}
            />
            <VictoryBar
              data={chartData}
              style={{
                data: {
                  fill: colors.accent.orange,
                  width: 36,
                },
              }}
              cornerRadius={{ top: 6 }}
              animate={{ duration: 400, onLoad: { duration: 400 } }}
              events={[
                {
                  target: 'data',
                  eventHandlers: {
                    onPressIn: () => [
                      {
                        target: 'data',
                        mutation: (props) => {
                          handleBarPress(props.datum.x, props.datum.y);
                          return null;
                        },
                      },
                    ],
                  },
                },
              ]}
            />
          </VictoryChart>

          {/* Tooltip */}
          {selectedBar && (
            <View style={styles.tooltip}>
              <Text variant="caption" color="primary">
                {selectedBar.label.replace('\n', ' ')}: {Math.round(selectedBar.value).toLocaleString()} lbs
              </Text>
            </View>
          )}
        </View>

        {/* Dismiss overlay */}
        {selectedBar && (
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedBar(null)}
            activeOpacity={1}
          />
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
  tooltip: {
    position: 'absolute',
    top: 10,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
});
