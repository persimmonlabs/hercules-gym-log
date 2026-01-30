import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, BackHandler, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { VictoryPie } from 'victory-native';

import { ScreenHeader } from '@/components/molecules/ScreenHeader';
import { Text } from '@/components/atoms/Text';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { PersonalRecordsSection } from '@/components/organisms/PersonalRecordsSection';
import { AnalyticsCard } from '@/components/atoms/AnalyticsCard';
import { SimpleDistributionChart } from '@/components/molecules/SimpleDistributionChart';
import { SimpleVolumeChart } from '@/components/molecules/SimpleVolumeChart';
import { VolumeTrendChart } from '@/components/molecules/VolumeTrendChart';
import { TrainingBalanceCard } from '@/components/molecules/TrainingBalanceCard';
import { TimeRangeSelector } from '@/components/atoms/TimeRangeSelector';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { spacing, colors, radius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { TIME_RANGE_SUBTITLES, TimeRange } from '@/types/analytics';
import type { CardioStats } from '@/types/analytics';
import { useSettingsStore } from '@/store/settingsStore';
import { exercises as exerciseCatalog } from '@/constants/exercises';
import { useUserProfileStore } from '@/store/userProfileStore';

// Simple cardio stats content component
const EMPTY_CARD_MIN_HEIGHT = 240;

const formatDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
};

const formatCompactNumber = (value: number): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    const num = abs / 1_000_000_000;
    const rounded = num >= 100 ? Math.round(num) : parseFloat(num.toFixed(1));
    return `${sign}${rounded}B`;
  }

  if (abs >= 1_000_000) {
    const num = abs / 1_000_000;
    const rounded = num >= 100 ? Math.round(num) : parseFloat(num.toFixed(1));
    return `${sign}${rounded}M`;
  }

  if (abs >= 1_000) {
    const num = abs / 1_000;
    const rounded = num >= 100 ? Math.round(num) : parseFloat(num.toFixed(1));
    return `${sign}${rounded}K`;
  }

  return `${sign}${Math.round(abs).toLocaleString()}`;
};

interface CardioStatsContentProps {
  stats: CardioStats;
  timeRange: TimeRange;
}

const CardioStatsContent: React.FC<CardioStatsContentProps> = ({ stats, timeRange }) => {
  // Subscribe to distanceUnit to trigger re-renders when units change
  const distanceUnitPref = useSettingsStore((state) => state.distanceUnit);
  const { formatDistanceForExercise } = useSettingsStore();
  const { totalDuration, totalDistanceByType } = stats;

  // Check if there's any cardio data
  const hasData = totalDuration > 0 || Object.keys(totalDistanceByType).length > 0;

  if (!hasData) {
    return (
      <View style={cardioStyles.emptyState}>
        <Text variant="body" color="secondary" style={cardioStyles.emptyText}>
          {`No workout data for ${TIME_RANGE_SUBTITLES[timeRange].toLowerCase()}.`}
        </Text>
      </View>
    );
  }

  const distanceEntries = Object.entries(totalDistanceByType).filter(([, dist]) => dist > 0);

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ alignItems: 'center' }}>
        <Text variant="heading2" color="primary">
          {formatDuration(totalDuration)}
        </Text>
        <Text variant="caption" color="secondary">
          Total Time
        </Text>
      </View>

      {distanceEntries.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="bodySemibold" color="secondary">
            Distance by Activity
          </Text>
          {distanceEntries.map(([exerciseName, distance]) => {
            const exerciseEntry = exerciseCatalog.find(e => e.name === exerciseName);
            const distanceUnit = exerciseEntry?.distanceUnit;
            return (
              <View key={exerciseName} style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: spacing.xs
              }}>
                <Text variant="body" color="primary" style={{ flex: 1 }}>
                  {exerciseName}
                </Text>
                <Text variant="bodySemibold" color="primary">
                  {formatDistanceForExercise(distance, distanceUnit)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const cardioStyles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    minHeight: EMPTY_CARD_MIN_HEIGHT,
  },
  emptyText: {
    textAlign: 'center',
  },
});

const summaryStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.lg,
  },
  tile: {
    width: '50%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  value: {
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  valueBadge: {
    backgroundColor: colors.accent.orange,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    marginBottom: spacing.xs,
  },
});

const streakStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  dayItem: {
    flex: 1,
    alignItems: 'center',
  },
  dayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotActive: {
    backgroundColor: colors.accent.orange,
    borderColor: colors.accent.orange,
  },
});


type PerformanceTab = 'general' | 'weights' | 'cardio';

interface TabPillProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const TabPill: React.FC<TabPillProps> = ({ label, isActive, onPress }) => {
  const { theme } = useTheme();

  const baseStyle = {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.accent.orangeMuted,
    backgroundColor: theme.primary.bg,
    minWidth: 90,
  } as const;

  // Add small margins for perfect card edge alignment
  const containerStyle = {
    ...baseStyle,
    ...(label === 'General' && { marginLeft: spacing.xs }),
    ...(label === 'Cardio' && { marginRight: spacing.xs }),
  };

  const activeStyle = isActive
    ? {
        backgroundColor: theme.accent.orangeMuted,
        borderColor: theme.accent.orange,
      }
    : {};

  const textStyle = {
    textAlign: 'center' as const,
    color: theme.text.primary,
  };

  return (
    <Pressable onPress={onPress} style={[containerStyle, activeStyle]} hitSlop={spacing.xs}>
      <Text variant="bodySemibold" style={textStyle}>
        {label}
      </Text>
    </Pressable>
  );
};

const StatsScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // Handle Android hardware back button - navigate to Dashboard
  useEffect(() => {
    const backAction = () => {
      router.replace('/(tabs)');
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [router]);

  const styles = StyleSheet.create({
    contentContainer: {
      flexGrow: 1,
      backgroundColor: theme.primary.bg,
      paddingTop: spacing.xl,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.xl,
    },
    tabsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: -spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: 0,
    },
    tabPill: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xxs,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.accent.orangeMuted,
      backgroundColor: theme.primary.bg,
      minWidth: 90,
    },
    tabPillActive: {
      backgroundColor: theme.accent.orangeMuted,
      borderColor: theme.accent.orange,
    },
    tabPillLabel: {
      textAlign: 'center',
    },
    tabPillLabelActive: {
      color: theme.text.onAccent,
    },
  });

  // Independent state for each card
  const [generalTimeRange, setGeneralTimeRange] = useState<TimeRange>('week');
  const [volumeTimeRange, setVolumeTimeRange] = useState<TimeRange>('week');
  const [volumeTrendTimeRange, setVolumeTrendTimeRange] = useState<TimeRange>('week');
  const [cardioTimeRange, setCardioTimeRange] = useState<TimeRange>('week');
  const [activeTab, setActiveTab] = useState<PerformanceTab>('general');

  // Reset time ranges to 'week' when page gains focus
  useFocusEffect(
    useCallback(() => {
      setGeneralTimeRange('week');
      setVolumeTimeRange('week');
      setVolumeTrendTimeRange('week');
      setCardioTimeRange('week');
    }, [])
  );

  // Fetch data separately for each time range
  const {
    workouts: allWorkouts,
    filteredWorkouts: generalFilteredWorkouts,
    weeklyVolume: generalWeeklyVolume,
    cardioStats: generalCardioStats,
    streakData,
    hasData: hasAnyWorkoutData,
    hasFilteredData: hasGeneralFilteredData,
  } = useAnalyticsData({ timeRange: generalTimeRange });

  const { hasFilteredData: hasVolumeData, filteredWorkouts: volumeFilteredWorkouts } = useAnalyticsData({ timeRange: volumeTimeRange });
  const weightUnit = useSettingsStore((state) => state.weightUnit);
  const { cardioStats, filteredWorkouts: cardioFilteredWorkouts } = useAnalyticsData({ timeRange: cardioTimeRange });

  const handleDistributionPress = () => {
    router.push('/(tabs)/distribution-analytics');
  };

  const handleVolumePress = () => {
    router.push('/(tabs)/volume-analytics');
  };

  const last7Days = useMemo(() => {
    const today = new Date();
    const workoutDates = new Set(allWorkouts.map((w) => w.date.split('T')[0]));

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(today);
      // Oldest on the left, today on the right
      date.setDate(today.getDate() - (6 - index));
      const dateKey = date.toISOString().split('T')[0];
      const hasWorkout = workoutDates.has(dateKey);
      const label = date.toLocaleDateString(undefined, { weekday: 'short' }).charAt(0);

      return { label, hasWorkout, key: dateKey };
    });
  }, [allWorkouts]);

  const sessionsThisWeekFromSunday = useMemo(() => {
    if (!allWorkouts.length) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // 0 = Sunday

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);

    const weekStartISO = weekStart.toISOString().split('T')[0];
    const todayISO = today.toISOString().split('T')[0];

    return allWorkouts.filter((w) => {
      const dateKey = w.date.split('T')[0];
      return dateKey >= weekStartISO && dateKey <= todayISO;
    }).length;
  }, [allWorkouts]);

  const totalWorkoutSessions = generalFilteredWorkouts.length;

  const totalVolume = useMemo(() => {
    if (!generalWeeklyVolume?.high) return 0;
    return generalWeeklyVolume.high.reduce((sum, bar) => sum + (bar.value || 0), 0);
  }, [generalWeeklyVolume]);

  const totalCardioTime = generalCardioStats.totalDuration;
  const totalCardioDistance = useMemo(
    () =>
      Object.values(generalCardioStats.totalDistanceByType || {}).reduce(
        (sum, dist) => sum + (dist || 0),
        0,
      ),
    [generalCardioStats.totalDistanceByType],
  );
  const distanceUnitShort = useSettingsStore((state) => state.getDistanceUnitShort());

  const convertWeight = useSettingsStore((state) => state.convertWeight);
  const userBodyWeight = useUserProfileStore((state) => state.profile?.weightLbs ?? 0);

  const topExercisesByVolume = useMemo(() => {
    const volumes: Record<string, number> = {};

    volumeFilteredWorkouts.forEach((workout) => {
      workout.exercises.forEach((exercise: any) => {
        const catalogEntry = exerciseCatalog.find((e) => e.name === exercise.name);
        const exerciseType = catalogEntry?.exerciseType || 'weight';

        // Skip cardio and pure duration exercises
        if (exerciseType === 'cardio' || exerciseType === 'duration') {
          return;
        }

        let exerciseVolume = 0;

        exercise.sets.forEach((set: any) => {
          if (!set.completed) return;
          const reps = set.reps ?? 0;
          if (reps <= 0) return;

          let setVolume = 0;
          switch (exerciseType) {
            case 'bodyweight':
              if (userBodyWeight > 0) {
                setVolume = userBodyWeight * reps;
              }
              break;
            case 'assisted': {
              if (userBodyWeight > 0) {
                const assistance = set.assistanceWeight ?? 0;
                const effective = Math.max(0, userBodyWeight - assistance);
                if (effective > 0) {
                  setVolume = effective * reps;
                }
              }
              break;
            }
            case 'reps_only':
              // Bands etc – do not contribute to volume
              setVolume = 0;
              break;
            case 'weight':
            default: {
              const weight = set.weight ?? 0;
              if (weight > 0) {
                setVolume = weight * reps;
              }
              break;
            }
          }

          if (setVolume > 0) {
            // Convert to user's preferred unit (lbs -> user)
            exerciseVolume += convertWeight(setVolume);
          }
        });

        if (exerciseVolume > 0) {
          volumes[exercise.name] = (volumes[exercise.name] || 0) + exerciseVolume;
        }
      });
    });

    const entries = Object.entries(volumes)
      .filter(([, vol]) => vol > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return entries.map(([name, volume]) => ({ name, volume }));
  }, [volumeFilteredWorkouts, convertWeight, userBodyWeight]);

  const outdoorCardioSummary = useMemo(() => {
    const activities: {
      name: string;
      count: number;
      totalDuration: number;
      totalDistance: number;
      distanceUnit?: 'miles' | 'meters' | 'floors';
    }[] = [];
    const byName: Record<string, (typeof activities)[number]> = {};

    let outdoorDuration = 0;
    let indoorDuration = 0;
    let outdoorDistance = 0;
    let indoorDistance = 0;

    cardioFilteredWorkouts.forEach((workout) => {
      workout.exercises.forEach((exercise: any) => {
        const exerciseEntry = exerciseCatalog.find((e) => e.name === exercise.name);
        if (!exerciseEntry || exerciseEntry.exerciseType !== 'cardio') return;

        const isOutdoor = Boolean(
          exerciseEntry.supportsGpsTracking ||
          exerciseEntry.distanceUnit === 'miles' ||
          exerciseEntry.distanceUnit === 'meters',
        );

        let hasCompletedSetForThisExercise = false;
        let exerciseDuration = 0;
        let exerciseDistance = 0;

        exercise.sets.forEach((set: any) => {
          if (!set.completed) return;
          const duration = set.duration || 0;
          const distance = set.distance || 0;

          if (duration > 0 || distance > 0) {
            hasCompletedSetForThisExercise = true;
          }

          if (isOutdoor) {
            outdoorDuration += duration;
            outdoorDistance += distance;
          } else {
            indoorDuration += duration;
            indoorDistance += distance;
          }

          exerciseDuration += duration;
          exerciseDistance += distance;
        });

        if (!hasCompletedSetForThisExercise) return;

        const key = exercise.name;
        if (!byName[key]) {
          byName[key] = {
            name: exercise.name,
            count: 0,
            totalDuration: 0,
            totalDistance: 0,
            distanceUnit: exerciseEntry.distanceUnit,
          };
          activities.push(byName[key]);
        }

        byName[key].count += 1;
        byName[key].totalDuration += exerciseDuration;
        byName[key].totalDistance += exerciseDistance;
      });
    });

    activities.sort((a, b) => b.totalDistance - a.totalDistance);

    return {
      outdoorDuration,
      indoorDuration,
      outdoorDistance,
      indoorDistance,
      activities,
      hasAnyCardio: outdoorDuration + indoorDuration > 0 || outdoorDistance + indoorDistance > 0,
    };
  }, [cardioFilteredWorkouts]);

  const renderGeneralTab = () => (
    <>
      <AnalyticsCard
        title="Summary"
        showAccentStripe={false}
        titleCentered={true}
        showHorizontalAccentBar={false}
        showChevron={false}
        headerRight={
          <TimeRangeSelector value={generalTimeRange} onChange={setGeneralTimeRange} />
        }
      >
        {!hasAnyWorkoutData ? (
          <View style={cardioStyles.emptyState}>
            <Text variant="body" color="secondary" style={cardioStyles.emptyText}>
              No workouts yet – start your first session to see stats here.
            </Text>
          </View>
        ) : !hasGeneralFilteredData ? (
          <View style={cardioStyles.emptyState}>
            <Text variant="body" color="secondary" style={cardioStyles.emptyText}>
              {`No workout data for ${TIME_RANGE_SUBTITLES[generalTimeRange].toLowerCase()}.`}
            </Text>
          </View>
        ) : (
          <View style={summaryStyles.grid}>
            <View style={summaryStyles.tile}>
              <View style={summaryStyles.valueBadge}>
                <Text variant="heading3" color="onAccent">
                  {totalWorkoutSessions}
                </Text>
              </View>
              <Text variant="caption" color="secondary">
                Workout Sessions
              </Text>
            </View>

            <View style={summaryStyles.tile}>
              <View style={summaryStyles.valueBadge}>
                <Text variant="heading3" color="onAccent">
                  {formatCompactNumber(totalVolume)}
                </Text>
              </View>
              <Text variant="caption" color="secondary">
                {`Total Volume (${weightUnit})`}
              </Text>
            </View>

            <View style={summaryStyles.tile}>
              <View style={summaryStyles.valueBadge}>
                <Text variant="heading3" color="onAccent">
                  {formatDuration(totalCardioTime)}
                </Text>
              </View>
              <Text variant="caption" color="secondary">
                Cardio Time
              </Text>
            </View>

            <View style={summaryStyles.tile}>
              <View style={summaryStyles.valueBadge}>
                <Text variant="heading3" color="onAccent">
                  {totalCardioDistance.toFixed(1)}
                </Text>
              </View>
              <Text variant="caption" color="secondary">
                {`Cardio Distance (${distanceUnitShort})`}
              </Text>
            </View>
          </View>
        )}
      </AnalyticsCard>

      <View>
        <PersonalRecordsSection />
      </View>

      <AnalyticsCard
        title="Volume Trend"
        showAccentStripe={false}
        titleCentered={true}
        showHorizontalAccentBar={false}
        showChevron={false}
        headerRight={
          <TimeRangeSelector value={volumeTrendTimeRange} onChange={setVolumeTrendTimeRange} />
        }
      >
        <VolumeTrendChart timeRange={volumeTrendTimeRange} />
      </AnalyticsCard>
    </>
  );

  const renderWeightsTab = () => (
    <>
      <AnalyticsCard
        title="Volume Distribution"
        onPress={handleDistributionPress}
        showAccentStripe={false}
        titleCentered={true}
        showHorizontalAccentBar={false}
      >
        <SimpleDistributionChart />
      </AnalyticsCard>

      <AnalyticsCard
        title={`Volume Totals (${weightUnit})`}
        onPress={handleVolumePress}
        headerRight={
          <TimeRangeSelector value={volumeTimeRange} onChange={setVolumeTimeRange} />
        }
        isEmpty={!hasVolumeData}
        showAccentStripe={false}
        titleCentered={true}
        showHorizontalAccentBar={false}
      >
        <SimpleVolumeChart timeRange={volumeTimeRange} />
      </AnalyticsCard>

      <TrainingBalanceCard />

      <AnalyticsCard
        title="Top Exercises"
        showAccentStripe={false}
        titleCentered={true}
        showHorizontalAccentBar={false}
        showChevron={false}
      >
        {topExercisesByVolume.length === 0 ? (
          <View style={cardioStyles.emptyState}>
            <Text variant="body" color="secondary" style={cardioStyles.emptyText}>
              No strength workouts in this time range.
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {topExercisesByVolume.map((entry, index) => (
              <View
                key={entry.name}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: spacing.xs,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: colors.accent.orangeMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text variant="captionSmall" color="primary">
                      {index + 1}
                    </Text>
                  </View>
                  <Text variant="body" color="primary">
                    {entry.name}
                  </Text>
                </View>
                <Text variant="bodySemibold" color="primary">
                  {formatCompactNumber(entry.volume)} {weightUnit}
                </Text>
              </View>
            ))}
          </View>
        )}
      </AnalyticsCard>
    </>
  );

  const renderCardioTab = () => (
    <>
      <AnalyticsCard
        title="Cardio Summary"
        showAccentStripe={false}
        titleCentered={true}
        showHorizontalAccentBar={false}
        headerRight={
          <TimeRangeSelector value={cardioTimeRange} onChange={setCardioTimeRange} />
        }
      >
        <CardioStatsContent stats={cardioStats} timeRange={cardioTimeRange} />
      </AnalyticsCard>

      <AnalyticsCard
        title="Outdoor Activities"
        showAccentStripe={false}
        titleCentered={true}
        showHorizontalAccentBar={false}
        showChevron={false}
      >
        {!outdoorCardioSummary.hasAnyCardio ? (
          <View style={cardioStyles.emptyState}>
            <Text variant="body" color="secondary" style={cardioStyles.emptyText}>
              No cardio logged for this time range.
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.lg }}>
            {/* Donut: Outdoor vs Indoor time */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.lg,
              }}
            >
              <View style={{ flex: 1, alignItems: 'center' }}>
                <VictoryPie
                  data={[
                    { x: 'Outdoor', y: outdoorCardioSummary.outdoorDuration || 0.0001 },
                    { x: 'Indoor', y: outdoorCardioSummary.indoorDuration || 0.0001 },
                  ]}
                  innerRadius={42}
                  padAngle={2}
                  width={180}
                  height={180}
                  colorScale={[colors.accent.orange, colors.accent.orangeMuted]}
                  labels={() => ''}
                  startAngle={0}
                  endAngle={360}
                  style={{
                    data: {
                      stroke: colors.primary.bg,
                      strokeWidth: 2,
                    },
                  }}
                />
                <View style={{ position: 'absolute', alignItems: 'center' }}>
                  <Text variant="caption" color="secondary">
                    Outdoor Share
                  </Text>
                  <Text variant="heading3" color="primary">
                    {(() => {
                      const total = outdoorCardioSummary.outdoorDuration + outdoorCardioSummary.indoorDuration;
                      if (!total) return '0%';
                      const pct = Math.round((outdoorCardioSummary.outdoorDuration / total) * 100);
                      return `${pct}%`;
                    })()}
                  </Text>
                </View>
              </View>

              <View style={{ flex: 1, gap: spacing.md }}>
                <View style={{ alignItems: 'center' }}>
                  <Text variant="caption" color="secondary">
                    Outdoor Time
                  </Text>
                  <Text variant="heading3" color="primary">
                    {formatDuration(outdoorCardioSummary.outdoorDuration)}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text variant="caption" color="secondary">
                    Indoor Time
                  </Text>
                  <Text variant="heading3" color="primary">
                    {formatDuration(outdoorCardioSummary.indoorDuration)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Top outdoor activities as colorful chips */}
            {outdoorCardioSummary.activities.length > 0 && (
              <View style={{ gap: spacing.sm }}>
                <Text variant="bodySemibold" color="secondary">
                  Top Outdoor Activities
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing.sm,
                  }}
                >
                  {outdoorCardioSummary.activities.slice(0, 3).map((activity, index) => {
                    const exerciseEntry = exerciseCatalog.find((e) => e.name === activity.name);
                    const distanceUnit = exerciseEntry?.distanceUnit;
                    const { formatDistanceForExercise } = useSettingsStore.getState();
                    const shadeOpacity = 0.2 + 0.15 * index;

                    return (
                      <View
                        key={activity.name}
                        style={{
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.xs,
                          borderRadius: 999,
                          backgroundColor: `rgba(255, 107, 74, ${shadeOpacity})`,
                          borderWidth: 1,
                          borderColor: colors.accent.orange,
                        }}
                      >
                        <Text variant="captionSmall" color="primary">
                          {activity.name}
                        </Text>
                        <Text variant="captionSmall" color="secondary">
                          {formatDistanceForExercise(activity.totalDistance, distanceUnit, 1)} ·{' '}
                          {formatDuration(activity.totalDuration)} · {activity.count} session
                          {activity.count === 1 ? '' : 's'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}
      </AnalyticsCard>
    </>
  );

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralTab();
      case 'weights':
        return renderWeightsTab();
      case 'cardio':
        return renderCardioTab();
      default:
        return null;
    }
  };

  return (
    <TabSwipeContainer ref={scrollRef} contentContainerStyle={styles.contentContainer}>
      <ScreenHeader
        title="Performance"
        subtitle="Track your gains and personal records"
      />

      {/* Top-level Performance tabs */}
      <View style={styles.tabsRow}>
        <TabPill
          label="General"
          isActive={activeTab === 'general'}
          onPress={() => setActiveTab('general')}
        />
        <TabPill
          label="Weights"
          isActive={activeTab === 'weights'}
          onPress={() => setActiveTab('weights')}
        />
        <TabPill
          label="Cardio"
          isActive={activeTab === 'cardio'}
          onPress={() => setActiveTab('cardio')}
        />
      </View>

      {renderActiveTabContent()}
    </TabSwipeContainer>
  );
};

export default StatsScreen;
