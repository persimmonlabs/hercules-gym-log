/**
 * CalendarDayCell
 * Atom representing a single day cell inside the monthly calendar grid.
 * Provides animated press feedback, haptic response, and visual states.
 */

import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { buttonPressAnimation, springSmooth } from '@/constants/animations';
import { opacity, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

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
  const { theme } = useTheme();
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

  const showMarkerFill = hasMarker && !isSelected;
  const showSelectedTodayMarkerFill = hasMarker && isSelected && isToday;

  const dayContainerStyle = useMemo<StyleProp<ViewStyle>>(() => {
    const states: ViewStyle[] = [
      styles.dayContainer,
      { backgroundColor: theme.surface.elevated, borderColor: theme.border.light },
    ];

    if (isToday) {
      states.push({ borderColor: theme.accent.orange });
    }

    if (showMarkerFill) {
      states.push({ backgroundColor: theme.accent.orange, borderColor: theme.accent.orange });
    }

    if (isSelected) {
      states.push({ backgroundColor: theme.surface.elevated });
    }

    if (showSelectedTodayMarkerFill) {
      states.push({ backgroundColor: theme.accent.orange, borderColor: theme.accent.orange });
    }

    if (!isCurrentMonth) {
      states.push(styles.outsideMonthDay);
    }

    return states;
  }, [isCurrentMonth, isSelected, isToday, showMarkerFill, showSelectedTodayMarkerFill, theme]);

  const textColor = useMemo(() => {
    if (!isCurrentMonth) {
      return 'tertiary';
    }

    if (showMarkerFill || showSelectedTodayMarkerFill) {
      return 'onAccent';
    }

    if (isSelected) {
      return 'primary';
    }

    if (isToday) {
      return 'primary';
    }

    return 'primary';
  }, [isCurrentMonth, isSelected, isToday, showMarkerFill, showSelectedTodayMarkerFill]);

  const todayLabelStyle = useMemo(() => {
    if (isToday && !showMarkerFill && !showSelectedTodayMarkerFill) {
      return styles.todayLabelText;
    }

    return undefined;
  }, [isToday, showMarkerFill, showSelectedTodayMarkerFill]);

  const dayContent = (
    <View style={dayContainerStyle}>
      <Text
        variant="bodySemibold"
        color={textColor}
        style={todayLabelStyle}
      >
        {dayLabel}
      </Text>
    </View>
  );

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
        {dayContent}
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
    aspectRatio: 1,
    alignItems: 'stretch',
  },
  dayContainer: {
    flex: 1,
    alignSelf: 'stretch',
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
    borderWidth: 2,
    overflow: 'hidden',
  },
  outsideMonthDay: {
    opacity: opacity.tertiary,
  },
  todayLabelText: {
    // Dynamic color applied inline
  },
});
