/**
 * NameEditModal
 * Modal for editing user's first and last name
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { InputField } from '@/components/atoms/InputField';
import { colors, radius, spacing, shadows } from '@/constants/theme';
import { supabaseClient } from '@/lib/supabaseClient';
import { useUserProfileStore } from '@/store/userProfileStore';

interface NameEditModalProps {
  visible: boolean;
  firstName: string;
  lastName: string;
  onClose: () => void;
  onSave: (firstName: string, lastName: string) => void;
}

export const NameEditModal: React.FC<NameEditModalProps> = ({
  visible,
  firstName,
  lastName,
  onClose,
  onSave,
}) => {
  const { updateProfile } = useUserProfileStore();
  const [tempFirstName, setTempFirstName] = useState(firstName);
  const [tempLastName, setTempLastName] = useState(lastName);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setTempFirstName(firstName);
      setTempLastName(lastName);
      setIsSaving(false); // Reset saving state when modal opens
    }
  }, [visible, firstName, lastName]);

  const handleCancel = () => {
    if (isSaving) return; // Prevent closing while saving
    triggerHaptic('selection');
    onClose();
  };

  const handleSave = async () => {
    if (isSaving) return; // Prevent multiple saves

    triggerHaptic('success');

    const trimmedFirst = tempFirstName.trim();
    const trimmedLast = tempLastName.trim();

    // Validate input
    if (!trimmedFirst && !trimmedLast) {
      Alert.alert('Invalid Name', 'Please enter at least a first name or last name.');
      return;
    }

    setIsSaving(true);
    console.log('[NameEditModal] Starting save...', { trimmedFirst, trimmedLast });

    try {
      // Get current user
      const { data: { user } } = await supabaseClient.auth.getUser();

      if (!user) {
        throw new Error('No authenticated user');
      }

      console.log('[NameEditModal] Updating profiles table...');

      // Update profiles table directly (skip auth.updateUser which is problematic)
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          first_name: trimmedFirst,
          last_name: trimmedLast,
          full_name: `${trimmedFirst} ${trimmedLast}`.trim(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        throw profileError;
      }

      console.log('[NameEditModal] Profile updated successfully');

      // Update the centralized store for real-time updates across the app
      updateProfile(trimmedFirst, trimmedLast);

      // Update parent component state (for backwards compatibility)
      console.log('[NameEditModal] Calling onSave callback');
      onSave(trimmedFirst, trimmedLast);

      // Close modal
      console.log('[NameEditModal] Closing modal');
      onClose();

    } catch (error: any) {
      console.error('[NameEditModal] Error saving name:', error);
      Alert.alert('Error', error.message || 'Failed to save name. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
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
            <View style={styles.container}>
              <Text variant="heading2" color="primary" style={styles.title}>
                Edit Name
              </Text>

              <View style={styles.form}>
                <InputField
                  label="First Name"
                  value={tempFirstName}
                  onChangeText={setTempFirstName}
                  placeholder="Enter your first name"
                  autoCapitalize="words"
                  returnKeyType="next"
                  editable={!isSaving}
                />

                <InputField
                  label="Last Name"
                  value={tempLastName}
                  onChangeText={setTempLastName}
                  placeholder="Enter your last name"
                  autoCapitalize="words"
                  returnKeyType="done"
                  editable={!isSaving}
                />
              </View>

              <View style={styles.actions}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={handleCancel}
                  style={styles.button}
                  disabled={isSaving}
                />

                <Button
                  label="Save"
                  variant="primary"
                  onPress={handleSave}
                  style={styles.button}
                  loading={isSaving}
                />
              </View>
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
    backgroundColor: colors.overlay.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  container: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.xl,
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
});
