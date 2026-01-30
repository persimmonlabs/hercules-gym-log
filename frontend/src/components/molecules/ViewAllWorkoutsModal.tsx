import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '@/utils/haptics';
import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing, shadows, sizing } from '@/constants/theme';
import { SheetModal } from '@/components/molecules/SheetModal';

interface Workout {
  uniqueId: string;
  name: string;
  exercises: any[];
  subtitle?: string;
  programNames?: string[];
}

interface ViewAllWorkoutsModalProps {
  visible: boolean;
  workouts: Workout[];
  onClose: () => void;
  onWorkoutPress: (workout: Workout) => void;
  onStartWorkout?: (workout: Workout) => void;
  onEditWorkout?: (workout: Workout) => void;
  onDeleteWorkout?: (workout: Workout) => void;
  onAddWorkout?: () => void;
}

export const ViewAllWorkoutsModal: React.FC<ViewAllWorkoutsModalProps> = ({
  visible,
  workouts,
  onClose,
  onWorkoutPress,
  onStartWorkout,
  onEditWorkout,
  onDeleteWorkout,
  onAddWorkout,
}) => {
  const insets = useSafeAreaInsets();
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  const handleWorkoutPress = useCallback((workout: Workout) => {
    triggerHaptic('selection');
    if (expandedWorkoutId === workout.uniqueId) {
      setExpandedWorkoutId(null);
    } else {
      setExpandedWorkoutId(workout.uniqueId);
    }
  }, [expandedWorkoutId]);

  const handleAction = useCallback((workout: Workout, action: () => void) => {
    action();
    setExpandedWorkoutId(null);
    onClose();
  }, [onClose]);

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title="My Workouts"
      headerContent={
        <Text variant="body" color="secondary">
          {workouts.length} {workouts.length === 1 ? 'workout' : 'workouts'}
        </Text>
      }
      height="85%"
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.sm + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        <View style={styles.list}>
          {workouts.map((workout) => {
            const isExpanded = expandedWorkoutId === workout.uniqueId;
            return (
              <Animated.View key={workout.uniqueId} style={styles.listCard}>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => handleWorkoutPress(workout)}
                >
                  <View style={styles.listCardBackground}>
                    {!isExpanded ? (
                      <Animated.View
                        key="normal"
                        entering={FadeIn.duration(250)}
                        exiting={FadeOut.duration(150)}
                        style={styles.listCardContent}
                      >
                        <View style={styles.listCardInfo}>
                          <Text variant="bodySemibold" color="primary" numberOfLines={1}>
                            {workout.name}
                          </Text>
                          {workout.programNames && workout.programNames.length > 0 ? (
                            <View style={styles.metaStack}>
                              <Text variant="caption" color="secondary" style={styles.programName} numberOfLines={1}>
                                {workout.programNames[0]}
                              </Text>
                              <Text variant="caption" color="secondary" style={styles.metaText}>
                                {workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}
                              </Text>
                            </View>
                          ) : (
                            <Text variant="caption" color="secondary">
                              {workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}
                            </Text>
                          )}
                        </View>
                        <IconSymbol name="chevron-right" size={sizing.iconMD} color={colors.text.primary} />
                      </Animated.View>
                    ) : (
                      <Animated.View
                        key="expanded"
                        entering={FadeIn.duration(250)}
                        exiting={FadeOut.duration(150)}
                        style={styles.expandedContent}
                      >
                        <View style={styles.actionButtons}>
                          {onStartWorkout && (
                            <Pressable
                              style={styles.actionButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                triggerHaptic('selection');
                                handleAction(workout, () => onStartWorkout(workout));
                              }}
                            >
                              <IconSymbol name="play-arrow" size={sizing.iconMD} color={colors.text.primary} />
                              <Text variant="caption" color="primary">Start</Text>
                            </Pressable>
                          )}
                          {onEditWorkout && (
                            <Pressable
                              style={styles.actionButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                triggerHaptic('selection');
                                handleAction(workout, () => onEditWorkout(workout));
                              }}
                            >
                              <IconSymbol name="edit" size={sizing.iconMD} color={colors.text.primary} />
                              <Text variant="caption" color="primary">Edit</Text>
                            </Pressable>
                          )}
                          {onDeleteWorkout && (
                            <Pressable
                              style={styles.actionButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                triggerHaptic('selection');
                                handleAction(workout, () => onDeleteWorkout(workout));
                              }}
                            >
                              <IconSymbol name="delete" size={sizing.iconMD} color={colors.text.primary} />
                              <Text variant="caption" color="primary">Delete</Text>
                            </Pressable>
                          )}
                          <Pressable
                            style={styles.actionButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              triggerHaptic('selection');
                              setExpandedWorkoutId(null);
                            }}
                          >
                            <IconSymbol name="close" size={sizing.iconMD} color={colors.text.primary} />
                            <Text variant="caption" color="primary">Close</Text>
                          </Pressable>
                        </View>
                      </Animated.View>
                    )}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}

          {/* Add Workout Card */}
          {onAddWorkout && (
            <Pressable
              style={[styles.listCard, styles.addCard]}
              onPress={() => {
                triggerHaptic('selection');
                onAddWorkout();
                onClose();
              }}
            >
              <View style={styles.addCardInner}>
                <View style={styles.addIconWrapper}>
                  <IconSymbol name="add" size={sizing.iconLG} color={colors.accent.orange} />
                </View>
                <Text variant="body" color="primary" style={styles.addText}>
                  Add Workout
                </Text>
              </View>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SheetModal>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  listCard: {
    height: 80,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  listCardBackground: {
    flex: 1,
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  listCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  listCardInfo: {
    flex: 1,
    gap: spacing.xxs,
    marginRight: spacing.sm,
  },
  metaStack: {
    gap: 2,
  },
  programName: {
    opacity: 0.85,
    fontWeight: '600',
  },
  metaText: {
    opacity: 0.85,
  },
  expandedContent: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  actionButton: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  addCard: {
    backgroundColor: colors.surface.card,
    borderWidth: 2,
    borderColor: colors.accent.orange,
    borderStyle: 'dashed',
  },
  addCardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    flexDirection: 'row',
  },
  addIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent.orange,
  },
  addText: {
    textAlign: 'center',
  },
});
