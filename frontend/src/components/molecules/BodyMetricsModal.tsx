/**
 * BodyMetricsModal
 * Modal for editing user height and weight for accurate analytics calculations.
 * Supports both imperial (ft/in, lbs) and metric (cm, kg) units based on user preferences.
 */

import React, { useState, useCallback } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { colors, radius, shadows, spacing } from '@/constants/theme';
import { useSettingsStore } from '@/store/settingsStore';

interface BodyMetricsModalProps {
  visible: boolean;
  heightFeet: number;
  heightInches: number;
  weightLbs: number;
  onClose: () => void;
  onSave: (heightFeet: number, heightInches: number, weightLbs: number) => void;
}

// Conversion constants
const LBS_TO_KG = 0.453592;
const KG_TO_LBS = 2.20462;
const CM_PER_INCH = 2.54;

/**
 * Convert feet and inches to centimeters
 */
const feetInchesToCm = (feet: number, inches: number): number => {
  const totalInches = feet * 12 + inches;
  return Math.round(totalInches * CM_PER_INCH);
};

/**
 * Convert centimeters to feet and inches
 */
const cmToFeetInches = (cm: number): { feet: number; inches: number } => {
  const totalInches = cm / CM_PER_INCH;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  // Handle edge case where rounding gives 12 inches
  if (inches === 12) {
    return { feet: feet + 1, inches: 0 };
  }
  return { feet, inches };
};

/**
 * Convert lbs to kg
 */
const lbsToKg = (lbs: number): number => {
  return Math.round(lbs * LBS_TO_KG * 10) / 10;
};

/**
 * Convert kg to lbs
 */
const kgToLbs = (kg: number): number => {
  return Math.round(kg * KG_TO_LBS);
};

export const BodyMetricsModal: React.FC<BodyMetricsModalProps> = ({
  visible,
  heightFeet: initialFeet,
  heightInches: initialInches,
  weightLbs: initialWeight,
  onClose,
  onSave,
}) => {
  const { sizeUnit, weightUnit } = useSettingsStore();
  const isMetricHeight = sizeUnit === 'cm';
  const isMetricWeight = weightUnit === 'kg';

  // Height state - for imperial: feet and inches; for metric: cm
  const [feetInput, setFeetInput] = useState('');
  const [inchesInput, setInchesInput] = useState('');
  const [cmInput, setCmInput] = useState('');
  
  // Weight state
  const [weightInput, setWeightInput] = useState('');

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      // Initialize height inputs based on unit preference
      if (isMetricHeight) {
        const cm = feetInchesToCm(initialFeet, initialInches);
        setCmInput(cm > 0 ? String(cm) : '');
      } else {
        setFeetInput(initialFeet > 0 ? String(initialFeet) : '');
        setInchesInput(initialInches > 0 ? String(initialInches) : '');
      }
      
      // Initialize weight input based on unit preference
      if (isMetricWeight) {
        const kg = lbsToKg(initialWeight);
        setWeightInput(kg > 0 ? String(kg) : '');
      } else {
        setWeightInput(initialWeight > 0 ? String(initialWeight) : '');
      }
    }
  }, [visible, initialFeet, initialInches, initialWeight, isMetricHeight, isMetricWeight]);

  const handleFeetChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setFeetInput(cleaned);
  }, []);

  const handleInchesChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    // Limit inches to 0-11
    const num = parseInt(cleaned, 10);
    if (cleaned === '' || (num >= 0 && num <= 11)) {
      setInchesInput(cleaned);
    }
  }, []);

  const handleCmChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setCmInput(cleaned);
  }, []);

  const handleWeightChange = useCallback((text: string) => {
    // Allow numbers and one decimal point for kg
    if (isMetricWeight) {
      const cleaned = text.replace(/[^0-9.]/g, '');
      // Ensure only one decimal point
      const parts = cleaned.split('.');
      if (parts.length <= 2) {
        setWeightInput(parts.length === 2 ? `${parts[0]}.${parts[1]}` : cleaned);
      }
    } else {
      const cleaned = text.replace(/[^0-9]/g, '');
      setWeightInput(cleaned);
    }
  }, [isMetricWeight]);

  const handleSave = useCallback(() => {
    triggerHaptic('success');
    
    // Convert height to feet/inches for storage
    let finalFeet: number;
    let finalInches: number;
    
    if (isMetricHeight) {
      const cm = parseInt(cmInput, 10) || 0;
      const converted = cmToFeetInches(cm);
      finalFeet = converted.feet;
      finalInches = converted.inches;
    } else {
      finalFeet = parseInt(feetInput, 10) || 0;
      finalInches = parseInt(inchesInput, 10) || 0;
    }
    
    // Convert weight to lbs for storage
    let finalWeight: number;
    if (isMetricWeight) {
      const kg = parseFloat(weightInput) || 0;
      finalWeight = kgToLbs(kg);
    } else {
      finalWeight = parseInt(weightInput, 10) || 0;
    }
    
    onSave(finalFeet, finalInches, finalWeight);
  }, [cmInput, feetInput, inchesInput, weightInput, isMetricHeight, isMetricWeight, onSave]);

  const handleClose = useCallback(() => {
    triggerHaptic('selection');
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
            
            {isMetricHeight ? (
              // Metric: Single cm input
              <View style={styles.inputRow}>
                <TextInput
                  value={cmInput}
                  onChangeText={handleCmChange}
                  placeholder="175"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="numeric"
                  style={styles.input}
                  cursorColor={colors.accent.primary}
                  selectionColor={colors.accent.orangeLight}
                  maxLength={3}
                />
                <Text variant="body" color="secondary" style={styles.unitLabel}>
                  cm
                </Text>
              </View>
            ) : (
              // Imperial: Feet and inches inputs
              <View style={styles.heightInputsRow}>
                <View style={styles.heightInputGroup}>
                  <TextInput
                    value={feetInput}
                    onChangeText={handleFeetChange}
                    placeholder="5"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                    style={styles.input}
                    cursorColor={colors.accent.primary}
                    selectionColor={colors.accent.orangeLight}
                    maxLength={1}
                  />
                  <Text variant="body" color="secondary" style={styles.unitLabel}>
                    ft
                  </Text>
                </View>
                <View style={styles.heightInputGroup}>
                  <TextInput
                    value={inchesInput}
                    onChangeText={handleInchesChange}
                    placeholder="9"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                    style={styles.input}
                    cursorColor={colors.accent.primary}
                    selectionColor={colors.accent.orangeLight}
                    maxLength={2}
                  />
                  <Text variant="body" color="secondary" style={styles.unitLabel}>
                    in
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Weight Section */}
          <View style={styles.section}>
            <Text variant="bodySemibold" color="primary" style={styles.sectionTitle}>
              Weight
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                value={weightInput}
                onChangeText={handleWeightChange}
                placeholder={isMetricWeight ? '70' : '150'}
                placeholderTextColor={colors.text.tertiary}
                keyboardType={isMetricWeight ? 'decimal-pad' : 'numeric'}
                style={styles.input}
                cursorColor={colors.accent.primary}
                selectionColor={colors.accent.orangeLight}
                maxLength={isMetricWeight ? 5 : 3}
              />
              <Text variant="body" color="secondary" style={styles.unitLabel}>
                {isMetricWeight ? 'kg' : 'lbs'}
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heightInputsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  heightInputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
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
  unitLabel: {
    minWidth: 28,
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
