import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, BackHandler, Pressable, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ScreenHeader } from '@/components/molecules/ScreenHeader';
import { Text } from '@/components/atoms/Text';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { PersonalRecordsSection } from '@/components/organisms/PersonalRecordsSection';
import { AnalyticsCard } from '@/components/atoms/AnalyticsCard';
import { SimpleVolumeChart } from '@/components/molecules/SimpleVolumeChart';
import { VolumeTrendChart, WEIGHT_EXERCISE_TYPES } from '@/components/molecules/VolumeTrendChart';
import { BalanceScoreCard } from '@/components/molecules/BalanceScoreCard';
import { WeeklyCardioGoalCard } from '@/components/molecules/WeeklyCardioGoalCard';
import { DistanceByActivityCard } from '@/components/molecules/DistanceByActivityCard';
import { InsightCard } from '@/components/molecules/InsightCard';
import { TimeRangeSelector } from '@/components/atoms/TimeRangeSelector';
import { SheetModal } from '@/components/molecules/SheetModal';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useInsightsData } from '@/hooks/useInsightsData';
import { searchExercises } from '@/utils/exerciseSearch';
import { spacing, colors, radius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { TIME_RANGE_SUBTITLES, TimeRange } from '@/types/analytics';
import type { CardioStats } from '@/types/analytics';
import { useSettingsStore } from '@/store/settingsStore';
import { exercises as exerciseCatalog } from '@/constants/exercises';
import { useUserProfileStore } from '@/store/userProfileStore';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { PremiumLock } from '@/components/atoms/PremiumLock';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { triggerHaptic } from '@/utils/haptics';

// Simple cardio stats content component
const EMPTY_CARD_MIN_HEIGHT = 240;

const formatDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    // Use colon format for hours:minutes when hours are present
    if (minutes < 10) {
      return `${hours}:0${minutes}`;
    }
    return `${hours}:${minutes}`;
  }
  return `${minutes}m`;
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
  useSettingsStore((state) => state.distanceUnit);
  const { convertDistance, getDistanceUnitShort } = useSettingsStore();
  const { totalDuration, totalDistanceByType } = stats;

  // Calculate total distance across activities that represent real distance.
  // Exercises measured in floors (e.g., stair climbing) are excluded from the mi/km total.
  const totalDistance = Object.entries(totalDistanceByType).reduce((sum, [exerciseName, dist]) => {
    const unit = exerciseCatalog.find(e => e.name === exerciseName)?.distanceUnit;
    if (unit === 'floors') return sum;
    return sum + (dist || 0);
  }, 0);

  // Check if there's any cardio data
  const hasData = totalDuration > 0 || totalDistance > 0;

  if (!hasData) {
    return (
      <View style={cardioStyles.emptyState}>
        <Text variant="body" color="secondary" style={cardioStyles.emptyText}>
          {`No workout data for ${TIME_RANGE_SUBTITLES[timeRange].toLowerCase()}.`}
        </Text>
      </View>
    );
  }

  // Time formatting logic - same as overview summary
  const cardioDurationHasHours = Math.floor(totalDuration / 3600) > 0;
  const cardioDurationMinutes = Math.floor((totalDuration % 3600) / 60);
  const cardioSummaryValue = cardioDurationHasHours
    ? formatDuration(totalDuration)
    : cardioDurationMinutes.toString();
  const cardioSummaryLabelSuffix = cardioDurationHasHours ? ' (hr:min)' : ' (min)';

  // Distance formatting
  const distanceUnitShort = getDistanceUnitShort();
  const displayDistance = convertDistance(totalDistance);
  const distanceSummaryValue = displayDistance.toFixed(1);
  const distanceSummaryLabelSuffix = ` (${distanceUnitShort})`;

  return (
    <View style={{ gap: spacing.lg, paddingVertical: spacing.md }}>
      {/* Total Time and Total Distance - Side by Side */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
        {/* Total Time */}
        <View style={{ alignItems: 'center', paddingHorizontal: spacing.sm }}>
          <View style={summaryStyles.valueBadge}>
            <Text variant="heading2" color="primary">
              {cardioSummaryValue}
            </Text>
          </View>
          <Text variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>
            Total Time{cardioSummaryLabelSuffix}
          </Text>
        </View>

        {/* Total Distance */}
        {totalDistance > 0 && (
          <View style={{ alignItems: 'center', paddingHorizontal: spacing.sm }}>
            <View style={summaryStyles.valueBadge}>
              <Text variant="heading2" color="primary">
                {distanceSummaryValue}
              </Text>
            </View>
            <Text variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>
              Total Distance{distanceSummaryLabelSuffix}
            </Text>
          </View>
        )}
      </View>
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
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    marginBottom: spacing.xs,
  },
});

