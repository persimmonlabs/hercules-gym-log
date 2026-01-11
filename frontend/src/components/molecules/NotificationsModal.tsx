/**
 * NotificationsModal
 * Main modal for managing workout reminder notifications.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, Alert } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { NotificationConfigCard } from './NotificationConfigCard';
import { NotificationEditModal } from './NotificationEditModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useNotificationStore, NotificationConfig, DayOfWeek } from '@/store/notificationStore';
import {
  requestNotificationPermissions,
  scheduleNotifications,
  cancelAllNotifications,
  checkNotificationPermissions,
} from '@/services/notificationService';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const {
    notificationsEnabled,
    configs,
    setNotificationsEnabled,
    addConfig,
    updateConfig,
    removeConfig,
    toggleConfig,
  } = useNotificationStore();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<NotificationConfig | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<NotificationConfig | null>(null);

  // Check permissions on mount
  useEffect(() => {
    if (visible) {
      checkNotificationPermissions().then(setHasPermission);
    }
  }, [visible]);

  // Reschedule notifications when configs change
  useEffect(() => {
    if (notificationsEnabled && hasPermission) {
      scheduleNotifications(configs);
    }
  }, [configs, notificationsEnabled, hasPermission]);

  const handleClose = useCallback(() => {
    triggerHaptic('selection');
    onClose();
  }, [onClose]);

  const handleToggleNotifications = async () => {
    triggerHaptic('selection');

    if (!notificationsEnabled) {
      // Turning on - request permission first
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive workout reminders.',
          [{ text: 'OK' }]
        );
        return;
      }
      setHasPermission(true);
      setNotificationsEnabled(true);
      // Schedule existing configs
      await scheduleNotifications(configs);
    } else {
      // Turning off - cancel all notifications
      setNotificationsEnabled(false);
      await cancelAllNotifications();
    }
  };

  const handleAddConfig = () => {
    triggerHaptic('selection');
    setEditingConfig(null);
    setEditModalVisible(true);
  };

  const handleEditConfig = (config: NotificationConfig) => {
    setEditingConfig(config);
    setEditModalVisible(true);
  };

  const handleDeleteConfig = (config: NotificationConfig) => {
    setConfigToDelete(config);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = () => {
    if (configToDelete) {
      removeConfig(configToDelete.id);
    }
    setDeleteModalVisible(false);
    setConfigToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
    setConfigToDelete(null);
  };

  const handleSaveConfig = (hour: number, minute: number, days: DayOfWeek[]) => {
    if (editingConfig) {
      updateConfig(editingConfig.id, { hour, minute, days });
    } else {
      addConfig({ hour, minute, days, enabled: true });
    }
    setEditModalVisible(false);
    setEditingConfig(null);
  };

  const handleToggleConfig = (config: NotificationConfig) => {
    toggleConfig(config.id);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        {!deleteModalVisible && (
          <Pressable style={[styles.modalContent, { backgroundColor: theme.surface.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text variant="heading2" color="primary">
                Workout Reminders
              </Text>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <IconSymbol name="close" size={24} color={theme.text.secondary} />
              </Pressable>
            </View>

            {/* Master Toggle */}
            <Pressable style={[styles.masterToggle, { backgroundColor: theme.surface.elevated, borderColor: theme.border.light }]} onPress={handleToggleNotifications}>
              <View style={styles.masterToggleInfo}>
                <IconSymbol
                  name="notifications"
                  size={24}
                  color={notificationsEnabled ? theme.accent.orange : theme.text.tertiary}
                />
                <View style={styles.masterToggleText}>
                  <Text variant="bodySemibold" color="primary">
                    Enable Reminders
                  </Text>
                  <Text variant="caption" color="secondary">
                    {notificationsEnabled ? 'Reminders are active' : 'Reminders are off'}
                  </Text>
                </View>
              </View>
              <View style={[styles.toggle, { backgroundColor: notificationsEnabled ? theme.accent.orange : theme.neutral.gray400 }]}>
                <View style={[styles.toggleKnob, { backgroundColor: theme.primary.bg }, notificationsEnabled && styles.toggleKnobEnabled]} />
              </View>
            </Pressable>

            {/* Config List */}
            {notificationsEnabled && (
              <>
                <ScrollView style={styles.configList} showsVerticalScrollIndicator={false}>
                  {configs.length === 0 ? (
                    <View style={styles.emptyState}>
                      <IconSymbol
                        name="schedule"
                        size={48}
                        color={theme.text.tertiary}
                      />
                      <Text variant="body" color="secondary" style={styles.emptyText}>
                        No reminders set
                      </Text>
                      <Text variant="caption" color="tertiary" style={styles.emptySubtext}>
                        Add a reminder to get notified
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.configCards}>
                      {configs.map((config) => (
                        <NotificationConfigCard
                          key={config.id}
                          config={config}
                          onToggle={() => handleToggleConfig(config)}
                          onEdit={() => handleEditConfig(config)}
                          onDelete={() => handleDeleteConfig(config)}
                        />
                      ))}
                    </View>
                  )}
                </ScrollView>
              </>
            )}

            {!notificationsEnabled && (
              <View style={styles.disabledState}>
                <Text variant="body" color="secondary" style={styles.disabledText}>
                  Enable reminders to set workout notification times
                </Text>
              </View>
            )}

            {/* Add Reminder Button - Always at Bottom */}
            {notificationsEnabled && (
              <Button
                label="Add Reminder"
                variant="primary"
                onPress={handleAddConfig}
                style={[styles.addButton, styles.button]}
              />
            )}
          </Pressable>
        )}
      </Pressable>

      <DeleteConfirmationModal
        visible={deleteModalVisible}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />

      <NotificationEditModal
        visible={editModalVisible}
        config={editingConfig}
        hasOverlay={false}
        onClose={() => {
          setEditModalVisible(false);
          setEditingConfig(null);
        }}
        onSave={handleSaveConfig}
      />
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
    width: 350,
    height: 450,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  closeButton: {
    padding: spacing.xs,
  },
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  masterToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  masterToggleText: {
    gap: spacing.xxs,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: radius.full,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
  },
  toggleKnobEnabled: {
    alignSelf: 'flex-end',
  },
  configList: {
    flexGrow: 0,
    maxHeight: 300,
  },
  configCards: {
    gap: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.md,
  },
  emptySubtext: {
    marginTop: spacing.xs,
  },
  addButton: {
    marginTop: spacing.md,
  },
  disabledState: {
    paddingVertical: spacing.xl,
  },
  disabledText: {
    textAlign: 'center',
  },
  button: {
    flex: 1,
    minWidth: 120,
    minHeight: 44,
  },
});
