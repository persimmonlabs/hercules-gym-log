import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Pressable, StyleSheet, View, InteractionManager, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { triggerHaptic } from '@/utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { InputField } from '@/components/atoms/InputField';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { FilterChip } from '@/components/atoms/FilterChip';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ExerciseSelectionRow } from '@/components/molecules/ExerciseSelectionRow';
import { FilterBottomSheet } from '@/components/molecules/FilterBottomSheet';
import { CreateExerciseModal } from '@/components/molecules/CreateExerciseModal';
import { createCustomExerciseCatalogItem } from '@/constants/exercises';
import { useCustomExerciseStore } from '@/store/customExerciseStore';
import type { Exercise } from '@/constants/exercises';
import type { ExerciseFilters } from '@/types/exercise';
import { colors, radius, spacing, sizing, shadows } from '@/constants/theme';
import { usePlanBuilderContext } from '@/providers/PlanBuilderProvider';
import { countActiveFilters, getActiveFilterLabels } from '@/utils/exerciseFilters';

interface SelectedExerciseMap {
  [id: string]: Exercise;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary.bg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingBottom: spacing['2xl'] * 4,
    paddingTop: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  titleGroup: {
    gap: spacing.sm,
    alignItems: 'flex-start',
    flex: 1,
  },
  headerTitle: {
    textAlign: 'left',
  },
  headerSubtitle: {
    textAlign: 'left',
    maxWidth: 320,
  },
  backButton: {
    borderRadius: radius.lg,
    marginLeft: spacing.sm,
    paddingTop: spacing.xs,
  },
  difficultyChip: {
    paddingHorizontal: spacing.sm,
  },
  filterButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
    shadowOpacity: 0,
    elevation: 0,
  },
  filterButtonContent: {
    backgroundColor: colors.surface.card,
    borderColor: colors.accent.primary,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    elevation: 0,
  },
  activeFilterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  searchSection: {
    gap: spacing.md,
  },
  searchCard: {
    position: 'relative',
  },
  listCard: {
    gap: spacing.sm,
    position: 'relative',
  },
  listFooterSpacer: {
    width: '100%',
    backgroundColor: colors.primary.bg,
  },
  emptyState: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  emptyStateText: {
    textAlign: 'left',
  },
  floatingContainer: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: 0,
  },
  floatingCard: {
    padding: 0,
    gap: 0,
    ...shadows.cardSoft,
  },
  saveButton: {
    width: '100%',
  },
  bottomOverlay: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: 0,
    backgroundColor: colors.primary.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  disabledButtonWrapper: {
    opacity: 1,
  },
  disabledButtonContent: {
    backgroundColor: colors.primary.bg,
    borderWidth: 1,
    borderColor: colors.accent.primary,
    opacity: 1,
  },
  createExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary.bg,
  },
  loadingText: {
    textAlign: 'center',
  },
});

const AddExercisesScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    searchTerm,
    setSearchTerm,
    filteredAvailableExercises,
    handleAddExercises,
    filters,
    filterOptions,
    toggleMuscleGroupFilter,
    toggleSpecificMuscleFilter,
    toggleEquipmentFilter,
    toggleDifficultyFilter,
    toggleBodyweightOnly,
    toggleCompoundOnly,
    resetFilters,
    updateFilters,
    setIsLoading,
    isLoading,
  } = usePlanBuilderContext();

  const [selectedMap, setSelectedMap] = useState<SelectedExerciseMap>({});
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  const [isReady, setIsReady] = useState(false); // Track when content is ready to show
  const [isCreateExerciseModalVisible, setIsCreateExerciseModalVisible] = useState(false);
  const customExercises = useCustomExerciseStore((state) => state.customExercises);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term for better performance
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 150);
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchTerm]);

  useEffect(() => {
    // Reset state on mount
    resetFilters();
    setSearchTerm('');

    // Wait for content to be ready before showing
    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        setIsReady(true);
        setIsLoading(false);
      });
    });

    return () => {
      task.cancel();
      resetFilters();
      setSearchTerm('');
      setSelectedMap({});
    };
  }, [resetFilters, setSearchTerm, setIsLoading]);

  const selectedExercises = useMemo(() => Object.values(selectedMap), [selectedMap]);
  const selectedCount = selectedExercises.length;
  const hasExercises = filteredAvailableExercises.length > 0;
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
  const activeFilterLabels = useMemo(() => getActiveFilterLabels(filters), [filters]);
  const hasActiveFilters = activeFilterCount > 0;
  const floatingAreaHeight = useMemo(
    () => Math.max(insets.bottom, 0) + spacing.md + spacing.sm * 2 + sizing.buttonLG,
    [insets.bottom],
  );
  const bottomOverlayHeight = useMemo(() => floatingAreaHeight, [floatingAreaHeight]);

  const handleToggleExercise = useCallback(
    (exercise: Exercise) => {
      setSelectedMap((prev) => {
        if (prev[exercise.id]) {
          const next = { ...prev };
          delete next[exercise.id];
          return next;
        }

        return {
          ...prev,
          [exercise.id]: exercise,
        };
      });
    },
    [],
  );

  const handleBackPress = useCallback(() => {
    triggerHaptic('selection');
    resetFilters();
    setSearchTerm('');
    setIsLoading(true); // Show loading on create-workout while navigating back
    router.back();
  }, [resetFilters, router, setSearchTerm, setIsLoading]);

  // Handle Android hardware back button
  useEffect(() => {
    const backAction = () => {
      handleBackPress();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [handleBackPress]);

  const handleSavePress = useCallback(() => {
    if (selectedCount === 0) {
      return;
    }

    handleAddExercises(selectedExercises);
    resetFilters();
    setSearchTerm('');
    setSelectedMap({});
    setIsLoading(true); // Show loading on create-workout while navigating back
    router.back();
  }, [handleAddExercises, resetFilters, router, selectedCount, selectedExercises, setSearchTerm, setIsLoading]);

  const handleOpenFilters = useCallback(() => {
    triggerHaptic('selection');
    setIsFilterSheetVisible(true);
  }, []);

  const handleCloseFilters = useCallback(() => {
    triggerHaptic('selection');
    setIsFilterSheetVisible(false);
  }, []);

  const handleApplyFilters = useCallback((newFilters: ExerciseFilters) => {
    triggerHaptic('selection');
    updateFilters(newFilters);
    setIsFilterSheetVisible(false);
  }, [updateFilters]);

  const handleRemoveFilter = useCallback(
    (label: string) => {
      triggerHaptic('selection');
      if (label === 'Bodyweight') {
        toggleBodyweightOnly();
      } else if (label === 'Compound') {
        toggleCompoundOnly();
      } else if (filterOptions.muscleGroups.includes(label as any)) {
        toggleMuscleGroupFilter(label as any);
      } else if (filters.specificMuscles.includes(label as any)) {
        toggleSpecificMuscleFilter(label as any);
      } else if (filterOptions.equipment.includes(label as any)) {
        toggleEquipmentFilter(label as any);
      } else if (filterOptions.difficulty.includes(label as any)) {
        toggleDifficultyFilter(label as any);
      }
    },
    [
      filterOptions,
      filters.specificMuscles,
      toggleBodyweightOnly,
      toggleCompoundOnly,
      toggleDifficultyFilter,
      toggleEquipmentFilter,
      toggleMuscleGroupFilter,
      toggleSpecificMuscleFilter,
    ],
  );

  // Show loading until content is ready
  if (!isReady) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text variant="body" color="secondary" style={styles.loadingText}>
            Loading exercises...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: floatingAreaHeight + spacing.lg }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        enableOnAndroid
        extraScrollHeight={spacing['2xl'] * 2}
        keyboardOpeningTime={0}
        enableAutomaticScroll={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <Text variant="heading2" color="primary" style={styles.headerTitle} fadeIn>
              Add Exercises
            </Text>
            <Text variant="body" color="secondary" style={styles.headerSubtitle} fadeIn>
              Choose from our library of exercises to include in your workout.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go Back"
            onPress={handleBackPress}
            style={styles.backButton}
          >
            <IconSymbol name="arrow-back" color={colors.text.primary} size={sizing.iconMD} />
          </Pressable>
        </View>

        <SurfaceCard tone="card" padding="xl" showAccentStripe style={styles.searchCard}>
          <View style={styles.searchSection}>
            <InputField
              label="Search Exercises"
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search by movement or muscle"
              returnKeyType="search"
              autoCapitalize="none"
              testID="add-exercises-search"
            />

            <View style={styles.filterButtonRow}>
              <Button
                label={hasActiveFilters ? `Filters (${activeFilterCount})` : 'Filters'}
                variant="light"
                size="md"
                onPress={handleOpenFilters}
                style={styles.filterButton}
                contentStyle={styles.filterButtonContent}
                textColor={colors.accent.primary}
              />
              {hasActiveFilters ? (
                <Button
                  label="Reset"
                  variant="ghost"
                  size="md"
                  onPress={resetFilters}
                />
              ) : null}
            </View>

            {hasActiveFilters ? (
              <View style={styles.activeFilterChips}>
                {activeFilterLabels.map((label) => (
                  <FilterChip
                    key={label}
                    label={label}
                    onRemove={() => handleRemoveFilter(label)}
                    testID={`active-filter-${label}`}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </SurfaceCard>

        <SurfaceCard tone="card" padding="xl" showAccentStripe style={styles.listCard}>
          {hasExercises ? (
            filteredAvailableExercises.map((exercise) => (
              <ExerciseSelectionRow
                key={exercise.id}
                exercise={exercise}
                selected={Boolean(selectedMap[exercise.id])}
                onToggle={handleToggleExercise}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text variant="bodySemibold" color="primary" style={styles.emptyStateText}>
                {searchTerm || hasActiveFilters ? 'No Exercises Found' : 'All Set!'}
              </Text>
              <Text variant="body" color="secondary" style={styles.emptyStateText}>
                {searchTerm || hasActiveFilters
                  ? 'Try adjusting your search or filters to find what you’re looking for.'
                  : 'You’ve already added every available exercise to this plan.'}
              </Text>
            </View>
          )}
          <Pressable
            style={styles.createExerciseRow}
            onPress={() => {
              triggerHaptic('selection');
              setIsCreateExerciseModalVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Create a new custom exercise"
          >
            <MaterialCommunityIcons
              name="plus-circle-outline"
              size={sizing.iconMD}
              color={colors.accent.primary}
            />
            <Text variant="bodySemibold" style={{ color: colors.accent.primary }}>
              Create Exercise
            </Text>
          </Pressable>
        </SurfaceCard>

        <View style={[styles.listFooterSpacer, { height: floatingAreaHeight }]} />

      </KeyboardAwareScrollView>

      <FilterBottomSheet
        visible={isFilterSheetVisible}
        filters={filters}
        filterOptions={filterOptions}
        onClose={handleCloseFilters}
        onApply={handleApplyFilters}
      />

      <View pointerEvents="none" style={[styles.bottomOverlay, { height: bottomOverlayHeight }]} />

      <View
        style={[
          styles.floatingContainer,
          { paddingBottom: insets.bottom + spacing.md },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.floatingCard}>
          <Button
            label={selectedCount > 0 ? `Save Exercises (${selectedCount})` : 'Save Exercises'}
            variant={selectedCount > 0 ? 'primary' : 'ghost'}
            size="xl"
            onPress={handleSavePress}
            disabled={selectedCount === 0}
            style={selectedCount === 0 ? [styles.saveButton, styles.disabledButtonWrapper] : styles.saveButton}
            contentStyle={selectedCount === 0 ? styles.disabledButtonContent : undefined}
            textColor={selectedCount === 0 ? colors.accent.primary : undefined}
          />
        </View>
      </View>
      <CreateExerciseModal
        visible={isCreateExerciseModalVisible}
        onClose={() => setIsCreateExerciseModalVisible(false)}
        onExerciseCreated={(exerciseName, exerciseType) => {
          // Create a catalog item for the new exercise and select it
          const newExercise = createCustomExerciseCatalogItem(
            `temp-${Date.now()}`,
            exerciseName,
            exerciseType
          );
          // Find the actual exercise from the store (it will have the real ID)
          const actualExercise = customExercises.find(e => e.name === exerciseName);
          if (actualExercise) {
            const catalogItem = createCustomExerciseCatalogItem(
              actualExercise.id,
              actualExercise.name,
              actualExercise.exerciseType
            );
            setSelectedMap((prev) => ({
              ...prev,
              [catalogItem.id]: catalogItem,
            }));
          }
          setIsCreateExerciseModalVisible(false);
        }}
      />
    </View>
  );
};

export default AddExercisesScreen;
