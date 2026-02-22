/**
 * SignOutConfirmationModal
 * A themed confirmation dialog for sign out with rounded corners and orange accent
 */

import React from 'react';
import { Modal, StyleSheet, View, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius } from '@/constants/theme';

interface SignOutConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const SignOutConfirmationModal: React.FC<SignOutConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const handleCancelPress = () => {
    triggerHaptic('selection');
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    setTimeout(() => {
      scale.value = withSpring(1);
      onClose();
    }, 100);
  };

  const handleSignOutPress = () => {
    triggerHaptic('warning');
    onConfirm();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.overlay.scrim }]}>
        <Animated.View style={[
          styles.card,
          {
            backgroundColor: theme.surface.card,
            borderColor: theme.accent.orange,
          },
          { transform: [{ scale: scale.value }] }
        ]}>
          <View style={[
            styles.iconContainer,
            { 
              backgroundColor: theme.surface.tint,
              borderColor: theme.accent.orange,
            }
          ]}>
            <IconSymbol
              name="logout"
              color={theme.accent.orange}
              size={32}
            />
          </View>
          
          <Text variant="heading3" color="primary" style={styles.title}>
            Sign Out
          </Text>
          
          <Text variant="body" color="secondary" style={styles.message}>
            Are you sure you want to sign out? You&apos;ll need to sign in again to access your account.
          </Text>

          <View style={styles.buttonStack}>
            <Button
              label="Cancel"
              onPress={handleCancelPress}
              variant="ghost"
              disabled={isLoading}
            />
            <Button
              label="Sign Out"
              onPress={handleSignOutPress}
              loading={isLoading}
              disabled={isLoading}
              contentStyle={[
                styles.signOutButton,
                {
                  backgroundColor: theme.accent.orange,
                  borderColor: theme.accent.orange,
                }
              ]}
              textColor={theme.text.onAccent}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  buttonStack: {
    width: '100%',
    gap: spacing.md,
  },
  signOutButton: {
    borderWidth: 2,
    borderRadius: radius.lg,
  },
});
