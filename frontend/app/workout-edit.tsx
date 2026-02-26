/**
 * workout-edit
 * Screen for editing an existing workout session.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '@/utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { EditableWorkoutExerciseCard } from '@/components/molecules/EditableWorkoutExerciseCard';
import { CreateExerciseModal } from '@/components/molecules/CreateExerciseModal';
import { DeleteConfirmationModal } from '@/components/molecules/DeleteConfirmationModal';
import { SheetModal } from '@/components/molecules/SheetModal';
import { colors, radius, spacing, sizing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useWorkoutEditor } from '@/hooks/useWorkoutEditor';
import { exercises as baseExerciseCatalog, createCustomExerciseCatalogItem } from '@/constants/exercises';
import { useCustomExerciseStore } from '@/store/customExerciseStore';
import { useSemanticExerciseSearch } from '@/hooks/useSemanticExerciseSearch';
import { normalizeSearchText } from '@/utils/strings';
import { getExerciseDisplayTagText } from '@/utils/exerciseDisplayTags';
import type { ExerciseCatalogItem } from '@/constants/exercises';

const WorkoutEditScreen: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();

  const {
    workout,
    planName,
    exerciseDrafts,
    exerciseCount,
    expandedExercise,
    toggleExercise,
    updateExerciseSets,
    removeExercise,
    moveExercise,
    addExercise,
    saveWorkout,
    searchTerm,
    setSearchTerm,
  } = useWorkoutEditor(workoutId);


  const handleSelectExercise = useCallback(
    (exercise: any) => {
      addExercise(exercise);
      triggerHaptic('selection');
    },
    [addExercise],
  );

  const handleSaveWorkout = useCallback(async () => {
    const success = await saveWorkout();

    if (!success) {
      return;
    }

    triggerHaptic('success');
    router.back();
  }, [router, saveWorkout]);

  // Handle Android hardware back button
  useEffect(() => {
    const backAction = () => {
      router.back();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [router]);

  const [isInteractionLocked, setInteractionLocked] = React.useState(false);
  const [isPickerVisible, setIsPickerVisible] = React.useState(false);
  const [isCreateExerciseModalVisible, setIsCreateExerciseModalVisible] = useState(false);
  const [exerciseToRemove, setExerciseToRemove] = useState<string | null>(null);
  const pickerListRef = useRef<FlatList>(null);
  const customExercises = useCustomExerciseStore((state) => state.customExercises);

  // Merge custom exercises into catalog
  const exerciseCatalog = useMemo<ExerciseCatalogItem[]>(() => {
    const customCatalogItems = customExercises.map((ce) =>
      createCustomExerciseCatalogItem(ce.id, ce.name, ce.exerciseType, ce.supportsGpsTracking)
    );
    return [...baseExerciseCatalog, ...customCatalogItems];
  }, [customExercises]);

  const semanticResults = useSemanticExerciseSearch(searchTerm, exerciseCatalog, {
    limit: exerciseCatalog.length,
  });

  const allFilteredExercises = useMemo(() => {
    const trimmedQuery = searchTerm.trim();
    let candidates = exerciseCatalog;

    if (trimmedQuery) {
      if (semanticResults.length > 0) {
        candidates = semanticResults;
      } else {
        const normalizedQuery = normalizeSearchText(trimmedQuery);
        if (normalizedQuery) {
          const tokens = normalizedQuery.split(' ').filter(Boolean);
          if (tokens.length > 0) {
            candidates = exerciseCatalog.filter((exercise) => {
              const normalizedName = normalizeSearchText(exercise.name);
              const target = `${normalizedName} ${exercise.searchIndex}`;
              return tokens.every((token) => target.includes(token));
            });
          }
        }
      }
    }

    // Filter out exercises already in the workout
    const existingNames = new Set(exerciseDrafts.map((e) => e.name));
    const filtered = candidates.filter((exercise) => !existingNames.has(exercise.name));

    // Only sort alphabetically when NOT searching - preserve relevance ranking when searching
    if (!trimmedQuery) {
      return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [searchTerm, semanticResults, exerciseDrafts, exerciseCatalog]);

  const handleOpenPicker = useCallback(() => {
    setIsPickerVisible(true);
    // Scroll to top on next frame to ensure list is rendered
    requestAnimationFrame(() => {
      pickerListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, []);

  const handleClosePicker = useCallback(() => {
    setIsPickerVisible(false);
  }, []);

  if (!workout) {
    return (
      <View style={styles.emptyContainer}>
        <SurfaceCard padding="xl" showAccentStripe={false} style={styles.emptyCard}>
          <Text variant="heading3">Workout not found</Text>
          <Text color="secondary">Return to the dashboard and select a workout to edit.</Text>
          <Button label="Go Back" onPress={router.back} />
        </SurfaceCard>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={exerciseDrafts}
        keyExtractor={(item) => item.name}
        contentContainerStyle={[styles.listContent, { paddingTop: spacing.md + insets.top }]}
        ListHeaderComponent={(
          <View style={styles.headerSection}>
            <SurfaceCard tone="neutral" padding="lg" showAccentStripe={false} style={styles.headerCard}>
              <View style={styles.headerTextGroup}>
                <Text variant="heading3" color="primary">
                  {planName ?? 'Workout Session'}
                </Text>
                <Text variant="body" color="secondary">
                  {`${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'} in this session`}
                </Text>
              </View>
            </SurfaceCard>
            <LinearGradient
              colors={[theme.accent.gradientStart, theme.accent.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerDivider}
            />
            <View style={styles.headerActions}>
              <Button label="Add Exercise" variant="ghost" size="md" onPress={handleOpenPicker} />
            </View>
          </View>
        )}
        ListFooterComponent={(
          <View style={styles.footerSection}>
            <Button label="Save Changes" onPress={handleSaveWorkout} disabled={exerciseDrafts.length === 0} />
          </View>
        )}
        onScrollBeginDrag={() => setInteractionLocked(true)}
        onScrollEndDrag={() => setInteractionLocked(false)}
        onMomentumScrollEnd={() => setInteractionLocked(false)}
        onMomentumScrollBegin={() => setInteractionLocked(true)}
        renderItem={({ item, index }) => (
          <EditableWorkoutExerciseCard
            exercise={item}
            index={index}
            isExpanded={expandedExercise === item.name}
            onToggle={() => toggleExercise(item.name)}
            onSaveSets={(sets) => {
              updateExerciseSets(item.name, sets);
              triggerHaptic('selection');
            }}
            onRemove={() => {
              console.log('[workout-edit] onRemove triggered for:', item.name);
              setExerciseToRemove(item.name);
              triggerHaptic('selection');
            }}
            onMoveUp={() => {
              moveExercise(item.name, 'up');
              triggerHaptic('selection');
            }}
            onMoveDown={() => {
              moveExercise(item.name, 'down');
              triggerHaptic('selection');
            }}
            canMoveUp={index > 0}
            canMoveDown={index < exerciseDrafts.length - 1}
            onProgressChange={() => undefined}
            isInteractionDisabled={isInteractionLocked}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
      />

      <SheetModal
        visible={isPickerVisible}
        onClose={handleClosePicker}
        title="Add Exercise"
        headerContent={
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search by name or category"
            placeholderTextColor={theme.text.tertiary}
            style={[styles.searchInput, { borderColor: theme.accent.orange, color: theme.text.primary }]}
          />
        }
      >
        <FlatList
          ref={pickerListRef}
          data={allFilteredExercises}
          keyExtractor={(item) => item.id}
          style={styles.modalList}
          contentContainerStyle={styles.modalListContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={(
            <View style={styles.modalEmptyState}>
              <Text variant="body" color="secondary">
                No exercises match that search yet.
              </Text>
              <Pressable
                style={styles.createExerciseButton}
                onPress={() => {
                  triggerHaptic('selection');
                  handleClosePicker();
                  setIsCreateExerciseModalVisible(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Create a new custom exercise"
              >
                <MaterialCommunityIcons
                  name="plus-circle-outline"
                  size={sizing.iconMD}
                  color={theme.accent.primary}
                />
                <Text variant="bodySemibold" style={{ color: theme.accent.primary }}>
                  Create Exercise
                </Text>
              </Pressable>
            </View>
          )}
          renderItem={({ item }) => {
            const musclesLabel = getExerciseDisplayTagText({
              muscles: item.muscles,
              exerciseType: item.exerciseType || 'weight',
            });

            return (
              <Pressable
                style={styles.modalItem}
                onPress={() => handleSelectExercise(item)}
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.name}`}
              >
                <Text variant="bodySemibold" color="primary">
                  {item.name}
                </Text>
                <Text variant="caption" color="secondary">
                  {musclesLabel || 'General'}
                </Text>
              </Pressable>
            );
          }}
          ListFooterComponent={(
            <Pressable
              style={styles.createExerciseButton}
              onPress={() => {
                triggerHaptic('selection');
                handleClosePicker();
                setIsCreateExerciseModalVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Create a new custom exercise"
            >
              <MaterialCommunityIcons
                name="plus-circle-outline"
                size={sizing.iconMD}
                color={theme.accent.primary}
              />
              <Text variant="bodySemibold" style={{ color: theme.accent.primary }}>
                Create Exercise
              </Text>
            </Pressable>
          )}
        />
      </SheetModal>
      <CreateExerciseModal
        visible={isCreateExerciseModalVisible}
        onClose={() => setIsCreateExerciseModalVisible(false)}
        onExerciseCreated={(exerciseName, exerciseType) => {
          // Read latest custom exercises directly from store (memo may be stale)
          const latestCustom = useCustomExerciseStore.getState().customExercises;
          const created = latestCustom.find(e => e.name === exerciseName);
          if (created) {
            const catalogItem = createCustomExerciseCatalogItem(
              created.id, created.name, created.exerciseType, created.supportsGpsTracking
            );
            handleSelectExercise(catalogItem);
          }
          setIsCreateExerciseModalVisible(false);
        }}
      />
      <DeleteConfirmationModal
        visible={!!exerciseToRemove}
        onClose={() => setExerciseToRemove(null)}
        onConfirm={() => {
          if (exerciseToRemove) {
            removeExercise(exerciseToRemove);
            setExerciseToRemove(null);
            triggerHaptic('success');
          }
        }}
        title="Remove Exercise?"
        message="Are you sure you want to remove this exercise from your workout?"
        confirmLabel="Remove"
        cancelLabel="Keep"
      />
    </View>
  );
};

export default WorkoutEditScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  headerSection: {
    gap: spacing.md,
  },
  headerCard: {
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
  },
  headerTextGroup: {
    gap: spacing.xxxs,
  },
  headerDivider: {
    height: spacing.xs,
    borderRadius: radius.full,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  itemSeparator: {
    height: spacing.sm,
  },
  footerSection: {
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
    marginHorizontal: 0,
  },
  modalList: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  modalListContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'] * 2,
    paddingTop: spacing.xs,
    gap: spacing.xs,
    flexGrow: 1,
  },
  modalItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    minHeight: 'auto',
  },
  modalEmptyState: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.bg,
    padding: spacing.lg,
  },
  emptyCard: {
    gap: spacing.md,
  },
  createExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
});
