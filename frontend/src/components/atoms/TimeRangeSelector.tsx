/**
 * TimeRangeSelector
 * Pill-style buttons for selecting time ranges (Week, Month, Year, All Time)
 * Used in analytics cards and pages for filtering data by time period
 */

import React, { useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { colors, spacing, radius } from '@/constants/theme';
import { springBouncy, buttonPressAnimation } from '@/constants/animations';
import { TimeRange, TIME_RANGE_LABELS } from '@/types/analytics';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const TIME_RANGES: TimeRange[] = ['week', 'month', 'year', 'all'];

interface TimeRangeChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

const TimeRangeChip: React.FC<TimeRangeChipProps> = ({ label, active, onPress }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    triggerHaptic('selection');
    scale.value = withSpring(0.95, springBouncy);

    setTimeout(() => {
      scale.value = withSpring(1, springBouncy);
      onPress();
    }, buttonPressAnimation.duration);
  }, [onPress, scale]);

  return (
    <Animated.View style={[styles.chipWrapper, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={[styles.chip, active && styles.chipActive]}
        onPress={handlePress}
      >
        <Text variant="caption" color={active ? 'onAccent' : 'secondary'}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <View style={styles.container}>
      {TIME_RANGES.map((range) => (
        <TimeRangeChip
          key={range}
          label={TIME_RANGE_LABELS[range]}
          active={range === value}
          onPress={() => onChange(range)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  chipWrapper: {
    borderRadius: radius.full,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.card,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
});
