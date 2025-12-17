/**
 * SimpleVolumeDistributionChart
 * High-tier only donut chart for dashboard (Upper/Lower/Core)
 * Shows volume distribution (weight × reps × muscle_weighting)
 * Simplified version without carousel for the main Performance screen
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { VictoryPie } from 'victory-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { ChartWrapper } from '@/components/atoms/ChartWrapper';
import { TimeRangeSelector } from '@/components/atoms/TimeRangeSelector';
import { colors, spacing, radius } from '@/constants/theme';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import type { ChartSlice, TimeRange } from '@/types/analytics';

const PIE_SIZE = 180;

interface LegendItemProps {
  item: ChartSlice;
  isSelected: boolean;
  isDimmed: boolean;
  onPress: () => void;
}

const LegendItem: React.FC<LegendItemProps> = ({ item, isSelected, isDimmed, onPress }) => (
  <TouchableOpacity
    style={[styles.legendItem, { opacity: isDimmed ? 0.3 : 1 }]}
    onPress={onPress}
  >
    <View style={[styles.legendColor, { backgroundColor: item.color }]} />
    <Text variant="caption" color="primary">{item.name}</Text>
    <Text variant="caption" color="secondary"> {Math.round(item.percentage)}%</Text>
  </TouchableOpacity>
);

export const SimpleDistributionChart: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const { tieredVolumeDistribution, hasFilteredData } = useAnalyticsData({ timeRange });
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);

  const data = tieredVolumeDistribution.high;

  const handleSelectSlice = useCallback((name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSlice((prev) => (prev === name ? null : name));
  }, []);

  // Determine chart state
  const chartState = !hasFilteredData ? 'empty' : 'ready';

  // Prepare Victory data
  const chartData = data.map((item) => ({
    x: item.name,
    y: item.percentage,
    color: item.color,
  }));

  const colorScale = chartData.map((d) => d.color);

  return (
    <ChartWrapper
      state={chartState}
      emptyMessage="No workout data yet. Complete a workout to see your distribution!"
      minHeight={PIE_SIZE + 140}
    >
      <View style={styles.container}>
        <View style={styles.selectorContainer}>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </View>
        <View style={styles.chartContainer}>
          <VictoryPie
            data={chartData}
            width={PIE_SIZE + 40}
            height={PIE_SIZE + 40}
            colorScale={colorScale}
            innerRadius={40}
            radius={({ datum }) =>
              selectedSlice === datum.x ? PIE_SIZE / 2 + 8 : PIE_SIZE / 2
            }
            padAngle={2}
            style={{
              data: {
                fill: ({ datum }) =>
                  selectedSlice && selectedSlice !== datum.x
                    ? colors.neutral.gray200
                    : datum.color,
              },
              labels: { fill: 'transparent' },
            }}
            events={[
              {
                target: 'data',
                eventHandlers: {
                  onPressIn: () => [
                    {
                      target: 'data',
                      mutation: (props) => {
                        handleSelectSlice(props.datum.x);
                        return null;
                      },
                    },
                  ],
                },
              },
            ]}
          />
        </View>

        <View style={styles.legend}>
          {data.map((item, index) => (
            <LegendItem
              key={index}
              item={item}
              isSelected={selectedSlice === item.name}
              isDimmed={selectedSlice !== null && selectedSlice !== item.name}
              onPress={() => handleSelectSlice(item.name)}
            />
          ))}
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
  selectorContainer: {
    marginBottom: spacing.md,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: spacing.xs,
  },
});
