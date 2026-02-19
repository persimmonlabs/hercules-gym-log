/**
 * OutdoorMetricsBar
 * Displays real-time metrics (time, distance, pace) for outdoor sessions.
 * Horizontal row of three stat cells with large typography.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { spacing, radius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/store/settingsStore';
import { formatElapsedTime, formatPace } from '@/utils/geo';

interface OutdoorMetricsBarProps {
  elapsedSeconds: number;
  distanceMiles: number;
  paceSecondsPerMile: number | null;
}

export const OutdoorMetricsBar: React.FC<OutdoorMetricsBarProps> = ({
  elapsedSeconds,
  distanceMiles,
  paceSecondsPerMile,
}) => {
  const { theme } = useTheme();
  const convertDistance = useSettingsStore((s) => s.convertDistance);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);

  const displayDistance = useMemo(() => {
    const converted = convertDistance(distanceMiles);
    return converted < 10 ? converted.toFixed(2) : converted.toFixed(1);
  }, [distanceMiles, convertDistance]);

  const displayPace = useMemo(() => {
    if (paceSecondsPerMile === null) return '--:--';
    // Convert pace to user's unit (sec/mi → sec/km if metric)
    const paceInUserUnit = distanceUnit === 'km'
      ? paceSecondsPerMile / 1.60934
      : paceSecondsPerMile;
    return formatPace(paceInUserUnit);
  }, [paceSecondsPerMile, distanceUnit]);

  const unitLabel = distanceUnit === 'km' ? 'km' : 'mi';
  const paceLabel = distanceUnit === 'km' ? '/km' : '/mi';

  return (
    <View style={[styles.container, { backgroundColor: theme.surface.card, borderColor: theme.border.light }]}>
      <View style={styles.cell}>
        <Text variant="label" color="secondary" style={styles.cellLabel}>
          Time
        </Text>
        <Text variant="statValue" color="primary" style={styles.cellValue}>
          {formatElapsedTime(elapsedSeconds)}
        </Text>
        <Text variant="caption" style={{ color: 'transparent' }}>
          {' '}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border.light }]} />

      <View style={styles.cell}>
        <Text variant="label" color="secondary" style={styles.cellLabel}>
          Distance
        </Text>
        <Text variant="statValue" color="primary" style={styles.cellValue}>
          {displayDistance}
        </Text>
        <Text variant="caption" color="tertiary">
          {unitLabel}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border.light }]} />

      <View style={styles.cell}>
        <Text variant="label" color="secondary" style={styles.cellLabel}>
          Pace
        </Text>
        <Text variant="statValue" color="primary" style={styles.cellValue}>
          {displayPace}
        </Text>
        <Text variant="caption" color="tertiary">
          {paceLabel}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  cellLabel: {
    textAlign: 'center',
  },
  cellValue: {
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: '60%',
    alignSelf: 'center',
  },
});
