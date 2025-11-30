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
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { InputField } from '@/components/atoms/InputField';
import { colors, radius, spacing, shadows } from '@/constants/theme';
import { supabaseClient } from '@/lib/supabaseClient';

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
  const [tempFirstName, setTempFirstName] = useState(firstName);
  const [tempLastName, setTempLastName] = useState(lastName);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setTempFirstName(firstName);
      setTempLastName(lastName);
    }
  }, [visible, firstName, lastName]);

  const handleCancel = () => {
    void Haptics.selectionAsync();
    onClose();
  };

  const handleSave = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const trimmedFirst = tempFirstName.trim();
    const trimmedLast = tempLastName.trim();
    
    // Validate input
    if (!trimmedFirst && !trimmedLast) {
      Alert.alert('Invalid Name', 'Please enter at least a first name or last name.');
      return;
    }

    // 1. Set loading state
    // We need to wait for the auth update to ensure persistence
    const { data: { user }, error: authError } = await supabaseClient.auth.updateUser({
      data: {
        first_name: trimmedFirst,
        last_name: trimmedLast,
        full_name: `${trimmedFirst} ${trimmedLast}`.trim(),
      },
    });

    if (authError) {
      console.error('Auth update failed:', authError);
      Alert.alert('Error', 'Failed to save name. Please try again.');
      return;
    }

    // 2. Update profiles table in background (Fire & Forget)
    // Using upsert to handle both insert/update cases gracefully
    if (user) {
      supabaseClient
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          first_name: trimmedFirst,
          last_name: trimmedLast,
          full_name: `${trimmedFirst} ${trimmedLast}`.trim(),
          updated_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) console.warn('Profile DB update failed (non-fatal):', error);
        });
    }

    // 3. Update UI and close
    onSave(trimmedFirst, trimmedLast);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={handleCancel}
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
                />
                
                <InputField
                  label="Last Name"
                  value={tempLastName}
                  onChangeText={setTempLastName}
                  placeholder="Enter your last name"
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <Text variant="bodySemibold" color="secondary">
                    Cancel
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  activeOpacity={0.7}
                >
                  <Text variant="bodySemibold" style={styles.saveButtonText}>
                    Save
                  </Text>
                </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  saveButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.accent.orange,
  },
  saveButtonText: {
    color: colors.text.onAccent,
  },
});
