/**
 * SwipePreviewCard
 * Molecule presenting a subtle hint about adjacent tab when swiping.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { colors, radius, spacing, shadows } from '@/constants/theme';

type SwipeDirection = 'left' | 'right';

interface SwipePreviewCardProps {
  /** Title of the destination tab */
  title: string;
  /** Direction user should swipe toward */
  direction: SwipeDirection;
}

export const SwipePreviewCard: React.FC<SwipePreviewCardProps> = ({ title, direction }) => {
  return (
    <SurfaceCard tone="elevated" padding="xl" style={styles.card}>
      <View style={styles.stack}>
        <Text variant="heading3" color="primary">
          {title}
        </Text>
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 280,
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.lg,
    ...shadows.md,
  },
  stack: {
    gap: spacing.sm,
  },
});
