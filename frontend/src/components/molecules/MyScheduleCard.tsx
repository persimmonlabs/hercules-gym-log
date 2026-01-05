/**
 * MyScheduleCard
 * Displays the active schedule summary with edit and override buttons.
 * Shows full weekly or rotating schedule at a glance.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { useActiveScheduleStore } from '@/store/activeScheduleStore';
import { useProgramsStore } from '@/store/programsStore';
import { usePlansStore } from '@/store/plansStore';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius, colors, shadows } from '@/constants/theme';
import type { WeekdayKey } from '@/types/activeSchedule';

interface MyScheduleCardProps {
  onEditPress: () => void;
  onAddOverridePress: () => void;
  onDeletePress: () => void;
}

const WEEKDAYS: { key: WeekdayKey; label: string }[] = [
  { key: 'sunday', label: 'Sunday' },
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
];

export const MyScheduleCard: React.FC<MyScheduleCardProps> = ({
  onEditPress,
  onAddOverridePress,
  onDeletePress,
}) => {
  const { theme } = useTheme();
  const activeRule = useActiveScheduleStore((state) => state.state.activeRule);
  const overrides = useActiveScheduleStore((state) => state.state.overrides);

  const userPrograms = useProgramsStore((state) => state.userPrograms);
  const plans = usePlansStore((state) => state.plans);

  const getWorkoutName = (workoutId: string | null | undefined): string => {
    if (workoutId == null) return 'Rest';

    for (const program of userPrograms) {
      const workout = program.workouts.find((w) => w.id === workoutId);
      if (workout) return workout.name;
    }

    const plan = plans.find((p) => p.id === workoutId);
    if (plan) return plan.name;

    return 'Rest';
  };

  const renderPlanDrivenSchedule = () => {
    if (activeRule?.type !== 'plan-driven') return null;

    // If plan-driven is active but the user has no saved plans (or the plan was deleted),
    // treat it like no schedule configured.
    if (userPrograms.length === 0 || !userPrograms.some((p) => p.id === activeRule.planId)) {
      return renderEmptyState();
    }

    const cycleWorkouts = activeRule.cycleWorkouts || [];
    if (cycleWorkouts.length === 0) {
      return (
        <View style={styles.emptyCard}>
          <Text variant="bodySemibold" color="primary">
            Plan-Driven Schedule
          </Text>
          <Text variant="body" color="secondary">
            No cycle days yet.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.scheduleList}>
        {cycleWorkouts.map((workoutId, visualIndex) => {
          const workoutName = getWorkoutName(workoutId);
          const isRest = workoutId === null || workoutId === undefined || workoutName === 'Rest';

          const today = new Date();
          const daysSinceStart = Math.floor((today.getTime() - activeRule.startDate) / (1000 * 60 * 60 * 24));
          const currentDayIndex = ((daysSinceStart % cycleWorkouts.length) + cycleWorkouts.length) % cycleWorkouts.length;
          const isCurrentDay = daysSinceStart >= 0 && visualIndex === currentDayIndex;

          return (
            <View
              key={visualIndex}
              style={[styles.scheduleRow, { backgroundColor: theme.surface.elevated }]}
            >
              <Text
                variant="bodySemibold"
                color={isCurrentDay ? 'orange' : 'primary'}
                style={styles.dayLabel}
              >
                Day {visualIndex + 1}
              </Text>
              <Text
                variant="body"
                color={isRest ? 'tertiary' : 'secondary'}
                numberOfLines={1}
                style={styles.workoutLabel}
              >
                {workoutName}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyCard}>
      <Text variant="bodySemibold" color="primary">
        No schedule yet
      </Text>
      <Text variant="body" color="secondary">
        Create a schedule to see it here.
      </Text>
    </View>
  );

  const renderWeeklySchedule = () => {
    if (activeRule?.type !== 'weekly') return null;

    return (
      <View style={styles.scheduleList}>
        {WEEKDAYS.map(({ key, label }) => {
          // Check for override first
          const today = new Date();
          const dayIndex = WEEKDAYS.findIndex(day => day.key === key);
          const targetDate = new Date(today);
          const currentDayIndex = today.getDay();
          const daysDiff = (dayIndex - currentDayIndex + 7) % 7;
          targetDate.setDate(today.getDate() + daysDiff);

          const dateKey = targetDate.toISOString().split('T')[0];
          const override = overrides.find((o: any) => o.date === dateKey);

          // Use override if exists, otherwise use base schedule
          const workoutId = override ? override.workoutId : activeRule.days[key];
          const workoutName = getWorkoutName(workoutId);
          const isRest = workoutId === null || workoutName === 'Rest';
          const hasOverride = !!override;
          const isCurrentDay = dayIndex === currentDayIndex;

          return (
            <View
              key={key}
              style={[styles.scheduleRow, { backgroundColor: theme.surface.elevated }]}
            >
              <Text variant="bodySemibold" color={isCurrentDay ? 'orange' : 'primary'} style={styles.dayLabel}>
                {label}
              </Text>
              <Text
                variant="body"
                color={isRest ? 'tertiary' : 'secondary'}
                numberOfLines={1}
                style={styles.workoutLabel}
              >
                {workoutName}{hasOverride ? '*' : ''}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderRotatingSchedule = () => {
    if (activeRule?.type !== 'rotating') return null;

    return (
      <View style={styles.scheduleList}>
        {activeRule.cycleWorkouts.map((workoutId, visualIndex) => {
          const workoutName = getWorkoutName(workoutId);
          const isRest = workoutId === null || workoutName === 'Rest';

          // Calculate if this is the current day in the rotating cycle
          const today = new Date();
          const daysSinceStart = Math.floor((today.getTime() - activeRule.startDate) / (1000 * 60 * 60 * 24));
          const currentDayIndex = daysSinceStart % activeRule.cycleWorkouts.length;
          const isCurrentDay = visualIndex === currentDayIndex;

          return (
            <View
              key={visualIndex}
              style={[styles.scheduleRow, { backgroundColor: theme.surface.elevated }]}
            >
              <Text
                variant="bodySemibold"
                color={isCurrentDay ? 'orange' : 'primary'}
                style={styles.dayLabel}
              >
                Day {visualIndex + 1}
              </Text>
              <Text
                variant="body"
                color={isRest ? 'tertiary' : 'secondary'}
                numberOfLines={1}
                style={styles.workoutLabel}
              >
                {workoutName}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderScheduleContent = () => {
    if (!activeRule) {
      return renderEmptyState();
    }

    switch (activeRule.type) {
      case 'weekly':
        return renderWeeklySchedule();
      case 'rotating':
        return renderRotatingSchedule();
      case 'plan-driven':
        return renderPlanDrivenSchedule();
      default:
        return renderEmptyState();
    }
  };

  return (
    <SurfaceCard padding="xl" tone="neutral" showAccentStripe={true} style={{ borderWidth: 0 }}>
      <View style={styles.content}>
        <View style={styles.cardHeader}>
          <Text variant="heading3" color="primary">
            My Schedule
          </Text>
        </View>

        {renderScheduleContent()}

        {activeRule ? (
          <View style={styles.buttonRow}>
            <View style={styles.buttonWrapper}>
              <Button
                label="Edit Schedule"
                variant="primary"
                size="md"
                onPress={onEditPress}
              />
            </View>
            <View style={styles.buttonWrapper}>
              <Button
                label="Add Override"
                variant="ghost"
                size="md"
                onPress={onAddOverridePress}
                textColor={colors.accent.warning}
              />
            </View>
          </View>
        ) : (
          <View style={styles.buttonRow}>
            <View style={styles.buttonWrapper}>
              <Button
                label="Create Schedule"
                variant="primary"
                size="md"
                onPress={onEditPress}
              />
            </View>
          </View>
        )}
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  cardHeader: {
    width: '100%',
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  emptyCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.card,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadows.cardSoft,
  },
  scheduleList: {
    gap: spacing.sm,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent.warning + '40',
  },
  dayLabel: {
    width: 100,
  },
  workoutLabel: {
    flex: 1,
    textAlign: 'right',
  },
  buttonRow: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  buttonWrapper: {
    // Remove flex: 1 to allow full width buttons
  },
});
