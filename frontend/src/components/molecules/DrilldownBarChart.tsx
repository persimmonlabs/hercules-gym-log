/**
 * DrilldownBarChart
 * Bar chart with drill-down capability for volume data
 * Similar to FractalBubbleChart but displays as bar chart
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTheme } from 'victory-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { ChartWrapper } from '@/components/atoms/ChartWrapper';
import { colors, spacing, radius } from '@/constants/theme';
import { useSettingsStore } from '@/store/settingsStore';
import type { HierarchicalSetData, ChartSlice } from '@/types/analytics';
import hierarchyData from '@/data/hierarchy.json';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 2;
const CHART_HEIGHT = 220;

interface DrilldownBarChartProps {
  data: HierarchicalSetData;
  rootGroup: string;
}

interface BreadcrumbItem {
  name: string;
  level: 'L1' | 'L2' | 'L3';
}

// Strip prefix from detailed muscle names
const getDisplayName = (fullName: string): string => {
  if (fullName === 'Hamstrings') return 'Hams.';
  if (fullName.includes(' - ')) {
    return fullName.split(' - ')[1];
  }
  return fullName;
};

export const DrilldownBarChart: React.FC<DrilldownBarChartProps> = ({
  data,
  rootGroup,
}) => {
  // Use reactive selector for unit
  const weightUnit = useSettingsStore((state) => state.weightUnit);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { name: rootGroup, level: 'L1' },
  ]);
  const [selectedBar, setSelectedBar] = useState<{ label: string; value: number } | null>(null);

  // Generate a unique key for the chart based on breadcrumb path
  // This forces VictoryChart to fully re-render and clear any stale state
  const chartKey = useMemo(() => {
    return breadcrumb.map(b => `${b.level}-${b.name}`).join('/');
  }, [breadcrumb]);

  // Get expected children from hierarchy for current level
  const expectedChildren = useMemo((): string[] => {
    const current = breadcrumb[breadcrumb.length - 1];
    const hierarchy = hierarchyData.muscle_hierarchy as any;
    
    if (current.level === 'L1') {
      // L1 -> get L2 children (e.g., Upper Body -> Chest, Back, Shoulders, Arms)
      return Object.keys(hierarchy[current.name]?.muscles || {});
    } else if (current.level === 'L2') {
      // L2 -> get L3 children (e.g., Arms -> Biceps, Triceps, Forearms)
      const l1Name = breadcrumb[0].name;
      const l3Children = hierarchy[l1Name]?.muscles?.[current.name]?.muscles || {};
      const l3Names = Object.keys(l3Children);
      
      // Special case: if L3 has same name as L2 (e.g., Calves -> Calves),
      // return L4 children directly to skip redundant level
      if (l3Names.length === 1 && l3Names[0] === current.name) {
        return Object.keys(l3Children[current.name]?.muscles || {});
      }
      return l3Names;
    } else if (current.level === 'L3') {
      // L3 -> get L4 children (e.g., Biceps -> Long Head, Short Head, Brachialis)
      const l1Name = breadcrumb[0].name;
      const l2Name = breadcrumb.length > 1 ? breadcrumb[1].name : '';
      return Object.keys(hierarchy[l1Name]?.muscles?.[l2Name]?.muscles?.[current.name]?.muscles || {});
    }
    return [];
  }, [breadcrumb]);

  // Get current level's data, ensuring all expected children are included
  const currentData = useMemo((): ChartSlice[] => {
    const current = breadcrumb[breadcrumb.length - 1];
    let key = `${current.level}:${current.name}`;
    
    // Special case: for L3 where L2 and L3 have same name (e.g., Calves),
    // the data is stored under L2 key, not L3
    if (current.level === 'L3' && breadcrumb.length > 1) {
      const l2Name = breadcrumb[1].name;
      if (l2Name === current.name) {
        key = `L2:${current.name}`;
      }
    }
    
    const rawData = data.byParent[key] || [];
    
    // Create a map of existing data
    const dataMap = new Map(rawData.map(d => [d.name, d]));
    
    // Include all expected children, with 0 values for missing ones
    return expectedChildren.map((name, index) => {
      const existing = dataMap.get(name);
      if (existing) {
        return existing;
      }
      // Return placeholder with 0 value
      return {
        name,
        value: 0,
        percentage: 0,
        color: colors.neutral.gray400,
      };
    });
  }, [breadcrumb, data, expectedChildren]);

  // Check if we can drill down further
  const canDrillDown = useCallback(
    (name: string): boolean => {
      const current = breadcrumb[breadcrumb.length - 1];
      let nextLevel: 'L2' | 'L3' | null = null;

      if (current.level === 'L1') nextLevel = 'L2';
      else if (current.level === 'L2') nextLevel = 'L3';

      if (!nextLevel) return false;

      // Check for data at the next level
      let key = `${nextLevel}:${name}`;
      let children = data.byParent[key];
      
      // Special case: for same-name L2/L3 (e.g., Calves), data is under L2 key
      if (!children?.length && nextLevel === 'L3' && current.name === name) {
        key = `L2:${name}`;
        children = data.byParent[key];
      }
      
      return children && children.length > 0;
    },
    [breadcrumb, data]
  );

  // Handle bar press - drill down if possible
  const handleBarPress = useCallback(
    (label: string, value: number) => {
      triggerHaptic('light');

      if (selectedBar?.label === label) {
        // Second tap - try to drill down
        if (canDrillDown(label)) {
          const current = breadcrumb[breadcrumb.length - 1];
          let nextLevel: 'L2' | 'L3' = current.level === 'L1' ? 'L2' : 'L3';
          setBreadcrumb([...breadcrumb, { name: label, level: nextLevel }]);
          setSelectedBar(null);
        } else {
          // No children - just deselect
          setSelectedBar(null);
        }
      } else {
        // First tap - select bar (deselect any previous)
        setSelectedBar({ label, value });
      }
    },
    [selectedBar, canDrillDown, breadcrumb]
  );

  // Handle breadcrumb navigation
  const handleBreadcrumbPress = useCallback((index: number) => {
    triggerHaptic('light');
    setBreadcrumb((prev) => prev.slice(0, index + 1));
    setSelectedBar(null);
  }, []);

  // Calculate Y-axis ticks
  const rawMax = Math.max(...currentData.map((d) => d.value), 0);
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

  // Create chart data with consistent ordering
  const chartData = currentData.map((d, index) => ({
    x: index + 1, // Use numeric index for proper bar positioning
    y: d.value,
    originalName: d.name,
    canDrill: canDrillDown(d.name),
  }));
  
  // Categories for x-axis labels
  const xCategories = currentData.map(d => getDisplayName(d.name));


  // Check for data
  const hasData = currentData.length > 0 && rawMax > 0;

  const headerTitle = useMemo((): string => {
    if (breadcrumb.length === 1) return rootGroup;
    return breadcrumb[breadcrumb.length - 1].name;
  }, [breadcrumb, rootGroup]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="heading3" color="primary">
          {headerTitle}
        </Text>
      </View>

      {/* Breadcrumb - always visible unless empty state */}
      {hasData && (
        <View style={styles.breadcrumbContainer}>
          {breadcrumb.map((item, index) => (
            <View key={`${item.level}-${item.name}`} style={styles.breadcrumbItem}>
              {index > 0 && (
                <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
              )}
              <Pressable
                onPress={() => handleBreadcrumbPress(index)}
                style={[
                  styles.breadcrumbButton,
                  index === breadcrumb.length - 1 && styles.breadcrumbButtonActive,
                ]}
              >
                <Text
                  variant="caption"
                  color={index === breadcrumb.length - 1 ? 'primary' : 'tertiary'}
                >
                  {item.name}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Chart */}
      {!hasData ? (
        <View style={styles.emptyContainer}>
          <Text variant="body" color="secondary">
            No workout data available yet.
          </Text>
          <Text variant="caption" color="tertiary">
            Complete workouts to see your volume.
          </Text>
        </View>
      ) : (
        <ChartWrapper state="ready" minHeight={CHART_HEIGHT + 40}>
          <View style={styles.chartContainer}>
            <VictoryChart
              key={chartKey}
              theme={VictoryTheme.material}
              domainPadding={{ x: 30 }}
              padding={{ top: 30, bottom: 50, left: 20, right: 20 }}
              height={CHART_HEIGHT}
              width={CHART_WIDTH}
            >
              <VictoryAxis
                tickValues={chartData.map((d) => d.x)}
                tickFormat={(t, index) => xCategories[index] || ''}
                style={{
                  axis: { stroke: 'none' },
                  tickLabels: {
                    fill: colors.text.primary,
                    fontSize: 11,
                    padding: 5,
                    angle: chartData.length > 5 ? -45 : 0,
                    textAnchor: chartData.length > 5 ? 'end' : 'middle',
                  },
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
                labels={({ datum }) => datum.y > 0 ? (datum.y >= 1000 ? `${(datum.y / 1000).toFixed(1)}k` : Math.round(datum.y).toString()) : ''}
                style={{
                  data: {
                    fill: (args: any) =>
                      selectedBar?.label === args.datum?.originalName
                        ? colors.accent.orangeLight
                        : colors.accent.orange,
                    width: Math.min(32, (CHART_WIDTH - 100) / chartData.length - 8),
                  },
                  labels: {
                    fill: colors.text.primary,
                    fontSize: 10,
                    fontWeight: '600',
                  },
                }}
                cornerRadius={{ top: 4 }}
                events={[
                  {
                    target: 'data',
                    eventHandlers: {
                      onPressIn: () => [
                        {
                          mutation: (props: any) => {
                            handleBarPress(props.datum.originalName, props.datum.y);
                            return null;
                          },
                        },
                      ],
                    },
                  },
                ]}
              />
            </VictoryChart>

          </View>

          {/* Drill down hint below chart */}
          {selectedBar && canDrillDown(selectedBar.label) && (
            <View style={styles.drillHint}>
              <Ionicons name="finger-print-outline" size={14} color={colors.text.tertiary} />
              <Text variant="caption" color="tertiary">Tap again to explore</Text>
            </View>
          )}

        </ChartWrapper>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  breadcrumbButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  breadcrumbButtonActive: {
    backgroundColor: colors.glass.light,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  chartContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  drillHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
});
