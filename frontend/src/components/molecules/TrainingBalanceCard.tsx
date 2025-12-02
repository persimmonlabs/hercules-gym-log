/**
 * TrainingBalanceCard
 * Shows push/pull and other muscle balance metrics
 * Swipeable between volume-based and set-based views
 */

import React, { useMemo, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { TimeRangeSelector } from '@/components/atoms/TimeRangeSelector';
import { colors, spacing, radius } from '@/constants/theme';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import exercisesData from '@/data/exercises.json';
import type { TimeRange } from '@/types/analytics';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = spacing.md * 2;
const CONTENT_WIDTH = SCREEN_WIDTH - CARD_PADDING - spacing.md * 2;

const EXERCISE_MUSCLES = exercisesData.reduce((acc, ex) => {
  if (ex.muscles) {
    acc[ex.name] = ex.muscles as unknown as Record<string, number>;
  }
  return acc;
}, {} as Record<string, Record<string, number>>);

// Muscle categorization for balance analysis
const PUSH_MUSCLES = ['Chest', 'Front Delts', 'Triceps', 'Upper Chest', 'Mid Chest', 'Lower Chest'];
const PULL_MUSCLES = ['Back', 'Lats', 'Rear Delts', 'Biceps', 'Mid Back', 'Upper Back', 'Traps'];
const QUAD_DOMINANT = ['Quads', 'Quad'];
const HIP_DOMINANT = ['Hamstrings', 'Glutes', 'Hams'];
// Compound exercises (multi-joint movements)
const COMPOUND_EXERCISES = [
  'Barbell Bench Press', 'Barbell Squat', 'Barbell Deadlift', 'Dumbbell Bench Press',
  'Dumbbell Squat', 'Romanian Deadlift', 'Overhead Press', 'Pull-ups', 'Rows',
  'Dips', 'Lunges', 'Leg Press', 'Shoulder Press'
];
// Isolated exercises (single-joint movements)
const ISOLATED_EXERCISES = [
  'Bicep Curls', 'Tricep Extensions', 'Leg Curls', 'Leg Extensions',
  'Calf Raises', 'Lateral Raises', 'Front Raises', 'Rear Delt Flyes',
  'Cable Flyes', 'Pec Deck', 'Hammer Curls'
];

interface BalanceBarProps {
  label: string;
  leftLabel: string;
  rightLabel: string;
  leftValue: number;
  rightValue: number;
}

const BalanceBar: React.FC<BalanceBarProps> = ({
  label,
  leftLabel,
  rightLabel,
  leftValue,
  rightValue,
}) => {
  const total = leftValue + rightValue;
  const leftPercent = total > 0 ? (leftValue / total) * 100 : 50;
  const rightPercent = total > 0 ? (rightValue / total) * 100 : 50;

  const getAssessment = () => {
    if (total === 0) return { text: 'No data', color: colors.text.tertiary, icon: 'remove' as const };
    const diff = Math.abs(leftPercent - 50);
    if (diff < 10) return { text: 'Balanced', color: colors.accent.success, icon: 'checkmark-circle' as const };
    if (diff < 20) return { text: 'Slight imbalance', color: colors.accent.warning, icon: 'alert-circle' as const };
    return { text: 'Imbalanced', color: colors.accent.red, icon: 'warning' as const };
  };

  const assessment = getAssessment();
  
  // Determine colors based on which side is higher
  const isBalanced = Math.abs(leftPercent - rightPercent) < 1;
  const leftIsHigher = leftPercent > rightPercent;
  
  const leftBarColor = isBalanced 
    ? colors.accent.orange 
    : leftIsHigher 
      ? colors.accent.orange 
      : 'rgba(255, 107, 74, 0.4)';
  
  const rightBarColor = isBalanced 
    ? colors.accent.orange 
    : !leftIsHigher 
      ? colors.accent.orange 
      : 'rgba(255, 107, 74, 0.4)';

  return (
    <View style={styles.balanceItem}>
      <View style={styles.balanceHeader}>
        <Text variant="labelMedium" color="primary">{label}</Text>
        <View style={styles.assessmentBadge}>
          <Ionicons name={assessment.icon} size={14} color={assessment.color} />
          <Text variant="captionSmall" style={{ color: assessment.color }}>
            {assessment.text}
          </Text>
        </View>
      </View>

      <View style={styles.barContainer}>
        <View style={[styles.barSegment, { flex: leftPercent, backgroundColor: leftBarColor }]}>
          <Text variant="captionSmall" color="primary" style={styles.barText}>
            {Math.round(leftPercent)}%
          </Text>
        </View>
        {isBalanced && <View style={styles.divider} />}
        <View style={[styles.barSegment, { flex: rightPercent, backgroundColor: rightBarColor }]}>
          <Text variant="captionSmall" color="primary" style={styles.barText}>
            {Math.round(rightPercent)}%
          </Text>
        </View>
      </View>
    </View>
  );
};

interface BalanceData {
  push: number;
  pull: number;
  quad: number;
  hip: number;
  upper: number;
  lower: number;
  compound: number;
  isolated: number;
}

interface BalancePageProps {
  data: BalanceData;
  width: number;
}

const BalancePage: React.FC<BalancePageProps> = ({ data, width }) => {
  return (
    <View style={[styles.page, { width }]}>
      <BalanceBar
        label="Push / Pull"
        leftLabel="Push"
        rightLabel="Pull"
        leftValue={data.push}
        rightValue={data.pull}
      />

      <BalanceBar
        label="Upper / Lower"
        leftLabel="Upper"
        rightLabel="Lower"
        leftValue={data.upper}
        rightValue={data.lower}
      />

      <BalanceBar
        label="Compound / Isolated"
        leftLabel="Compound"
        rightLabel="Isolated"
        leftValue={data.compound}
        rightValue={data.isolated}
      />
    </View>
  );
};

export const TrainingBalanceCard: React.FC = () => {
  const workouts = useWorkoutSessionsStore((state) => state.workouts);
  const [currentPage, setCurrentPage] = useState(0);
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const scrollViewRef = useRef<ScrollView>(null);

  // Calculate balance data for both volume and sets
  const { volumeData, setData, hasData } = useMemo(() => {
    const volumeBalance: BalanceData = { push: 0, pull: 0, quad: 0, hip: 0, upper: 0, lower: 0, compound: 0, isolated: 0 };
    const setBalance: BalanceData = { push: 0, pull: 0, quad: 0, hip: 0, upper: 0, lower: 0, compound: 0, isolated: 0 };

    // Calculate cutoff date based on time range
    const now = new Date();
    let cutoff: Date;
    
    switch (timeRange) {
      case 'week':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        cutoff = new Date(0); // Beginning of time
        break;
      default:
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    workouts
      .filter((w) => new Date(w.date) >= cutoff)
      .forEach((workout) => {
        workout.exercises.forEach((exercise: any) => {
          const muscles = EXERCISE_MUSCLES[exercise.name];
          if (!muscles) return;

          exercise.sets.forEach((set: any) => {
            if (!set.completed || set.weight <= 0) return;
            
            const volume = set.weight * set.reps;

            Object.keys(muscles).forEach((muscle) => {
              // Volume-based
              if (PUSH_MUSCLES.some((p) => muscle.includes(p))) volumeBalance.push += volume;
              if (PULL_MUSCLES.some((p) => muscle.includes(p))) volumeBalance.pull += volume;
              if (QUAD_DOMINANT.some((q) => muscle.includes(q))) volumeBalance.quad += volume;
              if (HIP_DOMINANT.some((h) => muscle.includes(h))) volumeBalance.hip += volume;
              if ([...PUSH_MUSCLES, ...PULL_MUSCLES, 'Arms', 'Shoulders'].some((u) => muscle.includes(u))) {
                volumeBalance.upper += volume;
              }
              if ([...QUAD_DOMINANT, ...HIP_DOMINANT, 'Calf', 'Hip'].some((l) => muscle.includes(l))) {
                volumeBalance.lower += volume;
              }

              // Compound vs Isolated - check exercise name directly
              const exerciseName = exercise.name.toLowerCase();
              const isCompound = COMPOUND_EXERCISES.some(comp => exerciseName.includes(comp.toLowerCase()));
              const isIsolated = ISOLATED_EXERCISES.some(iso => exerciseName.includes(iso.toLowerCase()));
              
              if (isCompound) {
                volumeBalance.compound += volume;
              } else if (isIsolated) {
                volumeBalance.isolated += volume;
              }

              // Set-based
              if (PUSH_MUSCLES.some((p) => muscle.includes(p))) setBalance.push += 1;
              if (PULL_MUSCLES.some((p) => muscle.includes(p))) setBalance.pull += 1;
              if (QUAD_DOMINANT.some((q) => muscle.includes(q))) setBalance.quad += 1;
              if (HIP_DOMINANT.some((h) => muscle.includes(h))) setBalance.hip += 1;
              if ([...PUSH_MUSCLES, ...PULL_MUSCLES, 'Arms', 'Shoulders'].some((u) => muscle.includes(u))) {
                setBalance.upper += 1;
              }
              if ([...QUAD_DOMINANT, ...HIP_DOMINANT, 'Calf', 'Hip'].some((l) => muscle.includes(l))) {
                setBalance.lower += 1;
              }
              
              if (isCompound) {
                setBalance.compound += 1;
              } else if (isIsolated) {
                setBalance.isolated += 1;
              }
            });
          });
        });
      });

    const hasVolumeData = Object.values(volumeBalance).some((v) => v > 0);
    const hasSetData = Object.values(setBalance).some((v) => v > 0);

    return {
      volumeData: volumeBalance,
      setData: setBalance,
      hasData: hasVolumeData || hasSetData,
    };
  }, [workouts, timeRange]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newPage = Math.round(offsetX / CONTENT_WIDTH);
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [currentPage]);

  if (!hasData) {
    return (
      <SurfaceCard tone="neutral" padding="md" showAccentStripe={false}>
        <View style={[styles.header, styles.headerCentered]}>
          <Text variant="heading3" color="primary">Training Balance</Text>
        </View>
        <View style={styles.emptyState}>
          <Text variant="body" color="tertiary" style={styles.emptyText}>
            Complete some workouts to see balance analysis
          </Text>
        </View>
      </SurfaceCard>
    );
  }

  const pages = [
    { key: 'volume', label: 'Volume', data: volumeData },
    { key: 'sets', label: 'Sets', data: setData },
  ];

  return (
    <SurfaceCard tone="neutral" padding="md" showAccentStripe={false}>
      <View style={styles.container}>
        <View style={[styles.header, styles.headerCentered]}>
          <Text variant="heading3" color="primary">
            Training Balance by {currentPage === 0 ? 'Volume' : 'Sets'}
          </Text>
        </View>

        <View style={styles.timeRangeContainer}>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={CONTENT_WIDTH}
          contentContainerStyle={styles.scrollContent}
        >
          {pages.map((page) => (
            <BalancePage key={page.key} data={page.data} width={CONTENT_WIDTH} />
          ))}
        </ScrollView>

        {/* Page indicators */}
        <View style={styles.indicators}>
          {pages.map((page, index) => (
            <View
              key={page.key}
              style={[
                styles.indicator,
                index === currentPage && styles.indicatorActive,
              ]}
            />
          ))}
        </View>
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  headerCentered: {
    alignItems: 'center',
  },
  timeRangeContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  scrollContent: {
    // Content container
  },
  page: {
    gap: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  balanceItem: {
    gap: spacing.sm,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assessmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  barContainer: {
    flexDirection: 'row',
    height: 28,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  barSegment: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    width: 2,
    backgroundColor: colors.primary.bg,
  },
  barText: {
    color: colors.text.onAccent,
    fontWeight: '600',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral.gray200,
  },
  indicatorActive: {
    backgroundColor: colors.accent.orange,
  },
  dataTypeIndicator: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
  },
});
