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
  FlatList,
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
import { CreateExerciseModal } from '@/components/molecules/CreateExerciseModal';
import { triggerHaptic } from '@/utils/haptics';
import { colors, radius, spacing, typography, sizing, shadows } from '@/constants/theme';
import { springGentle } from '@/constants/animations';
import { useSemanticExerciseSearch } from '@/hooks/useSemanticExerciseSearch';
import { exercises as baseExerciseCatalog, createCustomExerciseCatalogItem, type Exercise } from '@/constants/exercises';
import { useCustomExerciseStore } from '@/store/customExerciseStore';
import { getExerciseDisplayTags } from '@/utils/exerciseDisplayTags';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_THRESHOLD = spacing['2xl'] * 2;
const ITEM_HEIGHT = 64;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const keyExtractor = (item: Exercise) => item.id;
const getItemLayout = (_data: any, index: number) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
});

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
  const [selectedMap, setSelectedMap] = useState<Map<string, Exercise>>(new Map());
  const [isModalVisible, setIsModalVisible] = useState(visible);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  
  // Animation values
  const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);

  // Merge custom exercises into catalog
  const customExercises = useCustomExerciseStore((state) => state.customExercises);
  const exerciseCatalog = useMemo(() => {
    const customCatalogItems = customExercises.map((ce) =>
      createCustomExerciseCatalogItem(ce.id, ce.name, ce.exerciseType, ce.supportsGpsTracking)
    );
    return [...baseExerciseCatalog, ...customCatalogItems];
  }, [customExercises]);

  // Get suggestions based on search term — cap at 50 for performance, still plenty of results
  const suggestions = useSemanticExerciseSearch(searchTerm, exerciseCatalog, {
    limit: 50,
    excludeIds,
  });

  // Show popular exercises when search is empty — cap at 50 for fast initial render
  const popularExercises = useMemo(() => {
    if (searchTerm.trim()) return [];
    const excluded = new Set(excludeIds);
    return exerciseCatalog
      .filter(ex => !excluded.has(ex.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 50);
  }, [excludeIds, searchTerm, exerciseCatalog]);

  // Sort selected exercises to top
  const displayExercises = useMemo(() => {
    const base = searchTerm.trim() ? suggestions : popularExercises;
    if (selectedMap.size === 0) return base;
    return [...base].sort((a, b) => {
      const aS = selectedMap.has(a.id) ? 0 : 1;
      const bS = selectedMap.has(b.id) ? 0 : 1;
      return aS - bS;
    });
  }, [searchTerm, suggestions, popularExercises, selectedMap]);

  // Handle modal visibility and animations
  useEffect(() => {
    if (visible) {
      setIsModalVisible(true);
      setSearchTerm('');
      setSelectedMap(new Map());
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
    setSelectedMap(prev => {
      const next = new Map(prev);
      if (next.has(exercise.id)) {
        next.delete(exercise.id);
      } else {
        next.set(exercise.id, exercise);
      }
      return next;
    });
  }, []);

  const handleAddSelected = useCallback(() => {
    if (selectedMap.size === 0) return;
    
    Keyboard.dismiss();
    triggerHaptic('success');
    const selectedExercises = Array.from(selectedMap.values());
    
    if (onAddMultipleExercises) {
      onAddMultipleExercises(selectedExercises);
    } else {
      selectedExercises.forEach(ex => onAddExercise(ex));
    }
    
    setSelectedMap(new Map());
    onClose();
  }, [selectedMap, onAddExercise, onAddMultipleExercises, onClose]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    inputRef.current?.focus();
  }, []);

  const handleOpenCreateModal = useCallback(() => {
    triggerHaptic('selection');
    setIsCreateModalVisible(true);
  }, []);

  const handleExerciseCreated = useCallback((exerciseName: string) => {
    // Find the newly created exercise from the store and auto-select it
    const latest = useCustomExerciseStore.getState().customExercises;
    const created = latest.find(e => e.name === exerciseName);
    if (created) {
      const catalogItem = createCustomExerciseCatalogItem(
        created.id, created.name, created.exerciseType, created.supportsGpsTracking
      );
      setSelectedMap(prev => {
        const next = new Map(prev);
        next.set(catalogItem.id, catalogItem);
        return next;
      });
    }
    setIsCreateModalVisible(false);
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
              {selectedMap.size > 0 && (
                <View style={styles.selectedBadge}>
                  <Text variant="caption" style={styles.selectedBadgeText}>
                    {selectedMap.size} selected
                  </Text>
                </View>
              )}
            </View>

            {/* Exercise List */}
            {displayExercises.length > 0 ? (
              <FlatList
                data={displayExercises}
                keyExtractor={keyExtractor}
                renderItem={({ item }) => (
                  <ExerciseRow
                    exercise={item}
                    isSelected={selectedMap.has(item.id)}
                    onToggle={handleToggleExercise}
                  />
                )}
                ListFooterComponent={
                  <CreateExerciseRow onPress={handleOpenCreateModal} />
                }
                style={styles.scrollView}
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingBottom: selectedMap.size > 0 ? spacing.md : insets.bottom + spacing.lg },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                initialNumToRender={12}
                maxToRenderPerBatch={10}
                windowSize={5}
                getItemLayout={getItemLayout}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text variant="body" color="secondary">
                  No exercises found for &quot;{searchTerm}&quot;
                </Text>
                <Text variant="caption" color="tertiary" style={styles.emptyStateHint}>
                  Try a different search term or create a custom exercise
                </Text>
                <Pressable
                  onPress={handleOpenCreateModal}
                  style={styles.emptyStateCreateButton}
                >
                  <IconSymbol name="add" size={sizing.iconSM} color={colors.accent.orange} />
                  <Text variant="bodySemibold" style={{ color: colors.accent.orange }}>
                    Create "{searchTerm.trim()}"
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Bottom Action */}
            {selectedMap.size > 0 && (
              <Animated.View
                entering={FadeIn.duration(150)}
                exiting={FadeOut.duration(100)}
                style={[styles.bottomAction, { paddingBottom: insets.bottom + spacing.md }]}
              >
                <Button
                  label={`Add ${selectedMap.size} Exercise${selectedMap.size !== 1 ? 's' : ''}`}
                  variant="primary"
                  size="lg"
                  onPress={handleAddSelected}
                />
              </Animated.View>
            )}
          </Animated.View>
        </View>
      </GestureHandlerRootView>
      <CreateExerciseModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onExerciseCreated={handleExerciseCreated}
      />
    </Modal>
  );
};

// Exercise Row Sub-component
interface ExerciseRowProps {
  exercise: Exercise;
  isSelected: boolean;
  onToggle: (exercise: Exercise) => void;
}

const ExerciseRow: React.FC<ExerciseRowProps> = React.memo(({
  exercise,
  isSelected,
  onToggle,
}) => {
  const tags = useMemo(() => getExerciseDisplayTags({
    muscles: exercise.muscles,
    exerciseType: exercise.exerciseType,
  }, { maxTags: 2 }), [exercise.muscles, exercise.exerciseType]);

  const handlePress = useCallback(() => onToggle(exercise), [exercise, onToggle]);

  return (
    <Pressable
      onPress={handlePress}
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
});

// Create Exercise Footer Row
interface CreateExerciseRowProps {
  onPress: () => void;
}

const CreateExerciseRow: React.FC<CreateExerciseRowProps> = React.memo(({ onPress }) => (
  <Pressable onPress={onPress} style={styles.createExerciseFooter}>
    <IconSymbol name="add" size={sizing.iconSM} color={colors.accent.orange} />
    <Text variant="bodySemibold" style={{ color: colors.accent.orange }}>
      Create Custom Exercise
    </Text>
  </Pressable>
));

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
  emptyStateHint: {
    marginBottom: spacing.sm,
  },
  emptyStateCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent.orange,
    borderStyle: 'dashed',
    backgroundColor: colors.accent.orangeMuted,
  },
  createExerciseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  bottomAction: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
});
