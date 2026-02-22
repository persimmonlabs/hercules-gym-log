/**
 * ProfilePickerModal
 * Generic modal for selecting a single option from a list.
 * Reused across profile settings (gender, experience, goal, equipment, training days).
 */

import React, { useCallback } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface PickerOption {
  value: string | number;
  label: string;
}

interface ProfilePickerModalProps {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selectedValue: string | number | null | undefined;
  onSelect: (value: string | number) => void;
  onClose: () => void;
}

export const ProfilePickerModal: React.FC<ProfilePickerModalProps> = ({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}) => {
  const { theme } = useTheme();

  const handleClose = useCallback(() => {
    triggerHaptic('selection');
    onClose();
  }, [onClose]);

  const handleSelect = useCallback((value: string | number) => {
    triggerHaptic('selection');
    onSelect(value);
    onClose();
  }, [onSelect, onClose]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.modalContent, { backgroundColor: theme.surface.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text variant="heading2" color="primary" style={styles.title}>
            {title}
          </Text>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.optionsContainer}>
              {options.map((option) => {
                const isSelected = selectedValue === option.value;
                return (
                  <Pressable
                    key={String(option.value)}
                    style={[
                      styles.optionItem,
                      { borderColor: theme.border.light, backgroundColor: theme.surface.card },
                      isSelected && { backgroundColor: theme.accent.orange, borderColor: theme.accent.orange },
                    ]}
                    onPress={() => handleSelect(option.value)}
                  >
                    <Text
                      variant="bodySemibold"
                      color={isSelected ? 'onAccent' : 'primary'}
                      style={styles.optionText}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    ...shadows.lg,
  },
  title: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 0,
  },
  optionsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  optionItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionText: {
    textAlign: 'center',
  },
});
