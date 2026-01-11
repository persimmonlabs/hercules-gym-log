import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { colors, radius, spacing } from '@/constants/theme';
import type { Exercise } from '@/constants/exercises';
import { getExerciseDisplayTagText } from '@/utils/exerciseDisplayTags';

interface PlanExerciseCardProps {
  exercise: Exercise;
  onAdd: (exercise: Exercise) => void;
}

export const PlanExerciseCard: React.FC<PlanExerciseCardProps> = ({ exercise, onAdd }) => {
  const tagText = useMemo(() => {
    return getExerciseDisplayTagText({
      muscles: exercise.muscles,
      exerciseType: exercise.exerciseType,
    });
  }, [exercise.exerciseType, exercise.muscles]);

  return (
    <SurfaceCard tone="neutral" padding="lg" showAccentStripe={false} style={styles.card}>
      <View style={styles.content}>
        <View style={styles.meta}>
          <Text variant="bodySemibold" color="primary">
            {exercise.name}
          </Text>
          {tagText ? (
            <Text variant="caption" color="secondary">
              {tagText}
            </Text>
          ) : null}
        </View>
        <Button label="Add" size="sm" variant="secondary" onPress={() => onAdd(exercise)} />
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent.orangeLight,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  meta: {
    flex: 1,
    gap: spacing.xs,
    flexShrink: 1,
  },
});
