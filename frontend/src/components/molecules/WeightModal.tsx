/**
 * WeightModal
 * Modal for editing user body weight. Supports lbs and kg.
 */

import React, { useState, useCallback } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { colors, radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/store/settingsStore';

interface WeightModalProps {
  visible: boolean;
  weightLbs: number;
  onSave: (lbs: number) => void;
  onClose: () => void;
}

const LBS_TO_KG = 0.453592;
const KG_TO_LBS = 2.20462;

export const WeightModal: React.FC<WeightModalProps> = ({
  visible,
  weightLbs: initLbs,
  onSave,
  onClose,
}) => {
  const { theme } = useTheme();
  const { weightUnit } = useSettingsStore();
  const isMetric = weightUnit === 'kg';
  const [input, setInput] = useState('');

  React.useEffect(() => {
    if (visible) {
      if (isMetric) {
        const kg = Math.round(initLbs * LBS_TO_KG * 10) / 10;
        setInput(kg > 0 ? String(kg) : '');
      } else {
        setInput(initLbs > 0 ? String(initLbs) : '');
      }
    }
  }, [visible, initLbs, isMetric]);

  const handleClose = useCallback(() => { triggerHaptic('selection'); onClose(); }, [onClose]);

  const handleSave = useCallback(() => {
    triggerHaptic('success');
    const val = parseFloat(input) || 0;
    const lbs = isMetric ? Math.round(val * KG_TO_LBS) : val;
    onSave(lbs);
    onClose();
  }, [input, isMetric, onSave, onClose]);

  const handleChange = useCallback((text: string) => {
    if (isMetric) {
      const cleaned = text.replace(/[^0-9.]/g, '');
      const parts = cleaned.split('.');
      setInput(parts.length <= 2 ? (parts.length === 2 ? `${parts[0]}.${parts[1]}` : cleaned) : input);
    } else {
      setInput(text.replace(/[^0-9]/g, ''));
    }
  }, [isMetric, input]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={[styles.modal, { backgroundColor: theme.surface.card }]} onPress={(e) => e.stopPropagation()}>
          <Text variant="heading2" color="primary" style={styles.title}>Body Weight</Text>

          <View style={styles.row}>
            <TextInput
              value={input}
              onChangeText={handleChange}
              placeholder={isMetric ? '70' : '150'}
              placeholderTextColor={colors.text.tertiary}
              keyboardType={isMetric ? 'decimal-pad' : 'numeric'}
              style={[styles.input, { borderColor: theme.border.light, color: theme.text.primary }]}
              maxLength={isMetric ? 5 : 3}
            />
            <Text variant="body" color="secondary">{isMetric ? 'kg' : 'lbs'}</Text>
          </View>

          <View style={styles.buttons}>
            <Button label="Cancel" variant="ghost" onPress={handleClose} style={styles.btn} />
            <Button label="Save" variant="primary" onPress={handleSave} style={styles.btn} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modal: { borderRadius: radius.xl, padding: spacing.xl, width: '100%', maxWidth: 360, ...shadows.lg },
  title: { textAlign: 'center', marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  input: { flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, fontSize: 18, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: spacing.md },
  btn: { flex: 1 },
});
