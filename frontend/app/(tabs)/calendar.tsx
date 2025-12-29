import React, { useCallback, useMemo, useState, useRef } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { MonthlyCalendar } from '@/components/molecules/MonthlyCalendar';
import { ScreenHeader } from '@/components/molecules/ScreenHeader';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatDateToLocalISO, getDeviceCurrentDate, parseLocalISODate } from '@/utils/date';
import { formatWorkoutTitle, getWorkoutSummary } from '@/utils/workout';
import { useWorkoutSessionsStore, type WorkoutSessionsState } from '@/store/workoutSessionsStore';
import { usePlansStore, type PlansState } from '@/store/plansStore';

const getWorkoutLocalISO = (workout: WorkoutSessionsState['workouts'][number]): string | null => {
  if (workout.startTime) {
    return formatDateToLocalISO(new Date(workout.startTime));
  }

  if (workout.date) {
    return formatDateToLocalISO(new Date(workout.date));
  }

  return null;
};

const CalendarScreen: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateToLocalISO(getDeviceCurrentDate()));
  const [currentMonth, setCurrentMonth] = useState<string>(() => formatDateToLocalISO(getDeviceCurrentDate()));

  const workouts = useWorkoutSessionsStore((state: WorkoutSessionsState) => state.workouts);
  const hydrateWorkouts = useWorkoutSessionsStore((state: WorkoutSessionsState) => state.hydrateWorkouts);
  const plans = usePlansStore((state: PlansState) => state.plans);

  const markers = useMemo<string[]>(() => {
    const unique = new Set<string>();
    workouts.forEach((workout) => {
      const workoutISO = getWorkoutLocalISO(workout);
      if (workoutISO) {
        unique.add(workoutISO);
      }
    });
    return Array.from(unique).sort();
  }, [workouts]);

  const markersSet = useMemo(() => new Set(markers), [markers]);

  const friendlyFormatter = useMemo(
    () => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    []
  );

  const friendlyDateLabel = useMemo(() => {
    const date = parseLocalISODate(selectedDate);
    return friendlyFormatter.format(date);
  }, [friendlyFormatter, selectedDate]);

  const planNameLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    plans.forEach((plan) => {
      lookup.set(plan.id, plan.name);
    });
    return lookup;
  }, [plans]);

  const selectedWorkouts = useMemo(() => {
    return workouts
      .filter((workout) => getWorkoutLocalISO(workout) === selectedDate)
      .slice()
      .sort((a, b) => {
        const getTimestamp = (workout: WorkoutSessionsState['workouts'][number]): number => {
          return workout.endTime ?? workout.startTime ?? new Date(workout.date).getTime();
        };

        return getTimestamp(b) - getTimestamp(a);
      });
  }, [selectedDate, workouts]);

  const selectedWorkoutSummaries = useMemo(
    () =>
      selectedWorkouts.map((workout) => {
        const planName = workout.planId ? planNameLookup.get(workout.planId) ?? null : null;

        return {
          workout,
          title: formatWorkoutTitle(workout, planName),
          summary: getWorkoutSummary(workout),
        };
      }),
    [planNameLookup, selectedWorkouts],
  );

  const hasWorkouts = selectedWorkoutSummaries.length > 0;

  const handleSelectDate = useCallback((isoDate: string) => {
    setSelectedDate(isoDate);
  }, []);

  const handleDayLongPress = useCallback((isoDate: string) => {
    setSelectedDate(isoDate);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const today = formatDateToLocalISO(getDeviceCurrentDate());
      setSelectedDate(today);
      setCurrentMonth(today);
      void hydrateWorkouts();
    }, [])
  );

  const handleViewWorkout = useCallback(
    (workoutId: string) => {
      void Haptics.selectionAsync();
      router.push({ pathname: '/(tabs)/workout-detail', params: { workoutId } });
    },
    [router],
  );

  return (
    <TabSwipeContainer ref={scrollRef} contentContainerStyle={[styles.contentContainer, { backgroundColor: theme.primary.bg }]}>
      <ScreenHeader
        title="Calendar"
        subtitle="Track workouts and build consistency."
      />

      <View style={styles.calendarSection}>
        <MonthlyCalendar
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          markers={markers}
          onDayLongPress={handleDayLongPress}
          currentMonth={currentMonth}
          onCurrentMonthChange={setCurrentMonth}
        />
      </View>

      <View style={styles.summarySection}>
        <Text variant="heading3" color="primary">
          {friendlyDateLabel}
        </Text>

        {hasWorkouts ? (
          <View style={styles.workoutList}>
            {selectedWorkoutSummaries.map(({ workout, title, summary }) => (
              <Pressable
                key={workout.id}
                style={styles.summaryPressable}
                accessibilityRole="button"
                accessibilityLabel="View workout details"
                onPress={() => handleViewWorkout(workout.id)}
              >
                <SurfaceCard tone="card" padding="lg" showAccentStripe={true} style={styles.workoutCard}>
                  <View style={styles.workoutHeader}>
                    <Text variant="bodySemibold" color="primary">
                      {title}
                    </Text>
                    <Text variant="caption" color="secondary">
                      {summary}
                    </Text>
                  </View>
                </SurfaceCard>
              </Pressable>
            ))}
          </View>
        ) : (
          <SurfaceCard tone="card" padding="xl" showAccentStripe={false} style={styles.noWorkoutCard}>
            <Text variant="body" color="secondary">
              No session logged.
            </Text>
          </SurfaceCard>
        )}
      </View>
    </TabSwipeContainer>
  );
};

export default CalendarScreen;

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xl,
  },
  calendarSection: {
    width: '100%',
  },
  summarySection: {
    width: '100%',
    gap: spacing.md,
  },
  summaryPressable: {
    width: '100%',
  },
  workoutList: {
    width: '100%',
    gap: spacing.md,
  },
  workoutCard: {
    gap: spacing.sm,
    position: 'relative',
  },
  workoutHeader: {
    gap: spacing.xs,
  },
  noWorkoutCard: {
    gap: spacing.xs,
  },
});
