/**
 * Schedule Setup Page
 * Full-screen page for configuring the active schedule rule.
 * Supports Weekly, Rotating Cycle, and Plan-Driven schedule types.
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, FlatList } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useActiveScheduleStore } from '@/store/activeScheduleStore';
import { useProgramsStore } from '@/store/programsStore';
import { usePlansStore } from '@/store/plansStore';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/providers/AuthProvider';
import { spacing, radius, colors, shadows } from '@/constants/theme';
import type { PlanScheduleConfig, UserProgram } from '@/types/premadePlan';
import type {
  ScheduleRule,
  ScheduleRuleType,
  WeeklyScheduleRule,
  RotatingScheduleRule,
  PlanDrivenScheduleRule,
  WeekdayKey,
} from '@/types/activeSchedule';

type EditorStep = 'type-select' | 'configure';

interface WorkoutOption {
  id: string | null;
  name: string;
  source: string;
  isRest: boolean;
}

const SCHEDULE_TYPES: { type: ScheduleRuleType; label: string; description: string; icon: string }[] = [
  {
    type: 'weekly',
    label: 'Weekly',
    description: 'Same workout on the same day each week',
    icon: 'calendar-today',
  },
  {
    type: 'rotating',
    label: 'Rotating Cycle',
    description: 'Cycle through workouts regardless of day',
    icon: 'autorenew',
  },
  {
    type: 'plan-driven',
    label: 'Plan-Driven',
    description: 'Follow a saved plan sequentially',
    icon: 'assignment',
  },
];

const WEEKDAYS: { key: WeekdayKey; label: string; short: string }[] = [
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
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

const createEmptyRotatingRule = (startTime?: number): RotatingScheduleRule => ({
  type: 'rotating',
  startDate: startTime || Date.now(),
  cycleWorkouts: [null],
});

const normalizeCycleWorkouts = (cycleWorkouts: (string | null)[]): (string | null)[] => {
  // Important: Array holes (sparse arrays) can cause map() to skip indices,
  // which leads to Day 1 / Day 5 gaps. filter() compacts the array.
  return cycleWorkouts.filter((id) => id !== undefined);
};

const normalizeRotatingRule = (rule: RotatingScheduleRule): RotatingScheduleRule => {
  return {
    ...rule,
    cycleWorkouts: normalizeCycleWorkouts(rule.cycleWorkouts),
  };
};

const normalizeScheduleRule = (rule: ScheduleRule | null): ScheduleRule | null => {
  if (!rule) return null;
  if (rule.type !== 'rotating') return rule;
  return normalizeRotatingRule(rule);
};

const MAX_ROTATING_CYCLE_DAYS = 14;

/** Extract cycleWorkouts from a plan's suggested schedule */
const getPlanCycleWorkouts = (plan: UserProgram): (string | null)[] => {
  // Prefer the user's saved schedule (already mapped to the user's cloned workout IDs)
  if (plan.schedule?.type === 'rotation') {
    const order = plan.schedule.rotation?.workoutOrder as (string | null)[] | undefined;
    if (order && order.length > 0) return order;
  }

  if (plan.schedule?.type === 'weekly' && plan.schedule.weekly) {
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekly = plan.schedule.weekly;
    return weekdays.map((day) => (weekly as unknown as Record<string, string | null>)[day] ?? null);
  }

  // Fallback to premade suggestedSchedule (may contain source IDs)
  if (plan.suggestedSchedule?.rotation && plan.suggestedSchedule.rotation.length > 0) {
    return plan.suggestedSchedule.rotation;
  }

  if (plan.suggestedSchedule?.weekly) {
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return weekdays.map((day) => plan.suggestedSchedule?.weekly?.[day] ?? null);
  }

  // Default: list all workouts with rest days between them
  const workouts: (string | null)[] = [];
  plan.workouts.forEach((w, i) => {
    workouts.push(w.id);
    if (i < plan.workouts.length - 1) {
      workouts.push(null);
    }
  });
  return workouts.length > 0 ? workouts : [null];
};

const createEmptyPlanDrivenRule = (planId: string, cycleWorkouts: (string | null)[] = [null]): PlanDrivenScheduleRule => ({
  type: 'plan-driven',
  planId,
  startDate: Date.now(),
  cycleWorkouts,
  currentIndex: 0,
});

