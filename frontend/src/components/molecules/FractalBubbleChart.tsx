/**
 * FractalDonutChart
 * Interactive donut chart with drill-down capability
 * Uses orange color with opacity based on index
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { VictoryPie } from 'victory-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { colors, spacing, radius } from '@/constants/theme';
import type { HierarchicalSetData, ChartSlice } from '@/types/analytics';

const PIE_SIZE = 240;

interface FractalBubbleChartProps {
  data: HierarchicalSetData;
  onMusclePress?: (muscleName: string) => void;
  /** Optional: Start at a specific L1 group (e.g., "Upper Body", "Lower Body", "Core") */
  rootGroup?: string;
}

interface BreadcrumbItem {
  name: string;
  level: 'root' | 'L1' | 'L2' | 'L3';
}

// Orange with opacity based on index (sorted by value)
const getOrangeShade = (index: number, total: number): string => {
  if (total <= 1) return 'rgba(255, 107, 74, 1.0)';
  const ratio = index / (total - 1);
  const opacity = 1.0 - ratio * 0.7;
  return `rgba(255, 107, 74, ${opacity})`;
};

// Strip prefix from detailed muscle names for cleaner display
// e.g., "Biceps - Long Head" -> "Long Head", "Calves - Medial Head" -> "Medial Head"
const getDisplayName = (fullName: string): string => {
  if (fullName.includes(' - ')) {
    return fullName.split(' - ')[1];
  }
  return fullName;
};

