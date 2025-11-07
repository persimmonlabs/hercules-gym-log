import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { MonthlyCalendar } from '@/components/molecules/MonthlyCalendar';
import { ScreenHeader } from '@/components/molecules/ScreenHeader';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { colors, spacing } from '@/constants/theme';

const toISODate = (date: Date): string => date.toISOString().split('T')[0];

const CalendarScreen: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(() => toISODate(new Date()));
  const [resetKey, setResetKey] = useState<number>(0);

  const markers = useMemo(() => {
    const base = new Date();
    const offsets = [-6, -3, -1, 2, 5, 9, 14];
    return offsets.map((offset) => {
      const next = new Date(base);
      next.setDate(base.getDate() + offset);
      return toISODate(next);
    });
  }, []);

  const markersSet = useMemo(() => new Set(markers), [markers]);

  const friendlyFormatter = useMemo(
    () => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    []
  );

  const friendlyDateLabel = useMemo(() => {
    const date = new Date(`${selectedDate}T00:00:00`);
    return friendlyFormatter.format(date);
  }, [friendlyFormatter, selectedDate]);

  const hasWorkout = useMemo(() => markersSet.has(selectedDate), [markersSet, selectedDate]);

  const handleSelectDate = useCallback((isoDate: string) => {
    setSelectedDate(isoDate);
  }, []);

  const handleDayLongPress = useCallback((isoDate: string) => {
    setSelectedDate(isoDate);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setSelectedDate(toISODate(new Date()));
      setResetKey((prev) => prev + 1);
    }, [])
  );

  return (
    <TabSwipeContainer contentContainerStyle={styles.contentContainer}>
      <ScreenHeader
        title="Calendar"
        subtitle="Track your training days and keep momentum going."
      />

      <View style={styles.calendarSection}>
        <MonthlyCalendar
          key={resetKey}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          markers={markers}
          onDayLongPress={handleDayLongPress}
        />
      </View>

      <SurfaceCard tone={hasWorkout ? 'subtle' : 'card'} padding="xl">
        <View style={styles.summaryContent}>
          <Text variant="heading3" color="primary">
            {friendlyDateLabel}
          </Text>
          <Text variant="body" color={hasWorkout ? 'orange' : 'secondary'}>
            {hasWorkout ? 'Workout logged — review your session details.' : 'No sessions logged yet. Tap a day to schedule your next workout.'}
          </Text>
        </View>
      </SurfaceCard>
    </TabSwipeContainer>
  );
};

export default CalendarScreen;

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    backgroundColor: colors.primary.bg,
    paddingTop: spacing['2xl'],
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing['2xl'],
  },
  calendarSection: {
    width: '100%',
  },
  summaryContent: {
    gap: spacing.xs,
  },
});
