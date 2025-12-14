/**
 * NotificationConfigCard
 * Displays a single notification configuration with toggle and edit options.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing } from '@/constants/theme';
import { NotificationConfig, DayOfWeek } from '@/store/notificationStore';

interface NotificationConfigCardProps {
  config: NotificationConfig;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const DAY_ABBREVIATIONS: Record<DayOfWeek, string> = {
  sunday: 'Sun',
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
};

const formatTime = (hour: number, minute: number): string => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
};

const formatDays = (days: DayOfWeek[]): string => {
  if (days.length === 7) return 'Every day';
  if (days.length === 0) return 'No days selected';
  
  const weekdays: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const weekends: DayOfWeek[] = ['saturday', 'sunday'];
  
  const isWeekdays = weekdays.every((d) => days.includes(d)) && days.length === 5;
  const isWeekends = weekends.every((d) => days.includes(d)) && days.length === 2;
  
  if (isWeekdays) return 'Weekdays';
  if (isWeekends) return 'Weekends';
  
  return days.map((d) => DAY_ABBREVIATIONS[d]).join(', ');
};

export const NotificationConfigCard: React.FC<NotificationConfigCardProps> = ({
  config,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const handleToggle = () => {
    void Haptics.selectionAsync();
    onToggle();
  };

  const handleEdit = () => {
    void Haptics.selectionAsync();
    onEdit();
  };

  const handleDelete = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete();
  };

  return (
    <View style={[styles.container, !config.enabled && styles.containerDisabled]}>
      <Pressable style={styles.mainContent} onPress={handleEdit}>
        <View style={styles.timeContainer}>
          <Text variant="heading2" color={config.enabled ? 'primary' : 'tertiary'}>
            {formatTime(config.hour, config.minute)}
          </Text>
          <Text variant="caption" color={config.enabled ? 'secondary' : 'tertiary'}>
            {formatDays(config.days)}
          </Text>
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable style={styles.toggleButton} onPress={handleToggle}>
          <View style={[styles.toggle, config.enabled && styles.toggleEnabled]}>
            <View style={[styles.toggleKnob, config.enabled && styles.toggleKnobEnabled]} />
          </View>
        </Pressable>

        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <IconSymbol name="delete" size={20} color={colors.accent.red} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  containerDisabled: {
    opacity: 0.6,
  },
  mainContent: {
    flex: 1,
  },
  timeContainer: {
    gap: spacing.xxs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  toggleButton: {
    padding: spacing.xs,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.neutral.gray400,
    padding: 2,
    justifyContent: 'center',
  },
  toggleEnabled: {
    backgroundColor: colors.accent.orange,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.primary.bg,
  },
  toggleKnobEnabled: {
    alignSelf: 'flex-end',
  },
  deleteButton: {
    padding: spacing.xs,
  },
});
