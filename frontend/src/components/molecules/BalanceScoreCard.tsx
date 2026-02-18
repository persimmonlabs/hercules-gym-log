/**
 * BalanceScoreCard
 * Shows a composite balance score (0-100) with colored ring
 * Tap to expand and show Training Balance details
 */

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, StyleSheet, Animated, ScrollView, Pressable, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { TimeRangeSelector } from '@/components/atoms/TimeRangeSelector';
import { colors, spacing, radius } from '@/constants/theme';
import {
  useTrainingBalanceMetrics,
  calculateRatioScore,
  getIdealRatios,
  ALL_L2_GROUPS,
  MOVEMENT_PATTERN_TARGETS,
} from '@/hooks/useTrainingBalanceMetrics';
import { useUserProfileStore } from '@/store/userProfileStore';
import { triggerHaptic } from '@/utils/haptics';
import { TIME_RANGE_SUBTITLES } from '@/types/analytics';
import type { TimeRange } from '@/types/analytics';
import type { BalanceData } from '@/hooks/useTrainingBalanceMetrics';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = spacing.md * 2;
const SLIDE_WIDTH = SCREEN_WIDTH - CARD_PADDING - spacing.md * 2;

interface BalanceBarProps {
  label: string;
  leftValue: number;
  rightValue: number;
}

