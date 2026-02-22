/**
 * DeleteConfirmationModal
 * A confirmation dialog shown when deleting a notification reminder.
 */

import React from 'react';
import { Modal, StyleSheet, View, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { colors, radius, spacing } from '@/constants/theme';

interface DeleteConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  title = 'Delete Reminder',
  message = 'Are you sure you want to delete this reminder?',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
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
            <Text variant="heading3" style={styles.title}>{title}</Text>
            <Text variant="body" color="secondary" style={styles.message}>
              {message}
            </Text>

            <View style={styles.buttonStack}>
              <Button
                label={cancelLabel}
                onPress={onClose}
                variant="ghost"
                disabled={isLoading}
              />
              <Button
                label={confirmLabel}
                onPress={onConfirm}
                loading={isLoading}
                disabled={isLoading}
                contentStyle={styles.deleteButton}
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
  deleteButton: {
    backgroundColor: colors.accent.orange,
    borderWidth: 2,
    borderColor: colors.accent.orange,
    borderRadius: radius.lg,
  },
});
