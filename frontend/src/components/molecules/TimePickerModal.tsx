/**
 * TimePickerModal
 * A modal with numpad interface for entering time duration (hours, minutes, seconds).
 * Styled to match app theme with rounded corners, white/black/orange colors.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { colors, radius, spacing, sizing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (totalSeconds: number) => void;
  initialSeconds?: number;
}

const formatDigits = (value: number, length: number = 2): string => {
  return value.toString().padStart(length, '0');
};

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialSeconds = 0,
}) => {
  const { theme, isDarkMode } = useTheme();
  const [digits, setDigits] = useState<string>('');

  useEffect(() => {
    if (visible) {
      const hours = Math.floor(initialSeconds / 3600);
      const mins = Math.floor((initialSeconds % 3600) / 60);
      const secs = initialSeconds % 60;
      
      const totalDigits = `${formatDigits(hours)}${formatDigits(mins)}${formatDigits(secs)}`;
      setDigits(totalDigits.replace(/^0+/, '') || '');
    }
  }, [visible, initialSeconds]);

  const parseDigitsToTime = useCallback((inputDigits: string) => {
    const padded = inputDigits.padStart(6, '0');
    
    const hours = parseInt(padded.slice(0, 2), 10) || 0;
    const mins = parseInt(padded.slice(2, 4), 10) || 0;
    const secs = parseInt(padded.slice(4, 6), 10) || 0;
    return { hours, mins, secs };
  }, []);

  const { hours, mins, secs } = parseDigitsToTime(digits);

  const handleDigitPress = useCallback((digit: string) => {
    triggerHaptic('selection');
    setDigits((prev) => {
      const maxLength = 6;
      if (prev.length >= maxLength) {
        return prev; // Prevent entering more than 6 digits
      }
      return prev + digit;
    });
  }, []);

  const handleDoubleZeroPress = useCallback(() => {
    triggerHaptic('selection');
    setDigits((prev) => {
      const maxLength = 6;
      if (prev.length >= maxLength - 1) {
        return prev; // Prevent entering more than 6 digits
      }
      return prev + '00';
    });
  }, []);

  const handleBackspace = useCallback(() => {
    triggerHaptic('selection');
    setDigits((prev) => prev.slice(0, -1));
  }, []);

  const handleConfirm = useCallback(() => {
    triggerHaptic('light');
    const { hours: h, mins: m, secs: s } = parseDigitsToTime(digits);
    const clampedSecs = Math.min(s, 59);
    const totalSeconds = h * 3600 + m * 60 + clampedSecs;
    onConfirm(totalSeconds);
  }, [digits, onConfirm, parseDigitsToTime]);

  const handleCancel = useCallback(() => {
    triggerHaptic('selection');
    onClose();
  }, [onClose]);

  const numpadButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['00', '0', 'backspace'],
  ];

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
            Set duration
          </Text>

          <View style={styles.timeDisplay}>
            {digits.length > 4 && (
              <>
                <View style={styles.timeSegment}>
                  <Text style={[styles.timeValue, dynamicStyles.timeValue]}>
                    {formatDigits(hours)}
                  </Text>
                  <Text style={[styles.timeLabel, dynamicStyles.timeLabel]}>h</Text>
                </View>
              </>
            )}
            <View style={styles.timeSegment}>
              <Text style={[styles.timeValue, dynamicStyles.timeValue]}>
                {formatDigits(mins)}
              </Text>
              <Text style={[styles.timeLabel, dynamicStyles.timeLabel]}>m</Text>
            </View>
            <View style={styles.timeSegment}>
              <Text style={[styles.timeValue, dynamicStyles.timeValue]}>
                {formatDigits(secs > 59 ? 59 : secs)}
              </Text>
              <Text style={[styles.timeLabel, dynamicStyles.timeLabel]}>s</Text>
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
                      } else if (button === '00') {
                        handleDoubleZeroPress();
                      } else {
                        handleDigitPress(button);
                      }
                    }}
                    accessibilityLabel={button === 'backspace' ? 'Delete' : button}
                  >
                    {button === 'backspace' ? (
                      <MaterialCommunityIcons
                        name="backspace-outline"
                        size={sizing.iconMD}
                        color={isDarkMode ? theme.text.primary : colors.text.primary}
                      />
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
            <Button label="Cancel" variant="ghost" onPress={handleCancel} style={styles.actionButton} />
            <Button label="OK" variant="ghost" onPress={handleConfirm} style={styles.actionButton} />
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
    maxWidth: 320,
    borderRadius: radius.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  timeDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: spacing.xl,
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
    height: 72,
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
