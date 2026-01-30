/**
 * FeedbackModal
 * Modal for sending user feedback with a simple text input
 */

import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { FeedbackSuccessModal } from '@/components/molecules/FeedbackSuccessModal';
import { colors, radius, spacing, shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { submitFeedback } from '@/services/feedbackService';
import { useAuth } from '@/providers/AuthProvider';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const characterCount = feedback.length;
  const maxCharacters = 2000;

  const handleCancel = () => {
    if (isSubmitting) return;
    triggerHaptic('selection');
    onClose();
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const trimmedFeedback = feedback.trim();
    
    // Validate input
    if (!trimmedFeedback) {
      Alert.alert('Invalid Feedback', 'Please enter your feedback before submitting.');
      return;
    }

    if (trimmedFeedback.length > 2000) {
      Alert.alert('Invalid Feedback', 'Please keep your feedback under 2000 characters.');
      return;
    }

    triggerHaptic('success');
    setIsSubmitting(true);

    try {
      // Submit feedback using the service with user ID
      await submitFeedback(trimmedFeedback, user?.id);
      
      // Show custom success modal
      setShowSuccessModal(true);
      
      // Close modal and reset form
      setFeedback('');
      onClose();
      
    } catch (error: any) {
      console.error('[FeedbackModal] Error submitting feedback:', error);
      Alert.alert('Error', error.message || 'Failed to submit feedback. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!visible) {
      setFeedback('');
      setIsSubmitting(false);
    }
  }, [visible]);

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
  };

  return (
    <>
      <Modal
        animationType="fade"
        transparent
        visible={visible}
        onRequestClose={handleCancel}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={handleCancel}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.container, { backgroundColor: theme.surface.card }]}>
                <Text variant="heading2" color="primary" style={styles.title}>
                  Send Feedback
                </Text>

                <Text variant="body" color="secondary" style={styles.subtitle}>
                  Help us improve Hercules by sharing your thoughts, suggestions, or reporting issues.
                </Text>

                <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag">
                  <View style={styles.form}>
                    <View style={[styles.textInputContainer, { 
                      backgroundColor: theme.surface.elevated,
                      borderRadius: radius.md,
                      padding: spacing.sm,
                      borderWidth: 2,
                      borderColor: theme.accent?.orange || '#FF6B47',
                      minHeight: 180,
                    }]}>
                      <TextInput
                        style={[
                          styles.textInput, 
                          { 
                            backgroundColor: 'transparent',
                            borderColor: 'transparent',
                            color: theme.text.primary,
                          }
                        ]}
                        value={feedback}
                        onChangeText={setFeedback}
                        placeholder="Your feedback..."
                        placeholderTextColor={theme.text.tertiary}
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                        editable={!isSubmitting}
                        maxLength={2000}
                      />
                      <View style={styles.characterCounter}>
                        <Text 
                          variant="caption" 
                          color={characterCount > 1800 ? "primary" : "tertiary"}
                        >
                          {characterCount}/{maxCharacters}
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.actions}>
                  <Button
                    label="Cancel"
                    variant="ghost"
                    onPress={handleCancel}
                    style={styles.button}
                    disabled={isSubmitting}
                  />

                  <Button
                    label={isSubmitting ? "Submitting..." : "Submit"}
                    variant="primary"
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    style={styles.button}
                    loading={isSubmitting}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <FeedbackSuccessModal
        visible={showSuccessModal}
        onClose={handleSuccessModalClose}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  container: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    minHeight: 500,
    ...shadows.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  scrollContent: {
    flex: 1,
    marginBottom: spacing.lg,
    minHeight: 200,
  },
  form: {
    gap: spacing.md,
  },
  textInput: {
    minHeight: 150,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: 'System',
    backgroundColor: 'transparent', // Will be set dynamically
  },
  textInputContainer: {
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  characterCounter: {
    alignItems: 'flex-end',
    paddingTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    minWidth: 120,
    minHeight: 44,
  },
  spinner: {
    marginLeft: spacing.xs,
  },
});
