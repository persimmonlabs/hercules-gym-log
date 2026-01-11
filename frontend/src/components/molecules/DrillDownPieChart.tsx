/**
 * DrillDownPieChart
 * Split-view hierarchical pie chart with parent + child visible together
 * 
 * Shows a mini overview chart on the left and detailed breakdown on the right.
 * Tap slices in the detail chart to drill deeper.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { VictoryPie } from 'victory-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { ChartWrapper } from '@/components/atoms/ChartWrapper';
import { colors, spacing, radius } from '@/constants/theme';
import type { ChartSlice, HierarchicalSetData, DrillDownPath } from '@/types/analytics';

const MINI_PIE_SIZE = 100;
const MAIN_PIE_SIZE = 160;
const OTHER_THRESHOLD = 0.03; // 3%

interface DrillDownPieChartProps {
  data: HierarchicalSetData;
  onMusclePress?: (muscleName: string) => void;
}

/**
 * Get label for the current detail level
 */
const getDetailLabel = (path: DrillDownPath[]): string => {
  if (path.length === 0) return 'Body Regions';
  const lastLevel = path[path.length - 1].level;
  switch (lastLevel) {
    case 'high':
      return `${path[path.length - 1].name} Breakdown`;
    case 'mid':
      return `${path[path.length - 1].name} Details`;
    case 'low':
      return `${path[path.length - 1].name} Detailed`;
    default:
      return 'Breakdown';
  }
};

/**
 * Group small slices into "Other"
 */
