/**
 * ScheduleEditorModal
 * Modal for editing the active schedule rule.
 * Supports Weekly, Rotating Cycle, and Plan-Driven schedule types.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useActiveScheduleStore } from '@/store/activeScheduleStore';
import { useProgramsStore } from '@/store/programsStore';
import { usePlansStore } from '@/store/plansStore';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius, colors } from '@/constants/theme';
import type {
  ScheduleRule,
  ScheduleRuleType,
  WeeklyScheduleRule,
  RotatingScheduleRule,
  PlanDrivenScheduleRule,
  WeekdayKey,
} from '@/types/activeSchedule';

interface ScheduleEditorModalProps {
  visible: boolean;
  onClose: () => void;
}

type EditorStep = 'type-select' | 'configure';

const MAX_ROTATING_DAYS = 14;

const SCHEDULE_TYPES: { type: ScheduleRuleType; label: string; description: string }[] = [
  {
    type: 'weekly',
    label: 'Weekly',
    description: 'Same workout on the same day each week',
  },
  {
    type: 'rotating',
    label: 'Rotating Cycle',
    description: 'Cycle through workouts regardless of day',
  },
  {
    type: 'plan-driven',
    label: 'Plan-Driven',
    description: 'Follow a saved plan sequentially',
  },
];

const WEEKDAYS: { key: WeekdayKey; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

const createEmptyWeeklyRule = (): WeeklyScheduleRule => ({
  type: 'weekly',
  days: {
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null,
  },
});

const createEmptyRotatingRule = (): RotatingScheduleRule => ({
  type: 'rotating',
  cycleWorkouts: [],
  startDate: Date.now(),
});

const createEmptyPlanDrivenRule = (planId: string, cycleWorkouts: (string | null)[] = [null]): PlanDrivenScheduleRule => ({
  type: 'plan-driven',
  planId,
  startDate: Date.now(),
  cycleWorkouts,
  currentIndex: 0,
});

export const ScheduleEditorModal: React.FC<ScheduleEditorModalProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useTheme();
  const setActiveRule = useActiveScheduleStore((state) => state.setActiveRule);
  const currentRule = useActiveScheduleStore((state) => state.state.activeRule);

  const userPrograms = useProgramsStore((state) => state.userPrograms);
  const plans = usePlansStore((state) => state.plans);

  const [step, setStep] = useState<EditorStep>('type-select');
  const [selectedType, setSelectedType] = useState<ScheduleRuleType | null>(
    currentRule?.type || null
  );
  const [draftRule, setDraftRule] = useState<ScheduleRule | null>(currentRule);

  const allWorkouts = useMemo(() => {
    const workouts: { id: string; name: string; source: string }[] = [];
    const seenNames = new Set<string>();

    // Add custom workouts first — canonical versions
    plans.forEach((plan) => {
      const nameKey = plan.name.trim().toLowerCase();
      if (!seenNames.has(nameKey)) {
        seenNames.add(nameKey);
        workouts.push({ id: plan.id, name: plan.name, source: '' });
      }
    });

    // Add program workouts — only if not already present by name
    userPrograms.forEach((program) => {
      program.workouts.forEach((w) => {
        if (w.exercises.length === 0) return;
        const nameKey = w.name.trim().toLowerCase();
        if (!seenNames.has(nameKey)) {
          seenNames.add(nameKey);
          workouts.push({ id: w.id, name: w.name, source: program.name });
        }
      });
    });

    return workouts;
  }, [userPrograms, plans]);

  const allPlans = useMemo(() => {
    return userPrograms.map((p) => ({ id: p.id, name: p.name }));
  }, [userPrograms]);

  const handleTypeSelect = useCallback((type: ScheduleRuleType) => {
    triggerHaptic('selection');
    setSelectedType(type);

    switch (type) {
      case 'weekly':
        setDraftRule(
          currentRule?.type === 'weekly' ? currentRule : createEmptyWeeklyRule()
        );
        break;
      case 'rotating':
        setDraftRule(
          currentRule?.type === 'rotating' ? currentRule : createEmptyRotatingRule()
        );
        break;
      case 'plan-driven':
        const defaultPlanId = allPlans[0]?.id || '';
        setDraftRule(
          currentRule?.type === 'plan-driven'
            ? currentRule
            : createEmptyPlanDrivenRule(defaultPlanId)
        );
        break;
    }
    setStep('configure');
  }, [currentRule, allPlans]);

  const handleBack = useCallback(() => {
    triggerHaptic('selection');
    setStep('type-select');
  }, []);

  const handleSave = useCallback(async () => {
    triggerHaptic('success');
    await setActiveRule(draftRule);
    onClose();
  }, [draftRule, setActiveRule, onClose]);

  const handleClearSchedule = useCallback(async () => {
    triggerHaptic('warning');
    await setActiveRule(null);
    onClose();
  }, [setActiveRule, onClose]);

  const handleClose = useCallback(() => {
    triggerHaptic('selection');
    setStep('type-select');
    setSelectedType(currentRule?.type || null);
    setDraftRule(currentRule);
    onClose();
  }, [currentRule, onClose]);

  const updateWeeklyDay = useCallback((day: WeekdayKey, workoutId: string | null) => {
    if (draftRule?.type !== 'weekly') return;
    setDraftRule({
      ...draftRule,
      days: { ...draftRule.days, [day]: workoutId },
    });
  }, [draftRule]);

  const updateRotatingCycle = useCallback((workouts: (string | null)[]) => {
    if (draftRule?.type !== 'rotating') return;
    setDraftRule({ ...draftRule, cycleWorkouts: workouts });
  }, [draftRule]);

  const updatePlanDrivenPlan = useCallback((planId: string) => {
    if (draftRule?.type !== 'plan-driven') return;
    setDraftRule({ ...draftRule, planId });
  }, [draftRule]);

  const addCycleDay = useCallback(() => {
    if (draftRule?.type !== 'rotating') return;
    if (draftRule.cycleWorkouts.length >= MAX_ROTATING_DAYS) return;
    setDraftRule({
      ...draftRule,
      cycleWorkouts: [...draftRule.cycleWorkouts, null],
    });
  }, [draftRule]);

  const removeCycleDay = useCallback((index: number) => {
    if (draftRule?.type !== 'rotating') return;
    const newCycle = [...draftRule.cycleWorkouts];
    newCycle.splice(index, 1);
    setDraftRule({ ...draftRule, cycleWorkouts: newCycle });
  }, [draftRule]);

  const renderTypeSelection = () => (
    <View style={styles.stepContent}>
      <Text variant="heading3" color="primary" style={styles.stepTitle}>
        Choose Schedule Type
      </Text>
      <Text variant="body" color="secondary" style={styles.stepSubtitle}>
        Select how you want to organize your training
      </Text>

      <View style={styles.typeList}>
        {SCHEDULE_TYPES.map(({ type, label, description }) => {
          const isSelected = selectedType === type;
          return (
            <Pressable
              key={type}
              style={[
                styles.typeCard,
                { backgroundColor: theme.surface.elevated },
                isSelected && { borderColor: theme.accent.orange, borderWidth: 2 },
              ]}
              onPress={() => handleTypeSelect(type)}
            >
              <View style={styles.typeCardContent}>
                <Text variant="bodySemibold" color="primary">
                  {label}
                </Text>
                <Text variant="caption" color="secondary">
                  {description}
                </Text>
              </View>
              <IconSymbol
                name="chevron-right"
                size={20}
                color={theme.text.tertiary}
              />
            </Pressable>
          );
        })}
      </View>

      {currentRule && (
        <Button
          label="Clear Schedule"
          variant="ghost"
          size="md"
          onPress={handleClearSchedule}
          textColor={colors.accent.warning}
        />
      )}
    </View>
  );

  const renderWeeklyEditor = () => {
    if (draftRule?.type !== 'weekly') return null;

    return (
      <View style={styles.stepContent}>
        <Text variant="heading3" color="primary" style={styles.stepTitle}>
          Weekly Schedule
        </Text>
        <Text variant="body" color="secondary" style={styles.stepSubtitle}>
          Assign workouts to each day of the week
        </Text>

        <ScrollView style={styles.daysList} showsVerticalScrollIndicator={false}>
          {WEEKDAYS.map(({ key, label }) => {
            const selectedId = draftRule.days[key];
            const selectedWorkout = allWorkouts.find((w) => w.id === selectedId);

            return (
              <View key={key} style={styles.dayRow}>
                <Text variant="bodySemibold" color="primary" style={styles.dayLabel}>
                  {label}
                </Text>
                <Pressable
                  style={[styles.workoutPicker, { backgroundColor: theme.surface.elevated }]}
                  onPress={() => {
                    const currentIndex = allWorkouts.findIndex((w) => w.id === selectedId);
                    const nextIndex = (currentIndex + 1) % (allWorkouts.length + 1);
                    const nextWorkout = nextIndex < allWorkouts.length ? allWorkouts[nextIndex] : null;
                    updateWeeklyDay(key, nextWorkout?.id || null);
                  }}
                >
                  <Text
                    variant="bodySemibold"
                    color="primary"
                    numberOfLines={1}
                  >
                    {selectedWorkout?.name || 'Rest Day'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderRotatingEditor = () => {
    if (draftRule?.type !== 'rotating') return null;

    return (
      <View style={styles.stepContent}>
        <Text variant="heading3" color="primary" style={styles.stepTitle}>
          Rotating Cycle
        </Text>
        <Text variant="body" color="secondary" style={styles.stepSubtitle}>
          Define your cycle order (repeats indefinitely)
        </Text>

        <ScrollView style={styles.daysList} showsVerticalScrollIndicator={false}>
          {draftRule.cycleWorkouts.map((workoutId, visualIndex) => {
            const selectedWorkout = allWorkouts.find((w) => w.id === workoutId);

            return (
              <View key={visualIndex} style={styles.cycleRow}>
                <Text variant="bodySemibold" color="primary" style={styles.cycleDayNum}>
                  Day {visualIndex + 1}
                </Text>
                <Pressable
                  style={[styles.workoutPicker, { backgroundColor: theme.surface.elevated, flex: 1 }]}
                  onPress={() => {
                    const currentIndex = allWorkouts.findIndex((w) => w.id === workoutId);
                    const nextIndex = (currentIndex + 1) % (allWorkouts.length + 1);
                    const nextWorkout = nextIndex < allWorkouts.length ? allWorkouts[nextIndex] : null;
                    const newCycle = [...draftRule.cycleWorkouts];
                    newCycle[visualIndex] = nextWorkout?.id || null;
                    updateRotatingCycle(newCycle);
                  }}
                >
                  <Text
                    variant="bodySemibold"
                    color="primary"
                    numberOfLines={1}
                  >
                    {selectedWorkout?.name || 'Rest Day'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.removeButton}
                  onPress={() => removeCycleDay(visualIndex)}
                >
                  <IconSymbol name="close" size={18} color={theme.accent.warning} />
                </Pressable>
              </View>
            );
          })}

          <Button
            label="Add Day"
            variant="secondary"
            size="sm"
            onPress={addCycleDay}
            disabled={draftRule.cycleWorkouts.length >= MAX_ROTATING_DAYS}
          />
        </ScrollView>
      </View>
    );
  };

  const renderPlanDrivenEditor = () => {
    if (draftRule?.type !== 'plan-driven') return null;

    return (
      <View style={styles.stepContent}>
        <Text variant="heading3" color="primary" style={styles.stepTitle}>
          Plan-Driven Schedule
        </Text>
        <Text variant="body" color="secondary" style={styles.stepSubtitle}>
          Progress through a saved plan sequentially
        </Text>

        <View style={styles.planList}>
          {allPlans.length === 0 ? (
            <Text variant="body" color="tertiary">
              No plans available. Create a plan first.
            </Text>
          ) : (
            allPlans.map((plan) => {
              const isSelected = draftRule.planId === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  style={[
                    styles.planCard,
                    { backgroundColor: theme.surface.elevated },
                    isSelected && { borderColor: theme.accent.orange, borderWidth: 2 },
                  ]}
                  onPress={() => updatePlanDrivenPlan(plan.id)}
                >
                  <Text variant="bodySemibold" color="primary">
                    {plan.name}
                  </Text>
                  {isSelected && (
                    <IconSymbol name="check-circle" size={20} color={theme.accent.orange} />
                  )}
                </Pressable>
              );
            })
          )}
        </View>
      </View>
    );
  };

  const renderConfigureStep = () => {
    switch (selectedType) {
      case 'weekly':
        return renderWeeklyEditor();
      case 'rotating':
        return renderRotatingEditor();
      case 'plan-driven':
        return renderPlanDrivenEditor();
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay.scrim }]}>
        <View style={[styles.modalContainer, { backgroundColor: theme.surface.card }]}>
          <View style={styles.header}>
            {step === 'configure' && (
              <Pressable style={styles.backButton} onPress={handleBack}>
                <IconSymbol name="arrow-back" size={24} color={theme.text.primary} />
              </Pressable>
            )}
            <Text variant="heading3" color="primary" style={styles.headerTitle}>
              {step === 'type-select' ? 'Edit Schedule' : 'Configure'}
            </Text>
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <IconSymbol name="close" size={24} color={theme.text.primary} />
            </Pressable>
          </View>

          {step === 'type-select' ? renderTypeSelection() : renderConfigureStep()}

          {step === 'configure' && (
            <View style={styles.footer}>
              <Button
                label="Save Schedule"
                variant="primary"
                size="lg"
                onPress={handleSave}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    left: spacing.lg,
    padding: spacing.xs,
  },
  closeButton: {
    position: 'absolute',
    right: spacing.lg,
    padding: spacing.xs,
  },
  stepContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  stepTitle: {
    textAlign: 'center',
  },
  stepSubtitle: {
    textAlign: 'center',
  },
  typeList: {
    gap: spacing.md,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeCardContent: {
    flex: 1,
    gap: spacing.xs,
  },
  daysList: {
    maxHeight: 350,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  dayLabel: {
    width: 100,
  },
  workoutPicker: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cycleDayNum: {
    width: 60,
  },
  removeButton: {
    padding: spacing.sm,
  },
  planList: {
    gap: spacing.md,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.light,
  },
});
