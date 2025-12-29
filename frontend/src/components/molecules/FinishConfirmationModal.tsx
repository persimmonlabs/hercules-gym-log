import React from 'react';
import { Modal, StyleSheet, View, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { colors, radius, spacing, sizing } from '@/constants/theme';

interface FinishConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

/**
 * FinishConfirmationModal
 * A confirmation dialog shown when a user tries to finish their workout.
 */
export const FinishConfirmationModal: React.FC<FinishConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View style={styles.container}>
          <View style={styles.card}>
            <Text variant="heading3" style={styles.title}>Finish Workout?</Text>
            <Text variant="body" color="secondary" style={styles.message}>
              Are you sure you want to end your current session?
            </Text>

            <View style={styles.buttonStack}>
              <Button
                label="Continue Workout"
                onPress={onClose}
                variant="ghost"
                contentStyle={styles.continueButton}
                textColor={colors.accent.orange}
                disabled={isLoading}
              />
              <Button
                label="Finish Workout"
                onPress={onConfirm}
                loading={isLoading}
                disabled={isLoading}
                contentStyle={styles.finishButton}
                textColor={colors.text.onAccent}
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
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.accent.orange,
    alignItems: 'center',
    gap: spacing.md,
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
  },
  continueButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.accent.orange,
    borderRadius: radius.lg,
  },
  finishButton: {
    backgroundColor: colors.accent.orange,
    borderWidth: 2,
    borderColor: colors.accent.orange,
    borderRadius: radius.lg,
  },
});
