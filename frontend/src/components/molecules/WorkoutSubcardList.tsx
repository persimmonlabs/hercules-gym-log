import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing, shadows, sizing } from '@/constants/theme';

interface Workout {
  uniqueId: string;
  name: string;
  exercises: any[];
  subtitle?: string;
  programNames?: string[];
}

interface WorkoutSubcardListProps {
  workouts: Workout[];
  onWorkoutPress: (workout: Workout) => void;
  onAddWorkoutPress: () => void;
  onCreateWorkoutPress: () => void;
  selectedWorkoutId?: string | null;
  onStartWorkout?: (workout: Workout) => void;
  onEditWorkout?: (workout: Workout) => void;
  onDeleteWorkout?: (workout: Workout) => void;
  onCloseExpanded?: () => void;
}

export const WorkoutSubcardList: React.FC<WorkoutSubcardListProps> = ({
  workouts,
  onWorkoutPress,
  onAddWorkoutPress,
  onCreateWorkoutPress,
  selectedWorkoutId,
  onStartWorkout,
  onEditWorkout,
  onDeleteWorkout,
  onCloseExpanded,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.recentWorkoutsList}>
        {workouts.length === 0 ? (
          <SurfaceCard
            tone="neutral"
            padding="md"
            showAccentStripe={false}
            style={styles.emptyCard}
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
        ) : (
          workouts.map((workout) => {
            const isSelected = selectedWorkoutId === workout.uniqueId;
            return (
              <Pressable
                key={workout.uniqueId}
                style={styles.pressableStretch}
                onPress={() => {
                  triggerHaptic('selection');
                  onWorkoutPress(workout);
                }}
              >
                <SurfaceCard
                  tone="neutral"
                  padding="md"
                  showAccentStripe={false}
                  style={styles.inlineCard}
                >
                  {!isSelected ? (
                    <>
                      <View style={styles.recentCardHeader}>
                        <Text variant="bodySemibold" color="primary">
                          {workout.name}
                        </Text>
                      </View>
                      <View style={styles.exerciseInfoRow}>
                        {workout.programNames && workout.programNames.length > 0 && (
                          <>
                            <Text variant="body" color="secondary" style={styles.planName}>
                              {workout.programNames[0]}
                            </Text>
                            <Text variant="body" color="secondary" style={styles.dotSeparator}>
                              •
                            </Text>
                          </>
                        )}
                        <Text variant="body" color="secondary" style={styles.exerciseCount}>
                          {workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}
                        </Text>
                      </View>
                    </>
                  ) : (
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
                          <IconSymbol name="play-arrow" size={sizing.iconMD} color={colors.accent.primary} />
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
                          <IconSymbol name="edit" size={sizing.iconMD} color={colors.accent.primary} />
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
                          <IconSymbol name="delete" size={sizing.iconMD} color={colors.accent.warning} />
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
                          <IconSymbol name="close" size={sizing.iconMD} color={colors.text.secondary} />
                          <Text variant="caption" color="primary">Close</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </SurfaceCard>
              </Pressable>
            );
          })
        )}
      </View>

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
          textColor={colors.accent.orange}
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
  pressableStretch: {
    width: '100%',
  },
  expandedActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  expandedActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  largeActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    minWidth: 60,
    flex: 1,
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
  buttonsContainer: {
    gap: spacing.sm,
  },
  wideButton: {
    alignSelf: 'center',
    width: '103%',
  },
});
