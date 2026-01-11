/**
 * AccordionRow
 * A single expandable row showing a muscle group with progress bar
 * 
 * @param name - Muscle group name
 * @param percentage - Percentage of total sets (0-100)
 * @param isExpanded - Whether children are visible
 * @param hasChildren - Whether this row can expand
 * @param depth - Nesting level (0 = root, 1 = child, 2 = grandchild)
 * @param onPress - Callback when row is tapped
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { colors, spacing, radius } from '@/constants/theme';

interface AccordionRowProps {
  name: string;
  percentage: number;
  isExpanded: boolean;
  hasChildren: boolean;
  depth: number;
  onPress: () => void;
}

const INDENT_PER_LEVEL = spacing.md;
const BAR_HEIGHT = 8;
const MAX_BAR_WIDTH = 120;

export const AccordionRow: React.FC<AccordionRowProps> = ({
  name,
  percentage,
  isExpanded,
  hasChildren,
  depth,
  onPress,
}) => {
  // Shared value for chevron rotation
  const rotation = useSharedValue(0);

  // Update rotation when isExpanded changes
  useEffect(() => {
    rotation.value = withSpring(isExpanded ? 90 : 0, {
      damping: 15,
      stiffness: 150,
    });
  }, [isExpanded]);

  const handlePress = () => {
    triggerHaptic('light');
    onPress();
  };

  // Animated chevron rotation
  const chevronStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  // Calculate bar width based on percentage
  const barWidth = Math.max(4, (percentage / 100) * MAX_BAR_WIDTH);

  // Opacity based on depth for visual hierarchy
  const rowOpacity = depth === 0 ? 1 : depth === 1 ? 0.9 : 0.8;

  // Color intensity based on percentage
  const getBarColor = () => {
    if (percentage >= 30) return colors.accent.orange;
    if (percentage >= 15) return colors.accent.orangeLight;
    return `rgba(255, 107, 74, 0.5)`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { paddingLeft: spacing.md + depth * INDENT_PER_LEVEL },
        { opacity: rowOpacity },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Chevron or spacer */}
      <View style={styles.chevronContainer}>
        {hasChildren ? (
          <Animated.View style={chevronStyle}>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.text.secondary}
            />
          </Animated.View>
        ) : (
          <View style={styles.leafIndicator} />
        )}
      </View>

      {/* Name */}
      <Text
        variant={depth === 0 ? 'bodySemibold' : 'body'}
        color="primary"
        style={styles.name}
        numberOfLines={1}
      >
        {name}
      </Text>

      {/* Progress bar */}
      <View style={styles.barContainer}>
        <View
          style={[
            styles.bar,
            { width: barWidth, backgroundColor: getBarColor() },
          ]}
        />
      </View>

      {/* Percentage */}
      <Text variant="caption" color="secondary" style={styles.percentage}>
        {Math.round(percentage)}%
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    minHeight: 44,
  },
  chevronContainer: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  leafIndicator: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.neutral.gray400,
  },
  name: {
    flex: 1,
    marginRight: spacing.sm,
  },
  barContainer: {
    width: MAX_BAR_WIDTH,
    height: BAR_HEIGHT,
    backgroundColor: colors.neutral.gray200,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  bar: {
    height: '100%',
    borderRadius: radius.full,
  },
  percentage: {
    width: 36,
    textAlign: 'right',
  },
});
