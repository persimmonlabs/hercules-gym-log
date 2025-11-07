/**
 * MonthlyCalendar
 * Molecule rendering a monthly calendar grid with animated month controls.
 */

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { CalendarDayCell } from '@/components/atoms/CalendarDayCell';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { buttonPressAnimation, springSmooth } from '@/constants/animations';
import { colors, radius, spacing } from '@/constants/theme';
import { useMonthlyCalendar, type UseMonthlyCalendarOptions } from '@/hooks/useMonthlyCalendar';

interface MonthlyCalendarProps extends UseMonthlyCalendarOptions {
  onDayLongPress?: (isoDate: string) => void;
}

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({ onDayLongPress, ...hookOptions }) => {
  const { monthLabel, weekdayLabels, gridItems, goToPreviousMonth, goToNextMonth, selectDate } =
    useMonthlyCalendar(hookOptions);

  const weekRows = useMemo(() => {
    const rows: typeof gridItems[] = [];
    for (let index = 0; index < gridItems.length; index += 7) {
      rows.push(gridItems.slice(index, index + 7));
    }
    return rows;
  }, [gridItems]);

  const prevScale = useSharedValue(1);
  const nextScale = useSharedValue(1);

  const prevAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: prevScale.value }] }));
  const nextAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: nextScale.value }] }));

  const animatePressIn = useCallback((scaleRef: SharedValue<number>) => {
    scaleRef.value = withSpring(0.92, springSmooth);
  }, []);

  const animatePressOut = useCallback(
    (scaleRef: SharedValue<number>, direction: 'prev' | 'next') => {
      scaleRef.value = withSpring(1, springSmooth);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (direction === 'prev') {
          goToPreviousMonth();
        } else {
          goToNextMonth();
        }
      }, buttonPressAnimation.duration);
    },
    [goToNextMonth, goToPreviousMonth]
  );

  return (
    <SurfaceCard tone="neutral" padding="lg">
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          activeOpacity={0.9}
          onPressIn={() => animatePressIn(prevScale)}
          onPressOut={() => animatePressOut(prevScale, 'prev')}
        >
          <Animated.View style={prevAnimatedStyle}>
            <Ionicons name="chevron-back" size={spacing.xl} color={colors.text.primary} />
          </Animated.View>
        </TouchableOpacity>

        <Text variant="heading3" color="primary">
          {monthLabel}
        </Text>

        <TouchableOpacity
          style={styles.navButton}
          activeOpacity={0.9}
          onPressIn={() => animatePressIn(nextScale)}
          onPressOut={() => animatePressOut(nextScale, 'next')}
        >
          <Animated.View style={nextAnimatedStyle}>
            <Ionicons name="chevron-forward" size={spacing.xl} color={colors.text.primary} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {weekdayLabels.map((label, index) => (
          <View key={`${label}-${index}`} style={styles.weekdayCell}>
            <Text variant="caption" color="secondary">
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {weekRows.map((week, rowIndex) => (
          <View
            key={`week-${rowIndex}`}
            style={[styles.weekRow, rowIndex !== weekRows.length - 1 && styles.weekRowSpacing]}
          >
            {week.map((item) => (
              <View key={item.isoDate} style={styles.gridCell}>
                <CalendarDayCell
                  isoDate={item.isoDate}
                  dayLabel={item.dayLabel}
                  isCurrentMonth={item.isCurrentMonth}
                  isToday={item.isToday}
                  isSelected={item.isSelected}
                  hasMarker={item.hasMarker}
                  onSelect={selectDate}
                  onLongPress={onDayLongPress}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  navButton: {
    width: spacing['2xl'],
    height: spacing['2xl'],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  weekdayCell: { flex: 1, maxWidth: 56, alignItems: 'center' },
  grid: { gap: spacing.sm },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  weekRowSpacing: {
    marginBottom: spacing.sm,
  },
  gridCell: { flex: 1, maxWidth: 56, alignItems: 'center' },
});
