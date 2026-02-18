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
              style={[styles.scheduleRow, { backgroundColor: theme.surface.elevated, borderColor: 'rgba(0, 0, 0, 0.06)' }]}
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
    <SurfaceCard
      tone="neutral"
      padding="md"
      showAccentStripe={false}
      style={styles.emptyCard}
    >
      <View style={styles.emptyContent}>
        <Text variant="bodySemibold" color="primary" style={styles.emptyTitle}>
          No schedule yet
        </Text>
        <Text variant="body" color="secondary" style={styles.emptySubtext}>
          Create a schedule to see it here.
        </Text>
      </View>
    </SurfaceCard>
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
              style={[styles.scheduleRow, { backgroundColor: theme.surface.elevated, borderColor: 'rgba(0, 0, 0, 0.06)' }]}
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
              style={[styles.scheduleRow, { backgroundColor: theme.surface.elevated, borderColor: 'rgba(0, 0, 0, 0.06)' }]}
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
    <View style={styles.innerContent}>
      <View style={styles.cardHeader}>
        <Text variant="heading3" color="primary">
          My Schedule
        </Text>
      </View>
      {renderScheduleContent()}

      {activeRule ? (
        <View style={styles.buttonRow}>
          <Button
            label="Edit Schedule"
            variant="primary"
            size="md"
            onPress={onEditPress}
            style={styles.primaryButton}
          />
          <Button
            label="Add Override"
            variant="secondary"
            size="md"
            textColor={colors.accent.orange}
            style={[styles.secondaryButton, { ...shadows.sm }]}
            onPress={onAddOverridePress}
          />
        </View>
      ) : (
        <Button
          label="Create Schedule"
          variant="primary"
          size="md"
          onPress={onEditPress}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  innerContent: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    paddingLeft: spacing.lg,
  },
  emptyContent: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  emptyTitle: {
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    textAlign: 'left',
  },
  scheduleList: {
    gap: spacing.md,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 0.75,
  },
  dayLabel: {
    minWidth: 90,
    fontSize: 16,
  },
  workoutLabel: {
    flex: 1,
    textAlign: 'right',
    fontSize: 16,
  },
  buttonRow: {
    gap: spacing.sm,
  },
  primaryButton: {
  },
  secondaryButton: {
  },
});
