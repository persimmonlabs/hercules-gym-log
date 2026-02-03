/**
 * WeeklyCardioGoalCard
 * Shows weekly cardio goal progress with swipeable Time/Distance slides.
 * Features a circular progress ring matching BalanceScoreCard style.
 */
import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CardioGoalModal, CardioGoalType } from '@/components/molecules/CardioGoalModal';
import { colors, spacing, radius, sizing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/store/settingsStore';
import { useWeeklyCardioProgress } from '@/hooks/useWeeklyCardioProgress';
import { triggerHaptic } from '@/utils/haptics';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = spacing.md * 2;
const SLIDE_WIDTH = SCREEN_WIDTH - CARD_PADDING - spacing.md * 2;

interface CircularProgressProps {
  percentage: number;
  size: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({ percentage, size }) => {
  const ringSize = size - 20;
  const strokeWidth = 10;
  const radiusValue = ringSize / 2;
  const effectiveRadius = radiusValue - strokeWidth / 2;
  const circumference = 2 * Math.PI * effectiveRadius;

  // Clamp progress for visual ring (max 100%), but display actual percentage
  const visualProgress = Math.min(percentage, 100) / 100;
  const strokeDashoffset = circumference * (1 - visualProgress);

  // Display percentage can exceed 100%
  const displayPercentage = Math.round(percentage);

  return (
    <View style={[styles.progressContainer, { width: size, height: size }]}>
      <Svg width={ringSize} height={ringSize}>
        {/* Background ring - always muted orange */}
        <Circle
          cx={radiusValue}
          cy={radiusValue}
          r={effectiveRadius}
          stroke={colors.accent.orangeMuted}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Foreground progress ring - primary orange, proportional to score */}
        {visualProgress > 0 && (
          <Circle
            cx={radiusValue}
            cy={radiusValue}
            r={effectiveRadius}
            stroke={colors.accent.orange}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${radiusValue}, ${radiusValue}`}
          />
        )}
      </Svg>

      {/* Percentage text in center */}
      <View style={styles.percentageContainer}>
        <Text variant="heading3" color="primary">
          {displayPercentage}%
        </Text>
      </View>
    </View>
  );
};

const formatDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    if (minutes < 10) {
      return `${hours}:0${minutes}`;
    }
    return `${hours}:${minutes}`;
  }
  return `${minutes}m`;
};

const formatGoalDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
};

export const WeeklyCardioGoalCard: React.FC = () => {
  const { theme } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalModalType, setGoalModalType] = useState<CardioGoalType>('time');

  const {
    weeklyCardioTimeGoal,
    weeklyCardioDistanceGoal,
    distanceUnit,
    convertDistance,
    getDistanceUnitShort,
  } = useSettingsStore();

  const { weeklyTime, weeklyDistance } = useWeeklyCardioProgress();

  // Calculate percentages
  const timePercentage = weeklyCardioTimeGoal && weeklyCardioTimeGoal > 0
    ? (weeklyTime / weeklyCardioTimeGoal) * 100
    : 0;
  
  const distancePercentage = weeklyCardioDistanceGoal && weeklyCardioDistanceGoal > 0
    ? (weeklyDistance / weeklyCardioDistanceGoal) * 100
    : 0;

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / SLIDE_WIDTH);
    if (newIndex !== activeSlide && (newIndex === 0 || newIndex === 1)) {
      setActiveSlide(newIndex);
      triggerHaptic('selection');
    }
  }, [activeSlide]);

  const handleDotPress = useCallback((index: number) => {
    triggerHaptic('selection');
    scrollRef.current?.scrollTo({ x: index * SLIDE_WIDTH, animated: true });
    setActiveSlide(index);
  }, []);

  const openGoalModal = useCallback((type: CardioGoalType) => {
    triggerHaptic('selection');
    setGoalModalType(type);
    setGoalModalVisible(true);
  }, []);

  const distanceUnitShort = getDistanceUnitShort();

  // Format progress/goal text for time
  const formatTimeProgress = () => {
    const progressStr = formatDuration(weeklyTime);
    const goalStr = weeklyCardioTimeGoal ? formatGoalDuration(weeklyCardioTimeGoal) : '—';
    return `${progressStr} / ${goalStr}`;
  };

  // Format progress/goal text for distance
  const formatDistanceProgress = () => {
    const progressValue = convertDistance(weeklyDistance);
    const progressStr = progressValue.toFixed(1);
    const goalValue = weeklyCardioDistanceGoal ? convertDistance(weeklyCardioDistanceGoal) : null;
    const goalStr = goalValue ? goalValue.toFixed(1) : '—';
    return `${progressStr} / ${goalStr} ${distanceUnitShort}`;
  };

  const renderTimeSlide = () => {
    const hasGoal = weeklyCardioTimeGoal && weeklyCardioTimeGoal > 0;

    return (
      <View style={[styles.slide, { width: SLIDE_WIDTH }]}>
        <View style={styles.slideHeader}>
          <Text variant="body" color="primary" style={styles.slideTitle}>Time Goal</Text>
          <Pressable
            onPress={() => openGoalModal('time')}
            hitSlop={spacing.sm}
            style={styles.settingsButton}
          >
            <IconSymbol
              name={hasGoal ? 'edit' : 'add'}
              size={sizing.iconSM}
              color={theme.accent.orange}
            />
          </Pressable>
        </View>

        {hasGoal ? (
          <View style={styles.progressContent}>
            <CircularProgress percentage={timePercentage} size={120} />
            <Text variant="body" color="secondary" style={styles.progressText}>
              {formatTimeProgress()}
            </Text>
          </View>
        ) : (
          <Pressable style={styles.emptyState} onPress={() => openGoalModal('time')}>
            <View style={styles.emptyIconContainer}>
              <IconSymbol name="add" size={sizing.iconLG} color={theme.accent.orange} />
            </View>
            <Text variant="body" color="secondary" style={styles.emptyText}>
              Set a weekly time goal
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  const renderDistanceSlide = () => {
    const hasGoal = weeklyCardioDistanceGoal && weeklyCardioDistanceGoal > 0;

    return (
      <View style={[styles.slide, { width: SLIDE_WIDTH }]}>
        <View style={styles.slideHeader}>
          <Text variant="body" color="primary" style={styles.slideTitle}>Distance Goal</Text>
          <Pressable
            onPress={() => openGoalModal('distance')}
            hitSlop={spacing.sm}
            style={styles.settingsButton}
          >
            <IconSymbol
              name={hasGoal ? 'edit' : 'add'}
              size={sizing.iconSM}
              color={theme.accent.orange}
            />
          </Pressable>
        </View>

        {hasGoal ? (
          <View style={styles.progressContent}>
            <CircularProgress percentage={distancePercentage} size={120} />
            <Text variant="body" color="secondary" style={styles.progressText}>
              {formatDistanceProgress()}
            </Text>
          </View>
        ) : (
          <Pressable style={styles.emptyState} onPress={() => openGoalModal('distance')}>
            <View style={styles.emptyIconContainer}>
              <IconSymbol name="add" size={sizing.iconLG} color={theme.accent.orange} />
            </View>
            <Text variant="body" color="secondary" style={styles.emptyText}>
              Set a weekly distance goal
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <>
      <SurfaceCard tone="neutral" padding="md" showAccentStripe={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text variant="heading3" color="primary">
              Weekly Cardio Goal
            </Text>
          </View>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={SLIDE_WIDTH}
            contentContainerStyle={styles.scrollContent}
          >
            {renderTimeSlide()}
            {renderDistanceSlide()}
          </ScrollView>

          {/* Page indicator dots */}
          <View style={styles.dotsContainer}>
            <Pressable
              onPress={() => handleDotPress(0)}
              hitSlop={spacing.sm}
              style={styles.dotHitArea}
            >
              <View style={[
                styles.dot,
                activeSlide === 0 ? styles.dotActive : styles.dotInactive,
              ]} />
            </Pressable>
            <Pressable
              onPress={() => handleDotPress(1)}
              hitSlop={spacing.sm}
              style={styles.dotHitArea}
            >
              <View style={[
                styles.dot,
                activeSlide === 1 ? styles.dotActive : styles.dotInactive,
              ]} />
            </Pressable>
          </View>
        </View>
      </SurfaceCard>

      <CardioGoalModal
        visible={goalModalVisible}
        onClose={() => setGoalModalVisible(false)}
        goalType={goalModalType}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  slide: {
    paddingHorizontal: spacing.md,
  },
  slideHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    position: 'relative',
  },
  slideTitle: {
    textAlign: 'center',
  },
  settingsButton: {
    padding: spacing.xs,
    position: 'absolute',
    right: 0,
  },
  progressContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  progressContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  percentageContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.accent.orangeMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  dotHitArea: {
    padding: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.accent.orange,
  },
  dotInactive: {
    backgroundColor: colors.accent.orangeMuted,
  },
});
