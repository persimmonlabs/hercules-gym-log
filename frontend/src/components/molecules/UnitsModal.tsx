/**
 * UnitsModal
 * Modal for selecting granular unit preferences (weight, distance, size).
 */

import React, { useCallback } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  useSettingsStore,
  WeightUnit,
  DistanceUnit,
  SizeUnit,
} from '@/store/settingsStore';

interface UnitsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface UnitRowProps {
  label: string;
  options: { value: string; label: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

const UnitRow: React.FC<UnitRowProps> = ({
  label,
  options,
  selectedValue,
  onSelect,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.unitRow}>
      <Text variant="bodySemibold" color="primary" style={styles.unitLabel}>
        {label}
      </Text>
      <View style={styles.toggleContainer}>
        {options.map((option) => {
          const isSelected = selectedValue === option.value;
          return (
            <Pressable
              key={option.value}
              style={[
                styles.toggleOption,
                { borderColor: theme.border.light, backgroundColor: theme.surface.card },
                isSelected && { backgroundColor: theme.accent.orange, borderColor: theme.accent.orange },
              ]}
              onPress={() => {
                void Haptics.selectionAsync();
                onSelect(option.value);
              }}
            >
              <View style={styles.toggleOptionContent}>
                <Text
                  variant="bodySemibold"
                  color={isSelected ? 'onAccent' : 'primary'}
                  style={styles.toggleOptionText}
                >
                  {option.label.split(' ')[0]}
                </Text>
                <Text
                  variant="caption"
                  color={isSelected ? 'onAccent' : 'primary'}
                  style={styles.toggleOptionUnit}
                >
                  {option.label.split(' ')[1]}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export const UnitsModal: React.FC<UnitsModalProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const {
    weightUnit,
    distanceUnit,
    sizeUnit,
    setWeightUnit,
    setDistanceUnit,
    setSizeUnit,
  } = useSettingsStore();

  const handleClose = useCallback(() => {
    void Haptics.selectionAsync();
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={[styles.modalContent, { backgroundColor: theme.surface.card }]} onPress={(e) => e.stopPropagation()}>
          <Text variant="heading2" color="primary" style={styles.title}>
            Measurement Units
          </Text>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.optionsContainer}>
              <UnitRow
                label="Weight"
                options={[
                  { value: 'lbs', label: 'Pounds (lbs)' },
                  { value: 'kg', label: 'Kilograms (kg)' },
                ]}
                selectedValue={weightUnit}
                onSelect={(value) => setWeightUnit(value as WeightUnit)}
              />

              <UnitRow
                label="Distance"
                options={[
                  { value: 'mi', label: 'Miles (mi)' },
                  { value: 'km', label: 'Kilometers (km)' },
                ]}
                selectedValue={distanceUnit}
                onSelect={(value) => setDistanceUnit(value as DistanceUnit)}
              />

              <UnitRow
                label="Size (Height)"
                options={[
                  { value: 'in', label: 'Inches (in)' },
                  { value: 'cm', label: 'Centimeters (cm)' },
                ]}
                selectedValue={sizeUnit}
                onSelect={(value) => setSizeUnit(value as SizeUnit)}
              />
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <Button
              label="Done"
              variant="primary"
              onPress={handleSave}
              style={styles.button}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
  },
  scrollContent: {
    flexGrow: 0,
  },
  optionsContainer: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  unitRow: {
    gap: spacing.xs,
  },
  unitLabel: {
    marginBottom: spacing.xxs,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOptionContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOptionText: {
    textAlign: 'center',
  },
  toggleOptionUnit: {
    textAlign: 'center',
    marginTop: 1,
  },
  buttonContainer: {
    marginTop: spacing.sm,
  },
  button: {
    width: '100%',
  },
});
