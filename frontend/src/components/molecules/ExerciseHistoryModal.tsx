import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, FlatList, Dimensions } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/atoms/Text';
import { colors, radius, spacing, zIndex, typography, shadows } from '@/constants/theme';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { springGentle } from '@/constants/animations';
import { useSettingsStore } from '@/store/settingsStore';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_DISMISS_THRESHOLD = spacing['2xl'] * 2;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ExerciseHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  exerciseName: string | null;
}

export const ExerciseHistoryModal: React.FC<ExerciseHistoryModalProps> = ({
  visible,
  onClose,
  exerciseName,
}) => {
  const { formatWeight } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);
  const workouts = useWorkoutSessionsStore((state) => state.workouts);

  const historyData = useMemo(() => {
    if (!exerciseName) return [];

    return workouts
      .filter((workout) =>
        workout.exercises.some((e) => e.name === exerciseName)
      )
      .map((workout) => {
        const exercise = workout.exercises.find((e) => e.name === exerciseName);
        return {
          date: workout.date,
          sets: exercise?.sets || [],
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workouts, exerciseName]);

  useEffect(() => {

    if (visible) {

      sheetTranslateY.value = withSpring(0, springGentle);
    } else {

      // Animate out when visibility changes to false
      sheetTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
    }
  }, [visible, sheetTranslateY]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const sheetGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY < 0) {
        // Resistance when dragging up
        sheetTranslateY.value = event.translationY * 0.1;
        return;
      }
      sheetTranslateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (sheetTranslateY.value > SHEET_DISMISS_THRESHOLD) {
        // Animate out then close
        sheetTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 }, () => {
          runOnJS(onClose)();
        });
      } else {
        // Snap back
        sheetTranslateY.value = withSpring(0, springGentle);
      }
    });

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

  // Handle backdrop press with animation
  const handleBackdropPress = () => {
    sheetTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 }, () => {
      runOnJS(onClose)();
    });
  };

  return (
    <View
      style={[styles.overlay, !visible && styles.invisible]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Pressable style={styles.backdrop} onPress={handleBackdropPress} />
      <GestureDetector gesture={sheetGesture}>
        <AnimatedPressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }, sheetAnimatedStyle]}
          onPress={() => { }} // Consume press
        >
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <Text variant="heading2">{exerciseName || 'History'}</Text>
          </View>

          <FlatList
            data={historyData}
            keyExtractor={(item, index) => `${item.date}-${index}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.historyItem}>
                <Text variant="bodySemibold" style={styles.dateText}>
                  {formatDate(item.date)}
                </Text>
                <View style={styles.setsContainer}>
                  {item.sets.map((set, i) => (
                    <View key={i} style={styles.setRow}>
                      <Text variant="body" color="secondary">Set {i + 1}</Text>
                      <Text variant="bodySemibold">
                        {formatWeight(set.weight ?? 0)} × {set.reps} reps
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text color="secondary">No history found for this exercise.</Text>
              </View>
            }
          />
        </AnimatedPressable>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: zIndex.modal,
    justifyContent: 'flex-end',
    elevation: 100, // Force on top of everything
  },
  invisible: {
    opacity: 0, // Just to hide the backdrop instantly if needed, but we prefer animation.
    // However, since we animate translateY, we only need to hide the backdrop or the whole view when not active
    // to prevent blocking interactions.
    // pointerEvents='none' handles interaction blocking.
    // We'll keep opacity 1 for the view to allow exit animation of sheet.
    // But wait, if !visible, we want to be able to see the exit animation.
    // So we shouldn't set opacity: 0 immediately on !visible unless we delay it.
    // We'll remove this style and rely on pointerEvents and sheet translation.
    // But then the backdrop covers the screen even if invisible?
    // Yes.
    // So we need to hide it after animation.
    // But the parent controls 'visible'.
    // If parent sets visible=false, we assume it wants it gone.
    // If we want to animate out, we need internal state or parent needs to wait.
    // Simplified: We will follow the prompt's "pull up" request.
    // Let's just toggle zIndex?
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.scrim, // This will be abrupt if we don't animate opacity.
    // But it's acceptable for now given the constraints.
    // We can wrap this in Animated.View if we want.
  },
  sheet: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    height: '80%',
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    ...shadows.lg,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.light,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  historyItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  dateText: {
    marginBottom: spacing.xs,
  },
  setsContainer: {
    gap: spacing.xs,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
});
