/**
 * CardioGoalModal
 * Modal for setting weekly cardio time or distance goals.
 * Features numpad input similar to TimePickerModal with preset suggestions.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, ScrollView } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { colors, radius, spacing, sizing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/store/settingsStore';

export type CardioGoalType = 'time' | 'distance';

interface CardioGoalModalProps {
  visible: boolean;
  onClose: () => void;
  goalType: CardioGoalType;
}

// Preset suggestions for time goals (in minutes)
const TIME_PRESETS = [
  { label: '75 min', value: 75 * 60 }, // 75 minutes in seconds
  { label: '150 min', value: 150 * 60 }, // WHO recommendation
  { label: '300 min', value: 300 * 60 }, // Extended goal
];

// Preset suggestions for distance goals (in miles)
const DISTANCE_PRESETS = [
  { label: '5 mi', value: 5 },
  { label: '10 mi', value: 10 },
  { label: '20 mi', value: 20 },
];

const formatTimeDigits = (value: number, length: number = 2): string => {
  return value.toString().padStart(length, '0');
};

export const CardioGoalModal: React.FC<CardioGoalModalProps> = ({
  visible,
  onClose,
  goalType,
}) => {
  const { theme, isDarkMode } = useTheme();
  const {
    weeklyCardioTimeGoal,
    weeklyCardioDistanceGoal,
    setWeeklyCardioTimeGoal,
    setWeeklyCardioDistanceGoal,
    distanceUnit,
    convertDistance,
    convertDistanceToMiles,
  } = useSettingsStore();

  const [digits, setDigits] = useState<string>('');

  // Initialize digits based on goal type and existing value
  useEffect(() => {
    if (visible) {
      if (goalType === 'time') {
        if (weeklyCardioTimeGoal && weeklyCardioTimeGoal > 0) {
          const hours = Math.floor(weeklyCardioTimeGoal / 3600);
          const mins = Math.floor((weeklyCardioTimeGoal % 3600) / 60);
          const totalDigits = `${formatTimeDigits(hours)}${formatTimeDigits(mins)}`;
          setDigits(totalDigits.replace(/^0+/, '') || '');
        } else {
          setDigits('');
        }
      } else {
        if (weeklyCardioDistanceGoal && weeklyCardioDistanceGoal > 0) {
          // Convert from miles to user's display unit
          const displayValue = convertDistance(weeklyCardioDistanceGoal);
          // Remove decimal point and trailing zeros for whole numbers
          const valueStr = displayValue % 1 === 0 
            ? displayValue.toFixed(0) 
            : displayValue.toFixed(1).replace('.', '');
          setDigits(valueStr.replace(/^0+/, '') || '');
        } else {
          setDigits('');
        }
      }
    }
  }, [visible, goalType, weeklyCardioTimeGoal, weeklyCardioDistanceGoal, convertDistance]);

  const parseTimeDigits = useCallback((inputDigits: string) => {
    const padded = inputDigits.padStart(4, '0');
    const hours = parseInt(padded.slice(0, 2), 10) || 0;
    const mins = parseInt(padded.slice(2, 4), 10) || 0;
    return { hours, mins };
  }, []);

  const parseDistanceDigits = useCallback((inputDigits: string) => {
    if (!inputDigits) return 0;
    // Last digit is decimal, rest is whole number
    if (inputDigits.length === 1) {
      return parseInt(inputDigits, 10) || 0;
    }
    const whole = parseInt(inputDigits.slice(0, -1), 10) || 0;
    const decimal = parseInt(inputDigits.slice(-1), 10) || 0;
    return whole + decimal / 10;
  }, []);

  const handleDigitPress = useCallback((digit: string) => {
    triggerHaptic('selection');
    setDigits((prev) => {
      const maxLength = goalType === 'time' ? 4 : 4; // HHMM for time, XX.X for distance
      if (prev.length >= maxLength) {
        return prev;
      }
      return prev + digit;
    });
  }, [goalType]);

  const handleBackspace = useCallback(() => {
    triggerHaptic('selection');
    setDigits((prev) => prev.slice(0, -1));
  }, []);

  const handlePresetPress = useCallback((value: number) => {
    triggerHaptic('selection');
    if (goalType === 'time') {
      setWeeklyCardioTimeGoal(value);
    } else {
      setWeeklyCardioDistanceGoal(value);
    }
    onClose();
  }, [goalType, setWeeklyCardioTimeGoal, setWeeklyCardioDistanceGoal, onClose]);

  const handleConfirm = useCallback(() => {
    triggerHaptic('success');
    if (goalType === 'time') {
      const { hours, mins } = parseTimeDigits(digits);
      const totalSeconds = hours * 3600 + Math.min(mins, 59) * 60;
      setWeeklyCardioTimeGoal(totalSeconds > 0 ? totalSeconds : null);
    } else {
      const displayValue = parseDistanceDigits(digits);
      // Convert from display unit back to miles for storage
      const milesValue = convertDistanceToMiles(displayValue);
      setWeeklyCardioDistanceGoal(milesValue > 0 ? milesValue : null);
    }
    onClose();
  }, [digits, goalType, parseTimeDigits, parseDistanceDigits, setWeeklyCardioTimeGoal, setWeeklyCardioDistanceGoal, convertDistanceToMiles, onClose]);

  const handleClear = useCallback(() => {
    triggerHaptic('selection');
    if (goalType === 'time') {
      setWeeklyCardioTimeGoal(null);
    } else {
      setWeeklyCardioDistanceGoal(null);
    }
    onClose();
  }, [goalType, setWeeklyCardioTimeGoal, setWeeklyCardioDistanceGoal, onClose]);

  const handleCancel = useCallback(() => {
    triggerHaptic('selection');
    onClose();
  }, [onClose]);

  // Render display based on goal type
  const renderDisplay = () => {
    if (goalType === 'time') {
      const { hours, mins } = parseTimeDigits(digits);
      return (
        <View style={styles.timeDisplay}>
          {digits.length > 2 && (
            <View style={styles.timeSegment}>
              <Text style={[styles.timeValue, dynamicStyles.timeValue]}>
                {formatTimeDigits(hours)}
              </Text>
              <Text style={[styles.timeLabel, dynamicStyles.timeLabel]}>h</Text>
            </View>
          )}
          <View style={styles.timeSegment}>
            <Text style={[styles.timeValue, dynamicStyles.timeValue]}>
              {formatTimeDigits(mins > 59 ? 59 : mins)}
            </Text>
            <Text style={[styles.timeLabel, dynamicStyles.timeLabel]}>m</Text>
          </View>
        </View>
      );
    } else {
      const displayValue = parseDistanceDigits(digits);
      const unitLabel = distanceUnit === 'km' ? 'km' : 'mi';
      return (
        <View style={styles.timeDisplay}>
          <View style={styles.timeSegment}>
            <Text style={[styles.timeValue, dynamicStyles.timeValue]}>
              {displayValue.toFixed(1)}
            </Text>
            <Text style={[styles.timeLabel, dynamicStyles.timeLabel]}>{unitLabel}</Text>
          </View>
        </View>
      );
    }
  };

  const numpadButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['clear', '0', 'backspace'],
  ];

  const presets = goalType === 'time' ? TIME_PRESETS : DISTANCE_PRESETS;
  const displayPresets = goalType === 'distance' && distanceUnit === 'km'
    ? DISTANCE_PRESETS.map(p => ({
        label: `${convertDistance(p.value).toFixed(0)} km`,
        value: p.value,
      }))
    : presets;

  const dynamicStyles = {
    modalContent: {
      backgroundColor: isDarkMode ? theme.surface.card : colors.surface.card,
    },
    numpadButton: {
      backgroundColor: isDarkMode ? theme.surface.elevated : colors.neutral.gray200,
    },
    timeValue: {
      color: isDarkMode ? theme.text.primary : colors.text.primary,
    },
    timeLabel: {
      color: isDarkMode ? theme.text.secondary : colors.text.secondary,
    },
    presetButton: {
      backgroundColor: isDarkMode ? theme.surface.elevated : colors.neutral.gray200,
      borderColor: theme.accent.orangeMuted,
    },
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.modalContent, dynamicStyles.modalContent]}>
          <Text variant="bodySemibold" color="secondary" style={styles.title}>
            {goalType === 'time' ? 'Set Weekly Time Goal' : 'Set Weekly Distance Goal'}
          </Text>

          {renderDisplay()}

          {/* Preset suggestions */}
          <View style={styles.presetsContainer}>
            <Text variant="caption" color="secondary" style={styles.presetsLabel}>
              Quick presets
            </Text>
            <View style={styles.presetsRow}>
              {displayPresets.map((preset) => (
                <Pressable
                  key={preset.label}
                  style={[styles.presetButton, dynamicStyles.presetButton]}
                  onPress={() => handlePresetPress(preset.value)}
                >
                  <Text variant="bodySemibold" color="primary">
                    {preset.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.numpad}>
            {numpadButtons.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.numpadRow}>
                {row.map((button) => (
                  <Pressable
                    key={button}
                    style={[styles.numpadButton, dynamicStyles.numpadButton]}
                    onPress={() => {
                      if (button === 'backspace') {
                        handleBackspace();
                      } else if (button === 'clear') {
                        handleClear();
                      } else {
                        handleDigitPress(button);
                      }
                    }}
                    accessibilityLabel={button === 'backspace' ? 'Delete' : button === 'clear' ? 'Clear goal' : button}
                  >
                    {button === 'backspace' ? (
                      <MaterialCommunityIcons
                        name="backspace-outline"
                        size={sizing.iconMD}
                        color={isDarkMode ? theme.text.primary : colors.text.primary}
                      />
                    ) : button === 'clear' ? (
                      <Text variant="body" color="secondary">
                        Clear
                      </Text>
                    ) : (
                      <Text variant="heading2" color="primary">
                        {button}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.actionButton} onPress={handleCancel}>
              <Text variant="bodySemibold" style={{ color: colors.accent.orange }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={handleConfirm}>
              <Text variant="bodySemibold" style={{ color: colors.accent.orange }}>
                OK
              </Text>
            </Pressable>
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
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.scrim,
  },
  modalContent: {
    width: '85%',
    maxWidth: 340,
    borderRadius: radius.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  timeDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  timeSegment: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  timeValue: {
    fontSize: 48,
    fontWeight: '300',
    lineHeight: 56,
  },
  timeLabel: {
    fontSize: 20,
    fontWeight: '400',
    marginBottom: spacing.xs,
    marginLeft: 2,
  },
  presetsContainer: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  presetsLabel: {
    textAlign: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  presetButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  numpad: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  numpadButton: {
    width: 72,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
    paddingTop: spacing.sm,
  },
  actionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