export const FractalBubbleChart: React.FC<FractalBubbleChartProps> = ({ data, onMusclePress, rootGroup }) => {
  // If rootGroup is provided, start at L1 level with that group
  const initialBreadcrumb: BreadcrumbItem[] = rootGroup 
    ? [{ name: rootGroup, level: 'L1' }]
    : [{ name: 'Overview', level: 'root' }];
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>(initialBreadcrumb);
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);

  // Get current level's data with RELATIVE percentages (sum to 100%)
  const currentData = useMemo((): ChartSlice[] => {
    const current = breadcrumb[breadcrumb.length - 1];
    let rawData: ChartSlice[] = current.level === 'root' 
      ? data.root 
      : data.byParent[`${current.level}:${current.name}`] || [];
    
    const totalValue = rawData.reduce((sum, item) => sum + item.value, 0);
    return rawData
      .map(item => ({ ...item, percentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0 }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [breadcrumb, data]);

  const hasChildren = useCallback((name: string): boolean => {
    const current = breadcrumb[breadcrumb.length - 1];
    // Determine the next level based on current level
    // root -> L1, L1 -> L2, L2 -> L3, L3 -> null (L4 is the deepest, no further drill-down)
    const nextLevel = current.level === 'root' ? 'L1' 
      : current.level === 'L1' ? 'L2' 
      : current.level === 'L2' ? 'L3' 
      : null;
    if (!nextLevel) return false;
    const children = data.byParent[`${nextLevel}:${name}`];
    return children && children.length > 0;
  }, [breadcrumb, data]);

  const handleSlicePress = useCallback((name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (selectedSlice === name) {
      // Second tap - drill down or navigate
      if (hasChildren(name)) {
        const current = breadcrumb[breadcrumb.length - 1];
        // Determine the next level based on current level
        const nextLevel = current.level === 'root' ? 'L1' 
          : current.level === 'L1' ? 'L2' 
          : current.level === 'L2' ? 'L3' 
          : 'L3'; // Fallback, shouldn't reach here if hasChildren is false
        setBreadcrumb([...breadcrumb, { name, level: nextLevel as any }]);
        setSelectedSlice(null);
      } else {
        onMusclePress?.(name);
      }
    } else {
      setSelectedSlice(name);
    }
  }, [selectedSlice, hasChildren, breadcrumb, onMusclePress]);

  const handleBreadcrumbPress = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBreadcrumb(breadcrumb.slice(0, index + 1));
    setSelectedSlice(null);
  }, [breadcrumb]);

  // Prepare chart data with colors
  const chartData = useMemo(() => {
    return currentData.map((item, index) => ({
      x: item.name,
      y: item.percentage,
      color: getOrangeShade(index, currentData.length),
    }));
  }, [currentData]);

  const colorScale = chartData.map(d => d.color);

  const getCurrentGroupName = (): string => {
    const current = breadcrumb[breadcrumb.length - 1];
    if (current.level === 'root') return 'All Muscle Groups';
    // For L1 level when it's the root (rootGroup mode), just show the group name
    if (current.level === 'L1' && breadcrumb.length === 1) return current.name;
    return current.name;
  };

  const getSubtitle = (): string => {
    const current = breadcrumb[breadcrumb.length - 1];
    if (current.level === 'root') return 'Tap slice to select, tap again to drill down';
    // For L1 level when it's the starting point (rootGroup mode)
    if (current.level === 'L1' && breadcrumb.length === 1) return 'Tap slice to select, tap again to drill down';
    if (current.level === 'L1') return 'Muscle group breakdown';
    if (current.level === 'L2') return 'Specific muscles';
    return 'Detailed breakdown';
  };

  // Check if we have data - for rootGroup mode, check the L1 data
  const hasData = rootGroup 
    ? (data.byParent[`L1:${rootGroup}`] && data.byParent[`L1:${rootGroup}`].length > 0)
    : (data.root && data.root.length > 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="heading3" color="primary" style={styles.headerTitle}>
          {getCurrentGroupName()}
        </Text>
      </View>

      <View style={styles.breadcrumbContainer}>
        {breadcrumb.map((item, index) => (
          <View key={`${item.level}-${item.name}`} style={styles.breadcrumbItem}>
            {index > 0 && <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />}
            <Pressable
              onPress={() => handleBreadcrumbPress(index)}
              style={[styles.breadcrumbButton, index === breadcrumb.length - 1 && styles.breadcrumbButtonActive]}
            >
              <Text variant="caption" color={index === breadcrumb.length - 1 ? 'primary' : 'tertiary'}>
                {item.name}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>

      {!hasData ? (
        <View style={styles.emptyContainer}>
          <Text variant="body" color="secondary" style={styles.emptyText}>No workout data available</Text>
        </View>
      ) : currentData.length > 0 ? (
        <>
          <Animated.View key={breadcrumb.map(b => b.name).join('-')} entering={FadeIn.duration(200)} style={styles.chartContainer}>
            <VictoryPie
              data={chartData}
              width={PIE_SIZE + 40}
              height={PIE_SIZE + 40}
              colorScale={colorScale}
              innerRadius={58}
              radius={({ datum }) => selectedSlice === datum.x ? PIE_SIZE / 2 + 8 : PIE_SIZE / 2}
              padAngle={2}
              style={{
                data: {
                  fill: ({ datum }) => selectedSlice && selectedSlice !== datum.x ? colors.neutral.gray200 : datum.color,
                },
                labels: { fill: 'transparent' },
              }}
              events={[{
                target: 'data',
                eventHandlers: {
                  onPressIn: () => [{
                    target: 'data',
                    mutation: (props) => {
                      handleSlicePress(props.datum.x);
                      return null;
                    },
                  }],
                },
              }]}
            />

            {/* Selected slice info in center */}
            {selectedSlice && (
              <View style={styles.selectedInfo}>
                <Text variant="labelMedium" color="primary" numberOfLines={1}>{getDisplayName(selectedSlice)}</Text>
                <Text variant="heading2" color="primary">
                  {Math.round(currentData.find(d => d.name === selectedSlice)?.percentage || 0)}%
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Drill down hint below donut */}
          {selectedSlice && hasChildren(selectedSlice) && (
            <View style={styles.drillHint}>
              <Ionicons name="finger-print-outline" size={14} color={colors.text.tertiary} />
              <Text variant="caption" color="tertiary">Tap again to explore</Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.noDataContainer}>
          <Text variant="body" color="secondary">No data at this level</Text>
          <Pressable onPress={() => handleBreadcrumbPress(breadcrumb.length - 2)} style={styles.goBackButton}>
            <Ionicons name="arrow-back" size={16} color={colors.accent.orange} />
            <Text variant="caption" color="secondary">Go back</Text>
          </Pressable>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legendContainer}>
        {currentData.map((item, index) => {
          const isSelected = selectedSlice === item.name;
          const isDimmed = selectedSlice !== null && !isSelected;
          const canDrill = hasChildren(item.name);

          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.legendItem, { opacity: isDimmed ? 0.4 : 1 }]}
              onPress={() => handleSlicePress(item.name)}
            >
              <View style={[styles.legendDot, { backgroundColor: getOrangeShade(index, currentData.length) }]} />
              <Text variant="caption" color="primary" style={styles.legendText} numberOfLines={1}>
                {getDisplayName(item.name)}
              </Text>
              {canDrill && <Ionicons name="chevron-forward" size={12} color={colors.text.tertiary} />}
              <Text variant="caption" color="secondary">{Math.round(item.percentage)}%</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  header: {
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    alignItems: 'center',
  },
  headerTitle: {
    textAlign: 'center',
  },
  headerSubtitle: {
    textAlign: 'center',
  },
  breadcrumbContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, paddingVertical: spacing.xs },
  breadcrumbItem: { flexDirection: 'row', alignItems: 'center' },
  breadcrumbButton: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm },
  breadcrumbButtonActive: { backgroundColor: colors.neutral.gray200 },
  chartContainer: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  selectedInfo: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 120 },
  drillHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, paddingTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, backgroundColor: colors.surface.subtle, borderRadius: radius.sm, gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { maxWidth: 80 },
  emptyContainer: { padding: spacing.lg, alignItems: 'center', gap: spacing.xs },
  emptyText: { textAlign: 'center' },
  noDataContainer: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg, minHeight: 200 },
  goBackButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.neutral.gray200 },
});
