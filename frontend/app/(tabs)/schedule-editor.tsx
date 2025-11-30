import React, { useCallback } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WEEKDAY_LABELS } from '@/constants/schedule';
import { colors, opacity, radius, spacing } from '@/constants/theme';
import { useScheduleEditor } from '@/hooks/useScheduleEditor';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing['2xl'],
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
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
  scheduleCardContent: { gap: spacing.md },
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
  saveButtonWrapper: {
    width: '100%',
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
});

const ScheduleEditorScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { assignPlanToDay, closeModal, draftWeekdays, isSaving, modalDayLabel, planNameLookup, planOptions, saveSchedule, selectDay, selectedDay } = useScheduleEditor();

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

  const headerTitle = 'Edit Schedule';
  const headerSubtitle = 'Assign plans to each day or mark rest days.';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text variant="heading2" color="primary">
            {headerTitle}
          </Text>
          <Text variant="body" color="secondary">
            {headerSubtitle}
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

      <View style={styles.contentContainer}>
        <SurfaceCard padding="xl" tone="neutral" showAccentStripe={false}>
          <View style={styles.scheduleCardContent}>
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
          </View>
        </SurfaceCard>

        <View style={styles.saveButtonWrapper}>
          <Button label="Save Schedule" onPress={handleSave} size="lg" loading={isSaving} />
        </View>
      </View>

      <Modal
        visible={Boolean(selectedDay)}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <SurfaceCard tone="neutral" padding="lg" style={styles.modalCard} showAccentStripe={false}>
            <View style={styles.modalContent}>
              <Text variant="heading3" color="primary">{modalDayLabel ? `Assign a plan for ${modalDayLabel}` : 'Select a plan'}</Text>
              <Text variant="body" color="secondary" style={styles.modalSubtitle}>Choose a plan from your library or keep it as a rest day.</Text>
              <View style={styles.modalOptions}>
                {planOptions.map((option) => {
                  const isActive = selectedDay
                    ? draftWeekdays[selectedDay] === option.value
                    : false;

                  return (
                    <Pressable
                      key={`${option.label}-${option.value ?? 'rest'}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${option.label}`}
                      style={({ pressed }) => [styles.modalOption, isActive ? styles.modalOptionActive : null, pressed ? styles.dayPressablePressed : null]}
                      onPress={() => assignPlanToDay(option.value)}
                    >
                      <Text variant="bodySemibold" color="primary" style={styles.modalOptionText}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Button label="Cancel" onPress={closeModal} variant="ghost" />
            </View>
          </SurfaceCard>
        </View>
      </Modal>
    </View>
  );
};

export default ScheduleEditorScreen;