const volumeTrendFilterStyles = StyleSheet.create({
  headerControls: {
    alignItems: 'center',
    gap: spacing.md,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filterText: {
    flexShrink: 1,
  },
  modalContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    flex: 1,
  },
  searchInput: {
    backgroundColor: colors.primary.bg,
    borderWidth: 1,
    borderColor: colors.border.medium,
    padding: spacing.md,
    borderRadius: radius.md,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  exerciseList: {
    flex: 1,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
  },
  exerciseItemSelected: {
    backgroundColor: colors.accent.orangeMuted + '20',
  },
});

// Insights tab card styles
const insightsStyles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  headerSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  title: {
    textAlign: 'center',
  },
  linksList: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  divider: {
    height: 1,
    width: '100%',
  },
});

type PerformanceTab = 'general' | 'weights' | 'cardio' | 'insights';

interface TabPillProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const TabPill: React.FC<TabPillProps> = ({ label, isActive, onPress }) => {
  const { theme } = useTheme();

  const baseStyle = {
    flex: 1,
    flexBasis: 0,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.accent.orangeMuted,
    backgroundColor: theme.primary.bg,
  } as const;

  const containerStyle = {
    ...baseStyle,
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
  const { isPremium } = usePremiumStatus();
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
      justifyContent: 'flex-start',
      alignItems: 'center',
      marginTop: -spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: 0,
      gap: spacing.xs,
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
  const [topExercisesTimeRange, setTopExercisesTimeRange] = useState<TimeRange>('week');
  const [volumeTrendTimeRange, setVolumeTrendTimeRange] = useState<TimeRange>('week');
  const [cardioTimeRange, setCardioTimeRange] = useState<TimeRange>('week');
  const [activeTab, setActiveTab] = useState<PerformanceTab>('general');

  // Used to force InsightCards to remount (so they default back to collapsed)
  const [insightsCollapseNonce, setInsightsCollapseNonce] = useState(0);

  // Volume trend exercise filter state
  const [volumeTrendExercise, setVolumeTrendExercise] = useState<string | null>(null);
  const [isExerciseModalVisible, setIsExerciseModalVisible] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');

  // Reset time ranges to 'week' when page gains focus
  useFocusEffect(
    useCallback(() => {
      setGeneralTimeRange('week');
      setVolumeTimeRange('week');
      setTopExercisesTimeRange('week');
      setVolumeTrendTimeRange('week');
      setCardioTimeRange('week');
      setVolumeTrendExercise(null);

      // Ensure insight cards default back to collapsed when returning to this screen.
      setInsightsCollapseNonce((n) => n + 1);
    }, [])
  );

  // Fetch data separately for each time range
  const {
    filteredWorkouts: generalFilteredWorkouts,
    weeklyVolume: generalWeeklyVolume,
    cardioStats: generalCardioStats,
    hasData: hasAnyWorkoutData,
    hasFilteredData: hasGeneralFilteredData,
  } = useAnalyticsData({ timeRange: generalTimeRange });

  const { hasFilteredData: hasVolumeData, filteredWorkouts: volumeFilteredWorkouts } = useAnalyticsData({ timeRange: volumeTimeRange });
  const { filteredWorkouts: topExercisesFilteredWorkouts } = useAnalyticsData({ timeRange: topExercisesTimeRange });
  const { filteredWorkouts: volumeTrendFilteredWorkouts } = useAnalyticsData({ timeRange: volumeTrendTimeRange });
  const weightUnit = useSettingsStore((state) => state.weightUnit);
  const { cardioStats } = useAnalyticsData({ timeRange: cardioTimeRange });

  // Get list of weight exercises the user has performed for the volume trend filter
  const performedWeightExercises = useMemo(() => {
    const exerciseNames = new Set<string>();
    volumeTrendFilteredWorkouts.forEach((workout) => {
      workout.exercises.forEach((exercise: any) => {
        const catalogEntry = exerciseCatalog.find((e) => e.name === exercise.name);
        const exerciseType = catalogEntry?.exerciseType || 'weight';
        if (WEIGHT_EXERCISE_TYPES.includes(exerciseType)) {
          exerciseNames.add(exercise.name);
        }
      });
    });
    return Array.from(exerciseNames).sort();
  }, [volumeTrendFilteredWorkouts]);

  // Filter exercises for the modal
  const filteredExercisesForModal = useMemo(() => {
    const weightExercises = exerciseCatalog.filter(
      (ex) => WEIGHT_EXERCISE_TYPES.includes(ex.exerciseType) && performedWeightExercises.includes(ex.name)
    );
    
    if (!exerciseSearchQuery.trim()) {
      return weightExercises.slice(0, 50);
    }
    
    return searchExercises(exerciseSearchQuery, weightExercises, { limit: 50 });
  }, [exerciseSearchQuery, performedWeightExercises]);

  // Insights data for the Insights tab
  const { groupedInsights, orderedTypes, emptyReason } = useInsightsData();

  const handleDistributionPress = () => {
    router.push('/(tabs)/distribution-analytics');
  };

  const handleVolumePress = () => {
    router.push('/(tabs)/volume-analytics');
  };

  const totalWorkoutSessions = generalFilteredWorkouts.length;

  const totalVolume = useMemo(() => {
    if (!generalWeeklyVolume?.high) return 0;
    return generalWeeklyVolume.high.reduce((sum, bar) => sum + (bar.value || 0), 0);
  }, [generalWeeklyVolume]);

  const totalCardioTime = generalCardioStats.totalDuration;
  const totalCardioDistance = useMemo(
    () =>
      Object.entries(generalCardioStats.totalDistanceByType || {}).reduce(
        (sum, [exerciseName, dist]) => {
          const unit = exerciseCatalog.find(e => e.name === exerciseName)?.distanceUnit;
          if (unit === 'floors') return sum;
          return sum + (dist || 0);
        },
        0,
      ),
    [generalCardioStats.totalDistanceByType],
  );
  const distanceUnitShort = useSettingsStore((state) => state.getDistanceUnitShort());
  const formatDistanceValue = useSettingsStore((state) => state.formatDistanceValue);

  const convertWeight = useSettingsStore((state) => state.convertWeight);
  const userBodyWeight = useUserProfileStore((state) => state.profile?.weightLbs ?? 0);

  const topExercisesByVolume = useMemo(() => {
    const volumes: Record<string, number> = {};

    topExercisesFilteredWorkouts.forEach((workout) => {
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
      .slice(0, 5);

    return entries.map(([name, volume]) => ({ name, volume }));
  }, [topExercisesFilteredWorkouts, convertWeight, userBodyWeight]);

  const renderGeneralTab = () => {
    const cardioDurationHasHours = Math.floor(totalCardioTime / 3600) > 0;
    const cardioDurationMinutes = Math.floor((totalCardioTime % 3600) / 60);
    const cardioSummaryValue = cardioDurationHasHours
      ? formatDuration(totalCardioTime)
      : cardioDurationMinutes.toString();
    const cardioSummaryLabelSuffix = cardioDurationHasHours ? ' (hr:min)' : ' (min)';

    return (
      <>
        <View>
          <PersonalRecordsSection />
        </View>

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
          {!hasGeneralFilteredData ? (
            <View style={cardioStyles.emptyState}>
              <Text variant="body" color="secondary" style={cardioStyles.emptyText}>
                {`No workout data for ${TIME_RANGE_SUBTITLES[generalTimeRange].toLowerCase()}.`}
              </Text>
            </View>
          ) : (
            <View style={summaryStyles.grid}>
              <View style={summaryStyles.tile}>
                <View style={summaryStyles.valueBadge}>
                  <Text variant="heading3" color="primary">
                    {totalWorkoutSessions}
                  </Text>
                </View>
                <Text variant="caption" color="secondary">
                  Workout Sessions
                </Text>
              </View>

              <View style={summaryStyles.tile}>
                <View style={summaryStyles.valueBadge}>
                  <Text variant="heading3" color="primary">
                    {formatCompactNumber(totalVolume)}
                  </Text>
                </View>
                <Text variant="caption" color="secondary">
                  {`Total Volume (${weightUnit})`}
                </Text>
              </View>

              <View style={summaryStyles.tile}>
                <View style={summaryStyles.valueBadge}>
                  <Text variant="heading3" color="primary">
                    {cardioSummaryValue}
                  </Text>
                </View>
                <Text variant="caption" color="secondary">
                  Cardio Time{cardioSummaryLabelSuffix}
                </Text>
              </View>

              <View style={summaryStyles.tile}>
                <View style={summaryStyles.valueBadge}>
                  <Text variant="heading3" color="primary">
                    {formatDistanceValue(totalCardioDistance, 1)}
                  </Text>
                </View>
                <Text variant="caption" color="secondary">
                  {`Cardio Distance (${distanceUnitShort})`}
                </Text>
              </View>
            </View>
          )}
        </AnalyticsCard>

        <PremiumLock
          isLocked={!isPremium}
          featureName="Balance Score"
          onUnlock={() => router.push('/premium')}
        >
          <BalanceScoreCard />
        </PremiumLock>
      </>
    );
  };

  const renderWeightsTab = () => (
    <>
      <AnalyticsCard
        title={`Volume Trend (${weightUnit})`}
        showAccentStripe={false}
        titleCentered={true}
        showHorizontalAccentBar={false}
        showChevron={false}
        headerRight={
          <View style={volumeTrendFilterStyles.headerControls}>
            {/* Exercise filter dropdown */}
            <TouchableOpacity 
              style={volumeTrendFilterStyles.filterButton} 
              onPress={() => {
                setExerciseSearchQuery('');
                setIsExerciseModalVisible(true);
              }}
            >
              <Text variant="caption" color="secondary" numberOfLines={1} style={volumeTrendFilterStyles.filterText}>
                {volumeTrendExercise || 'All Exercises'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={theme.text.secondary} />
            </TouchableOpacity>
            {/* Time range selector */}
            <TimeRangeSelector value={volumeTrendTimeRange} onChange={setVolumeTrendTimeRange} />
          </View>
        }
      >
        <VolumeTrendChart timeRange={volumeTrendTimeRange} selectedExercise={volumeTrendExercise} />
        
        {/* Exercise selection modal */}
        <SheetModal
          visible={isExerciseModalVisible}
          onClose={() => setIsExerciseModalVisible(false)}
          title="Filter by Exercise"
        >
          <View style={volumeTrendFilterStyles.modalContent}>
            <TextInput
              style={volumeTrendFilterStyles.searchInput}
              placeholder="Search exercises..."
              value={exerciseSearchQuery}
              onChangeText={setExerciseSearchQuery}
              placeholderTextColor={colors.text.tertiary}
            />
            
            {/* All Exercises option to clear filter */}
            <TouchableOpacity
              style={volumeTrendFilterStyles.exerciseItem}
              onPress={() => {
                setVolumeTrendExercise(null);
                setIsExerciseModalVisible(false);
              }}
            >
              <Text variant="body" style={!volumeTrendExercise ? { fontWeight: '600' } : undefined}>All Exercises</Text>
              {!volumeTrendExercise && <Ionicons name="checkmark" size={20} color={theme.accent.orange} />}
            </TouchableOpacity>
            
            <FlatList
              data={filteredExercisesForModal}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={volumeTrendFilterStyles.exerciseItem}
                  onPress={() => {
                    if (!isPremium) {
                      setIsExerciseModalVisible(false);
                      router.push('/premium');
                      return;
                    }
                    setVolumeTrendExercise(item.name);
                    setIsExerciseModalVisible(false);
                  }}
                >
                  <Text variant="body" style={volumeTrendExercise === item.name ? { fontWeight: '600' } : undefined}>
                    {item.name}
                  </Text>
                  {volumeTrendExercise === item.name && (
                    <Ionicons name="checkmark" size={20} color={theme.accent.orange} />
                  )}
                </TouchableOpacity>
              )}
              ListFooterComponent={<View style={{ height: spacing.xl * 2 }} />}
              style={volumeTrendFilterStyles.exerciseList}
            />
          </View>
        </SheetModal>
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

      <AnalyticsCard
        title={`Top Exercises (${weightUnit})`}
        showAccentStripe={false}
        titleCentered={true}
        showHorizontalAccentBar={false}
        showChevron={false}
        headerRight={
          <TimeRangeSelector value={topExercisesTimeRange} onChange={setTopExercisesTimeRange} />
        }
      >
        {topExercisesByVolume.length === 0 ? (
          <View style={cardioStyles.emptyState}>
            <Text variant="body" color="secondary" style={cardioStyles.emptyText}>
              {`No workout data for ${TIME_RANGE_SUBTITLES[topExercisesTimeRange].toLowerCase()}.`}
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.sm, paddingTop: spacing.md }}>
            {topExercisesByVolume.map((entry, index) => (
              <View
                key={entry.name}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: spacing.xs,
                  minHeight: 32,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    flex: 1,
                    marginRight: spacing.md,
                  }}
                >
                  <Text variant="body" color="primary" style={{ flex: 1 }} numberOfLines={2}>
                    {index + 1}. {entry.name}
                  </Text>
                </View>
                <View style={{ minWidth: 80, alignItems: 'flex-end' }}>
                  <Text variant="bodySemibold" color="primary">
                    {formatCompactNumber(entry.volume)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </AnalyticsCard>
    </>
  );
  const renderCardioTab = () => (
    <>
      {/* Weekly Cardio Goal Card - Swipeable Time/Distance */}
      <WeeklyCardioGoalCard />

      {/* Distance by Activity Card */}
      <DistanceByActivityCard />

      {/* Cardio Summary Card - Total Time and Total Distance only */}
      <AnalyticsCard
        title="Cardio Summary"
        showAccentStripe={false}
        titleCentered={true}
        showHorizontalAccentBar={false}
        showChevron={false}
        headerRight={
          <TimeRangeSelector value={cardioTimeRange} onChange={setCardioTimeRange} />
        }
      >
        <CardioStatsContent stats={cardioStats} timeRange={cardioTimeRange} />
      </AnalyticsCard>
    </>
  );

  const renderInsightsTab = () => (
    <>
      {/* Insight Cards - always show all 3 categories with empty states or premium locks */}
      {(['plateau', 'balance', 'focus'] as const).map((type) => (
        <PremiumLock
          key={`${type}-${insightsCollapseNonce}`}
          isLocked={!isPremium}
          featureName={type === 'plateau' ? 'Plateaus Detected' : type === 'balance' ? 'Balance Alerts' : 'Focus Suggestions'}
          onUnlock={() => router.push('/premium')}
        >
          <InsightCard
            insights={groupedInsights[type] ?? []}
            insightType={type}
            emptyReason={emptyReason}
          />
        </PremiumLock>
      ))}

      {/* Deep Dive section */}
      <PremiumLock
        isLocked={!isPremium}
        featureName="Deep Dive Analytics"
        onUnlock={() => router.push('/premium')}
      >
        <SurfaceCard tone="neutral" padding="md" showAccentStripe={false}>
          <View style={insightsStyles.content}>
            {/* Header */}
            <View style={insightsStyles.headerSection}>
              <Text variant="heading3" color="primary" style={insightsStyles.title}>
                Detailed Strength Charts
              </Text>
            </View>

            {/* Chart links */}
            <View style={insightsStyles.linksList}>
              <Pressable
                onPress={() => {
                  triggerHaptic('selection');
                  handleVolumePress();
                }}
                style={insightsStyles.linkItem}
              >
                <Text variant="body" color="primary">
                  Volume Totals Breakdown
                </Text>
                <Ionicons name="chevron-forward" size={20} color={theme.accent.orange} />
              </Pressable>

              <View style={[insightsStyles.divider, { backgroundColor: theme.border.light }]} />

              <Pressable
                onPress={() => {
                  triggerHaptic('selection');
                  handleDistributionPress();
                }}
                style={insightsStyles.linkItem}
              >
                <Text variant="body" color="primary">
                  Volume Distribution Map
                </Text>
                <Ionicons name="chevron-forward" size={20} color={theme.accent.orange} />
              </Pressable>
            </View>
          </View>
        </SurfaceCard>
      </PremiumLock>

      {/* Hercules AI Card */}
      <SurfaceCard tone="neutral" padding="md" showAccentStripe={false}>
        <View style={insightsStyles.content}>
          {/* Header */}
          <View style={insightsStyles.headerSection}>
            <Text variant="heading3" color="primary" style={insightsStyles.title}>
              Hercules AI
            </Text>
          </View>

          {/* AI link */}
          <View style={insightsStyles.linksList}>
            <Pressable
              onPress={() => {
                triggerHaptic('selection');
                router.push('/hercules-ai');
              }}
              style={insightsStyles.linkItem}
            >
              <Text variant="body" color="primary">
                Chat with your AI Coach
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.accent.orange} />
            </Pressable>
          </View>
        </View>
      </SurfaceCard>
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
      case 'insights':
        return renderInsightsTab();
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
          label="Overview"
          isActive={activeTab === 'general'}
          onPress={() => setActiveTab('general')}
        />
        <TabPill
          label="Strength"
          isActive={activeTab === 'weights'}
          onPress={() => setActiveTab('weights')}
        />
        <TabPill
          label="Cardio"
          isActive={activeTab === 'cardio'}
          onPress={() => setActiveTab('cardio')}
        />
        <TabPill
          label="Insights"
          isActive={activeTab === 'insights'}
          onPress={() => setActiveTab('insights')}
        />
      </View>

      {renderActiveTabContent()}
    </TabSwipeContainer>
  );
};

export default StatsScreen;
