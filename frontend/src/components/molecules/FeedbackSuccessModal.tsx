/**
 * FeedbackSuccessModal
 * Custom success modal for feedback submission with themed styling
 */

import React from 'react';
import {
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { colors, radius, spacing, shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface FeedbackSuccessModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FeedbackSuccessModal: React.FC<FeedbackSuccessModalProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();

  const handleClose = () => {
    triggerHaptic('selection');
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: theme.surface.card }]}>
              {/* Success Message */}
              <Text variant="heading2" color="primary" style={styles.title}>
                Thank You!
              </Text>

              <Text variant="body" color="secondary" style={styles.message}>
                Your feedback has been submitted successfully. We appreciate your input!
              </Text>

              {/* Action Button */}
              <Button
                label="Close"
                variant="primary"
                onPress={handleClose}
                style={styles.button}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  container: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    ...shadows.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  button: {
    width: '100%',
  },
});
