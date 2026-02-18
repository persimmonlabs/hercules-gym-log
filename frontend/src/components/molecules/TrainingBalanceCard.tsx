/**
 * TrainingBalanceCard
 * Shows push/pull and other muscle balance metrics
 * Consolidated view with both volume and sets data in one card
 * Uses shared useTrainingBalanceMetrics hook for consistent calculations.
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { TimeRangeSelector } from '@/components/atoms/TimeRangeSelector';
import { colors, spacing, radius } from '@/constants/theme';
import { useTrainingBalanceMetrics } from '@/hooks/useTrainingBalanceMetrics';
import { TIME_RANGE_SUBTITLES } from '@/types/analytics';
import type { TimeRange } from '@/types/analytics';

const EMPTY_MIN_HEIGHT = 240;

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

interface BalanceSectionData {
  push: number;
  pull: number;
  upper: number;
  lower: number;
  compound: number;
  isolated: number;
}

interface BalanceSectionProps {
  title: string;
  data: BalanceSectionData;
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

export const TrainingBalanceCard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const { volumeData, setData, hasData } = useTrainingBalanceMetrics(timeRange);

  return (
    <SurfaceCard tone="neutral" padding="md" showAccentStripe={false}>
      <View style={styles.container}>
        <View style={[styles.header, styles.headerCentered]}>
          <Text variant="heading3" color="primary">
            Training Balance
          </Text>
        </View>

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
          <View style={styles.sectionsContainer}>
            <BalanceSection title="By Volume" data={volumeData} />
            <BalanceSection title="By Sets" data={setData} />
          </View>
        )}
      </View>
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
  },
  headerCentered: {
    alignItems: 'center',
  },
  timeRangeContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
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
    minHeight: EMPTY_MIN_HEIGHT,
  },
  emptyText: {
    textAlign: 'center',
  },
});
