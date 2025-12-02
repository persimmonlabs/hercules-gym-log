/**
 * ChartWrapper
 * Unified wrapper for all charts with loading, empty, and error states
 * 
 * @param state - Current state of the chart data
 * @param emptyMessage - Message to show when no data available
 * @param errorMessage - Message to show when error occurs
 * @param minHeight - Minimum height for consistent layout
 * @param children - Chart content to render when ready
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { colors, spacing } from '@/constants/theme';
import type { ChartState } from '@/types/analytics';

interface ChartWrapperProps {
  state: ChartState;
  emptyMessage?: string;
  errorMessage?: string;
  minHeight?: number;
  children: React.ReactNode;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({
  state,
  emptyMessage = 'No data available',
  errorMessage = 'Failed to load data',
  minHeight = 200,
  children,
}) => {
  if (state === 'loading') {
    return (
      <View style={[styles.container, { minHeight }]}>
        <ActivityIndicator size="large" color={colors.accent.orange} />
        <Text variant="caption" color="secondary" style={styles.message}>
          Loading analytics...
        </Text>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={[styles.container, { minHeight }]}>
        <Text variant="body" color="secondary" style={styles.message}>
          {errorMessage}
        </Text>
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View style={[styles.container, { minHeight }]}>
        <Text variant="body" color="secondary" style={styles.message}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  message: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
