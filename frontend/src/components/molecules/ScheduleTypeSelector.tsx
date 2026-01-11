/**
 * ScheduleTypeSelector
 * Toggle between Weekly and Rotation schedule types.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing } from '@/constants/theme';
import type { ScheduleType } from '@/types/premadePlan';

interface ScheduleTypeSelectorProps {
  value: ScheduleType;
  onChange: (type: ScheduleType) => void;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border.light,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.surface.tint,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerSelected: {
    backgroundColor: colors.accent.primary,
  },
  textContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  optionTitle: {
    textAlign: 'center',
  },
  optionSubtitle: {
    textAlign: 'center',
  },
});

export const ScheduleTypeSelector: React.FC<ScheduleTypeSelectorProps> = ({ 
  value, 
  onChange 
}) => {
  const handlePress = (type: ScheduleType) => {
    if (type !== value) {
      triggerHaptic('selection');
      onChange(type);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.option, value === 'weekly' && styles.optionSelected]}
        onPress={() => handlePress('weekly')}
        accessibilityRole="radio"
        accessibilityState={{ selected: value === 'weekly' }}
      >
        <View style={[styles.iconContainer, value === 'weekly' && styles.iconContainerSelected]}>
          <IconSymbol 
            name="calendar-today" 
            size={20} 
            color={value === 'weekly' ? colors.text.onAccent : colors.text.secondary} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text 
            variant="bodySemibold" 
            color={value === 'weekly' ? 'primary' : 'secondary'}
            style={styles.optionTitle}
          >
            Weekly
          </Text>
          <Text variant="caption" color="tertiary" style={styles.optionSubtitle}>
            Same days each week
          </Text>
        </View>
      </Pressable>

      <Pressable
        style={[styles.option, value === 'rotation' && styles.optionSelected]}
        onPress={() => handlePress('rotation')}
        accessibilityRole="radio"
        accessibilityState={{ selected: value === 'rotation' }}
      >
        <View style={[styles.iconContainer, value === 'rotation' && styles.iconContainerSelected]}>
          <IconSymbol 
            name="sync" 
            size={20} 
            color={value === 'rotation' ? colors.text.onAccent : colors.text.secondary} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text 
            variant="bodySemibold" 
            color={value === 'rotation' ? 'primary' : 'secondary'}
            style={styles.optionTitle}
          >
            Rotation
          </Text>
          <Text variant="caption" color="tertiary" style={styles.optionSubtitle}>
            Cycle through workouts
          </Text>
        </View>
      </Pressable>
    </View>
  );
};