const groupSmallSlices = (slices: ChartSlice[]): ChartSlice[] => {
  if (slices.length === 0) return slices;

  const totalPercentage = slices.reduce((sum, d) => sum + d.percentage, 0);
  const threshold = totalPercentage * OTHER_THRESHOLD;

  const mainSlices: ChartSlice[] = [];
  let otherValue = 0;
  let otherPercentage = 0;

  slices.forEach((slice) => {
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
};

export const DrillDownPieChart: React.FC<DrillDownPieChartProps> = ({
  data,
  onMusclePress,
}) => {
  // Navigation path - each entry represents a drill-down level
  const [path, setPath] = useState<DrillDownPath[]>([]);
  const [selectedInMini, setSelectedInMini] = useState<string | null>(null);
  const [selectedInMain, setSelectedInMain] = useState<string | null>(null);

  // Get parent chart data (one level up or root)
  const parentData = useMemo((): ChartSlice[] => {
    if (path.length === 0) {
      return data.root;
    }
    if (path.length === 1) {
      return data.root;
    }
    // Get parent's parent data
    const parentPath = path[path.length - 2];
    let key = '';
    switch (parentPath.level) {
      case 'high':
        key = `L1:${parentPath.name}`;
        break;
      case 'mid':
        key = `L2:${parentPath.name}`;
        break;
      default:
        return data.root;
    }
    return data.byParent[key] || data.root;
  }, [data, path]);

  // Get current detail chart data
  const detailData = useMemo((): ChartSlice[] => {
    if (path.length === 0) {
      return data.root;
    }

    const lastPath = path[path.length - 1];
    let key = '';
    
    switch (lastPath.level) {
      case 'high':
        key = `L1:${lastPath.name}`;
        break;
      case 'mid':
        key = `L2:${lastPath.name}`;
        break;
      case 'low':
        key = `L3:${lastPath.name}`;
        break;
      default:
        return [];
    }

    return data.byParent[key] || [];
  }, [data, path]);

  // Check if a slice can drill down further
  const canDrillDown = useCallback((sliceName: string, fromPath: DrillDownPath[]): boolean => {
    if (sliceName === 'Other') return false;
    
    let nextKey = '';
    if (fromPath.length === 0) {
      nextKey = `L1:${sliceName}`;
    } else {
      const lastPath = fromPath[fromPath.length - 1];
      switch (lastPath.level) {
        case 'high':
          nextKey = `L2:${sliceName}`;
          break;
        case 'mid':
          nextKey = `L3:${sliceName}`;
          break;
        default:
          return false;
      }
    }

    const nextData = data.byParent[nextKey];
    return nextData && nextData.length > 0;
  }, [data]);

  // Handle tap on mini chart - navigate to that level
  const handleMiniChartPress = useCallback((sliceName: string) => {
    triggerHaptic('light');
    
    if (sliceName === 'Other') return;

    // If at root, drill into this body region
    if (path.length === 0) {
      if (canDrillDown(sliceName, [])) {
        setPath([{ name: sliceName, level: 'high' }]);
        setSelectedInMini(sliceName);
        setSelectedInMain(null);
      }
    } else if (path.length === 1) {
      // Tapping on root level mini chart - switch to different body region
      if (canDrillDown(sliceName, [])) {
        setPath([{ name: sliceName, level: 'high' }]);
        setSelectedInMini(sliceName);
        setSelectedInMain(null);
      }
    } else {
      // Navigate to parent of current selection
      const parentSlice = path[path.length - 2];
      if (parentSlice.name === sliceName) {
        // Already viewing this, just highlight
        setSelectedInMini(sliceName);
      } else {
        // Switch to different sibling
        const newPath = path.slice(0, -1);
        newPath[newPath.length - 1] = { ...newPath[newPath.length - 1], name: sliceName };
        setPath(newPath);
        setSelectedInMini(sliceName);
        setSelectedInMain(null);
      }
    }
  }, [path, canDrillDown]);

  // Handle tap on main detail chart - drill deeper
  const handleDetailChartPress = useCallback((sliceName: string) => {
    triggerHaptic('light');
    
    if (sliceName === 'Other') {
      setSelectedInMain(sliceName);
      return;
    }

    // Determine next level
    let nextLevel: DrillDownPath['level'];
    if (path.length === 0) {
      nextLevel = 'high';
    } else {
      const lastLevel = path[path.length - 1].level;
      switch (lastLevel) {
        case 'high':
          nextLevel = 'mid';
          break;
        case 'mid':
          nextLevel = 'low';
          break;
        default:
          // At lowest level, trigger callback
          if (onMusclePress) {
            onMusclePress(sliceName);
          }
          setSelectedInMain(sliceName);
          return;
      }
    }

    // Check if we can drill down
    if (canDrillDown(sliceName, path)) {
      setPath((prev) => [...prev, { name: sliceName, level: nextLevel }]);
      setSelectedInMini(sliceName);
      setSelectedInMain(null);
    } else {
      // No children, just select or trigger callback
      setSelectedInMain((prev) => (prev === sliceName ? null : sliceName));
      if (onMusclePress) {
        onMusclePress(sliceName);
      }
    }
  }, [path, canDrillDown, onMusclePress]);

  // Handle back button
  const handleBack = useCallback(() => {
    triggerHaptic('light');
    setPath((prev) => prev.slice(0, -1));
    setSelectedInMini(null);
    setSelectedInMain(null);
  }, []);

  // Handle breadcrumb navigation
  const handleBreadcrumbPress = useCallback((index: number) => {
    triggerHaptic('light');
    if (index === -1) {
      setPath([]);
    } else {
      setPath((prev) => prev.slice(0, index + 1));
    }
    setSelectedInMini(null);
    setSelectedInMain(null);
  }, []);

  // Process data for display
  const processedParent = groupSmallSlices(parentData);
  const processedDetail = groupSmallSlices(detailData);

  const parentChartData = processedParent.map((item) => ({
    x: item.name,
    y: item.percentage,
    color: item.color,
  }));

  const detailChartData = processedDetail.map((item) => ({
    x: item.name,
    y: item.percentage,
    color: item.color,
  }));

  const detailLabel = getDetailLabel(path);
  const chartState = detailData.length === 0 ? 'empty' : 'ready';
  const currentSelection = path.length > 0 ? path[path.length - 1].name : null;

  return (
    <View style={styles.container}>
      {/* Breadcrumb Navigation */}
      <View style={styles.breadcrumbContainer}>
        <TouchableOpacity
          style={styles.breadcrumbItem}
          onPress={() => handleBreadcrumbPress(-1)}
          disabled={path.length === 0}
        >
          <Text
            variant="caption"
            color={path.length === 0 ? 'primary' : 'secondary'}
            style={path.length === 0 ? styles.breadcrumbActive : undefined}
          >
            All
          </Text>
        </TouchableOpacity>

        {path.map((p, index) => (
          <React.Fragment key={index}>
            <Ionicons
              name="chevron-forward"
              size={12}
              color={colors.text.tertiary}
              style={styles.breadcrumbSeparator}
            />
            <TouchableOpacity
              style={styles.breadcrumbItem}
              onPress={() => handleBreadcrumbPress(index)}
              disabled={index === path.length - 1}
            >
              <Text
                variant="caption"
                color={index === path.length - 1 ? 'primary' : 'secondary'}
                style={index === path.length - 1 ? styles.breadcrumbActive : undefined}
              >
                {p.name}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      {/* Split View: Mini Chart + Main Chart */}
      <View style={styles.splitContainer}>
        {/* Mini Overview Chart (left side) */}
        {path.length > 0 && (
          <Animated.View 
            entering={FadeIn.duration(200)} 
            exiting={FadeOut.duration(200)}
            style={styles.miniChartSection}
          >
            <Text variant="caption" color="tertiary" style={styles.miniLabel}>
              {path.length === 1 ? 'REGIONS' : path[path.length - 2]?.name.toUpperCase()}
            </Text>
            <View style={styles.miniChartContainer}>
              <VictoryPie
                data={parentChartData}
                width={MINI_PIE_SIZE}
                height={MINI_PIE_SIZE}
                colorScale={parentChartData.map((d) => d.color)}
                innerRadius={20}
                radius={MINI_PIE_SIZE / 2 - 5}
                padAngle={2}
                style={{
                  data: {
                    fill: ({ datum }) =>
                      currentSelection && currentSelection !== datum.x
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
                            handleMiniChartPress(props.datum.x);
                            return null;
                          },
                        },
                      ],
                    },
                  },
                ]}
              />
            </View>
          </Animated.View>
        )}

        {/* Arrow indicator */}
        {path.length > 0 && (
          <View style={styles.arrowContainer}>
            <Ionicons name="arrow-forward" size={20} color={colors.text.tertiary} />
          </View>
        )}

        {/* Main Detail Chart (right side) */}
        <View style={[styles.mainChartSection, path.length === 0 && styles.mainChartFull]}>
          <Text variant="labelMedium" color="secondary" style={styles.detailLabel}>
            {detailLabel.toUpperCase()}
          </Text>
          
          <ChartWrapper state={chartState} emptyMessage="No data at this level" minHeight={MAIN_PIE_SIZE + 40}>
            <Animated.View 
              key={path.map(p => p.name).join('-') || 'root'}
              entering={SlideInRight.duration(250)}
              style={styles.mainChartContainer}
            >
              <VictoryPie
                data={detailChartData}
                width={MAIN_PIE_SIZE + 20}
                height={MAIN_PIE_SIZE + 20}
                colorScale={detailChartData.map((d) => d.color)}
                innerRadius={35}
                radius={({ datum }) =>
                  selectedInMain === datum.x ? MAIN_PIE_SIZE / 2 + 5 : MAIN_PIE_SIZE / 2
                }
                padAngle={2}
                style={{
                  data: {
                    fill: ({ datum }) =>
                      selectedInMain && selectedInMain !== datum.x
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
                            handleDetailChartPress(props.datum.x);
                            return null;
                          },
                        },
                      ],
                    },
                  },
                ]}
              />
            </Animated.View>
          </ChartWrapper>
        </View>
      </View>

      {/* Legend for detail chart */}
      <View style={styles.legendContainer}>
        {processedDetail.map((item, index) => {
          const isSelected = selectedInMain === item.name;
          const isDimmed = selectedInMain !== null && !isSelected;
          const hasDrillDown = canDrillDown(item.name, path);

          return (
            <TouchableOpacity
              key={index}
              style={[styles.legendItem, { opacity: isDimmed ? 0.4 : 1 }]}
              onPress={() => handleDetailChartPress(item.name)}
            >
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text variant="caption" color="primary" style={styles.legendText}>
                {item.name}
              </Text>
              <Text variant="caption" color="secondary">
                {Math.round(item.percentage)}%
              </Text>
              {hasDrillDown && (
                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color={colors.text.tertiary}
                  style={styles.drillDownIcon}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer with back button and hint */}
      <View style={styles.footer}>
        {path.length > 0 ? (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={16} color={colors.accent.primary} />
            <Text variant="caption" color="primary" style={styles.backText}>
              Back
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        <View style={styles.hintContainer}>
          <Ionicons
            name="information-circle-outline"
            size={14}
            color={colors.text.tertiary}
          />
          <Text variant="caption" color="tertiary" style={styles.hintText}>
            Tap slices to drill down
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  breadcrumbItem: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  breadcrumbSeparator: {
    marginHorizontal: spacing.xxs,
  },
  breadcrumbActive: {
    fontWeight: '600',
  },
  splitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  miniChartSection: {
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  miniLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  miniChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowContainer: {
    paddingHorizontal: spacing.xs,
  },
  mainChartSection: {
    flex: 1,
    alignItems: 'center',
  },
  mainChartFull: {
    flex: 0,
  },
  detailLabel: {
    letterSpacing: 1,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  mainChartContainer: {
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
  drillDownIcon: {
    marginLeft: spacing.xxs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginTop: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface.tint,
    borderRadius: radius.sm,
  },
  backText: {
    marginLeft: spacing.xs,
    color: colors.accent.primary,
  },
  backPlaceholder: {
    width: 60,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hintText: {
    marginLeft: spacing.xs,
  },
});
