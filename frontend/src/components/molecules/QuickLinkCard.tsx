/**
 * QuickLinkCard
 * Molecule presenting a single quick action with balanced hierarchy.
 * Keeps gradient usage limited to icon accents while maintaining soft surfaces.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, sizing, spacing } from '@/constants/theme';
import { QuickLinkItem } from '@/types/dashboard';

interface QuickLinkCardProps {
  /** Quick action item content */
  item: QuickLinkItem;
}

export const QuickLinkCard: React.FC<QuickLinkCardProps> = ({ item }) => {
  const isPrimary = item.variant === 'primary';

  return (
    <SurfaceCard tone={isPrimary ? 'tint' : 'card'} padding="lg" style={styles.card}>
      <View style={[styles.iconWrapper, isPrimary ? styles.iconPrimary : styles.iconSecondary]}>
        <LinearGradient
          colors={[colors.accent.gradientStart, colors.accent.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.iconGradient, { opacity: isPrimary ? 1 : 0.2 }]}
        />
        <IconSymbol
          name={item.icon}
          color={isPrimary ? colors.text.onAccent : colors.accent.primary}
          size={sizing.iconMD}
        />
      </View>

      <View style={styles.content}>
        <Text variant="bodySemibold" color="primary">
          {item.title}
        </Text>
        <Text variant="body" color="secondary">
          {item.description}
        </Text>
      </View>

      <View style={[styles.chevronWrapper, isPrimary ? styles.chevronPrimary : styles.chevronNeutral]}>
        <IconSymbol
          name="chevron-right"
          color={isPrimary ? colors.text.onAccent : colors.accent.primary}
          size={sizing.iconSM}
        />
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconPrimary: {
    backgroundColor: colors.accent.orange,
  },
  iconSecondary: {
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  iconGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  chevronWrapper: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronPrimary: {
    backgroundColor: colors.accent.orange,
  },
  chevronNeutral: {
    borderWidth: 1,
    borderColor: colors.border.light,
  },
});
