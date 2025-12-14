/**
 * AppearanceModal
 * Modal for selecting app theme preference (light, dark, or system).
 */

import React, { useCallback } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius, shadows } from '@/constants/theme';
import { useSettingsStore, ThemePreference } from '@/store/settingsStore';

interface AppearanceModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ThemeOptionProps {
  icon: string;
  label: string;
  description: string;
  value: ThemePreference;
  isSelected: boolean;
  onSelect: () => void;
}

const ThemeOption: React.FC<ThemeOptionProps> = ({
  icon,
  label,
  description,
  isSelected,
  onSelect,
}) => {
  const { theme } = useTheme();

  return (
    <Pressable
      style={[
        styles.themeOption,
        { 
          borderColor: isSelected ? theme.accent.orange : theme.border.light,
          backgroundColor: isSelected ? theme.surface.tint : theme.surface.card,
        },
      ]}
      onPress={() => {
        void Haptics.selectionAsync();
        onSelect();
      }}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.surface.subtle }]}>
        <IconSymbol name={icon} color={theme.accent.orange} size={24} />
      </View>
      <View style={styles.optionContent}>
        <Text variant="bodySemibold" color="primary">
          {label}
        </Text>
        <Text variant="caption" color="secondary">
          {description}
        </Text>
      </View>
      <View
        style={[
          styles.radioOuter,
          { borderColor: isSelected ? theme.accent.orange : theme.border.dark },
        ]}
      >
        {isSelected && (
          <View style={[styles.radioInner, { backgroundColor: theme.accent.orange }]} />
        )}
      </View>
    </Pressable>
  );
};

export const AppearanceModal: React.FC<AppearanceModalProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useTheme();
  const { themePreference, setThemePreference } = useSettingsStore();

  const handleClose = useCallback(() => {
    void Haptics.selectionAsync();
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }, [onClose]);

  const handleSelectTheme = (value: ThemePreference) => {
    setThemePreference(value);
  };

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
            Appearance
          </Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            Choose how the app looks
          </Text>

          <View style={styles.optionsContainer}>
            <ThemeOption
              icon="light-mode"
              label="Light"
              description="Always use light theme"
              value="light"
              isSelected={themePreference === 'light'}
              onSelect={() => handleSelectTheme('light')}
            />
            <ThemeOption
              icon="dark-mode"
              label="Dark"
              description="Always use dark theme"
              value="dark"
              isSelected={themePreference === 'dark'}
              onSelect={() => handleSelectTheme('dark')}
            />
            <ThemeOption
              icon="settings-brightness"
              label="System"
              description="Match device settings"
              value="system"
              isSelected={themePreference === 'system'}
              onSelect={() => handleSelectTheme('system')}
            />
          </View>

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
    ...shadows.lg,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  optionsContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  buttonContainer: {
    marginTop: spacing.sm,
  },
  button: {
    width: '100%',
  },
});
