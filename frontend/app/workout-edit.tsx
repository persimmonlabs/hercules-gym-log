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
import { colors, radius, spacing, sizing } from '@/constants/theme';
import { useWorkoutEditor } from '@/hooks/useWorkoutEditor';
import { exercises, createCustomExerciseCatalogItem } from '@/constants/exercises';
import { useCustomExerciseStore } from '@/store/customExerciseStore';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { normalizeSearchText } from '@/utils/strings';
import { getExerciseDisplayTagText } from '@/utils/exerciseDisplayTags';
import type { Exercise } from '@/constants/exercises';
import hierarchyData from '@/data/hierarchy.json';

const WorkoutEditScreen: React.FC = () => {
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
    openPicker,
    closePicker,
    filteredExercises,
    searchTerm,
    setSearchTerm,
  } = useWorkoutEditor(workoutId);

  // Build muscle to mid-level group mapping
  const muscleToMidLevelMap = useMemo(() => {
    const map: Record<string, string> = {};
    const hierarchy = hierarchyData.muscle_hierarchy;

    Object.entries(hierarchy).forEach(([l1, l1Data]: [string, any]) => {
      if (l1Data?.muscles) {
        Object.entries(l1Data.muscles).forEach(([midLevel, midLevelData]: [string, any]) => {
          // Map the mid-level group to itself
          map[midLevel] = midLevel;

          // Map all low-level muscles to their mid-level parent
          if (midLevelData?.muscles) {
            Object.keys(midLevelData.muscles).forEach(lowLevel => {
              map[lowLevel] = midLevel;
            });
          }
        });
      }
    });
    return map;
  }, []);

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

  // Merge custom exercises with filtered exercises
  const allFilteredExercises = useMemo(() => {
    const customCatalogItems = customExercises.map((ce) =>
      createCustomExerciseCatalogItem(ce.id, ce.name, ce.exerciseType)
    );
    const combinedExercises = [...filteredExercises, ...customCatalogItems];
    // Filter by search term if present
    let result = combinedExercises;
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = combinedExercises.filter((e) =>
        e.name.toLowerCase().includes(query)
      );
    }
    // Sort alphabetically A-Z by name
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredExercises, customExercises, searchTerm]);

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
              colors={[colors.accent.gradientStart, colors.accent.gradientEnd]}
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

      {isPickerVisible ? (
        <Pressable style={styles.overlay} onPress={handleClosePicker}>
          <Pressable style={styles.modal} onPress={() => undefined}>
            <Text variant="heading3">Add Exercise</Text>
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search by name or category"
              placeholderTextColor={colors.text.tertiary}
              style={styles.searchInput}
            />
            <FlatList
              ref={pickerListRef}
              data={allFilteredExercises}
              keyExtractor={(item) => item.id}
              style={styles.modalList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const musclesLabel = getExerciseDisplayTagText({
                  muscles: item.muscles,
                  exerciseType: item.exerciseType || 'weight',
                });

                return (
                  <Pressable
                    key={item.id}
                    style={styles.modalItem}
                    onPress={() => handleSelectExercise(item)}
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
                    setIsPickerVisible(false);
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
              )}
            />
            <Button label="Close" variant="ghost" onPress={handleClosePicker} />
          </Pressable>
        </Pressable>
      ) : null}
      <CreateExerciseModal
        visible={isCreateExerciseModalVisible}
        onClose={() => setIsCreateExerciseModalVisible(false)}
        onExerciseCreated={(exerciseName, exerciseType) => {
          // Find the newly created exercise and add it
          const newExercise = customExercises.find(e => e.name === exerciseName);
          if (newExercise) {
            const catalogItem = createCustomExerciseCatalogItem(
              newExercise.id,
              newExercise.name,
              newExercise.exerciseType
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
    borderColor: colors.accent.orangeLight,
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modal: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  searchInput: {
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    color: colors.text.primary,
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    gap: spacing.xxxs,
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
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
});
