/**
 * CreditsExhaustedModal
 * Shown when user runs out of both normal and purchased AI credits.
 * Offers to purchase additional credits or wait for weekly reset.
 */

import React from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius } from '@/constants/theme';
import { triggerHaptic } from '@/utils/haptics';

interface CreditsExhaustedModalProps {
  visible: boolean;
  nextResetAt: string;
  onPurchase: () => void;
  onDismiss: () => void;
  isPurchasing: boolean;
}

const formatResetDate = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'next Monday';
  }
};

export const CreditsExhaustedModal: React.FC<CreditsExhaustedModalProps> = ({
  visible,
  nextResetAt,
  onPurchase,
  onDismiss,
  isPurchasing,
}) => {
  const { theme } = useTheme();

  const handlePurchase = () => {
    triggerHaptic('light');
    onPurchase();
  };

  const handleDismiss = () => {
    triggerHaptic('light');
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface.card,
              borderColor: theme.border.light,
            },
          ]}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: theme.accent.orangeMuted },
            ]}
          >
            <IconSymbol name="bolt" size={28} color={theme.accent.orange} />
          </View>

          <Text variant="heading3" color="primary" style={styles.title}>
            Credits Used Up
          </Text>

          <Text variant="body" color="secondary" style={styles.description}>
            You've used all your AI credits for this week. Free credits reset on{' '}
            <Text variant="bodySemibold" color="primary">
              {formatResetDate(nextResetAt)}
            </Text>{' '}
            at midnight UTC.
          </Text>

          <View style={styles.divider} />

          <Text variant="bodySemibold" color="primary" style={styles.offerTitle}>
            Need more credits now?
          </Text>
          <Text variant="caption" color="secondary" style={styles.offerDesc}>
            Get 100 additional AI messages for $0.99. Purchased credits roll
            over week to week until used.
          </Text>

          <Button
            label={isPurchasing ? 'Processing...' : 'Get 100 Credits — $0.99'}
            variant="primary"
            size="lg"
            onPress={handlePurchase}
            disabled={isPurchasing}
            style={styles.purchaseButton}
          />

          <Pressable onPress={handleDismiss} style={styles.dismissButton}>
            <Text variant="body" color="secondary">
              No thanks, I'll wait
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginVertical: spacing.md,
  },
  offerTitle: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  offerDesc: {
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  purchaseButton: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  dismissButton: {
    paddingVertical: spacing.sm,
  },
});
