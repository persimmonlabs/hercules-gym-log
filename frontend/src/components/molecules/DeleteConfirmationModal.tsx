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
  isLoading?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
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
      <View style={styles.container}>
        <View style={styles.card}>
          <Text variant="heading3" style={styles.title}>Delete Reminder</Text>
          <Text variant="body" color="secondary" style={styles.message}>
            Are you sure you want to delete this reminder?
          </Text>

          <View style={styles.buttonStack}>
            <Button
              label="Cancel"
              onPress={onClose}
              variant="ghost"
              contentStyle={styles.cancelButton}
              textColor={colors.accent.orange}
              disabled={isLoading}
            />
            <Button
              label="Delete"
              onPress={onConfirm}
              loading={isLoading}
              disabled={isLoading}
              contentStyle={styles.deleteButton}
              textColor={colors.text.onAccent}
            />
          </View>
        </View>
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
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.accent.orange,
    borderRadius: radius.lg,
  },
  deleteButton: {
    backgroundColor: colors.accent.orange,
    borderWidth: 2,
    borderColor: colors.accent.orange,
    borderRadius: radius.lg,
  },
});
