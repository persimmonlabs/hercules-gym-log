import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WEEKDAY_LABELS } from '@/constants/schedule';
import { colors, opacity, radius, spacing } from '@/constants/theme';
import { useScheduleEditor } from '@/hooks/useScheduleEditor';
import type { ScheduleType } from '@/types/schedule';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.sm,
    paddingTop: spacing.xs,
    borderRadius: radius.full,
  },
  titleContainer: {
    flex: 1,
  },
  scheduleTypeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scheduleTypeOption: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    gap: spacing.sm,
  },
  scheduleTypeOptionSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.surface.tint,
  },
  scheduleTypeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleTypeIconContainerSelected: {
    backgroundColor: colors.accent.primary,
  },
  scheduleTypeTextContainer: {
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
  },
  scheduleTypeTitle: {
    textAlign: 'center',
  },
  scheduleTypeSubtitle: {
    textAlign: 'center',
  },
  sectionCard: {
    gap: spacing.md,
  },
  dayRows: { gap: spacing.sm + 2 },
  dayPressable: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.card,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayPressablePressed: { borderColor: colors.accent.primary, opacity: opacity.hover },
  dayLabel: { flexShrink: 0 },
  dayPlanName: { flex: 1, textAlign: 'right' },
  rotatingDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  rotatingDayReorderButtons: {
    gap: spacing.xxs,
  },
  rotatingDayReorderButton: {
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  rotatingDayReorderButtonDisabled: {
    opacity: 0.3,
  },
  rotatingDayBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotatingDayInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  rotatingDayActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  rotatingDayActionButton: {
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  emptyStateContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  datePickerLabel: {
    flex: 1,
  },
  datePickerValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  datePickerControlWrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface.card,
  },
  addDayButtons: {
    gap: spacing.sm,
  },
  saveButtonWrapper: {
    width: '100%',
    marginTop: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.overlay.scrim,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent.orangeLight,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
  },
  modalContent: { gap: spacing.md },
  modalSubtitle: { textAlign: 'left' },
  modalOptions: { gap: spacing.sm },
  modalOption: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent.orangeLight,
    backgroundColor: colors.surface.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  modalOptionActive: { borderColor: colors.accent.primary, backgroundColor: colors.surface.elevated },
  modalOptionText: { textAlign: 'left' },
  helperText: {
    paddingHorizontal: spacing.md,
  },
});

const ScheduleEditorScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    scheduleType,
    setScheduleType,
    assignPlanToDay,
    assignPlanToRotatingDay,
    closeModal,
    draftWeekdays,
    draftRotating,
    isSaving,
    modalDayLabel,
    planNameLookup,
    planOptions,
    saveSchedule,
    selectDay,
    selectRotatingDay,
    selectedDay,
    selectedRotatingDayIndex,
    addRotatingDay,
    removeRotatingDay,
    moveRotatingDayUp,
    moveRotatingDayDown,
    setRotatingStartDate,
  } = useScheduleEditor();

  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleBack = useCallback(() => {
    void Haptics.selectionAsync();
    router.push('/(tabs)/plans');
  }, [router]);

  const handleSave = useCallback(async () => {
    const success = await saveSchedule();

    if (success) {
      router.push('/(tabs)/plans');
    }
  }, [router, saveSchedule]);

  const handleScheduleTypeChange = useCallback((type: ScheduleType) => {
    if (type !== scheduleType) {
      void Haptics.selectionAsync();
      setScheduleType(type);
    }
  }, [scheduleType, setScheduleType]);

  const handleDateChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'set' && selectedDate) {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      setRotatingStartDate(startOfDay.getTime());
    }
    
    if (Platform.OS === 'ios' && event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  }, [setRotatingStartDate]);

  const handleOpenDatePicker = useCallback(() => {
    void Haptics.selectionAsync();
    setShowDatePicker(true);
  }, []);

  const handleCloseDatePicker = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const formattedStartDate = useMemo(() => {
    if (!draftRotating.startDate) return 'Not set';
    return new Date(draftRotating.startDate).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [draftRotating.startDate]);

  const isModalVisible = Boolean(selectedDay) || selectedRotatingDayIndex !== null;
  const currentPlanId = selectedDay
    ? draftWeekdays[selectedDay]
    : selectedRotatingDayIndex !== null
      ? draftRotating.days[selectedRotatingDayIndex]?.planId
      : null;

  const handleAssignPlan = useCallback((planId: string | null) => {
    if (selectedDay) {
      assignPlanToDay(planId);
    } else if (selectedRotatingDayIndex !== null) {
      assignPlanToRotatingDay(planId);
    }
  }, [selectedDay, selectedRotatingDayIndex, assignPlanToDay, assignPlanToRotatingDay]);

  const scrollBottomPadding = spacing['2xl'] * 2 + insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text variant="heading2" color="primary">
              Edit Schedule
            </Text>
            <Text variant="body" color="secondary">
              Choose how you want to organize your workouts.
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed ? { opacity: opacity.hover } : null]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleBack}
            hitSlop={8}
          >
            <IconSymbol name="arrow-back" color={colors.text.primary} size={24} />
          </Pressable>
        </View>

        {/* Schedule Type Selector */}
        <SurfaceCard padding="lg" tone="neutral" showAccentStripe={false}>
          <View style={styles.sectionCard}>
            <Text variant="heading3" color="primary">Schedule Type</Text>
            <View style={styles.scheduleTypeContainer}>
              <Pressable
                style={[styles.scheduleTypeOption, scheduleType === 'weekly' && styles.scheduleTypeOptionSelected]}
                onPress={() => handleScheduleTypeChange('weekly')}
                accessibilityRole="radio"
                accessibilityState={{ selected: scheduleType === 'weekly' }}
              >
                <View style={[styles.scheduleTypeIconContainer, scheduleType === 'weekly' && styles.scheduleTypeIconContainerSelected]}>
                  <IconSymbol
                    name="calendar-today"
                    size={20}
                    color={scheduleType === 'weekly' ? colors.text.onAccent : colors.text.secondary}
                  />
                </View>
                <View style={styles.scheduleTypeTextContainer}>
                  <Text
                    variant="bodySemibold"
                    color={scheduleType === 'weekly' ? 'primary' : 'secondary'}
                    style={styles.scheduleTypeTitle}
                  >
                    7-Day
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={[styles.scheduleTypeOption, scheduleType === 'rotating' && styles.scheduleTypeOptionSelected]}
                onPress={() => handleScheduleTypeChange('rotating')}
                accessibilityRole="radio"
                accessibilityState={{ selected: scheduleType === 'rotating' }}
              >
                <View style={[styles.scheduleTypeIconContainer, scheduleType === 'rotating' && styles.scheduleTypeIconContainerSelected]}>
                  <IconSymbol
                    name="sync"
                    size={20}
                    color={scheduleType === 'rotating' ? colors.text.onAccent : colors.text.secondary}
                  />
                </View>
                <View style={styles.scheduleTypeTextContainer}>
                  <Text
                    variant="bodySemibold"
                    color={scheduleType === 'rotating' ? 'primary' : 'secondary'}
                    style={styles.scheduleTypeTitle}
                  >
                    Rotating
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </SurfaceCard>

        {/* Schedule Configuration */}
        <SurfaceCard padding="lg" tone="neutral" showAccentStripe={false}>
          <View style={styles.sectionCard}>
            <Text variant="heading3" color="primary">
              {scheduleType === 'weekly' ? '7-Day Schedule' : 'Rotation Schedule'}
            </Text>

            {scheduleType === 'weekly' ? (
              <View style={styles.dayRows}>
                {WEEKDAY_LABELS.map(({ key, label }) => {
                  const assignedPlanId = draftWeekdays[key];
                  const assignedName = assignedPlanId ? planNameLookup[assignedPlanId] : null;

                  return (
                    <Pressable
                      key={key}
                      style={({ pressed }) => [styles.dayPressable, pressed ? styles.dayPressablePressed : null]}
                      accessibilityRole="button"
                      accessibilityLabel={`Assign plan to ${label}`}
                      onPress={() => selectDay(key)}
                    >
                      <Text variant="bodySemibold" color="primary" style={styles.dayLabel}>{label}</Text>
                      <Text variant="body" color="secondary" style={styles.dayPlanName}>{assignedName ?? 'Rest Day'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <>
                {/* Start Date Picker */}
                <View style={{ gap: spacing.sm }}>
                  <Pressable style={styles.datePickerRow} onPress={handleOpenDatePicker}>
                    <Text variant="bodySemibold" color="primary" style={styles.datePickerLabel}>
                      Start Date
                    </Text>
                    <View style={styles.datePickerValue}>
                      <Text variant="body" color={draftRotating.startDate ? 'primary' : 'tertiary'}>
                        {formattedStartDate}
                      </Text>
                      <IconSymbol name="calendar-today" size={18} color={colors.accent.primary} />
                    </View>
                  </Pressable>

                  {showDatePicker && (
                    Platform.OS === 'ios' ? (
                      <View style={{ alignItems: 'center', gap: spacing.sm }}>
                        <View style={styles.datePickerControlWrapper}>
                          <DateTimePicker
                            value={draftRotating.startDate ? new Date(draftRotating.startDate) : new Date()}
                            mode="date"
                            display="spinner"
                            onChange={handleDateChange}
                            textColor={colors.text.primary}
                            accentColor={colors.accent.primary}
                          />
                        </View>
                        <Button
                          label="Done"
                          variant="ghost"
                          size="sm"
                          onPress={handleCloseDatePicker}
                        />
                      </View>
                    ) : (
                      <DateTimePicker
                        value={draftRotating.startDate ? new Date(draftRotating.startDate) : new Date()}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                        accentColor={colors.accent.primary}
                      />
                    )
                  )}
                </View>

                {/* Rotating Days List */}
                {draftRotating.days.length === 0 ? (
                  <View style={styles.emptyStateContainer}>
                    <Text variant="body" color="secondary">
                      No days added yet
                    </Text>
                    <Text variant="caption" color="tertiary">
                      Add workout days and rest days below
                    </Text>
                  </View>
                ) : (
                  <View style={styles.dayRows}>
                    {draftRotating.days.map((day, index) => {
                      const isFirst = index === 0;
                      const isLast = index === draftRotating.days.length - 1;
                      const assignedName = day.planId ? planNameLookup[day.planId] : null;

                      return (
                        <View key={day.id} style={styles.rotatingDayRow}>
                          <View style={styles.rotatingDayReorderButtons}>
                            <Pressable
                              style={[styles.rotatingDayReorderButton, isFirst && styles.rotatingDayReorderButtonDisabled]}
                              onPress={() => moveRotatingDayUp(index)}
                              disabled={isFirst}
                              hitSlop={4}
                            >
                              <IconSymbol
                                name="keyboard-arrow-up"
                                size={18}
                                color={isFirst ? colors.text.muted : colors.text.secondary}
                              />
                            </Pressable>
                            <Pressable
                              style={[styles.rotatingDayReorderButton, isLast && styles.rotatingDayReorderButtonDisabled]}
                              onPress={() => moveRotatingDayDown(index)}
                              disabled={isLast}
                              hitSlop={4}
                            >
                              <IconSymbol
                                name="keyboard-arrow-down"
                                size={18}
                                color={isLast ? colors.text.muted : colors.text.secondary}
                              />
                            </Pressable>
                          </View>

                          <View style={styles.rotatingDayBadge}>
                            <Text variant="caption" color="onAccent">
                              {index + 1}
                            </Text>
                          </View>

                          <Pressable
                            style={styles.rotatingDayInfo}
                            onPress={() => selectRotatingDay(index)}
                          >
                            <Text variant="bodySemibold" color="primary">
                              {assignedName ?? 'Rest Day'}
                            </Text>
                          </Pressable>

                          <View style={styles.rotatingDayActions}>
                            <Pressable
                              style={styles.rotatingDayActionButton}
                              onPress={() => selectRotatingDay(index)}
                              hitSlop={8}
                            >
                              <IconSymbol name="edit" size={18} color={colors.accent.primary} />
                            </Pressable>
                            <Pressable
                              style={styles.rotatingDayActionButton}
                              onPress={() => removeRotatingDay(index)}
                              hitSlop={8}
                            >
                              <IconSymbol name="close" size={18} color={colors.accent.orange} />
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {draftRotating.days.length > 0 && (
                  <Text variant="caption" color="tertiary" style={styles.helperText}>
                    Use arrows to reorder. Days will cycle in this order starting from Day 1.
                  </Text>
                )}

                {/* Add Day Buttons */}
                <View style={styles.addDayButtons}>
                  <Button
                    label="Add Day"
                    variant="ghost"
                    size="sm"
                    onPress={() => addRotatingDay(false)}
                    disabled={draftRotating.days.length >= 14}
                  />
                </View>
              </>
            )}
          </View>
        </SurfaceCard>

        {/* Save Button */}
        <View style={styles.saveButtonWrapper}>
          <Button label="Save Schedule" onPress={handleSave} size="lg" loading={isSaving} />
        </View>
      </ScrollView>

      {/* Plan Selection Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        presentationStyle="overFullScreen"
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <SurfaceCard tone="neutral" padding="lg" style={styles.modalCard} showAccentStripe={false}>
            <View style={styles.modalContent}>
              <Text variant="heading3" color="primary">
                {modalDayLabel ? `Assign a plan for ${modalDayLabel}` : 'Select a plan'}
              </Text>
              <Text variant="body" color="secondary" style={styles.modalSubtitle}>
                Choose a workout from your library or keep it as a rest day.
              </Text>
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                <View style={styles.modalOptions}>
                  {planOptions.map((option) => {
                    const isActive = currentPlanId === option.value;

                    return (
                      <Pressable
                        key={`${option.label}-${option.value ?? 'rest'}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${option.label}`}
                        style={({ pressed }) => [
                          styles.modalOption,
                          isActive ? styles.modalOptionActive : null,
                          pressed ? styles.dayPressablePressed : null
                        ]}
                        onPress={() => handleAssignPlan(option.value)}
                      >
                        <Text variant="bodySemibold" color="primary" style={styles.modalOptionText}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              <Button label="Cancel" onPress={closeModal} variant="ghost" />
            </View>
          </SurfaceCard>
        </View>
      </Modal>
    </View>
  );
};

export default ScheduleEditorScreen;
