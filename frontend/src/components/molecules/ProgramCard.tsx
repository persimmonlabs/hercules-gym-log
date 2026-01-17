import React from 'react';
import { StyleSheet, View, Pressable, ViewStyle, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { Badge } from '@/components/atoms';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing, shadows } from '@/constants/theme';
import type { PremadeProgram, UserProgram, PremadeWorkout } from '@/types/premadePlan';

interface ProgramCardProps {
  program: PremadeProgram | UserProgram | PremadeWorkout;
  onPress: (program: PremadeProgram | UserProgram | PremadeWorkout) => void;
  style?: ViewStyle;
  isLocked?: boolean;
  onUnlock?: () => void;
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
  lockedCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    minHeight: 180,
    gap: spacing.md,
  },
  lockBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surface.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedName: {
    textAlign: 'center',
  },
  lockedDescription: {
    textAlign: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.orange,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    gap: spacing.xs,
    ...shadows.sm,
  },
  ctaText: {
    color: colors.text.onAccent,
  },
});

export const ProgramCard: React.FC<ProgramCardProps> = ({ program, onPress, style, isLocked = false, onUnlock }) => {
  // Defensive checks for corrupted data
  if (!program || typeof program !== 'object') {
    return null;
  }
  
  const name = program.name || 'Untitled';
  const metadata = program.metadata || {};
  const isWorkout = metadata && 'durationMinutes' in metadata;
  // Workouts don't have a 'workouts' array of their own, they contain exercises directly
  const workoutsArray = 'workouts' in program && Array.isArray(program.workouts) ? program.workouts : [];
  const exercisesArray = 'exercises' in program && Array.isArray(program.exercises) ? program.exercises : [];
  const itemCount = workoutsArray.length > 0 ? workoutsArray.length : exercisesArray.length;
  const itemLabel = workoutsArray.length > 0 ? 'workouts' : 'exercises';

  // Show locked card for premium content
  if (isLocked) {
    return (
      <SurfaceCard tone="neutral" padding="lg" style={[styles.container, style]} showAccentStripe={true}>
        <View style={styles.lockedCard}>
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={20} color={colors.accent.orange} />
          </View>

          <Text variant="bodySemibold" color="primary" style={styles.lockedName}>
            {name}
          </Text>

          <Text variant="caption" color="secondary" style={styles.lockedDescription}>
            Unlock this {isWorkout ? 'workout' : 'program'} with Hercules Pro
          </Text>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={onUnlock}
            activeOpacity={0.8}
          >
            <Ionicons name="star" size={16} color={colors.text.onAccent} />
            <Text variant="labelMedium" style={styles.ctaText}>
              Unlock Premium
            </Text>
          </TouchableOpacity>
        </View>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard tone="neutral" padding="lg" style={[styles.container, style]} showAccentStripe={true}>
      <Pressable
        onPress={() => onPress(program)}
        style={({ pressed }) => [styles.pressable, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={styles.header}>
          <Text variant="bodySemibold" color="primary">{name}</Text>
          <Text variant="caption" color="secondary" numberOfLines={2}>{metadata.description}</Text>
        </View>

        <View style={styles.tags}>
          {metadata.goal && <Badge label={String(metadata.goal).replace('-', ' ')} variant="workout" size="sm" />}
          {metadata.experienceLevel && <Badge label={String(metadata.experienceLevel)} variant="workout" size="sm" />}
          {metadata.equipment && <Badge label={String(metadata.equipment).replace('-', ' ')} variant="workout" size="sm" />}
        </View>

        <View style={styles.footer}>
          <Text variant="caption" color="secondary">
            {itemCount} {itemLabel} • {isWorkout
              ? `${(metadata as any).durationMinutes || 0} min`
              : `${(metadata as any).daysPerWeek || 0} days/week`
            }
          </Text>
        </View>
      </Pressable>
    </SurfaceCard>
  );
};
