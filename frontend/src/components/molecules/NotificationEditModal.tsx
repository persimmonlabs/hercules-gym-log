/**
 * NotificationEditModal
 * Modal for creating or editing a notification configuration.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, Platform, PanResponder } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
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
  const [clockMode, setClockMode] = useState<'hour' | 'minute'>('hour');
  const [tempTime, setTempTime] = useState(new Date());
  
  // Animated values for smooth clock hand rotation
  const hourRotation = useSharedValue(0);
  const minuteRotation = useSharedValue(0);

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

  // Update animated rotations when time changes
  useEffect(() => {
    const hourAngle = ((selectedTime.getHours() % 12) * 30 + selectedTime.getMinutes() * 0.5 - 90);
    const minuteAngle = (selectedTime.getMinutes() * 6 - 90);
    hourRotation.value = hourAngle;
    minuteRotation.value = minuteAngle;
  }, [selectedTime, hourRotation, minuteRotation]);

  const handleOpenTimePicker = () => {
    setTempTime(new Date(selectedTime));
    setClockMode('hour');
    setShowTimePickerModal(true);
    void Haptics.selectionAsync();
  };

  const handleCloseTimePicker = () => {
    setShowTimePickerModal(false);
    void Haptics.selectionAsync();
  };

  const handleSaveTimePicker = () => {
    setSelectedTime(new Date(tempTime));
    setShowTimePickerModal(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleClockModeToggle = () => {
    setClockMode(prev => prev === 'hour' ? 'minute' : 'hour');
    void Haptics.selectionAsync();
  };

  const updateHourFromAngleWorklet = (angle: number) => {
    'worklet';
    const normalizedAngle = (angle + 360) % 360;
    const hour = Math.round(normalizedAngle / 30) % 12;
    const finalHour = hour === 0 ? 12 : hour;
    return { normalizedAngle, finalHour };
  };

  const updateMinuteFromAngleWorklet = (angle: number) => {
    'worklet';
    const normalizedAngle = (angle + 360) % 360;
    const minute = Math.round(normalizedAngle / 6) % 60;
    return { normalizedAngle, minute };
  };

  const updateHourFromAngle = (angle: number) => {
    const { normalizedAngle, finalHour } = updateHourFromAngleWorklet(angle);
    const newDate = new Date(tempTime);
    const currentHour = tempTime.getHours();
    const newHour = currentHour >= 12 ? finalHour + 12 : finalHour;
    newDate.setHours(newHour);
    setTempTime(newDate);
    hourRotation.value = withSpring(normalizedAngle - 90);
  };

  const updateMinuteFromAngle = (angle: number) => {
    const { normalizedAngle, minute } = updateMinuteFromAngleWorklet(angle);
    const newDate = new Date(tempTime);
    newDate.setMinutes(minute);
    setTempTime(newDate);
    minuteRotation.value = withSpring(normalizedAngle - 90);
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
        </View>
      )}
    </Modal>
    
    {/* Beautiful Time Picker Modal */}
    <Modal visible={showTimePickerModal} animationType="slide" transparent onRequestClose={handleCloseTimePicker}>
      <View style={styles.timePickerModalOverlay}>
        <View style={styles.timePickerModalContent}>
          {/* Time Display */}
          <View style={styles.timeDisplayContainer}>
            <Pressable onPress={handleClockModeToggle}>
              <Text variant="heading1" color={clockMode === 'hour' ? 'primary' : 'secondary'}>
                {tempTime.getHours() % 12 || 12}
              </Text>
            </Pressable>
            <Text variant="heading1" color="primary">:</Text>
            <Pressable onPress={handleClockModeToggle}>
              <Text variant="heading1" color={clockMode === 'minute' ? 'primary' : 'secondary'}>
                {tempTime.getMinutes().toString().padStart(2, '0')}
              </Text>
            </Pressable>
          </View>
          
          {/* AM/PM Selector */}
          <View style={styles.timePickerAmpm}>
            <Pressable
              style={[
                styles.timePickerAmpmButton,
                tempTime.getHours() < 12 && styles.timePickerAmpmButtonSelected
              ]}
              onPress={() => {
                const newDate = new Date(tempTime);
                newDate.setHours(tempTime.getHours() - 12);
                setTempTime(newDate);
              }}
            >
              <Text
                variant="bodySemibold"
                color={tempTime.getHours() < 12 ? 'onAccent' : 'primary'}
              >
                AM
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.timePickerAmpmButton,
                tempTime.getHours() >= 12 && styles.timePickerAmpmButtonSelected
              ]}
              onPress={() => {
                const newDate = new Date(tempTime);
                newDate.setHours(tempTime.getHours() + 12);
                setTempTime(newDate);
              }}
            >
              <Text
                variant="bodySemibold"
                color={tempTime.getHours() >= 12 ? 'onAccent' : 'primary'}
              >
                PM
              </Text>
            </Pressable>
          </View>
          
          {/* Clock Face */}
          <View style={styles.timePickerClock}>
            <View style={styles.timePickerClockFace}>
              <View style={styles.timePickerClockCenter} />
              
              {/* Hour Numbers */}
              {clockMode === 'hour' && Array.from({ length: 12 }, (_, i) => {
                const hour = i === 0 ? 12 : i;
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const radius = 80;
                const x = Math.cos(angle) * radius + 100;
                const y = Math.sin(angle) * radius + 100;
                const isSelected = (tempTime.getHours() % 12 || 12) === hour;
                
                return (
                  <Pressable
                    key={hour}
                    style={[
                      styles.timePickerClockNumber,
                      { left: x - 20, top: y - 20 },
                      isSelected && styles.timePickerClockNumberSelected
                    ]}
                    onPress={() => {
                      const currentHour = tempTime.getHours();
                      const newHour = currentHour >= 12 ? hour + 12 : hour;
                      const newDate = new Date(tempTime);
                      newDate.setHours(newHour);
                      setTempTime(newDate);
                      // Auto switch to minute mode after selecting hour
                      setClockMode('minute');
                    }}
                  >
                    <Text
                      variant="bodySemibold"
                      color={isSelected ? 'onAccent' : 'primary'}
                      style={styles.timePickerClockNumberText}
                    >
                      {hour}
                    </Text>
                  </Pressable>
                );
              })}
              
              {/* Minute Numbers */}
              {clockMode === 'minute' && Array.from({ length: 12 }, (_, i) => {
                const minute = i * 5;
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const radius = 80;
                const x = Math.cos(angle) * radius + 100;
                const y = Math.sin(angle) * radius + 100;
                const isSelected = tempTime.getMinutes() === minute;
                
                return (
                  <Pressable
                    key={minute}
                    style={[
                      styles.timePickerClockNumber,
                      { left: x - 20, top: y - 20 },
                      isSelected && styles.timePickerClockNumberSelected
                    ]}
                    onPress={() => {
                      const newDate = new Date(tempTime);
                      newDate.setMinutes(minute);
                      setTempTime(newDate);
                    }}
                  >
                    <Text
                      variant="bodySemibold"
                      color={isSelected ? 'onAccent' : 'primary'}
                      style={styles.timePickerClockNumberText}
                    >
                      {minute === 0 ? '00' : minute.toString()}
                    </Text>
                  </Pressable>
                );
              })}
              
              {/* Draggable Clock Hand */}
              <Animated.View
                style={[
                  clockMode === 'hour' ? styles.timePickerHourHand : styles.timePickerMinuteHand,
                  clockMode === 'hour' 
                    ? useAnimatedStyle(() => ({
                        transform: [{ rotate: `${hourRotation.value}deg` }]
                      }))
                    : useAnimatedStyle(() => ({
                        transform: [{ rotate: `${minuteRotation.value}deg` }]
                      }))
                ]}
                {...(Platform.OS === 'ios' ? {} : PanResponder.create({
                  onPanResponderMove: (_evt, gestureState) => {
                    const { dx, dy } = gestureState;
                    const centerX = 100;
                    const centerY = 100;
                    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
                    const normalizedAngle = (angle + 360) % 360;
                    
                    if (clockMode === 'hour') {
                      updateHourFromAngle(normalizedAngle);
                    } else {
                      updateMinuteFromAngle(normalizedAngle);
                    }
                  },
                  onPanResponderRelease: () => {
                    // Auto switch to minute mode after dragging hour hand
                    if (clockMode === 'hour') {
                      setClockMode('minute');
                    }
                  },
                }).panHandlers)}
              />
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.timePickerButtons}>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={handleCloseTimePicker}
              style={styles.timePickerButton}
            />
            <Button
              label="OK"
              variant="primary"
              onPress={handleSaveTimePicker}
              style={styles.timePickerButton}
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
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    ...shadows.lg,
  },
  modalContentNoOverlay: {
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
  },
  ampmOption: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    minWidth: 40,
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
    paddingHorizontal: spacing.xs,
    fontSize: 24,
    fontWeight: '600',
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
  },
  // Time Picker Modal Styles
  timePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  timePickerModalContent: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    ...shadows.lg,
  },
  timeDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  timePickerAmpm: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  timePickerAmpmButton: {
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    minWidth: 60,
    alignItems: 'center',
  },
  timePickerAmpmButtonSelected: {
    backgroundColor: colors.accent.orange,
    borderColor: colors.accent.orange,
  },
  timePickerClock: {
    marginVertical: spacing.xl,
  },
  timePickerClockFace: {
    width: 200,
    height: 200,
    backgroundColor: colors.surface.card,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border.light,
    position: 'relative',
  },
  timePickerClockCenter: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: colors.accent.orange,
    borderRadius: radius.full,
    left: 94,
    top: 94,
  },
  timePickerClockNumber: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerClockNumberSelected: {
    backgroundColor: colors.accent.orange,
  },
  timePickerClockNumberText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timePickerHourHand: {
    position: 'absolute',
    width: 6,
    height: 60,
    backgroundColor: colors.text.primary,
    borderRadius: 3,
    left: 97,
    top: 40,
    transformOrigin: 'center bottom',
  },
  timePickerMinuteHand: {
    position: 'absolute',
    width: 4,
    height: 80,
    backgroundColor: colors.text.secondary,
    borderRadius: 2,
    left: 98,
    top: 20,
    transformOrigin: 'center bottom',
  },
  timePickerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginTop: spacing.xl,
  },
  timePickerButton: {
    flex: 1,
  },
});