const ScheduleSetupScreen: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const setActiveRule = useActiveScheduleStore((state) => state.setActiveRule);
  const currentRule = useActiveScheduleStore((state) => state.state.activeRule);
  
  // Check if we're editing an existing schedule
  const isEditing = !!currentRule;

  const userPrograms = useProgramsStore((state) => state.userPrograms);
  const plans = usePlansStore((state) => state.plans);
  const hydratePlans = usePlansStore((state) => state.hydratePlans);
  const hydratePrograms = useProgramsStore((state) => state.hydratePrograms);

  const editorScrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState<EditorStep>(isEditing ? 'configure' : 'type-select');
  const [selectedType, setSelectedType] = useState<ScheduleRuleType | null>(
    currentRule?.type || null
  );
  const [draftRule, setDraftRule] = useState<ScheduleRule | null>(() => normalizeScheduleRule(currentRule));

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerContext, setPickerContext] = useState<{
    type: 'weekly' | 'rotating' | 'plan-driven';
    index: number | WeekdayKey;
  } | null>(null);
  const [startDate, setStartDate] = useState<Date>(
    (currentRule?.type === 'rotating' || currentRule?.type === 'plan-driven') 
      ? new Date(currentRule.startDate) 
      : new Date()
  );
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerViewDate, setDatePickerViewDate] = useState<Date>(
    (currentRule?.type === 'rotating' || currentRule?.type === 'plan-driven') 
      ? new Date(currentRule.startDate) 
      : new Date()
  );
  const [pendingStartDate, setPendingStartDate] = useState<Date>(
    (currentRule?.type === 'rotating' || currentRule?.type === 'plan-driven') 
      ? new Date(currentRule.startDate) 
      : new Date()
  );

  // Ensure data is loaded when component mounts
  useEffect(() => {
    if (user?.id) {
      void hydratePlans(user.id);
      void hydratePrograms();
    }
  }, [user?.id, hydratePlans, hydratePrograms]);

  const allWorkouts = useMemo((): WorkoutOption[] => {
    const workouts: WorkoutOption[] = [
      { id: null, name: 'Rest Day', source: '', isRest: true },
    ];

    // Add workouts from programs
    userPrograms.forEach((program) => {
      program.workouts.forEach((w) => {
        if (w.exercises.length > 0) {
          workouts.push({ id: w.id, name: w.name, source: program.name, isRest: false });
        }
      });
    });

    // Add custom plans (My Workouts)
    plans.forEach((plan) => {
      workouts.push({ id: plan.id, name: plan.name, source: 'My Workouts', isRest: false });
    });

    // Debug logging (remove in production)
    console.log('All workouts:', workouts);
    console.log('Plans count:', plans.length);
    console.log('Programs count:', userPrograms.length);

    return workouts;
  }, [userPrograms, plans]);

  const allPlans = useMemo(() => {
    return userPrograms.map((p) => ({ id: p.id, name: p.name }));
  }, [userPrograms]);

  const newestPlan = useMemo(() => {
    if (userPrograms.length === 0) return null;
    return [...userPrograms].sort((a, b) => {
      const aTime = Math.max(a.modifiedAt ?? 0, a.createdAt ?? 0);
      const bTime = Math.max(b.modifiedAt ?? 0, b.createdAt ?? 0);
      return bTime - aTime;
    })[0];
  }, [userPrograms]);

  const handleTypeSelect = useCallback((type: ScheduleRuleType) => {
    void Haptics.selectionAsync();
    setSelectedType(type);

    switch (type) {
      case 'weekly':
        setDraftRule(
          currentRule?.type === 'weekly' ? currentRule : createEmptyWeeklyRule()
        );
        break;
      case 'rotating':
        setDraftRule(
          currentRule?.type === 'rotating'
            ? normalizeRotatingRule(currentRule)
            : createEmptyRotatingRule(startDate.getTime())
        );
        break;
      case 'plan-driven':
        if (currentRule?.type === 'plan-driven') {
          setDraftRule(currentRule);
        } else {
          const defaultPlan = newestPlan;
          if (defaultPlan) {
            const cycleWorkouts = getPlanCycleWorkouts(defaultPlan);
            setDraftRule(createEmptyPlanDrivenRule(defaultPlan.id, cycleWorkouts));
          } else {
            setDraftRule(createEmptyPlanDrivenRule('', [null]));
          }
        }
        break;
    }
    setStep('configure');
  }, [currentRule, newestPlan, startDate]);

  useEffect(() => {
    if (step !== 'configure') return;
    requestAnimationFrame(() => {
      editorScrollRef.current?.scrollTo({ y: 0, animated: false });
    });
  }, [step, selectedType]);

  useEffect(() => {
    if (selectedType !== 'plan-driven') return;
    if (!draftRule || draftRule.type !== 'plan-driven') return;
    if (!newestPlan) return;

    const isBlankRule = !draftRule.planId || !draftRule.cycleWorkouts || draftRule.cycleWorkouts.length <= 1;
    if (!isBlankRule) return;

    const cycleWorkouts = getPlanCycleWorkouts(newestPlan);
    setDraftRule({
      ...draftRule,
      planId: newestPlan.id,
      cycleWorkouts,
    });
  }, [draftRule, newestPlan, selectedType]);

  const handleBack = useCallback(() => {
    void Haptics.selectionAsync();
    if (step === 'configure') {
      // Always go to type-select from configure mode
      setStep('type-select');
    } else {
      router.push('/(tabs)/plans');
    }
  }, [step, router]);

  const handleSave = useCallback(async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Update rotating/plan-driven rule with selected start date
    let finalRule = draftRule;
    if (draftRule?.type === 'rotating') {
      finalRule = {
        ...draftRule,
        startDate: startDate.getTime(),
        cycleWorkouts: normalizeCycleWorkouts(draftRule.cycleWorkouts),
      };
    } else if (draftRule?.type === 'plan-driven') {
      finalRule = {
        ...draftRule,
        startDate: startDate.getTime(),
      };
    }
    
    await setActiveRule(finalRule);
    router.push('/(tabs)/plans');
  }, [draftRule, startDate, setActiveRule, router]);

  const handleClearSchedule = useCallback(async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await setActiveRule(null);
    router.push('/(tabs)/plans');
  }, [setActiveRule, router]);

  const openWorkoutPicker = useCallback((type: 'weekly' | 'rotating' | 'plan-driven', index: number | WeekdayKey) => {
    void Haptics.selectionAsync();
    setPickerContext({ type, index });
    setPickerVisible(true);
  }, []);

  const handleWorkoutSelect = useCallback((workoutId: string | null) => {
    void Haptics.selectionAsync();
    if (!pickerContext || !draftRule) return;

    if (pickerContext.type === 'weekly' && draftRule.type === 'weekly') {
      const day = pickerContext.index as WeekdayKey;
      setDraftRule({
        ...draftRule,
        days: { ...draftRule.days, [day]: workoutId },
      });
    } else if (pickerContext.type === 'rotating' && draftRule.type === 'rotating') {
      const idx = pickerContext.index as number;

      const normalizedCycle = normalizeCycleWorkouts(draftRule.cycleWorkouts);

      if (idx === normalizedCycle.length && normalizedCycle.length >= MAX_ROTATING_CYCLE_DAYS) {
        setPickerVisible(false);
        setPickerContext(null);
        return;
      }
      
      // Check if this is a new day being added (index equals current length)
      if (idx === normalizedCycle.length) {
        // Add the new day with the selected workout
        setDraftRule({
          ...draftRule,
          cycleWorkouts: normalizeCycleWorkouts([...normalizedCycle, workoutId]),
        });
      } else {
        // Update existing day
        const newCycle = [...normalizedCycle];
        newCycle[idx] = workoutId;
        setDraftRule({ ...draftRule, cycleWorkouts: normalizeCycleWorkouts(newCycle) });
      }
    } else if (pickerContext.type === 'plan-driven' && draftRule.type === 'plan-driven') {
      const idx = pickerContext.index as number;
      const cycleWorkouts = draftRule.cycleWorkouts || [];

      if (idx === cycleWorkouts.length && cycleWorkouts.length >= MAX_ROTATING_CYCLE_DAYS) {
        setPickerVisible(false);
        setPickerContext(null);
        return;
      }
      
      if (idx === cycleWorkouts.length) {
        setDraftRule({
          ...draftRule,
          cycleWorkouts: [...cycleWorkouts, workoutId],
        });
      } else {
        const newCycle = [...cycleWorkouts];
        newCycle[idx] = workoutId;
        setDraftRule({ ...draftRule, cycleWorkouts: newCycle });
      }
    }

    setPickerVisible(false);
    setPickerContext(null);
  }, [pickerContext, draftRule]);

  const addCycleDay = useCallback(() => {
    if (draftRule?.type !== 'rotating') return;
    void Haptics.selectionAsync();
    const newIndex = normalizeCycleWorkouts(draftRule.cycleWorkouts).length;
    if (newIndex >= MAX_ROTATING_CYCLE_DAYS) return;
    // Don't add the day yet, just open the picker
    setTimeout(() => {
      openWorkoutPicker('rotating', newIndex);
    }, 100);
  }, [draftRule, openWorkoutPicker]);

  const removeCycleDay = useCallback((index: number) => {
    if (draftRule?.type !== 'rotating') return;
    if (draftRule.cycleWorkouts.length <= 1) return;
    void Haptics.selectionAsync();
    const newCycle = [...normalizeCycleWorkouts(draftRule.cycleWorkouts)];
    newCycle.splice(index, 1);
    setDraftRule({ ...draftRule, cycleWorkouts: normalizeCycleWorkouts(newCycle) });
  }, [draftRule]);

  const updatePlanDrivenPlan = useCallback((planId: string) => {
    if (draftRule?.type !== 'plan-driven') return;
    void Haptics.selectionAsync();
    
    // Find the selected plan and update cycleWorkouts from its suggested schedule
    const selectedPlan = userPrograms.find(p => p.id === planId);
    if (selectedPlan) {
      const cycleWorkouts = getPlanCycleWorkouts(selectedPlan);
      setDraftRule({ ...draftRule, planId, cycleWorkouts });
    } else {
      setDraftRule({ ...draftRule, planId });
    }
  }, [draftRule, userPrograms]);

  const addPlanDrivenDay = useCallback(() => {
    if (draftRule?.type !== 'plan-driven') return;
    void Haptics.selectionAsync();
    const cycleWorkouts = draftRule.cycleWorkouts || [];
    const newIndex = cycleWorkouts.length;
    if (newIndex >= MAX_ROTATING_CYCLE_DAYS) return;
    setTimeout(() => {
      openWorkoutPicker('plan-driven', newIndex);
    }, 100);
  }, [draftRule, openWorkoutPicker]);

  const removePlanDrivenDay = useCallback((index: number) => {
    if (draftRule?.type !== 'plan-driven') return;
    const cycleWorkouts = draftRule.cycleWorkouts || [];
    if (cycleWorkouts.length <= 1) return;
    void Haptics.selectionAsync();
    const newCycle = [...cycleWorkouts];
    newCycle.splice(index, 1);
    setDraftRule({ ...draftRule, cycleWorkouts: newCycle });
  }, [draftRule]);

  const movePlanDrivenDay = useCallback((fromIndex: number, toIndex: number) => {
    if (draftRule?.type !== 'plan-driven') return;
    const cycleWorkouts = draftRule.cycleWorkouts || [];
    if (fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= cycleWorkouts.length || toIndex >= cycleWorkouts.length) return;
    if (fromIndex === toIndex) return;

    void Haptics.selectionAsync();
    const newCycle = [...cycleWorkouts];
    const temp = newCycle[fromIndex];
    newCycle[fromIndex] = newCycle[toIndex];
    newCycle[toIndex] = temp;
    setDraftRule({ ...draftRule, cycleWorkouts: newCycle });
  }, [draftRule]);

  const getWorkoutName = (workoutId: string | null | undefined): string => {
    if (workoutId == null) return 'Rest Day';
    const workout = allWorkouts.find((w) => w.id === workoutId);
    return workout?.name || 'Unknown';
  };

  const renderTypeSelection = () => (
    <View style={{ gap: spacing.md, marginTop: spacing.md }}>
      {SCHEDULE_TYPES.map(({ type, label, description, icon }) => {
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
            <View style={[styles.typeIcon, { backgroundColor: theme.accent.orange + '20' }]}>
              <IconSymbol
                name={icon as any}
                size={24}
                color={theme.accent.orange}
              />
            </View>
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

      {currentRule && (
        <View style={styles.clearButtonWrapper}>
          <Button
            label="Clear Schedule"
            variant="ghost"
            size="md"
            onPress={handleClearSchedule}
            textColor={colors.accent.warning}
          />
        </View>
      )}
    </View>
  );

  const renderWeeklyEditor = () => {
    if (draftRule?.type !== 'weekly') return null;

    return (
      <View style={{ gap: spacing.md, marginTop: spacing.md }}>
        <View style={styles.daysList}>
          {WEEKDAYS.map(({ key, label }) => {
            const selectedId = draftRule.days[key];
            const workoutName = getWorkoutName(selectedId);
            const isRest = selectedId === null;

            return (
              <Pressable
                key={key}
                style={[styles.dayRow, { backgroundColor: theme.surface.elevated }]}
                onPress={() => openWorkoutPicker('weekly', key)}
              >
                <Text variant="bodySemibold" color="primary" style={styles.dayLabel}>
                  {label}
                </Text>
                <View style={styles.dayValue}>
                  <Text
                    variant="body"
                    color={isRest ? 'tertiary' : 'primary'}
                    numberOfLines={1}
                  >
                    {workoutName}
                  </Text>
                  <IconSymbol name="chevron-right" size={16} color={theme.text.tertiary} />
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.saveButtonWrapper}>
          <Button
            label="Save Schedule"
            variant="primary"
            size="lg"
            onPress={handleSave}
          />
        </View>
      </View>
    );
  };

  const renderRotatingEditor = () => {
    if (draftRule?.type !== 'rotating') return null;

    const normalizedCycle = normalizeCycleWorkouts(draftRule.cycleWorkouts);

    return (
      <View style={{ gap: spacing.md, marginTop: spacing.md }}>
        <View style={[styles.cycleRow, { backgroundColor: theme.surface.elevated }]}>
          <Text variant="bodySemibold" color="primary" style={styles.cycleDayNum}>
            Start Date
          </Text>
          <Pressable
            style={styles.cycleWorkoutPicker}
            onPress={() => {
              setDatePickerViewDate(startDate);
              setPendingStartDate(startDate);
              setDatePickerVisible(true);
            }}
          >
            <Text
              variant="body"
              color="primary"
              numberOfLines={1}
              style={[styles.cycleWorkoutText, { textAlignVertical: 'center' }]}
            >
              {startDate.toLocaleDateString()}
            </Text>
            <IconSymbol name="calendar-today" size={16} color={theme.text.tertiary} />
          </Pressable>
        </View>
        
        <View style={styles.daysList}>
          {normalizedCycle.map((workoutId, visualIndex) => {
            const workoutName = getWorkoutName(workoutId);
            const isRest = workoutId === null;

            return (
              <View
                key={`cycle-${visualIndex}-${workoutId ?? 'rest'}`}
                style={[styles.cycleRow, { backgroundColor: theme.surface.elevated }]}
              >
                <Text variant="bodySemibold" color="primary" style={styles.cycleDayNum}>
                  Day {visualIndex + 1}
                </Text>
                <Pressable
                  style={styles.cycleWorkoutPicker}
                  onPress={() => openWorkoutPicker('rotating', visualIndex)}
                >
                  <Text
                    variant="body"
                    color={isRest ? 'tertiary' : 'primary'}
                    numberOfLines={1}
                    style={styles.cycleWorkoutText}
                  >
                    {workoutName}
                  </Text>
                  <IconSymbol name="chevron-right" size={16} color={theme.text.tertiary} />
                </Pressable>
                {normalizedCycle.length > 1 && (
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => removeCycleDay(visualIndex)}
                  >
                    <IconSymbol name="close" size={18} color={theme.accent.warning} />
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        <Pressable
          style={[styles.addDayButton, { backgroundColor: theme.surface.elevated }]}
          onPress={addCycleDay}
          disabled={normalizedCycle.length >= MAX_ROTATING_CYCLE_DAYS}
        >
          <IconSymbol name="add" size={24} color={theme.accent.warning} />
        </Pressable>

        <View style={styles.saveButtonWrapper}>
          <Button
            label="Save Schedule"
            variant="primary"
            size="lg"
            onPress={handleSave}
          />
        </View>
      </View>
    );
  };

  const renderPlanDrivenEditor = () => {
    if (draftRule?.type !== 'plan-driven') return null;

    const cycleWorkouts = draftRule.cycleWorkouts || [];
    const effectiveSelectedPlanId = draftRule.planId || (cycleWorkouts.length > 1 ? newestPlan?.id || '' : '');

    return (
      <View style={{ gap: spacing.md, marginTop: spacing.md }}>
        {/* Plan Selection */}
        <View style={styles.planList}>
          {allPlans.length === 0 ? (
            <SurfaceCard tone="neutral" padding="lg">
              <Text variant="body" color="tertiary" style={styles.emptyText}>
                No plans available. Create a plan first from My Programs.
              </Text>
            </SurfaceCard>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.planScrollView}>
              {allPlans.map((plan) => {
                const isSelected = effectiveSelectedPlanId === plan.id;
                return (
                  <Pressable
                    key={plan.id}
                    style={[
                      styles.planChip,
                      {
                        backgroundColor: isSelected ? theme.accent.orange : theme.surface.elevated,
                        borderColor: isSelected ? theme.accent.orange : theme.border.light,
                      },
                    ]}
                    onPress={() => updatePlanDrivenPlan(plan.id)}
                  >
                    <Text 
                      variant="bodySemibold" 
                      color={isSelected ? 'onAccent' : 'primary'}
                    >
                      {plan.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Start Date */}
        <View style={[styles.cycleRow, { backgroundColor: theme.surface.elevated }]}>
          <Text variant="bodySemibold" color="primary" style={styles.cycleDayNum}>
            Start Date
          </Text>
          <Pressable
            style={styles.cycleWorkoutPicker}
            onPress={() => {
              setDatePickerViewDate(startDate);
              setPendingStartDate(startDate);
              setDatePickerVisible(true);
            }}
          >
            <Text
              variant="body"
              color="primary"
              numberOfLines={1}
              style={[styles.cycleWorkoutText, { textAlignVertical: 'center' }]}
            >
              {startDate.toLocaleDateString()}
            </Text>
            <IconSymbol name="calendar-today" size={16} color={theme.text.tertiary} />
          </Pressable>
        </View>

        {/* Cycle Days */}
        <View style={styles.daysList}>
          {cycleWorkouts.map((workoutId, visualIndex) => {
            const workoutName = getWorkoutName(workoutId);
            const isRest = workoutId === null;
            const canMoveUp = visualIndex > 0;
            const canMoveDown = visualIndex < cycleWorkouts.length - 1;

            return (
              <View
                key={`plan-cycle-${visualIndex}-${workoutId ?? 'rest'}`}
                style={[styles.cycleRow, { backgroundColor: theme.surface.elevated }]}
              >
                <Text variant="bodySemibold" color="primary" style={styles.cycleDayNum}>
                  Day {visualIndex + 1}
                </Text>
                <View style={styles.reorderButtonsContainer}>
                  <Pressable
                    style={[styles.reorderButton, !canMoveUp && styles.reorderButtonDisabled]}
                    disabled={!canMoveUp}
                    onPress={() => movePlanDrivenDay(visualIndex, visualIndex - 1)}
                    hitSlop={8}
                  >
                    <IconSymbol
                      name="keyboard-arrow-up"
                      size={20}
                      color={canMoveUp ? theme.text.secondary : theme.text.tertiary}
                    />
                  </Pressable>
                  <Pressable
                    style={[styles.reorderButton, !canMoveDown && styles.reorderButtonDisabled]}
                    disabled={!canMoveDown}
                    onPress={() => movePlanDrivenDay(visualIndex, visualIndex + 1)}
                    hitSlop={8}
                  >
                    <IconSymbol
                      name="keyboard-arrow-down"
                      size={20}
                      color={canMoveDown ? theme.text.secondary : theme.text.tertiary}
                    />
                  </Pressable>
                </View>
                <Pressable
                  style={styles.cycleWorkoutPicker}
                  onPress={() => openWorkoutPicker('plan-driven', visualIndex)}
                >
                  <Text
                    variant="body"
                    color={isRest ? 'tertiary' : 'primary'}
                    numberOfLines={1}
                    style={styles.cycleWorkoutText}
                  >
                    {workoutName}
                  </Text>
                  <IconSymbol name="chevron-right" size={16} color={theme.text.tertiary} />
                </Pressable>
                {cycleWorkouts.length > 1 && (
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => removePlanDrivenDay(visualIndex)}
                  >
                    <IconSymbol name="close" size={18} color={theme.accent.warning} />
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        {/* Add Day Button */}
        <Pressable
          style={[styles.addDayButton, { backgroundColor: theme.surface.elevated }]}
          onPress={addPlanDrivenDay}
          disabled={cycleWorkouts.length >= MAX_ROTATING_CYCLE_DAYS}
        >
          <IconSymbol name="add" size={24} color={theme.accent.warning} />
        </Pressable>

        {/* Save Button */}
        {allPlans.length > 0 && (
          <View style={styles.saveButtonWrapper}>
            <Button
              label="Save Schedule"
              variant="primary"
              size="lg"
              onPress={handleSave}
            />
          </View>
        )}
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

  const renderWorkoutPicker = () => (
    <Modal
      visible={pickerVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setPickerVisible(false)}
    >
      <View style={[styles.pickerOverlay, { backgroundColor: colors.overlay.scrim }]}>
        <View style={[styles.pickerPopup, { backgroundColor: theme.surface.card }]}>
          <View style={styles.pickerHeader}>
            <Text variant="heading3" color="primary">
              Select Workout
            </Text>
            <Pressable onPress={() => setPickerVisible(false)}>
              <IconSymbol name="close" size={24} color={theme.text.primary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.pickerScroll}
            contentContainerStyle={styles.pickerScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {allWorkouts.map((item) => (
              <Pressable
                key={item.id || 'rest'}
                style={[styles.pickerItem, { borderBottomColor: theme.border.light }]}
                onPress={() => handleWorkoutSelect(item.id)}
              >
                <View style={styles.pickerItemContent}>
                  <Text variant="bodySemibold" color={item.isRest ? 'tertiary' : 'primary'}>
                    {item.name}
                  </Text>
                  {item.source && !item.isRest && (
                    <Text variant="caption" color="secondary">
                      {item.source}
                    </Text>
                  )}
                </View>
                              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const getTitle = () => {
    if (step === 'type-select') return 'Create Schedule';
    switch (selectedType) {
      case 'weekly': return 'Weekly Schedule';
      case 'rotating': return 'Rotating Cycle';
      case 'plan-driven': return 'Plan-Driven';
      default: return 'Create Schedule';
    }
  };

  const getSubtitle = () => {
    if (step === 'type-select') return 'Choose how you want to organize your training';
    switch (selectedType) {
      case 'weekly': return 'Assign workouts to specific days of the week';
      case 'rotating': return 'Create a cycle that repeats regardless of the day';
      case 'plan-driven': return 'Follow a saved plan in order';
      default: return '';
    }
  };

  const renderDatePicker = () => {
    if (!datePickerVisible) return null;

    // Generate calendar days
    const year = datePickerViewDate.getFullYear();
    const month = datePickerViewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const calendarDays = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push(i);
    }

    const handleDateSelect = (day: number) => {
      const newDate = new Date(year, month, day);
      setPendingStartDate(newDate);
    };

    const handleSaveStartDate = () => {
      void Haptics.selectionAsync();
      setStartDate(pendingStartDate);
      setDatePickerVisible(false);
    };

    const handleMonthChange = (direction: 'prev' | 'next') => {
      const newDate = new Date(datePickerViewDate);
      if (direction === 'prev') {
        newDate.setMonth(month - 1);
      } else {
        newDate.setMonth(month + 1);
      }
      setDatePickerViewDate(newDate);
    };

    return (
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <Pressable 
          style={[styles.pickerOverlay, { backgroundColor: colors.overlay.scrim }]} 
          onPress={() => setDatePickerVisible(false)}
        >
          <View style={[styles.datePickerPopup, { backgroundColor: theme.surface.card }]}>
            <View style={styles.pickerHeader}>
              <Text variant="heading3" color="primary">
                Select Start Date
              </Text>
              <Pressable onPress={() => setDatePickerVisible(false)}>
                <IconSymbol name="close" size={24} color={theme.text.primary} />
              </Pressable>
            </View>

            <View style={styles.content}>
              {/* Month navigation */}
              <View style={styles.monthNavigation}>
                <Pressable onPress={() => handleMonthChange('prev')} style={styles.monthNavButton}>
                  <IconSymbol name="chevron-left" size={20} color={theme.text.primary} />
                </Pressable>
                <Text variant="bodySemibold" color="primary">
                  {datePickerViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
                <Pressable onPress={() => handleMonthChange('next')} style={styles.monthNavButton}>
                  <IconSymbol name="chevron-right" size={20} color={theme.text.primary} />
                </Pressable>
              </View>

              {/* Weekday headers */}
              <View style={styles.weekdayHeaders}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <View key={day} style={styles.weekdayHeaderCell}>
                    <Text variant="caption" color="primary" style={styles.weekdayHeaderText}>
                      {day}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Calendar grid */}
              <View style={styles.calendarGrid}>
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <View key={`empty-${index}`} style={styles.calendarDay} />;
                  }
                  
                  const isSelected =
                    pendingStartDate.getFullYear() === year &&
                    pendingStartDate.getMonth() === month &&
                    pendingStartDate.getDate() === day;
                  const isToday = new Date().getDate() === day && 
                                 new Date().getMonth() === month && 
                                 new Date().getFullYear() === year;

                  return (
                    <Pressable
                      key={day}
                      style={[
                        styles.calendarDay,
                        isSelected && { backgroundColor: theme.accent.orange },
                        isToday && !isSelected && { backgroundColor: theme.surface.elevated },
                      ]}
                      onPress={() => handleDateSelect(day)}
                    >
                      <Text
                        variant="body"
                        color={isSelected ? 'onAccent' : 'primary'}
                        style={isToday && !isSelected ? { fontWeight: 'bold' } : {}}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.datePickerActions}>
                <Button
                  label="Save"
                  variant="primary"
                  size="md"
                  onPress={handleSaveStartDate}
                />
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>
    );
  };

  return (
    <TabSwipeContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text variant="heading2" color="primary">
              {getTitle()}
            </Text>
            <Text variant="body" color="secondary">
              {getSubtitle()}
            </Text>
          </View>
          <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
            <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
        </View>
        
        <ScrollView
          ref={editorScrollRef}
          style={styles.editorScroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {step === 'type-select' ? renderTypeSelection() : renderConfigureStep()}
        </ScrollView>
      </View>

      {renderWorkoutPicker()}
      {renderDatePicker()}
    </TabSwipeContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
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
  editorScroll: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  sectionTitle: {
    textAlign: 'center',
  },
  sectionSubtitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  typeList: {
    gap: spacing.md,
  },
  typeCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.cardSoft,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeCardContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  clearButtonWrapper: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  daysList: {
    gap: spacing.sm,
  },
  dayRow: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.cardSoft,
  },
  dayLabel: {
    width: 100,
  },
  dayValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  cycleRow: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.cardSoft,
  },
  cycleDayNum: {
    width: 80,
  },
  cycleWorkoutPicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    minHeight: 44,
  },
  cycleWorkoutText: {
    flex: 1,
    textAlign: 'right',
    textAlignVertical: 'center',
  },
  removeButton: {
    padding: spacing.sm,
  },
  reorderButtonsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  reorderButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  reorderButtonDisabled: {
    opacity: 0.5,
  },
  addDayWrapper: {
    alignItems: 'center',
  },
  saveButtonWrapper: {
    marginTop: spacing.lg,
  },
  planList: {
    gap: spacing.md,
  },
  planScrollView: {
    flexGrow: 0,
  },
  planChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    marginRight: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  planCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.cardSoft,
  },
  emptyText: {
    textAlign: 'center',
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerPopup: {
    borderRadius: radius.xl,
    width: '90%',
    maxHeight: '80%',
    marginHorizontal: spacing.md,
    minHeight: 280,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  pickerScroll: {
    maxHeight: 420,
  },
  pickerScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerItemContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  debugSection: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  iconItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  iconSectionTitle: {
    marginTop: spacing.lg,
  },
  // Date picker styles
  datePickerPopup: {
    borderRadius: radius.xl,
    width: '90%',
    maxHeight: '80%',
    marginHorizontal: spacing.md,
    minHeight: 280,
    overflow: 'hidden',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: spacing.lg,
    padding: spacing.xs,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  monthNavButton: {
    padding: spacing.sm,
    borderRadius: radius.full,
  },
  weekdayHeaders: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: 0,
    paddingBottom: spacing.xxs,
  },
  weekdayHeaderCell: {
    flex: 1,
  },
  weekdayHeaderText: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 12,
    paddingTop: 0,
    paddingBottom: 0,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingTop: 0,
    paddingBottom: spacing.sm,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    marginHorizontal: 0,
    marginVertical: 1,
  },
  datePickerActions: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  // Add day card styles
  addDayCard: {
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.accent.warning + '40',
  },
  addDayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addDayText: {
    color: colors.accent.warning,
  },
  addDayButton: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent.warning + '40',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.md,
    ...shadows.cardSoft,
  },
  // Swipe indicator styles
  swipeIndicator: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  swipeBar: {
    width: 36,
    height: 4,
    backgroundColor: colors.border.light,
    borderRadius: radius.full,
  },
});

export default ScheduleSetupScreen;
