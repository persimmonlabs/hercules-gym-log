/**
 * BodyMetricsModal
 * Modal for editing user height and weight for accurate analytics calculations.
 */

import React, { useState, useCallback } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { colors, radius, shadows, spacing } from '@/constants/theme';

interface BodyMetricsModalProps {
  visible: boolean;
  heightFeet: number;
  heightInches: number;
  weightLbs: number;
  onClose: () => void;
  onSave: (heightFeet: number, heightInches: number, weightLbs: number) => void;
}

const FEET_OPTIONS = [4, 5, 6, 7];
const INCHES_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export const BodyMetricsModal: React.FC<BodyMetricsModalProps> = ({
  visible,
  heightFeet: initialFeet,
  heightInches: initialInches,
  weightLbs: initialWeight,
  onClose,
  onSave,
}) => {
  const [feet, setFeet] = useState(initialFeet);
  const [inches, setInches] = useState(initialInches);
  const [weightInput, setWeightInput] = useState(initialWeight > 0 ? String(initialWeight) : '');

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setFeet(initialFeet);
      setInches(initialInches);
      setWeightInput(initialWeight > 0 ? String(initialWeight) : '');
    }
  }, [visible, initialFeet, initialInches, initialWeight]);

  const handleFeetChange = useCallback((newFeet: number) => {
    void Haptics.selectionAsync();
    setFeet(newFeet);
  }, []);

  const handleInchesChange = useCallback((newInches: number) => {
    void Haptics.selectionAsync();
    setInches(newInches);
  }, []);

  const handleWeightChange = useCallback((text: string) => {
    // Only allow numbers
    const cleaned = text.replace(/[^0-9]/g, '');
    setWeightInput(cleaned);
  }, []);

  const handleSave = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const weight = weightInput ? parseInt(weightInput, 10) : 0;
    onSave(feet, inches, weight);
  }, [feet, inches, weightInput, onSave]);

  const handleClose = useCallback(() => {
    void Haptics.selectionAsync();
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
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <Text variant="heading2" color="primary" style={styles.title}>
            Body Metrics
          </Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            Used for accurate volume calculations
          </Text>

          {/* Height Section */}
          <View style={styles.section}>
            <Text variant="bodySemibold" color="primary" style={styles.sectionTitle}>
              Height
            </Text>
            <View style={styles.heightContainer}>
              {/* Feet Picker */}
              <View style={styles.pickerColumn}>
                <Text variant="label" color="secondary" style={styles.pickerLabel}>
                  Feet
                </Text>
                <View style={styles.pickerOptions}>
                  {FEET_OPTIONS.map((ft) => (
                    <Pressable
                      key={ft}
                      style={[
                        styles.pickerOption,
                        feet === ft && styles.pickerOptionSelected,
                      ]}
                      onPress={() => handleFeetChange(ft)}
                    >
                      <Text
                        variant="bodySemibold"
                        color={feet === ft ? 'onAccent' : 'primary'}
                      >
                        {ft}'
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Inches Picker */}
              <View style={styles.pickerColumn}>
                <Text variant="label" color="secondary" style={styles.pickerLabel}>
                  Inches
                </Text>
                <View style={styles.pickerOptions}>
                  {INCHES_OPTIONS.map((inch) => (
                    <Pressable
                      key={inch}
                      style={[
                        styles.pickerOption,
                        styles.pickerOptionSmall,
                        inches === inch && styles.pickerOptionSelected,
                      ]}
                      onPress={() => handleInchesChange(inch)}
                    >
                      <Text
                        variant="bodySemibold"
                        color={inches === inch ? 'onAccent' : 'primary'}
                      >
                        {inch}"
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Weight Section */}
          <View style={styles.section}>
            <Text variant="bodySemibold" color="primary" style={styles.sectionTitle}>
              Weight
            </Text>
            <View style={styles.weightInputContainer}>
              <TextInput
                value={weightInput}
                onChangeText={handleWeightChange}
                placeholder="150"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
                style={styles.weightInput}
                cursorColor={colors.accent.primary}
                selectionColor={colors.accent.orangeLight}
              />
              <Text variant="body" color="secondary" style={styles.weightUnit}>
                lbs
              </Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={handleClose}
              style={styles.button}
            />
            <Button
              label="Save"
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
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  heightContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  pickerOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  pickerOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    minWidth: 48,
    alignItems: 'center',
  },
  pickerOptionSmall: {
    paddingHorizontal: spacing.sm,
    minWidth: 40,
  },
  pickerOptionSelected: {
    backgroundColor: colors.accent.orange,
    borderColor: colors.accent.orange,
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  weightInput: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    color: colors.text.primary,
    textAlign: 'center',
  },
  weightUnit: {
    width: 32,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  button: {
    flex: 1,
  },
});
