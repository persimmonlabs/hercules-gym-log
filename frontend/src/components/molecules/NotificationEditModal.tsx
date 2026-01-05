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
import { InputField } from '@/components/atoms/InputField';
import { colors, radius, shadows, spacing } from '@/constants/theme';
import { NotificationConfig, DayOfWeek } from '@/store/notificationStore';

interface NotificationEditModalProps {
  visible: boolean;
  config?: NotificationConfig | null;
  onClose: () => void;
  onSave: (hour: number, minute: number, days: DayOfWeek[]) => void;
  hasOverlay?: boolean;
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
  hasOverlay = true,
}) => {
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  
  // Simple time input state
  const [hourInput, setHourInput] = useState('');
  const [minuteInput, setMinuteInput] = useState('');
  const [ampm, setAmPm] = useState<'AM' | 'PM'>('AM');

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      if (config) {
        const date = new Date();
        date.setHours(config.hour, config.minute, 0, 0);
        setSelectedTime(date);
        setSelectedDays([...config.days]);
        
        // Set simple input values
        const hour = config.hour % 12 || 12;
        setHourInput(hour.toString());
        setMinuteInput(config.minute.toString().padStart(2, '0'));
        setAmPm(config.hour >= 12 ? 'PM' : 'AM');
      } else {
        const date = new Date();
        date.setHours(9, 0, 0, 0);
        setSelectedTime(date);
        setSelectedDays([]);
        
        // Set default input values
        setHourInput('9');
        setMinuteInput('00');
        setAmPm('AM');
      }
      if (Platform.OS === 'android') {
        setShowTimePicker(false);
      }
    }
  }, [visible, config]);


  const handleOpenTimePicker = () => {
    setShowTimePickerModal(true);
    void Haptics.selectionAsync();
  };

  const handleCloseTimePicker = () => {
    setShowTimePickerModal(false);
    void Haptics.selectionAsync();
  };

  const handleSaveTimePicker = () => {
    // Validate and update time from inputs
    const hour = parseInt(hourInput);
    const minute = parseInt(minuteInput);
    
    if (isNaN(hour) || hour < 1 || hour > 12) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    if (isNaN(minute) || minute < 0 || minute > 59) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    // Convert to 24-hour format
    const hour24 = hour === 12 ? (ampm === 'AM' ? 0 : 12) : (ampm === 'PM' ? hour + 12 : hour);
    
    const newDate = new Date(selectedTime);
    newDate.setHours(hour24, minute, 0, 0);
    setSelectedTime(newDate);
    setShowTimePickerModal(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };


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
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
        {hasOverlay ? (
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
                    onPress={handleOpenTimePicker}
                  >
                    <Text variant="heading2" color="primary">
                      {formatDisplayTime()}
                    </Text>
                  </Pressable>
                )}
                {Platform.OS === 'ios' && !showTimePicker && (
                  <Pressable
                    style={styles.timeButton}
                    onPress={handleOpenTimePicker}
                  >
                    <Text variant="heading2" color="primary">
                      {formatDisplayTime()}
                    </Text>
                  </Pressable>
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
                variant="ghost"
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
      ) : (
        <View style={styles.container}>
          <Pressable style={styles.modalContentNoOverlay} onPress={(e) => e.stopPropagation()}>
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
                  onPress={handleOpenTimePicker}
                >
                  <Text variant="heading2" color="primary">
                    {formatDisplayTime()}
                  </Text>
                </Pressable>
              )}
              {Platform.OS === 'ios' && !showTimePicker && (
                <Pressable
                  style={styles.timeButton}
                  onPress={handleOpenTimePicker}
                >
                  <Text variant="heading2" color="primary">
                    {formatDisplayTime()}
                  </Text>
                </Pressable>
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
                variant="ghost"
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
        </View>
      )}
    </Modal>
    
    {/* Simple Time Picker Modal */}
    <Modal visible={showTimePickerModal} animationType="fade" transparent onRequestClose={handleCloseTimePicker}>
      <View style={styles.timePickerModalContainer}>
        <View style={styles.timePickerModalContent}>
          <Text variant="heading2" color="primary" style={styles.timePickerTitle}>
            Set Time
          </Text>
          
          {/* Time Input Fields */}
          <View style={styles.timeInputContainer}>
            <View style={styles.timeInputRow}>
              {/* Hour Input */}
              <View style={styles.timeInputWrapper}>
                <InputField
                  label="Hour"
                  value={hourInput}
                  onChangeText={(text) => {
                    // Only allow numbers 1-12
                    const num = parseInt(text);
                    if (text === '' || (!isNaN(num) && num >= 1 && num <= 12)) {
                      setHourInput(text);
                    }
                  }}
                  placeholder="1-12"
                  keyboardType="numeric"
                  autoFocus={true}
                  onFocus={() => {
                    if (hourInput === '9') {
                      setHourInput('');
                    }
                  }}
                />
              </View>
              
              {/* Separator */}
              <Text variant="heading2" color="primary" style={styles.timeSeparator}>
                :
              </Text>
              
              {/* Minute Input */}
              <View style={styles.timeInputWrapper}>
                <InputField
                  label="Minute"
                  value={minuteInput}
                  onChangeText={(text) => {
                    // Only allow numbers 00-59
                    if (text === '') {
                      setMinuteInput('');
                      return;
                    }
                    
                    const num = parseInt(text);
                    if (!isNaN(num) && num >= 0 && num <= 59) {
                      // Just use the input as-is, no automatic leading zero
                      setMinuteInput(text);
                    }
                  }}
                  placeholder="00-59"
                  keyboardType="numeric"
                  onFocus={() => {
                    if (minuteInput === '00') {
                      setMinuteInput('');
                    }
                  }}
                />
              </View>
            </View>
            
            {/* AM/PM Selector */}
            <View style={styles.ampmSelector}>
              <Pressable
                style={[
                  styles.ampmOption,
                  ampm === 'AM' && styles.ampmOptionSelected
                ]}
                onPress={() => {
                  setAmPm('AM');
                  void Haptics.selectionAsync();
                }}
              >
                <Text
                  variant="bodySemibold"
                  color={ampm === 'AM' ? 'onAccent' : 'primary'}
                >
                  AM
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.ampmOption,
                  ampm === 'PM' && styles.ampmOptionSelected
                ]}
                onPress={() => {
                  setAmPm('PM');
                  void Haptics.selectionAsync();
                }}
              >
                <Text
                  variant="bodySemibold"
                  color={ampm === 'PM' ? 'onAccent' : 'primary'}
                >
                  PM
                </Text>
              </Pressable>
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <Button
              label="Cancel"
              variant="ghost"
              onPress={handleCloseTimePicker}
              style={styles.button}
            />
            <Button
              label="OK"
              variant="primary"
              onPress={handleSaveTimePicker}
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </Modal>
    </>
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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: 350,
    height: 450,
    ...shadows.lg,
  },
  modalContentNoOverlay: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: 350,
    height: 450,
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
  timePickerContainer: {
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.lg,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  unifiedClock: {
    alignItems: 'center',
    gap: spacing.md,
  },
  clockFace: {
    width: 100,
    height: 100,
    backgroundColor: colors.surface.card,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.light,
    position: 'relative',
  },
  clockCenter: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: colors.accent.orange,
    borderRadius: radius.full,
    left: 47,
    top: 47,
  },
  clockNumber: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockNumberSelected: {
    backgroundColor: colors.accent.orange,
  },
  clockNumberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  minuteMarker: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border.light,
  },
  minuteMarkerSelected: {
    backgroundColor: colors.accent.orange,
  },
  hourHand: {
    position: 'absolute',
    width: 4,
    height: 30,
    backgroundColor: colors.text.primary,
    borderRadius: 2,
    left: 48,
    top: 20,
    transformOrigin: 'center bottom',
  },
  minuteHand: {
    position: 'absolute',
    width: 3,
    height: 38,
    backgroundColor: colors.text.secondary,
    borderRadius: 2,
    left: 48.5,
    top: 12,
    transformOrigin: 'center bottom',
  },
  ampmSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  ampmOption: {
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    minWidth: 60,
    alignItems: 'center',
  },
  ampmOptionSelected: {
    backgroundColor: colors.accent.orange,
    borderColor: colors.accent.orange,
  },
  customTimePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timeColumn: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeLabel: {
    textAlign: 'center',
    fontSize: 10,
    marginBottom: 2,
  },
  timeButtonCustom: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.sm,
    padding: spacing.sm,
    minWidth: 45,
    minHeight: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  timeButtonUpDown: {
    minWidth: 35,
    minHeight: 25,
  },
  timeControl: {
    alignItems: 'center',
    gap: 2,
  },
  timeDisplay: {
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: 45,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  timeButtonSmall: {
    padding: spacing.xs,
    minWidth: 30,
    minHeight: 25,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: spacing.xs,
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
    gap: spacing.xxs,
  },
  dayButton: {
    width: 36,
    height: 36,
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
    minWidth: 120,
    minHeight: 44,
  },
  // Time Picker Modal Styles
  timePickerModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerModalContent: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    paddingTop: spacing['2xl'],
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
    width: 350,
    height: 450,
    alignItems: 'center',
    ...shadows.lg,
  },
  timePickerTitle: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  timeInputContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  timeInputWrapper: {
    flex: 1,
  },
  timePickerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginTop: spacing.xl,
  },
  timePickerButton: {
    flex: 1,
    minWidth: 80,
  },
});
