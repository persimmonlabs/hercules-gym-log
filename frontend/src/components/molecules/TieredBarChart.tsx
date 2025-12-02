/**
 * TieredBarChart
 * Reusable bar chart for volume data at any tier level
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTheme } from 'victory-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { ChartWrapper } from '@/components/atoms/ChartWrapper';
import { colors, spacing, radius } from '@/constants/theme';
import type { BarChartData } from '@/types/analytics';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const CHART_HEIGHT = 220;

interface TieredBarChartProps {
  data: BarChartData[];
  title?: string;
  unit?: string;
  onBarPress?: (label: string) => void;
}

export const TieredBarChart: React.FC<TieredBarChartProps> = ({
  data,
  title,
  unit = 'lbs',
  onBarPress,
}) => {
  const [selectedBar, setSelectedBar] = useState<{ label: string; value: number } | null>(null);

  // Calculate Y-axis ticks
  const rawMax = Math.max(...data.map((d) => d.value), 0);
  const increments = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000];

  let targetMax = 100;
  let increment = 25;

  if (rawMax > 0) {
    for (const inc of increments) {
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

  const chartData = data.map((d) => ({
    x: d.displayLabel || d.label,
    y: d.value,
    originalLabel: d.label,
  }));

  const handleBarPress = useCallback((label: string, value: number, originalLabel: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBar((prev) => (prev?.label === label ? null : { label, value }));
    if (onBarPress) {
      onBarPress(originalLabel);
    }
  }, [onBarPress]);

  const chartState = data.length === 0 || rawMax === 0 ? 'empty' : 'ready';

  return (
    <ChartWrapper state={chartState} emptyMessage="No volume data available" minHeight={CHART_HEIGHT + 40}>
      <View style={styles.container}>
        {title && (
          <Text variant="heading3" color="primary" style={styles.title}>
            {title}
          </Text>
        )}

        <View style={styles.chartContainer}>
          <VictoryChart
            theme={VictoryTheme.material}
            domainPadding={{ x: 30 }}
            padding={{ top: 20, bottom: 50, left: 55, right: 20 }}
            height={CHART_HEIGHT}
            width={CHART_WIDTH}
          >
            <VictoryAxis
              tickValues={chartData.map((d) => d.x)}
              style={{
                axis: { stroke: 'none' },
                tickLabels: {
                  fill: colors.text.primary,
                  fontSize: 9,
                  padding: 5,
                  angle: data.length > 5 ? -45 : 0,
                  textAnchor: data.length > 5 ? 'end' : 'middle',
                },
                grid: { stroke: 'none' },
              }}
            />
            <VictoryAxis
              dependentAxis
              tickValues={yTickValues}
              tickFormat={(t) => (t >= 1000 ? `${t / 1000}k` : `${Math.round(t)}`)}
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
                  width: Math.min(32, (CHART_WIDTH - 100) / data.length - 8),
                },
              }}
              cornerRadius={{ top: 4 }}
              animate={{ duration: 400, onLoad: { duration: 400 } }}
              events={[
                {
                  target: 'data',
                  eventHandlers: {
                    onPressIn: () => [
                      {
                        target: 'data',
                        mutation: (props) => {
                          handleBarPress(props.datum.x, props.datum.y, props.datum.originalLabel);
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
                {selectedBar.label}: {Math.round(selectedBar.value).toLocaleString()} {unit}
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
  title: {
    marginBottom: spacing.sm,
    textAlign: 'center',
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
