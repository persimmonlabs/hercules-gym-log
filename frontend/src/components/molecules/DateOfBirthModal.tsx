/**
 * DateOfBirthModal
 * Modal for selecting date of birth with month/day/year text inputs.
 */

import React, { useState, useCallback } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { colors, radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface DateOfBirthModalProps {
  visible: boolean;
  currentValue: string | null | undefined;
  onSave: (isoDate: string) => void;
  onClose: () => void;
}

export const DateOfBirthModal: React.FC<DateOfBirthModalProps> = ({
  visible,
  currentValue,
  onSave,
  onClose,
}) => {
  const { theme } = useTheme();
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');

  React.useEffect(() => {
    if (visible && currentValue) {
      // Parse ISO date string directly to avoid timezone offset issues
      const parts = currentValue.split('-');
      if (parts.length === 3) {
        setMonth(String(parseInt(parts[1], 10)));
        setDay(String(parseInt(parts[2], 10)));
        setYear(parts[0]);
      }
    } else if (visible) {
      setMonth('');
      setDay('');
      setYear('');
    }
  }, [visible, currentValue]);

  const handleMonthChange = useCallback((t: string) => {
    const cleaned = t.replace(/[^0-9]/g, '');
    const n = parseInt(cleaned, 10);
    if (cleaned === '' || (n >= 0 && n <= 12)) setMonth(cleaned);
  }, []);

  const handleDayChange = useCallback((t: string) => {
    const cleaned = t.replace(/[^0-9]/g, '');
    const n = parseInt(cleaned, 10);
    const m = parseInt(month, 10) || 0;
    const y = parseInt(year, 10) || 2000;
    const maxDay = m >= 1 && m <= 12 ? new Date(y, m, 0).getDate() : 31;
    if (cleaned === '' || (n >= 0 && n <= maxDay)) setDay(cleaned);
  }, [month, year]);

  const handleYearChange = useCallback((t: string) => {
    const cleaned = t.replace(/[^0-9]/g, '');
    setYear(cleaned);
  }, []);

  const handleClose = useCallback(() => {
    triggerHaptic('selection');
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    const y = parseInt(year, 10);
    if (!m || !d || !y || m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2020) return;
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    triggerHaptic('success');
    onSave(iso);
    onClose();
  }, [month, day, year, onSave, onClose]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.modalContent, { backgroundColor: theme.surface.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text variant="heading2" color="primary" style={styles.title}>
            Date of Birth
          </Text>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text variant="caption" color="secondary">Month</Text>
              <TextInput
                value={month}
                onChangeText={handleMonthChange}
                placeholder="MM"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
                style={[styles.input, { borderColor: theme.border.light, color: theme.text.primary }]}
                maxLength={2}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text variant="caption" color="secondary">Day</Text>
              <TextInput
                value={day}
                onChangeText={handleDayChange}
                placeholder="DD"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
                style={[styles.input, { borderColor: theme.border.light, color: theme.text.primary }]}
                maxLength={2}
              />
            </View>
            <View style={styles.inputGroupWide}>
              <Text variant="caption" color="secondary">Year</Text>
              <TextInput
                value={year}
                onChangeText={handleYearChange}
                placeholder="YYYY"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
                style={[styles.input, { borderColor: theme.border.light, color: theme.text.primary }]}
                maxLength={4}
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button label="Cancel" variant="secondary" onPress={handleClose} style={styles.button} />
            <Button label="Save" variant="primary" onPress={handleSave} style={styles.button} />
          </View>
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
    maxWidth: 360,
    ...shadows.lg,
  },
  title: { textAlign: 'center', marginBottom: spacing.lg },
  inputRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  inputGroup: { flex: 1 },
  inputGroupWide: { flex: 1.4 },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  buttonContainer: { flexDirection: 'row', gap: spacing.md },
  button: { flex: 1 },
});
