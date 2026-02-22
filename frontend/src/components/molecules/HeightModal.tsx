/**
 * HeightModal
 * Modal for editing user height. Supports imperial (ft/in) and metric (cm).
 */

import React, { useState, useCallback } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { colors, radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/store/settingsStore';

interface HeightModalProps {
  visible: boolean;
  heightFeet: number;
  heightInches: number;
  onSave: (feet: number, inches: number) => void;
  onClose: () => void;
}

const CM_PER_INCH = 2.54;

export const HeightModal: React.FC<HeightModalProps> = ({
  visible,
  heightFeet: initFeet,
  heightInches: initInches,
  onSave,
  onClose,
}) => {
  const { theme } = useTheme();
  const { sizeUnit } = useSettingsStore();
  const isMetric = sizeUnit === 'cm';

  const [feetInput, setFeetInput] = useState('');
  const [inchesInput, setInchesInput] = useState('');
  const [cmInput, setCmInput] = useState('');

  React.useEffect(() => {
    if (visible) {
      if (isMetric) {
        const cm = Math.round((initFeet * 12 + initInches) * CM_PER_INCH);
        setCmInput(cm > 0 ? String(cm) : '');
      } else {
        setFeetInput(initFeet > 0 ? String(initFeet) : '');
        setInchesInput(initInches > 0 ? String(initInches) : '');
      }
    }
  }, [visible, initFeet, initInches, isMetric]);

  const handleClose = useCallback(() => { triggerHaptic('selection'); onClose(); }, [onClose]);

  const handleSave = useCallback(() => {
    triggerHaptic('success');
    if (isMetric) {
      const cm = parseInt(cmInput, 10) || 0;
      const totalIn = cm / CM_PER_INCH;
      onSave(Math.floor(totalIn / 12), Math.round(totalIn % 12));
    } else {
      onSave(parseInt(feetInput, 10) || 0, parseInt(inchesInput, 10) || 0);
    }
    onClose();
  }, [cmInput, feetInput, inchesInput, isMetric, onSave, onClose]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={[styles.modal, { backgroundColor: theme.surface.card }]} onPress={(e) => e.stopPropagation()}>
          <Text variant="heading2" color="primary" style={styles.title}>Height</Text>

          {isMetric ? (
            <View style={styles.row}>
              <TextInput value={cmInput} onChangeText={(t) => setCmInput(t.replace(/[^0-9]/g, ''))}
                placeholder="175" placeholderTextColor={colors.text.tertiary} keyboardType="numeric"
                style={[styles.input, { borderColor: theme.border.light, color: theme.text.primary }]} maxLength={3} />
              <Text variant="body" color="secondary">cm</Text>
            </View>
          ) : (
            <View style={styles.row}>
              <TextInput value={feetInput} onChangeText={(t) => setFeetInput(t.replace(/[^0-9]/g, ''))}
                placeholder="5" placeholderTextColor={colors.text.tertiary} keyboardType="numeric"
                style={[styles.input, { borderColor: theme.border.light, color: theme.text.primary }]} maxLength={1} />
              <Text variant="body" color="secondary">ft</Text>
              <TextInput value={inchesInput} onChangeText={(t) => {
                const c = t.replace(/[^0-9]/g, ''); const n = parseInt(c, 10);
                if (c === '' || (n >= 0 && n <= 11)) setInchesInput(c);
              }} placeholder="9" placeholderTextColor={colors.text.tertiary} keyboardType="numeric"
                style={[styles.input, { borderColor: theme.border.light, color: theme.text.primary }]} maxLength={2} />
              <Text variant="body" color="secondary">in</Text>
            </View>
          )}

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
