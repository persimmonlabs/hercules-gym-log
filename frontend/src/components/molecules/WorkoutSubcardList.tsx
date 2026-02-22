import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing, shadows, sizing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface Workout {
  id: string;
  name: string;
  exercises: any[];
  type?: 'custom' | 'program';
  programNames?: string[];
  programIds?: string[];
  programId?: string;
  uniqueId?: string;
  subtitle?: string;
}

interface WorkoutSubcardListProps {
  workouts: Workout[];
  onWorkoutPress: (workout: Workout) => void;
  onAddWorkoutPress: () => void;
  onCreateWorkoutPress: () => void;
  selectedWorkoutId: string | null;
  onStartWorkout?: (workout: Workout) => void;
  onEditWorkout?: (workout: Workout) => void;
  onDeleteWorkout?: (workout: Workout) => void;
  onCloseExpanded?: () => void;
  maxVisible?: number;
  showAll?: boolean;
  onToggleShowAll?: () => void;
}

const WorkoutSubcardList: React.FC<WorkoutSubcardListProps> = ({
  workouts,
  onWorkoutPress,
  onAddWorkoutPress,
  onCreateWorkoutPress,
  selectedWorkoutId,
  onStartWorkout,
  onEditWorkout,
  onDeleteWorkout,
  onCloseExpanded,
  maxVisible = 3,
  showAll = false,
  onToggleShowAll,
}) => {
  const { theme } = useTheme();
  const displayWorkouts = showAll ? workouts : workouts.slice(0, maxVisible);
  const hasMore = workouts.length > maxVisible;

  const handleWorkoutPress = useCallback((workout: Workout) => {
    triggerHaptic('selection');
    onWorkoutPress(workout);
  }, [onWorkoutPress]);

  return (
    <View style={styles.container}>
      {/* Card Header with Expand/Collapse Button */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text variant="heading3" color="primary">
            My Workouts
          </Text>
        </View>
        {hasMore && onToggleShowAll && (
          <Pressable
            style={styles.expandCollapseButton}
            onPress={() => {
              triggerHaptic('selection');
              onToggleShowAll();
            }}
          >
            <Text variant="caption" color="primary" style={styles.expandCollapseText}>
              {showAll ? 'Collapse' : 'Expand'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Empty State */}
      {workouts.length === 0 && (
        <SurfaceCard
          tone="neutral"
          padding="md"
          showAccentStripe={false}
          style={[styles.emptyCard, { borderColor: theme.border.light }]}
        >
          <View style={styles.emptyContent}>
            <Text variant="bodySemibold" color="primary" style={styles.emptyTitle}>
              No workouts yet
            </Text>
            <Text variant="body" color="secondary" style={styles.emptySubtext}>
              Add a workout to see it here.
            </Text>
          </View>
        </SurfaceCard>
      )}

      {/* Workout List */}
      {displayWorkouts.map((workout) => {
        const workoutSelectionKey = workout.uniqueId || workout.id;
        const isExpanded = selectedWorkoutId === workoutSelectionKey;

        return (
          <Pressable
            key={workoutSelectionKey}
            style={styles.pressableStretch}
            onPress={() => handleWorkoutPress(workout)}
          >
            <SurfaceCard
              tone="neutral"
              padding="md"
              showAccentStripe={false}
              style={[styles.inlineCard, { borderColor: theme.border.light }, isExpanded && styles.expandedCard]}
            >
            {isExpanded ? (
              <View style={styles.expandedActionsContainer}>
                {onStartWorkout && (
                  <Pressable
                    style={styles.largeActionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      triggerHaptic('selection');
                      onStartWorkout(workout);
                    }}
                  >
                    <View style={[styles.iconCircle, { borderColor: theme.accent.orange }]}>
                      <IconSymbol name="play-arrow" size={sizing.iconMD} color={colors.accent.orange} />
                    </View>
                    <Text variant="caption" color="primary">Start</Text>
                  </Pressable>
                )}
                {onEditWorkout && (
                  <Pressable
                    style={styles.largeActionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      triggerHaptic('selection');
                      onEditWorkout(workout);
                    }}
                  >
                    <View style={[styles.iconCircle, { borderColor: theme.accent.orange }]}>
                      <IconSymbol name="edit" size={sizing.iconMD} color={colors.accent.orange} />
                    </View>
                    <Text variant="caption" color="primary">Edit</Text>
                  </Pressable>
                )}
                {onDeleteWorkout && (
                  <Pressable
                    style={styles.largeActionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      triggerHaptic('selection');
                      onDeleteWorkout(workout);
                    }}
                  >
                    <View style={[styles.iconCircle, { borderColor: theme.accent.orange }]}>
                      <IconSymbol name="delete" size={sizing.iconMD} color={colors.accent.orange} />
                    </View>
                    <Text variant="caption" color="primary">Delete</Text>
                  </Pressable>
                )}
                {onCloseExpanded && (
                  <Pressable
                    style={styles.largeActionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      triggerHaptic('selection');
                      onCloseExpanded();
                    }}
                  >
                    <View style={[styles.iconCircle, { borderColor: theme.accent.orange }]}>
                      <IconSymbol name="close" size={sizing.iconMD} color={colors.accent.orange} />
                    </View>
                    <Text variant="caption" color="primary">Close</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <>
                <View style={styles.recentCardHeader}>
                  <Text variant="bodySemibold" color="primary">
                    {workout.name}
                  </Text>
                </View>
                <View style={styles.exerciseInfoRow}>
                  {workout.programNames && workout.programNames.length > 0 && (
                    <>
                      <Text
                        variant="body"
                        color="secondary"
                        style={styles.planName}
                        numberOfLines={1}
                      >
                        {workout.programNames.join(', ')}
                      </Text>
                      <Text variant="body" color="secondary" style={styles.dotSeparator}>•</Text>
                    </>
                  )}
                  <Text variant="body" color="secondary" style={styles.exerciseCount}>
                    {workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}
                  </Text>
                </View>
              </>
            )}
          </SurfaceCard>
        </Pressable>
      );
      })}

      {/* Buttons Row */}
      <View style={styles.buttonsContainer}>
        {/* Add Workout Button */}
        <Button
          label="Add Workout"
          variant="primary"
          size="md"
          style={styles.wideButton}
          onPress={() => {
            triggerHaptic('selection');
            onAddWorkoutPress();
          }}
        />

        {/* Create Workout Button */}
        <Button
          label="Create Workout"
          variant="secondary"
          size="md"
          textColor={theme.accent.orange}
          style={[styles.wideButton, { ...shadows.sm }]}
          onPress={() => {
            triggerHaptic('selection');
            onCreateWorkoutPress();
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.md,
  },
  recentWorkoutsList: {
    gap: spacing.md,
  },
  recentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  inlineCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    paddingLeft: spacing.lg,
  },
  expandedCard: {
    paddingHorizontal: spacing.lg,
  },
  pressableStretch: {
    width: '100%',
  },
  expandedActionsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    columnGap: spacing.sm,
  },
  largeActionButton: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    flexShrink: 0,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  exerciseInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  planName: {
    marginRight: spacing.xs,
  },
  dotSeparator: {
    marginHorizontal: spacing.xs,
  },
  exerciseCount: {
    flexShrink: 0,
  },
  wideButton: {
    alignSelf: 'center',
    width: '100%',
  },
  emptyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  expandCollapseButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  expandCollapseText: {
    fontWeight: '400',
  },
  buttonsContainer: {
    gap: spacing.sm,
  },
});

export default WorkoutSubcardList;
