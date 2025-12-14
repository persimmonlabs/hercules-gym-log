/**
 * NotificationEditModal
 * Modal for creating or editing a notification configuration.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { colors, radius, shadows, spacing } from '@/constants/theme';
import { NotificationConfig, DayOfWeek } from '@/store/notificationStore';

interface NotificationEditModalProps {
  visible: boolean;
  config?: NotificationConfig | null;
  onClose: () => void;
  onSave: (hour: number, minute: number, days: DayOfWeek[]) => void;
}

const DAYS_OF_WEEK: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'sunday', label: 'Sunday', short: 'S' },
  { key: 'monday', label: 'Monday', short: 'M' },
  { key: 'tuesday', label: 'Tuesday', short: 'T' },
  { key: 'wednesday', label: 'Wednesday', short: 'W' },
  { key: 'thursday', label: 'Thursday', short: 'T' },
  { key: 'friday', label: 'Friday', short: 'F' },
  { key: 'saturday', label: 'Saturday', short: 'S' },
];

export const NotificationEditModal: React.FC<NotificationEditModalProps> = ({
  visible,
  config,
  onClose,
  onSave,
}) => {
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      if (config) {
        const date = new Date();
        date.setHours(config.hour, config.minute, 0, 0);
        setSelectedTime(date);
        setSelectedDays([...config.days]);
      } else {
        const date = new Date();
        date.setHours(9, 0, 0, 0);
        setSelectedTime(date);
        setSelectedDays([]);
      }
      if (Platform.OS === 'android') {
        setShowTimePicker(false);
      }
    }
  }, [visible, config]);

  const handleClose = useCallback(() => {
    void Haptics.selectionAsync();
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    if (selectedDays.length === 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(selectedTime.getHours(), selectedTime.getMinutes(), selectedDays);
  }, [selectedTime, selectedDays, onSave]);

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (date) {
      setSelectedTime(date);
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    void Haptics.selectionAsync();
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const selectAllDays = () => {
    void Haptics.selectionAsync();
    setSelectedDays(DAYS_OF_WEEK.map((d) => d.key));
  };

  const selectWeekdays = () => {
    void Haptics.selectionAsync();
    setSelectedDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  };

  const formatDisplayTime = (): string => {
    const hour = selectedTime.getHours();
    const minute = selectedTime.getMinutes();
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <Text variant="heading2" color="primary" style={styles.title}>
            {config ? 'Edit Reminder' : 'Add Reminder'}
          </Text>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Time Selection */}
            <View style={styles.section}>
              <Text variant="bodySemibold" color="primary" style={styles.sectionLabel}>
                Time
              </Text>
              {Platform.OS === 'android' && !showTimePicker && (
                <Pressable
                  style={styles.timeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text variant="heading2" color="primary">
                    {formatDisplayTime()}
                  </Text>
                </Pressable>
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                  style={styles.timePicker}
                />
              )}
            </View>

            {/* Day Selection */}
            <View style={styles.section}>
              <Text variant="bodySemibold" color="primary" style={styles.sectionLabel}>
                Repeat on
              </Text>

              {/* Quick Select Buttons */}
              <View style={styles.quickSelectRow}>
                <Pressable style={styles.quickSelectButton} onPress={selectAllDays}>
                  <Text variant="caption" color="secondary">
                    Every day
                  </Text>
                </Pressable>
                <Pressable style={styles.quickSelectButton} onPress={selectWeekdays}>
                  <Text variant="caption" color="secondary">
                    Weekdays
                  </Text>
                </Pressable>
              </View>

              {/* Day Buttons */}
              <View style={styles.daysRow}>
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = selectedDays.includes(day.key);
                  return (
                    <Pressable
                      key={day.key}
                      style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                      onPress={() => toggleDay(day.key)}
                    >
                      <Text
                        variant="bodySemibold"
                        color={isSelected ? 'onAccent' : 'primary'}
                      >
                        {day.short}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {selectedDays.length === 0 && (
                <Text variant="caption" color="secondary" style={styles.hint}>
                  Select at least one day
                </Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.buttonRow}>
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
              disabled={selectedDays.length === 0}
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
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    ...shadows.lg,
  },
  title: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 0,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  timeButton: {
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  timePicker: {
    height: 150,
  },
  quickSelectRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickSelectButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  dayButtonSelected: {
    backgroundColor: colors.accent.orange,
    borderColor: colors.accent.orange,
  },
  hint: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  button: {
    flex: 1,
  },
});
