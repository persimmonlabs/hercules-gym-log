import React from 'react';
import {
  Modal,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { Button } from '@/components/atoms/Button';
import { Text } from '@/components/atoms/Text';
import { colors, radius, sizing, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface PlanSetModalProps {
  visible: boolean;
  exerciseName: string;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const PlanSetModal: React.FC<PlanSetModalProps> = ({
  visible,
  exerciseName,
  value,
  onChange,
  onCancel,
  onConfirm,
}) => {
  const { theme } = useTheme();
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              <Text variant="heading3" color="primary" style={styles.title}>
                Sets for {exerciseName}
              </Text>
              <TextInput
                value={value}
                onChangeText={onChange}
                keyboardType="number-pad"
                placeholder="Enter sets"
                placeholderTextColor={colors.text.tertiary}
                style={styles.input}
                selectionColor={theme.accent.primary}
              />
              <View style={styles.actions}>
                <Button label="Cancel" variant="ghost" size="sm" onPress={onCancel} />
                <Button label="Confirm" variant="primary" size="sm" onPress={onConfirm} />
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
    backgroundColor: colors.glass.dark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    textAlign: 'center',
  },
  input: {
    height: sizing.inputHeight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface.subtle,
    color: colors.text.primary,
    textAlign: 'center',
    ...typography.bodySemibold,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
});
