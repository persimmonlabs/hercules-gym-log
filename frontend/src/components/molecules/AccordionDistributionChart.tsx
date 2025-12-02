/**
 * AccordionDistributionChart
 * Collapsible accordion list showing muscle set distribution
 * 
 * Displays hierarchical muscle data with expandable rows.
 * Each row shows a progress bar proportional to set percentage.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
} from 'react-native-reanimated';

import { AccordionRow } from '@/components/atoms/AccordionRow';
import { Text } from '@/components/atoms/Text';
import { colors, spacing } from '@/constants/theme';
import type { HierarchicalSetData } from '@/types/analytics';

interface AccordionDistributionChartProps {
  data: HierarchicalSetData;
  onMusclePress?: (muscleName: string) => void;
}

interface ExpandedState {
  [key: string]: boolean;
}

export const AccordionDistributionChart: React.FC<AccordionDistributionChartProps> = ({
  data,
  onMusclePress,
}) => {
  const [expanded, setExpanded] = useState<ExpandedState>({});

  // Toggle expansion for a given key
  const toggleExpand = useCallback((key: string) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  // Get children for a given parent at a specific level
  const getChildren = useCallback(
    (parentName: string, level: 'L1' | 'L2' | 'L3'): typeof data.root => {
      const key = `${level}:${parentName}`;
      return data.byParent[key] || [];
    },
    [data.byParent]
  );

  // Check if a node has children
  const hasChildren = useCallback(
    (name: string, level: 'root' | 'L1' | 'L2'): boolean => {
      let nextLevel: 'L1' | 'L2' | 'L3';
      switch (level) {
        case 'root':
          nextLevel = 'L1';
          break;
        case 'L1':
          nextLevel = 'L2';
          break;
        case 'L2':
          nextLevel = 'L3';
          break;
        default:
          return false;
      }
      const children = getChildren(name, nextLevel);
      return children.length > 0;
    },
    [getChildren]
  );

  // Handle row press
  const handleRowPress = useCallback(
    (name: string, level: 'root' | 'L1' | 'L2' | 'L3', key: string) => {
      if (level === 'L3' || !hasChildren(name, level as 'root' | 'L1' | 'L2')) {
        // Leaf node - trigger callback
        onMusclePress?.(name);
      } else {
        // Has children - toggle expansion
        toggleExpand(key);
      }
    },
    [hasChildren, onMusclePress, toggleExpand]
  );

  // Render a single level of rows
  const renderLevel = useCallback(
    (
      items: typeof data.root,
      level: 'root' | 'L1' | 'L2' | 'L3',
      depth: number,
      parentKey: string = ''
    ) => {
      return items.map((item) => {
        const key = parentKey ? `${parentKey}:${item.name}` : item.name;
        const isExpanded = expanded[key] || false;
        const canExpand = level !== 'L3' && hasChildren(item.name, level as 'root' | 'L1' | 'L2');

        // Determine next level
        let nextLevel: 'L1' | 'L2' | 'L3' | null = null;
        switch (level) {
          case 'root':
            nextLevel = 'L1';
            break;
          case 'L1':
            nextLevel = 'L2';
            break;
          case 'L2':
            nextLevel = 'L3';
            break;
        }

        const children = nextLevel ? getChildren(item.name, nextLevel) : [];

        return (
          <Animated.View
            key={key}
            layout={Layout.springify().damping(15).stiffness(120)}
          >
            <AccordionRow
              name={item.name}
              percentage={item.percentage}
              isExpanded={isExpanded}
              hasChildren={canExpand}
              depth={depth}
              onPress={() => handleRowPress(item.name, level, key)}
            />

            {/* Render children if expanded */}
            {isExpanded && children.length > 0 && (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
              >
                {renderLevel(
                  children,
                  nextLevel as 'L1' | 'L2' | 'L3',
                  depth + 1,
                  key
                )}
              </Animated.View>
            )}
          </Animated.View>
        );
      });
    },
    [expanded, getChildren, handleRowPress, hasChildren]
  );

  // Empty state
  if (!data.root || data.root.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="body" color="secondary" style={styles.emptyText}>
          No workout data available yet.
        </Text>
        <Text variant="caption" color="tertiary" style={styles.emptyHint}>
          Complete workouts to see your muscle distribution.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="heading3" color="primary">
          Set Distribution
        </Text>
        <Text variant="caption" color="tertiary">
          Tap to expand
        </Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Accordion List */}
      <View style={styles.listContainer}>
        {renderLevel(data.root, 'root', 0)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginHorizontal: spacing.md,
  },
  listContainer: {
    paddingTop: spacing.xs,
  },
  emptyContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptyHint: {
    textAlign: 'center',
  },
});
