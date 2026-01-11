/**
 * SimpleVolumeDistributionChart
 * High-tier only donut chart for dashboard (Upper/Lower/Core)
 * Shows volume distribution (weight × reps × muscle_weighting)
 * Simplified version without carousel for the main Performance screen
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { VictoryPie } from 'victory-native';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { ChartWrapper } from '@/components/atoms/ChartWrapper';
import { TimeRangeSelector } from '@/components/atoms/TimeRangeSelector';
import { colors, spacing, radius } from '@/constants/theme';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { TIME_RANGE_SUBTITLES } from '@/types/analytics';
import type { ChartSlice, TimeRange } from '@/types/analytics';

const PIE_SIZE = 240;
const EMPTY_MIN_HEIGHT = 240;

// Orange with opacity based on index (sorted by value)
const getOrangeShade = (index: number, total: number): string => {
  if (total <= 1) return 'rgba(255, 107, 74, 1.0)';
  const ratio = index / (total - 1);
  const opacity = 1.0 - ratio * 0.7;
  return `rgba(255, 107, 74, ${opacity})`;
};

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
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const { tieredVolumeDistribution, hasFilteredData } = useAnalyticsData({ timeRange });
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);
  
  // Reset time range to 'week' when page gains focus
  useFocusEffect(
    useCallback(() => {
      setTimeRange('week');
      setSelectedSlice(null);
    }, [])
  );

  const data = tieredVolumeDistribution.high;

  const handleSelectSlice = useCallback((name: string) => {
    triggerHaptic('light');
    setSelectedSlice((prev) => (prev === name ? null : name));
  }, []);

  // Prepare Victory data with orange color scheme
  const chartData = data.map((item, index) => ({
    x: item.name,
    y: item.percentage,
    color: getOrangeShade(index, data.length),
  }));

  const colorScale = chartData.map((d) => d.color);
  const chartState = !hasFilteredData ? 'empty' : 'ready';
  const emptyMessage = `No workout data for ${TIME_RANGE_SUBTITLES[timeRange].toLowerCase()}.`;

  return (
    <View style={styles.container}>
      <View style={styles.selectorContainer}>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </View>

      <ChartWrapper
        state={chartState}
        emptyMessage={emptyMessage}
        minHeight={chartState === 'empty' ? EMPTY_MIN_HEIGHT : PIE_SIZE + 140}
      >
        <View style={styles.chartContainer}>
          <VictoryPie
            data={chartData}
            width={PIE_SIZE + 40}
            height={PIE_SIZE + 40}
            colorScale={colorScale}
            innerRadius={58}
            startAngle={0}
            endAngle={-360}
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

          {/* Selected slice info in center */}
          {selectedSlice && (
            <View style={styles.selectedInfo}>
              <Text variant="labelMedium" color="primary" numberOfLines={1}>{selectedSlice}</Text>
              <Text variant="heading2" color="primary">
                {Math.round(data.find(d => d.name === selectedSlice)?.percentage || 0)}%
              </Text>
            </View>
          )}
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
      </ChartWrapper>
    </View>
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
    position: 'relative',
  },
  selectedInfo: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
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
