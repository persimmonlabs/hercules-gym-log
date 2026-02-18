import React, { useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { triggerHaptic } from '@/utils/haptics';
import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing, shadows, sizing } from '@/constants/theme';

interface Workout {
  uniqueId: string;
  name: string;
  exercises: any[];
  subtitle?: string;
  programNames?: string[];
}

interface WorkoutCarouselProps {
  workouts: Workout[];
  onWorkoutPress: (workout: Workout) => void;
  onAddWorkoutPress: () => void;
  selectedWorkoutId?: string | null;
  onStartWorkout?: (workout: Workout) => void;
  onEditWorkout?: (workout: Workout) => void;
  onDeleteWorkout?: (workout: Workout) => void;
  onCloseExpanded?: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.65;
const CARD_SPACING = spacing.md;
const LEFT_MARGIN = spacing.lg + spacing.xs;

export const WorkoutCarousel: React.FC<WorkoutCarouselProps> = ({
  workouts,
  onWorkoutPress,
  onAddWorkoutPress,
  selectedWorkoutId,
  onStartWorkout,
  onEditWorkout,
  onDeleteWorkout,
  onCloseExpanded,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // Reset scroll position when parent screen gains focus
  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ x: 0, animated: false });
    }, [])
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="normal"
        contentContainerStyle={styles.scrollContent}
      >
        {workouts.map((workout) => {
          const isSelected = selectedWorkoutId === workout.uniqueId;
          return (
            <Animated.View
              key={workout.uniqueId}
              style={styles.card}
            >
              <Pressable
                style={{ flex: 1 }}
                onPress={() => {
                  triggerHaptic('selection');
                  onWorkoutPress(workout);
                }}
              >
                <View style={styles.cardBackground}>
                  {!isSelected ? (
                    <Animated.View
                      key="normal"
                      entering={FadeIn.duration(250)}
                      exiting={FadeOut.duration(150)}
                      style={styles.cardInner}
                    >
                      <View style={styles.cardContent}>
                        <Text variant="heading3" color="primary" numberOfLines={1}>
                          {workout.name}
                        </Text>
                        {workout.programNames && workout.programNames.length > 0 ? (
                          <View style={styles.metaStack}>
                            <Text variant="body" color="secondary" style={styles.programName} numberOfLines={1}>
                              {workout.programNames[0]}
                            </Text>
                            <Text variant="body" color="secondary" style={styles.exerciseCount}>
                              {workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}
                            </Text>
                          </View>
                        ) : (
                          <Text variant="body" color="secondary" style={styles.exerciseCount}>
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
                      <Text variant="heading4" color="primary" numberOfLines={1} style={{ marginBottom: spacing.sm }}>
                        {workout.name}
                      </Text>
                      <View style={styles.actionButtons}>
                        {onStartWorkout && (
                          <Pressable
                            style={styles.actionButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              triggerHaptic('selection');
                              onStartWorkout(workout);
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
                              onEditWorkout(workout);
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
                              onDeleteWorkout(workout);
                            }}
                          >
                            <IconSymbol name="delete" size={sizing.iconMD} color={colors.text.primary} />
                            <Text variant="caption" color="primary">Delete</Text>
                          </Pressable>
                        )}
                        {onCloseExpanded && (
                          <Pressable
                            style={styles.actionButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              triggerHaptic('selection');
                              onCloseExpanded();
                            }}
                          >
                            <IconSymbol name="close" size={sizing.iconMD} color={colors.text.primary} />
                            <Text variant="caption" color="primary">Close</Text>
                          </Pressable>
                        )}
                      </View>
                    </Animated.View>
                  )}
                </View>
              </Pressable>
            </Animated.View>
          );
        })}

        {/* Add Workout Card */}
        <Pressable
          style={[styles.card, styles.addCard]}
          onPress={() => {
            triggerHaptic('selection');
            onAddWorkoutPress();
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.md,
  },
  scrollContent: {
    paddingLeft: LEFT_MARGIN,
    paddingRight: LEFT_MARGIN + spacing.xs,
    gap: CARD_SPACING,
  },
  card: {
    width: CARD_WIDTH,
    height: 140,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  cardBackground: {
    flex: 1,
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  cardInner: {
    flex: 1,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  metaStack: {
    gap: spacing.xxs,
  },
  programName: {
    fontWeight: '600',
  },
  exerciseCount: {
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
  expandedContent: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.sm,
  },
  actionButton: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
});
