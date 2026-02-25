/**
 * AccentColorModal
 * Modal for selecting the app's accent color from a predefined palette.
 * Works with both light and dark modes.
 */

import React, { useCallback } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius, shadows } from '@/constants/theme';
import { useSettingsStore } from '@/store/settingsStore';
import {
  ACCENT_COLOR_OPTIONS,
  type AccentColorKey,
} from '@/constants/accentColors';

interface AccentColorModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ColorSwatchProps {
  colorKey: AccentColorKey;
  label: string;
  preview: string;
  isSelected: boolean;
  onSelect: () => void;
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({
  label,
  preview,
  isSelected,
  onSelect,
}) => {
  const { theme } = useTheme();

  return (
    <Pressable
      style={[
        styles.swatch,
        {
          borderColor: isSelected ? theme.text.primary : 'transparent',
        },
      ]}
      onPress={() => {
        triggerHaptic('selection');
        onSelect();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={label}
    >
      <View style={[styles.swatchColor, { backgroundColor: preview }]}>
        {isSelected && (
          <IconSymbol name="check" color="#FFFFFF" size={18} />
        )}
      </View>
      <Text
        variant="caption"
        color={isSelected ? 'primary' : 'secondary'}
        style={styles.swatchLabel}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export const AccentColorModal: React.FC<AccentColorModalProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useTheme();
  const { accentColor, setAccentColor } = useSettingsStore();

  const handleClose = useCallback(() => {
    triggerHaptic('selection');
    onClose();
  }, [onClose]);

  const handleDone = useCallback(() => {
    triggerHaptic('success');
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(
    (key: AccentColorKey) => {
      setAccentColor(key);
    },
    [setAccentColor],
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.modalContent, { backgroundColor: theme.surface.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text variant="heading2" color="primary" style={styles.title}>
            Accent Color
          </Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            Choose a color that appears throughout the app
          </Text>

          <View style={styles.grid}>
            {ACCENT_COLOR_OPTIONS.map((option) => (
              <ColorSwatch
                key={option.key}
                colorKey={option.key}
                label={option.label}
                preview={option.preview}
                isSelected={accentColor === option.key}
                onSelect={() => handleSelect(option.key)}
              />
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <Button
              label="Done"
              variant="primary"
              onPress={handleDone}
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
    ...shadows.lg,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  swatch: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 64,
    padding: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 2,
  },
  swatchColor: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchLabel: {
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: spacing.sm,
  },
  button: {
    width: '100%',
  },
});
