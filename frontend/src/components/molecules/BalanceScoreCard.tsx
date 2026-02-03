/**
 * BalanceScoreCard
 * Shows a composite balance score (0-100) with colored ring
 * Tap to expand and show Training Balance details
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { TimeRangeSelector } from '@/components/atoms/TimeRangeSelector';
import { colors, spacing, radius } from '@/constants/theme';
import { useTrainingBalanceMetrics } from '@/hooks/useTrainingBalanceMetrics';
import { TIME_RANGE_SUBTITLES } from '@/types/analytics';
import type { TimeRange } from '@/types/analytics';

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

import type { BalanceData } from '@/hooks/useTrainingBalanceMetrics';

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
  const { volumeData, setData, hasData } = useTrainingBalanceMetrics(timeRange);
  
  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };
  
  // Calculate composite balance score
  const balanceScore = useMemo(() => {
    if (!hasData) return 0;
    
    // Calculate individual scores based on ideal ratios
    const calculateRatioScore = (left: number, right: number, idealLeft: number) => {
      const total = left + right;
      if (total === 0) return 0;
      
      const leftPercent = (left / total) * 100;
      const idealPercent = idealLeft;
      
      // Score based on how close to ideal (100% = perfect match)
      const diff = Math.abs(leftPercent - idealPercent);
      return Math.max(0, 100 - diff * 2); // 2 points per percent deviation
    };
    
    // Calculate scores for each ratio
    const pushPullScore = calculateRatioScore(volumeData.push, volumeData.pull, 50); // 50/50 ideal
    const upperLowerScore = calculateRatioScore(volumeData.upper, volumeData.lower, 55); // 55/45 ideal
    const compoundIsolatedScore = calculateRatioScore(volumeData.compound, volumeData.isolated, 60); // 60/40 ideal
    
    // Average the three scores
    return Math.round((pushPullScore + upperLowerScore + compoundIsolatedScore) / 3);
  }, [volumeData, hasData]);
  
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
      
      {/* Expandable Training Balance details */}
      {isExpanded && hasData && (
        <Animated.View style={styles.expandedContent}>
          <View style={styles.sectionsContainer}>
            <BalanceSection title="By Volume" data={volumeData} />
            <BalanceSection title="By Sets" data={setData} />
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
