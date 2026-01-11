/**
 * DistributionCharts
 * Multiple chart visualizations for muscle set distribution
 * Quick prototypes for comparison
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { colors, spacing, radius } from '@/constants/theme';
import type { HierarchicalSetData } from '@/types/analytics';

interface DistributionChartsProps {
  data: HierarchicalSetData;
  onMusclePress?: (muscleName: string) => void;
}

type ChartType = 'bar' | 'treemap' | 'radial' | 'stacked' | 'bubble';

const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: 'bar', label: 'Bar' },
  { id: 'treemap', label: 'Treemap' },
  { id: 'radial', label: 'Radial' },
  { id: 'stacked', label: 'Stacked' },
  { id: 'bubble', label: 'Bubble' },
];

// Color palette for charts
const CHART_COLORS = [
  colors.accent.orange,
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
];

const getColor = (index: number): string => CHART_COLORS[index % CHART_COLORS.length];

// ============================================
// 1. HORIZONTAL BAR CHART
// ============================================
const BarChart: React.FC<{ data: HierarchicalSetData; onPress?: (name: string) => void }> = ({ 
  data, 
  onPress 
}) => {
  const maxPercentage = Math.max(...data.root.map(d => d.percentage), 1);

  return (
    <View style={barStyles.container}>
      <Text variant="labelMedium" color="primary" style={barStyles.title}>
        Horizontal Bar Chart
      </Text>
      {data.root.map((item, index) => (
        <Pressable
          key={item.name}
          style={barStyles.row}
          onPress={() => {
            triggerHaptic('light');
            onPress?.(item.name);
          }}
        >
          <Text variant="caption" color="primary" style={barStyles.label}>
            {item.name}
          </Text>
          <View style={barStyles.barContainer}>
            <View
              style={[
                barStyles.bar,
                {
                  width: `${(item.percentage / maxPercentage) * 100}%`,
                  backgroundColor: getColor(index),
                },
              ]}
            />
          </View>
          <Text variant="caption" color="secondary" style={barStyles.value}>
            {Math.round(item.percentage)}%
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

const barStyles = StyleSheet.create({
  container: { gap: spacing.sm },
  title: { marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { width: 70, fontSize: 11 },
  barContainer: { flex: 1, height: 20, backgroundColor: colors.neutral.gray200, borderRadius: radius.sm },
  bar: { height: '100%', borderRadius: radius.sm },
  value: { width: 35, textAlign: 'right', fontSize: 11 },
});

// ============================================
// 2. TREEMAP
// ============================================
const Treemap: React.FC<{ data: HierarchicalSetData; onPress?: (name: string) => void }> = ({ 
  data, 
  onPress 
}) => {
  const total = data.root.reduce((sum, d) => sum + d.percentage, 0) || 1;
  
  // Simple treemap layout - just rows
  const items = data.root.map((item, index) => ({
    ...item,
    color: getColor(index),
    widthPercent: (item.percentage / total) * 100,
  }));

  return (
    <View style={treemapStyles.container}>
      <Text variant="labelMedium" color="primary" style={treemapStyles.title}>
        Treemap
      </Text>
      <View style={treemapStyles.grid}>
        {items.map((item) => (
          <Pressable
            key={item.name}
            style={[
              treemapStyles.cell,
              {
                width: `${Math.max(item.widthPercent, 15)}%`,
                backgroundColor: item.color,
              },
            ]}
            onPress={() => {
              triggerHaptic('light');
              onPress?.(item.name);
            }}
          >
            <Text variant="caption" color="primary" style={treemapStyles.cellText}>
              {item.name}
            </Text>
            <Text variant="labelMedium" color="primary" style={treemapStyles.cellValue}>
              {Math.round(item.percentage)}%
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const treemapStyles = StyleSheet.create({
  container: { gap: spacing.sm },
  title: { marginBottom: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, minHeight: 150 },
  cell: { 
    padding: spacing.sm, 
    borderRadius: radius.sm, 
    minHeight: 60,
    justifyContent: 'space-between',
  },
  cellText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  cellValue: { fontSize: 14, color: '#fff', fontWeight: '700' },
});

// ============================================
// 3. RADIAL/DONUT CHART
// ============================================
const RadialChart: React.FC<{ data: HierarchicalSetData; onPress?: (name: string) => void }> = ({ 
  data, 
  onPress 
}) => {
  const total = data.root.reduce((sum, d) => sum + d.percentage, 0) || 1;
  const size = 180;
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  let currentAngle = 0;
  const segments = data.root.map((item, index) => {
    const angle = (item.percentage / total) * 360;
    const segment = {
      ...item,
      color: getColor(index),
      startAngle: currentAngle,
      angle,
      dashArray: `${(item.percentage / total) * circumference} ${circumference}`,
      rotation: currentAngle - 90,
    };
    currentAngle += angle;
    return segment;
  });

  return (
    <View style={radialStyles.container}>
      <Text variant="labelMedium" color="primary" style={radialStyles.title}>
        Radial / Donut Chart
      </Text>
      <View style={radialStyles.chartContainer}>
        <View style={[radialStyles.chart, { width: size, height: size }]}>
          {segments.map((seg, i) => (
            <View
              key={seg.name}
              style={[
                radialStyles.segment,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderWidth: strokeWidth,
                  borderColor: 'transparent',
                  borderTopColor: seg.color,
                  borderRightColor: seg.angle > 90 ? seg.color : 'transparent',
                  borderBottomColor: seg.angle > 180 ? seg.color : 'transparent',
                  borderLeftColor: seg.angle > 270 ? seg.color : 'transparent',
                  transform: [{ rotate: `${seg.rotation}deg` }],
                },
              ]}
            />
          ))}
          <View style={radialStyles.centerHole} />
        </View>
        <View style={radialStyles.legend}>
          {segments.map((seg) => (
            <Pressable
              key={seg.name}
              style={radialStyles.legendItem}
              onPress={() => {
                triggerHaptic('light');
                onPress?.(seg.name);
              }}
            >
              <View style={[radialStyles.legendDot, { backgroundColor: seg.color }]} />
              <Text variant="caption" color="primary" style={radialStyles.legendText}>
                {seg.name}
              </Text>
              <Text variant="caption" color="secondary">
                {Math.round(seg.percentage)}%
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
};

const radialStyles = StyleSheet.create({
  container: { gap: spacing.sm },
  title: { marginBottom: spacing.xs },
  chartContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chart: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  segment: { position: 'absolute' },
  centerHole: { 
    position: 'absolute', 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    backgroundColor: colors.surface.card 
  },
  legend: { flex: 1, gap: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { flex: 1, fontSize: 11 },
});

// ============================================
// 4. STACKED BAR CHART
// ============================================
const StackedChart: React.FC<{ data: HierarchicalSetData; onPress?: (name: string) => void }> = ({ 
  data, 
  onPress 
}) => {
  const total = data.root.reduce((sum, d) => sum + d.percentage, 0) || 1;

  return (
    <View style={stackedStyles.container}>
      <Text variant="labelMedium" color="primary" style={stackedStyles.title}>
        Stacked Bar Chart
      </Text>
      <View style={stackedStyles.barContainer}>
        {data.root.map((item, index) => (
          <Pressable
            key={item.name}
            style={[
              stackedStyles.segment,
              {
                width: `${(item.percentage / total) * 100}%`,
                backgroundColor: getColor(index),
              },
            ]}
            onPress={() => {
              triggerHaptic('light');
              onPress?.(item.name);
            }}
          />
        ))}
      </View>
      <View style={stackedStyles.legend}>
        {data.root.map((item, index) => (
          <View key={item.name} style={stackedStyles.legendItem}>
            <View style={[stackedStyles.legendDot, { backgroundColor: getColor(index) }]} />
            <Text variant="caption" color="primary" style={stackedStyles.legendText}>
              {item.name}
            </Text>
            <Text variant="caption" color="secondary">
              {Math.round(item.percentage)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const stackedStyles = StyleSheet.create({
  container: { gap: spacing.sm },
  title: { marginBottom: spacing.xs },
  barContainer: { 
    flexDirection: 'row', 
    height: 40, 
    borderRadius: radius.md, 
    overflow: 'hidden',
    backgroundColor: colors.neutral.gray200,
  },
  segment: { height: '100%' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11 },
});

// ============================================
// 5. BUBBLE CHART
// ============================================
const BubbleChart: React.FC<{ data: HierarchicalSetData; onPress?: (name: string) => void }> = ({ 
  data, 
  onPress 
}) => {
  const maxPercentage = Math.max(...data.root.map(d => d.percentage), 1);
  const minSize = 40;
  const maxSize = 90;

  return (
    <View style={bubbleStyles.container}>
      <Text variant="labelMedium" color="primary" style={bubbleStyles.title}>
        Bubble Chart
      </Text>
      <View style={bubbleStyles.bubbleContainer}>
        {data.root.map((item, index) => {
          const size = minSize + ((item.percentage / maxPercentage) * (maxSize - minSize));
          return (
            <Pressable
              key={item.name}
              style={[
                bubbleStyles.bubble,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: getColor(index),
                },
              ]}
              onPress={() => {
                triggerHaptic('light');
                onPress?.(item.name);
              }}
            >
              <Text variant="caption" color="primary" style={bubbleStyles.bubbleText}>
                {item.name.split(' ')[0]}
              </Text>
              <Text variant="labelMedium" color="primary" style={bubbleStyles.bubbleValue}>
                {Math.round(item.percentage)}%
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const bubbleStyles = StyleSheet.create({
  container: { gap: spacing.sm },
  title: { marginBottom: spacing.xs },
  bubbleContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 180,
    paddingVertical: spacing.md,
  },
  bubble: { 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: spacing.xs,
  },
  bubbleText: { fontSize: 9, color: '#fff', fontWeight: '600', textAlign: 'center' },
  bubbleValue: { fontSize: 12, color: '#fff', fontWeight: '700' },
});

// ============================================
// MAIN COMPONENT WITH SELECTOR
// ============================================
export const DistributionCharts: React.FC<DistributionChartsProps> = ({
  data,
  onMusclePress,
}) => {
  const [selectedChart, setSelectedChart] = useState<ChartType>('bar');

  const handleChartChange = (type: ChartType) => {
    triggerHaptic('light');
    setSelectedChart(type);
  };

  // Empty state
  if (!data.root || data.root.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="body" color="secondary" style={styles.emptyText}>
          No workout data available yet.
        </Text>
        <Text variant="caption" color="tertiary">
          Complete workouts to see your distribution.
        </Text>
      </View>
    );
  }

  const renderChart = () => {
    switch (selectedChart) {
      case 'bar':
        return <BarChart data={data} onPress={onMusclePress} />;
      case 'treemap':
        return <Treemap data={data} onPress={onMusclePress} />;
      case 'radial':
        return <RadialChart data={data} onPress={onMusclePress} />;
      case 'stacked':
        return <StackedChart data={data} onPress={onMusclePress} />;
      case 'bubble':
        return <BubbleChart data={data} onPress={onMusclePress} />;
      default:
        return <BarChart data={data} onPress={onMusclePress} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Chart Type Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.selectorScroll}
        contentContainerStyle={styles.selectorContent}
      >
        {CHART_TYPES.map((type) => (
          <Pressable
            key={type.id}
            style={[
              styles.selectorButton,
              selectedChart === type.id && styles.selectorButtonActive,
            ]}
            onPress={() => handleChartChange(type.id)}
          >
            <Text
              variant="caption"
              color={selectedChart === type.id ? 'primary' : 'tertiary'}
            >
              {type.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Selected Chart */}
      <Animated.View entering={FadeIn.duration(200)} key={selectedChart}>
        {renderChart()}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  selectorScroll: {
    marginHorizontal: -spacing.md,
  },
  selectorContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  selectorButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.neutral.gray200,
  },
  selectorButtonActive: {
    backgroundColor: colors.accent.orange,
  },
  emptyContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
});
