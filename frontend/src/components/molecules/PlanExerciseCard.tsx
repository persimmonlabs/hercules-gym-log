import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { colors, radius, spacing } from '@/constants/theme';
import type { Exercise } from '@/constants/exercises';
import hierarchyData from '@/data/hierarchy.json';

interface PlanExerciseCardProps {
  exercise: Exercise;
  onAdd: (exercise: Exercise) => void;
}

export const PlanExerciseCard: React.FC<PlanExerciseCardProps> = ({ exercise, onAdd }) => {
  // Build muscle to mid-level group mapping
  const muscleToMidLevelMap = useMemo(() => {
    const map: Record<string, string> = {};
    const hierarchy = hierarchyData.muscle_hierarchy;

    Object.entries(hierarchy).forEach(([l1, l1Data]) => {
      if (l1Data.muscles) {
        Object.entries(l1Data.muscles).forEach(([midLevel, midLevelData]) => {
          // Map the mid-level group to itself
          map[midLevel] = midLevel;
          
          // Map all low-level muscles to their mid-level parent
          if (midLevelData.muscles) {
            Object.keys(midLevelData.muscles).forEach(lowLevel => {
              map[lowLevel] = midLevel;
            });
          }
        });
      }
    });
    return map;
  }, []);

  const midLevelMusclesLabel = useMemo(() => {
    // Get all muscle names from the exercise's muscles object
    const muscleNames = Object.keys(exercise.muscles || {});
    
    // Map each muscle to its mid-level parent group
    const midLevelGroups = muscleNames.map(muscle => muscleToMidLevelMap[muscle]).filter(Boolean);
    
    // Remove duplicates and sort for consistency
    const uniqueGroups = [...new Set(midLevelGroups)];
    
    return uniqueGroups.length > 0 ? uniqueGroups.join(' · ') : 'General';
  }, [exercise.muscles, muscleToMidLevelMap]);

  return (
    <SurfaceCard tone="neutral" padding="lg" showAccentStripe={false} style={styles.card}>
      <View style={styles.content}>
        <View style={styles.meta}>
          <Text variant="bodySemibold" color="primary">
            {exercise.name}
          </Text>
          <Text variant="caption" color="secondary">
            {midLevelMusclesLabel}
          </Text>
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
  },
});
