/**
 * ExerciseSearchModal
 * A full-screen modal for searching and adding exercises to a workout.
 * Provides dedicated space and a better UX than inline search.
 * Supports swipe-to-dismiss gesture like other modals in the app.
 */
import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  ScrollView,
  Dimensions,
  Keyboard,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { triggerHaptic } from '@/utils/haptics';
import { colors, radius, spacing, typography, sizing, shadows } from '@/constants/theme';
import { springGentle } from '@/constants/animations';
import { useSemanticExerciseSearch } from '@/hooks/useSemanticExerciseSearch';
import { exercises as exerciseCatalog, type Exercise } from '@/constants/exercises';
import { getExerciseDisplayTags } from '@/utils/exerciseDisplayTags';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_THRESHOLD = spacing['2xl'] * 2;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ExerciseSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onAddExercise: (exercise: Exercise) => void;
  onAddMultipleExercises?: (exercises: Exercise[]) => void;
  excludeIds?: string[];
  title?: string;
}

export const ExerciseSearchModal: React.FC<ExerciseSearchModalProps> = ({
  visible,
  onClose,
  onAddExercise,
  onAddMultipleExercises,
  excludeIds = [],
  title = 'Add Exercises',
}) => {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isModalVisible, setIsModalVisible] = useState(visible);
  
  // Animation values
  const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);

  // Get suggestions based on search term
  const suggestions = useSemanticExerciseSearch(searchTerm, exerciseCatalog, {
    limit: 20,
    excludeIds,
  });

  // Show popular exercises when search is empty
  const popularExercises = useMemo(() => {
    if (searchTerm.trim()) return [];
    const excluded = new Set(excludeIds);
    return exerciseCatalog
      .filter(ex => !excluded.has(ex.id))
      .slice(0, 20);
  }, [excludeIds, searchTerm]);

  const displayExercises = searchTerm.trim() ? suggestions : popularExercises;

  // Handle modal visibility and animations
  useEffect(() => {
    if (visible) {
      setIsModalVisible(true);
      setSearchTerm('');
      setSelectedIds(new Set());
      // Animate in after modal renders
      requestAnimationFrame(() => {
        sheetTranslateY.value = withSpring(0, springGentle);
      });
    } else {
      // Animate out
      sheetTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(setIsModalVisible)(false);
        }
      });
    }
  }, [visible, sheetTranslateY]);

  // Animated styles
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      sheetTranslateY.value,
      [0, SCREEN_HEIGHT],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  // Helper function to handle dismiss
  const dismissModal = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  // Swipe-to-dismiss gesture
  const panGesture = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetY(-10)
    .shouldCancelWhenOutside(false)
    .onUpdate((event) => {
      // Only allow dragging down
      if (event.translationY < 0) return;
      sheetTranslateY.value = event.translationY;
    })
    .onEnd(() => {
      if (sheetTranslateY.value > DISMISS_THRESHOLD) {
        // Dismiss
        sheetTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 }, () => {
          runOnJS(dismissModal)();
        });
      } else {
        // Snap back
        sheetTranslateY.value = withSpring(0, springGentle);
      }
    });

  const handleToggleExercise = useCallback((exercise: Exercise) => {
    triggerHaptic('selection');
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(exercise.id)) {
        next.delete(exercise.id);
      } else {
        next.add(exercise.id);
      }
      return next;
    });
  }, []);


  const handleAddSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    
    Keyboard.dismiss();
    triggerHaptic('success');
    const selectedExercises = displayExercises.filter(ex => selectedIds.has(ex.id));
    
    if (onAddMultipleExercises) {
      onAddMultipleExercises(selectedExercises);
    } else {
      selectedExercises.forEach(ex => onAddExercise(ex));
    }
    
    setSelectedIds(new Set());
    onClose();
  }, [selectedIds, displayExercises, onAddExercise, onAddMultipleExercises, onClose]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    inputRef.current?.focus();
  }, []);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    triggerHaptic('selection');
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.overlay}>
          {/* Backdrop - fully covers screen */}
          <AnimatedPressable
            style={[styles.backdrop, backdropStyle]}
            onPress={handleClose}
          />

          {/* Sheet */}
          <Animated.View
            style={[
              styles.sheet,
              sheetAnimatedStyle,
            ]}
          >
            {/* Gesture area for swipe-to-dismiss */}
            <GestureDetector gesture={panGesture}>
              <View>
                <View style={styles.handleContainer}>
                  <View style={styles.handle} />
                </View>

                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerContent}>
                    <Text variant="heading3" color="primary">
                      {title}
                    </Text>
                    <Text variant="caption" color="secondary">
                      Tap to select, then add multiple at once
                    </Text>
                  </View>
                  <Pressable onPress={handleClose} style={styles.closeButton} hitSlop={12}>
                    <IconSymbol name="close" size={sizing.iconMD} color={colors.text.primary} />
                  </Pressable>
                </View>
              </View>
            </GestureDetector>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <IconSymbol
                  name="search"
                  size={sizing.iconSM}
                  color={colors.text.tertiary}
                />
                <TextInput
                  ref={inputRef}
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Search by name, muscle, or equipment..."
                  placeholderTextColor={colors.text.muted}
                  selectionColor={colors.accent.primary}
                  cursorColor={colors.accent.primary}
                  style={styles.searchInput}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchTerm.length > 0 && (
                  <Pressable onPress={handleClearSearch} hitSlop={8}>
                    <IconSymbol
                      name="close"
                      size={sizing.iconSM}
                      color={colors.text.tertiary}
                    />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Results Label */}
            <View style={styles.resultsHeader}>
              <Text variant="caption" color="secondary">
                {searchTerm.trim() 
                  ? `${displayExercises.length} result${displayExercises.length !== 1 ? 's' : ''}`
                  : 'Popular exercises'
                }
              </Text>
              {selectedIds.size > 0 && (
                <View style={styles.selectedBadge}>
                  <Text variant="caption" style={styles.selectedBadgeText}>
                    {selectedIds.size} selected
                  </Text>
                </View>
              )}
            </View>

            {/* Exercise List */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: selectedIds.size > 0 ? spacing.md : insets.bottom + spacing.lg },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {displayExercises.length > 0 ? (
                displayExercises.map((exercise) => (
                  <ExerciseRow
                    key={exercise.id}
                    exercise={exercise}
                    isSelected={selectedIds.has(exercise.id)}
                    onToggle={handleToggleExercise}
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text variant="body" color="secondary">
                    No exercises found for "{searchTerm}"
                  </Text>
                  <Text variant="caption" color="tertiary">
                    Try a different search term
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Bottom Action */}
            {selectedIds.size > 0 && (
              <Animated.View
                entering={FadeIn.duration(150)}
                exiting={FadeOut.duration(100)}
                style={[styles.bottomAction, { paddingBottom: insets.bottom + spacing.md }]}
              >
                <Button
                  label={`Add ${selectedIds.size} Exercise${selectedIds.size !== 1 ? 's' : ''}`}
                  variant="primary"
                  size="lg"
                  onPress={handleAddSelected}
                />
              </Animated.View>
            )}
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

// Exercise Row Sub-component
interface ExerciseRowProps {
  exercise: Exercise;
  isSelected: boolean;
  onToggle: (exercise: Exercise) => void;
}

const ExerciseRow: React.FC<ExerciseRowProps> = ({
  exercise,
  isSelected,
  onToggle,
}) => {
  const tags = getExerciseDisplayTags({
    muscles: exercise.muscles,
    exerciseType: exercise.exerciseType,
  }, { maxTags: 2 });

  return (
    <Pressable
      onPress={() => onToggle(exercise)}
      style={({ pressed }) => [
        styles.exerciseRow,
        isSelected && styles.exerciseRowSelected,
        pressed && styles.exerciseRowPressed,
      ]}
    >
      {/* Selection Indicator */}
      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected && (
          <IconSymbol name="check" size={14} color={colors.text.onAccent} />
        )}
      </View>

      {/* Exercise Info */}
      <View style={styles.exerciseInfo}>
        <Text variant="body" color="primary" numberOfLines={1}>
          {exercise.name}
        </Text>
        {tags.length > 0 && (
          <Text variant="captionSmall" color="tertiary">
            {tags.join(' · ')}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay.scrim,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.scrim,
  },
  sheet: {
    height: '85%',
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.neutral.gray200,
    overflow: 'hidden',
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerContent: {
    flex: 1,
    gap: spacing.xs,
  },
  closeButton: {
    padding: spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontWeight: typography.body.fontWeight as any,
    color: colors.text.primary,
    paddingVertical: spacing.xs,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  selectedBadge: {
    backgroundColor: colors.accent.orange,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  selectedBadgeText: {
    color: colors.text.onAccent,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    gap: spacing.md,
  },
  exerciseRowSelected: {
    backgroundColor: colors.accent.orangeMuted,
    borderColor: colors.accent.orange,
  },
  exerciseRowPressed: {
    opacity: 0.8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.accent.orange,
    borderColor: colors.accent.orange,
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.sm,
  },
  bottomAction: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
});
