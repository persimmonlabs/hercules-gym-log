/**
 * TieredPieChart
 * Reusable pie/donut chart for any tier level with wrapped legend
 * Groups small slices (<3%) into "Other" category
 * Legend displays all items visible at once without scrolling
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { VictoryPie } from 'victory-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { ChartWrapper } from '@/components/atoms/ChartWrapper';
import { colors, spacing, radius } from '@/constants/theme';
import type { ChartSlice } from '@/types/analytics';

const PIE_SIZE = 200;
const OTHER_THRESHOLD = 0.03; // 3%

interface TieredPieChartProps {
  data: ChartSlice[];
  title?: string;
  showOtherGroup?: boolean;
  onSlicePress?: (sliceName: string) => void;
}

export const TieredPieChart: React.FC<TieredPieChartProps> = ({
  data,
  title,
  showOtherGroup = true,
  onSlicePress,
}) => {
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);

  // Group small slices into "Other"
  const processedData = useMemo(() => {
    if (!showOtherGroup || data.length === 0) return data;

    const totalPercentage = data.reduce((sum, d) => sum + d.percentage, 0);
    const threshold = totalPercentage * OTHER_THRESHOLD;

    const mainSlices: ChartSlice[] = [];
    let otherValue = 0;
    let otherPercentage = 0;

    data.forEach((slice) => {
      if (slice.percentage >= threshold) {
        mainSlices.push(slice);
      } else {
        otherValue += slice.value;
        otherPercentage += slice.percentage;
      }
    });

    if (otherPercentage > 0) {
      mainSlices.push({
        name: 'Other',
        value: otherValue,
        percentage: otherPercentage,
        color: colors.neutral.gray400,
      });
    }

    return mainSlices;
  }, [data, showOtherGroup]);

  const handleSelectSlice = useCallback((name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSlice((prev) => (prev === name ? null : name));
    if (onSlicePress && name !== 'Other') {
      onSlicePress(name);
    }
  }, [onSlicePress]);

  const chartState = data.length === 0 ? 'empty' : 'ready';

  const chartData = processedData.map((item) => ({
    x: item.name,
    y: item.percentage,
    color: item.color,
  }));

  const colorScale = chartData.map((d) => d.color);

  return (
    <ChartWrapper state={chartState} emptyMessage="No data available" minHeight={PIE_SIZE + 80}>
      <View style={styles.container}>
        {title && (
          <Text variant="heading3" color="primary" style={styles.title}>
            {title}
          </Text>
        )}

        <View style={styles.chartContainer}>
          <VictoryPie
            data={chartData}
            width={PIE_SIZE + 40}
            height={PIE_SIZE + 40}
            colorScale={colorScale}
            innerRadius={45}
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

        {/* Legend - wrapped to show all items without scrolling */}
        <View style={styles.legendContainer}>
          {processedData.map((item, index) => {
            const isSelected = selectedSlice === item.name;
            const isDimmed = selectedSlice !== null && !isSelected;

            return (
              <TouchableOpacity
                key={index}
                style={[styles.legendItem, { opacity: isDimmed ? 0.4 : 1 }]}
                onPress={() => handleSelectSlice(item.name)}
              >
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text variant="caption" color="primary" style={styles.legendText}>
                  {item.name}
                </Text>
                <Text variant="caption" color="secondary">
                  {Math.round(item.percentage)}%
                </Text>
              </TouchableOpacity>
            );
          })}
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
  title: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface.subtle,
    borderRadius: radius.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  legendText: {
    marginRight: spacing.xs,
  },
});