const BalanceBar: React.FC<BalanceBarProps> = ({
  label,
  leftValue,
  rightValue,
}) => {
  const total = leftValue + rightValue;
  const leftPercent = total > 0 ? (leftValue / total) * 100 : 50;
  const rightPercent = total > 0 ? (rightValue / total) * 100 : 50;
  
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

interface BalanceSectionProps {
  title: string;
  data: BalanceData;
}

const BalanceSection: React.FC<BalanceSectionProps> = ({ title, data }) => {
  return (
    <View style={styles.section}>
      <Text variant="labelMedium" color="secondary" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={styles.sectionContent}>
        <BalanceBar
          label="Push / Pull"
          leftValue={data.push}
          rightValue={data.pull}
        />

        <BalanceBar
          label="Upper / Lower"
          leftValue={data.upper}
          rightValue={data.lower}
        />

        <BalanceBar
          label="Compound / Isolated"
          leftValue={data.compound}
          rightValue={data.isolated}
        />
      </View>
    </View>
  );
};

const CircularProgress: React.FC<{ score: number; size: number }> = ({ score, size }) => {
  // Clamp score to 0-100 range
  const clampedScore = Math.max(0, Math.min(score, 100));

  const ringSize = size - 20;
  const strokeWidth = 10;
  const radiusValue = ringSize / 2;
  const effectiveRadius = radiusValue - strokeWidth / 2;
  const circumference = 2 * Math.PI * effectiveRadius;

  const progress = clampedScore / 100;
  const strokeDashoffset = circumference * (1 - progress);

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
        {progress > 0 && (
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

      {/* Score text */}
      <View style={styles.scoreContainer}>
        <Text variant="heading3" color="primary">
          {Math.round(clampedScore)}
        </Text>
      </View>
    </View>
  );
};

export const BalanceScoreCard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const metrics = useTrainingBalanceMetrics(timeRange);
  const { volumeData, setData, hasData, muscleGroupSets, movementPatterns } = metrics;
  const primaryGoal = useUserProfileStore((s) => s.profile?.primaryGoal);
  
  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };
  
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
  
  // Calculate composite balance score using 5 dimensions
  const balanceScore = useMemo(() => {
    if (!hasData) return 0;

    const ideals = getIdealRatios(primaryGoal);

    // --- Dimension 1: Ratio balance (40% weight) ---
    // Uses volume-based ratios with goal-aware ideal targets
    const pushPullScore = calculateRatioScore(volumeData.push, volumeData.pull, ideals.pushPull);
    const upperLowerScore = calculateRatioScore(volumeData.upper, volumeData.lower, ideals.upperLower);
    const compoundIsolatedScore = calculateRatioScore(volumeData.compound, volumeData.isolated, ideals.compoundIsolated);
    const ratioScore = (pushPullScore + upperLowerScore + compoundIsolatedScore) / 3;

    // --- Dimension 2: Muscle group coverage (25% weight) ---
    // How many of the 11 L2 muscle groups received at least 1 fractional set?
    const trainedGroups = ALL_L2_GROUPS.filter((g) => (muscleGroupSets[g] ?? 0) >= 0.5).length;
    const coverageScore = (trainedGroups / ALL_L2_GROUPS.length) * 100;

    // --- Dimension 3: Movement pattern diversity (15% weight) ---
    // How many of the 7 key movement patterns were used?
    const patternsHit = MOVEMENT_PATTERN_TARGETS.filter((p) => movementPatterns.has(p)).length;
    const diversityScore = (patternsHit / MOVEMENT_PATTERN_TARGETS.length) * 100;

    // --- Dimension 4: Set-based ratio agreement (10% weight) ---
    // Cross-check: do set-based ratios agree with volume-based ratios?
    const setPushPull = calculateRatioScore(setData.push, setData.pull, ideals.pushPull);
    const setUpperLower = calculateRatioScore(setData.upper, setData.lower, ideals.upperLower);
    const setCompIso = calculateRatioScore(setData.compound, setData.isolated, ideals.compoundIsolated);
    const setAgreementScore = (setPushPull + setUpperLower + setCompIso) / 3;

    // --- Dimension 5: Volume distribution evenness (10% weight) ---
    // Penalise when a single muscle group dominates (Gini-like check)
    const groupVolumes = ALL_L2_GROUPS.map((g) => muscleGroupSets[g] ?? 0).filter((v) => v > 0);
    let evennessScore = 100;
    if (groupVolumes.length >= 2) {
      const total = groupVolumes.reduce((a, b) => a + b, 0);
      const maxShare = Math.max(...groupVolumes) / total;
      // Perfect evenness for 11 groups ≈ 9% each; penalise if any group > 30%
      evennessScore = maxShare <= 0.15 ? 100 : Math.max(0, 100 - (maxShare - 0.15) * 300);
    }

    // Weighted composite
    const composite =
      ratioScore * 0.40 +
      coverageScore * 0.25 +
      diversityScore * 0.15 +
      setAgreementScore * 0.10 +
      evennessScore * 0.10;

    return Math.round(Math.max(0, Math.min(100, composite)));
  }, [volumeData, setData, muscleGroupSets, movementPatterns, hasData, primaryGoal]);

  const renderBalanceSlide = (title: string, data: BalanceData) => (
    <View style={[styles.slide, { width: SLIDE_WIDTH }]}>
      <View style={styles.slideHeader}>
        <Text variant="labelMedium" color="secondary" style={styles.slideTitle}>
          {title}
        </Text>
      </View>
      <View style={styles.sectionContent}>
        <BalanceBar
          label="Push / Pull"
          leftValue={data.push}
          rightValue={data.pull}
        />

        <BalanceBar
          label="Upper / Lower"
          leftValue={data.upper}
          rightValue={data.lower}
        />

        <BalanceBar
          label="Compound / Isolated"
          leftValue={data.compound}
          rightValue={data.isolated}
        />
      </View>
    </View>
  );
  
  return (
    <SurfaceCard tone="neutral" padding="md" showAccentStripe={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="heading3" color="primary">
            Balance Score
          </Text>
        </View>
        
        {/* Time range selector below header */}
        <View style={styles.timeRangeContainer}>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </View>
        
        {!hasData ? (
          <View style={styles.emptyState}>
            <Text variant="body" color="secondary" style={styles.emptyText}>
              {`No workout data for ${TIME_RANGE_SUBTITLES[timeRange].toLowerCase()}.`}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.scoreSection}>
              <CircularProgress score={balanceScore} size={120} />
              <Text variant="caption" color="secondary" style={styles.scoreDescription}>
                {balanceScore >= 75 ? 'Excellent Balance' : 
                 balanceScore >= 50 ? 'Good Balance' : 
                 'Needs Improvement'}
              </Text>
            </View>
            
            {/* Tap for details indicator */}
            <TouchableOpacity onPress={toggleExpanded} activeOpacity={0.8}>
              <View style={styles.detailsIndicator}>
                <Text variant="caption" color="secondary">
                  {isExpanded ? 'Tap to hide details' : 'Tap for details'}
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>
      
      {/* Expandable Training Balance details with swipeable slides */}
      {isExpanded && hasData && (
        <Animated.View style={styles.expandedContent}>
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
            {renderBalanceSlide('By Volume', volumeData)}
            {renderBalanceSlide('By Sets', setData)}
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
        </Animated.View>
      )}
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    alignItems: 'center',
  },
  timeRangeContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  scoreSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  progressContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    position: 'relative',
  },
  backgroundCircle: {
    position: 'absolute',
    borderWidth: 10,
  },
  progressCircle: {
    position: 'absolute',
    borderWidth: 10,
  },
  scoreContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreDescription: {
    textAlign: 'center',
  },
  detailsIndicator: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  expandedContent: {
    marginTop: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  slide: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  slideHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  slideTitle: {
    textAlign: 'center',
  },
  sectionsContainer: {
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    textAlign: 'center',
    paddingBottom: spacing.sm,
  },
  sectionContent: {
    gap: spacing.lg,
  },
  balanceItem: {
    gap: spacing.sm,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    minHeight: 120,
  },
  emptyText: {
    textAlign: 'center',
  },
});
