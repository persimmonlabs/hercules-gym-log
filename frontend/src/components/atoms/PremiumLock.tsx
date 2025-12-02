/**
 * PremiumLock
 * Clean lock card for premium-gated content
 * When locked, shows only the lock message on a white card (no blurred preview)
 * 
 * @param isLocked - Whether content should be locked
 * @param ctaText - Call-to-action button text
 * @param featureName - Name of the premium feature
 * @param onUnlock - Callback when unlock button pressed
 * @param children - Content to show when unlocked
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { colors, spacing, radius, shadows } from '@/constants/theme';

interface PremiumLockProps {
  isLocked: boolean;
  ctaText?: string;
  featureName?: string;
  onUnlock?: () => void;
  children: React.ReactNode;
}

export const PremiumLock: React.FC<PremiumLockProps> = ({
  isLocked,
  ctaText = 'Unlock with Pro',
  featureName,
  onUnlock,
  children,
}) => {
  if (!isLocked) {
    return <>{children}</>;
  }

  // When locked, show clean lock card instead of blurred content
  return (
    <View style={styles.lockedCard}>
      <View style={styles.lockBadge}>
        <Ionicons name="lock-closed" size={24} color={colors.accent.orange} />
      </View>

      {featureName && (
        <Text variant="bodySemibold" color="primary" style={styles.featureName}>
          {featureName}
        </Text>
      )}

      <Text variant="caption" color="secondary" style={styles.description}>
        Unlock detailed analytics with Hercules Pro
      </Text>

      <TouchableOpacity
        style={styles.ctaButton}
        onPress={onUnlock}
        activeOpacity={0.8}
      >
        <Ionicons name="star" size={16} color={colors.text.onAccent} />
        <Text variant="labelMedium" style={styles.ctaText}>
          {ctaText}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  lockedCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    minHeight: 180,
  },
  lockBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.surface.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  featureName: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.orange,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    gap: spacing.xs,
    ...shadows.sm,
  },
  ctaText: {
    color: colors.text.onAccent,
  },
});
