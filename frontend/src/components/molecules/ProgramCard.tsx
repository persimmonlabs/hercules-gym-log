import React from 'react';
import { StyleSheet, View, Pressable, ViewStyle } from 'react-native';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { Badge } from '@/components/atoms';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing } from '@/constants/theme';
import type { PremadeProgram, UserProgram, PremadeWorkout } from '@/types/premadePlan';

interface ProgramCardProps {
  program: PremadeProgram | UserProgram | PremadeWorkout;
  onPress: (program: PremadeProgram | UserProgram | PremadeWorkout) => void;
  style?: ViewStyle;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  pressable: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.light,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});

export const ProgramCard: React.FC<ProgramCardProps> = ({ program, onPress, style }) => {
  const { name, metadata } = program;
  const isWorkout = 'durationMinutes' in metadata;
  // Workouts don't have a 'workouts' array of their own, they contain exercises directly
  const itemCount = 'workouts' in program ? program.workouts.length : program.exercises.length;
  const itemLabel = 'workouts' in program ? 'workouts' : 'exercises';

  return (
    <SurfaceCard tone="neutral" padding="lg" style={[styles.container, style]} showAccentStripe={false}>
      <Pressable 
        onPress={() => onPress(program)}
        style={({ pressed }) => [styles.pressable, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={styles.header}>
          <Text variant="bodySemibold" color="primary">{name}</Text>
          <Text variant="caption" color="secondary" numberOfLines={2}>{metadata.description}</Text>
        </View>

        <View style={styles.tags}>
          <Badge label={metadata.goal.replace('-', ' ')} variant="accent" size="sm" />
          <Badge label={metadata.experienceLevel} variant="neutral" size="sm" />
          <Badge label={metadata.equipment.replace('-', ' ')} variant="outline" size="sm" />
        </View>

        <View style={styles.footer}>
          <View style={styles.stat}>
            <IconSymbol 
              name={isWorkout ? "timer" : "calendar-today"} 
              size={14} 
              color={colors.text.secondary} 
            />
            <Text variant="caption" color="secondary">
              {isWorkout 
                ? `${(metadata as any).durationMinutes} min` 
                : `${(metadata as any).daysPerWeek} days/week`
              }
            </Text>
          </View>
          <View style={styles.stat}>
            <IconSymbol name="fitness-center" size={14} color={colors.text.secondary} />
            <Text variant="caption" color="secondary">{itemCount} {itemLabel}</Text>
          </View>
        </View>
      </Pressable>
    </SurfaceCard>
  );
};
