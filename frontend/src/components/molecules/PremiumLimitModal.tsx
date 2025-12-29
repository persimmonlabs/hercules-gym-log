import React from 'react';
import { Modal, StyleSheet, View, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface PremiumLimitModalProps {
  visible: boolean;
  onClose: () => void;
  limitType: 'workout' | 'plan';
}

/**
 * PremiumLimitModal
 * A modal shown when free users hit their workout or plan limits.
 * Features dark overlay, rounded corners, orange theme, and "Unlock with Pro" button.
 */
export const PremiumLimitModal: React.FC<PremiumLimitModalProps> = ({
  visible,
  onClose,
  limitType,
}) => {
  const router = useRouter();
  const { theme } = useTheme();

  const title = limitType === 'workout' ? 'Workout Limit Reached' : 'Plan Limit Reached';
  const limit = limitType === 'workout' ? '7 workouts' : '1 plan';
  const message = `Free users can create up to ${limit}. Upgrade to Hercules Pro for unlimited ${limitType}s and more premium features.`;

  const handleUnlockPress = () => {
    void Haptics.selectionAsync();
    onClose();
    // Navigate to existing Premium page
    router.push('/premium' as any);
  };

  const handleClose = () => {
    void Haptics.selectionAsync();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        
        <View style={styles.container}>
          <View style={[styles.card, { backgroundColor: theme.surface.card }]}>
            <View style={styles.iconContainer}>
              <IconSymbol name="lock" size={48} color={colors.accent.orange} />
            </View>

            <Text variant="heading3" style={styles.title}>{title}</Text>
            <Text variant="body" color="secondary" style={styles.message}>
              {message}
            </Text>

            <View style={styles.buttonStack}>
              <Button
                label="Unlock with Pro"
                onPress={handleUnlockPress}
                variant="primary"
                contentStyle={styles.unlockButton}
                textColor={colors.text.onAccent}
              />
              <Button
                label="Maybe Later"
                onPress={handleClose}
                variant="ghost"
                contentStyle={styles.cancelButton}
                textColor={colors.accent.orange}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.accent.orange,
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    marginBottom: spacing.sm,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  buttonStack: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  unlockButton: {
    backgroundColor: colors.accent.orange,
    borderWidth: 2,
    borderColor: colors.accent.orange,
    borderRadius: radius.lg,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.accent.orange,
    borderRadius: radius.lg,
  },
});
