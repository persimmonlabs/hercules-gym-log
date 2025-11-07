/**
 * CalendarDayCell
 * Atom representing a single day cell inside the monthly calendar grid.
 * Provides animated press feedback, haptic response, and visual states.
 */

import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { buttonPressAnimation, springSmooth } from '@/constants/animations';
import { colors, opacity, radius, spacing } from '@/constants/theme';

interface CalendarDayCellProps {
  /** ISO string for the date represented by this cell */
  isoDate: string;
  /** Day number displayed to the user */
  dayLabel: string;
  /** Whether the day belongs to the active month */
  isCurrentMonth: boolean;
  /** Whether the date matches today's date */
  isToday: boolean;
  /** Whether the date is currently selected */
  isSelected: boolean;
  /** Whether the day has a marker (e.g. workout logged) */
  hasMarker?: boolean;
  /** Callback fired when the user selects the day */
  onSelect: (isoDate: string) => void;
  /** Optional long press handler for contextual actions */
  onLongPress?: (isoDate: string) => void;
}

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  isoDate,
  dayLabel,
  isCurrentMonth,
  isToday,
  isSelected,
  hasMarker = false,
  onSelect,
  onLongPress,
}) => {
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSpring(0.94, springSmooth);
    Haptics.selectionAsync();

    setTimeout(() => {
      scale.value = withSpring(1, springSmooth);
      onSelect(isoDate);
    }, buttonPressAnimation.duration);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const dayContainerStyle = useMemo(() => {
    const states = [
      styles.dayContainer,
      isSelected ? styles.selectedDayContainer : isToday ? styles.todayDayContainer : null,
      !isCurrentMonth ? styles.outsideMonthDay : null,
    ];
    return states.filter(Boolean);
  }, [isCurrentMonth, isSelected, isToday]);

  const showMarker = isToday;

  const markerStyles = useMemo(() => {
    const states = [styles.marker, showMarker ? styles.markerVisible : styles.markerHidden];
    if (isSelected) {
      states.push(styles.markerSelected);
    }
    return states;
  }, [isSelected, showMarker]);

  const textColor = useMemo(() => {
    if (!isCurrentMonth) return 'tertiary';
    if (isSelected) return 'onAccent';
    if (isToday) return 'orange';
    return 'primary';
  }, [isCurrentMonth, isSelected, isToday]);

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        onLongPress={
          onLongPress
            ? () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onLongPress(isoDate);
              }
            : undefined
        }
        delayLongPress={150}
        style={styles.touchable}
      >
        <View style={dayContainerStyle}>
          <Text variant="bodySemibold" color={textColor}>
            {dayLabel}
          </Text>
          <View style={markerStyles} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
  },
  touchable: {
    width: '100%',
    alignItems: 'center',
  },
  dayContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.primary.dark,
  },
  todayDayContainer: {
    borderColor: colors.accent.orange,
  },
  selectedDayContainer: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  outsideMonthDay: {
    opacity: opacity.tertiary,
  },
  marker: {
    width: spacing.xs,
    height: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginTop: -spacing.xs,
  },
  markerHidden: {
    opacity: 0,
  },
  markerVisible: {
    backgroundColor: colors.accent.orange,
  },
  markerSelected: {
    backgroundColor: colors.text.onAccent,
  },
});
