import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ColorValue,
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { triggerHaptic } from '@/utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Layout,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { SheetModal } from '@/components/molecules/SheetModal';
import { Button } from '@/components/atoms/Button';
import { Text } from '@/components/atoms/Text';
import { ExerciseSetEditor } from '@/components/molecules/ExerciseSetEditor';
import { ExerciseHistoryModal } from '@/components/molecules/ExerciseHistoryModal';
import { exercises as baseExerciseCatalog, createCustomExerciseCatalogItem } from '@/constants/exercises';
import { springGentle } from '@/constants/animations';
import { colors, radius, shadows, sizing, spacing, typography, zIndex } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useElapsedTimer } from '@/hooks/useElapsedTimer';
import { useSemanticExerciseSearch } from '@/hooks/useSemanticExerciseSearch';
import { useSessionStore } from '@/store/sessionStore';
import { usePlansStore } from '@/store/plansStore';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { useProgramsStore } from '@/store/programsStore';
import { useCustomExerciseStore } from '@/store/customExerciseStore';
import { CreateExerciseModal } from '@/components/molecules/CreateExerciseModal';
import { FinishConfirmationModal } from '@/components/molecules/FinishConfirmationModal';
import { DeleteConfirmationModal } from '@/components/molecules/DeleteConfirmationModal';
import { normalizeSearchText } from '@/utils/strings';
import { createSetsWithHistory } from '@/utils/exerciseHistory';
import { getExerciseDisplayTagText } from '@/utils/exerciseDisplayTags';
import type { Exercise, ExerciseCatalogItem } from '@/constants/exercises';
import type { SetLog, WorkoutExercise } from '@/types/workout';
import hierarchyData from '@/data/hierarchy.json';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_DISMISS_THRESHOLD = spacing['2xl'] * 2;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ExerciseProgressSnapshot {
  completedSets: number;
  totalSets: number;
}

type ActiveMenu =
  | { type: 'exercise'; exerciseName: string }
  | { type: 'set'; exerciseName: string; setIndex: number }
  | null;

const formatElapsed = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const remaining = (seconds % 60).toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${minutes}:${remaining}`;
  }
  return `${minutes}:${remaining}`;
};

const WorkoutSessionScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const currentSession = useSessionStore((state) => state.currentSession);
  const lastKnownSessionRef = useRef(currentSession);
  if (currentSession) {
    lastKnownSessionRef.current = currentSession;
  }

  const [isFinishingWorkout, setIsFinishingWorkout] = useState<boolean>(false);

  // Use current session if active, otherwise fall back to last known session if finishing
  const sessionToDisplay = currentSession ?? (isFinishingWorkout ? lastKnownSessionRef.current : null);
  const activePlanId = sessionToDisplay?.planId ?? null;
  const activePlanName = usePlansStore((state) => {
    if (!activePlanId) {
      return null;
    }

    return state.plans.find((plan) => plan.id === activePlanId)?.name ?? null;
  });
  const isSessionActive = useSessionStore((state) => state.isSessionActive);
  const addExerciseToSession = useSessionStore((state) => state.addExercise);
  const endSession = useSessionStore((state) => state.endSession);
  const clearSession = useSessionStore((state) => state.clearSession);
  const updateExercise = useSessionStore((state) => state.updateExercise);
  const removeExercise = useSessionStore((state) => state.removeExercise);
  const addWorkout = useWorkoutSessionsStore((state) => state.addWorkout);
  const { activeRotation, advanceRotation } = useProgramsStore();
  const customExercises = useCustomExerciseStore((state) => state.customExercises);

  const sessionExercises = sessionToDisplay?.exercises ?? [];

  const [pickerVisible, setPickerVisible] = useState<boolean>(false);
  const [createExerciseModalVisible, setCreateExerciseModalVisible] = useState<boolean>(false);
  const pickerListRef = useRef<FlatList>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(
    () => new Set(sessionExercises.length > 0 ? [sessionExercises[0].name] : [])
  );
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);
  const [replaceTargetName, setReplaceTargetName] = useState<string | null>(null);
  const [historyModalVisible, setHistoryModalVisible] = useState<boolean>(false);
  const [finishModalVisible, setFinishModalVisible] = useState<boolean>(false);
  const [historyTargetName, setHistoryTargetName] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  // Debug: Log state changes
  useEffect(() => {
    console.log('[WorkoutSession] historyModalVisible changed to:', historyModalVisible);
  }, [historyModalVisible]);

  useEffect(() => {
    console.log('[WorkoutSession] pickerVisible changed to:', pickerVisible);
  }, [pickerVisible]);

  // Dismiss keyboard on component mount to prevent unwanted keyboard popup on app re-entry
  useEffect(() => {
    Keyboard.dismiss();
  }, []);
  const [exerciseProgress, setExerciseProgress] = useState<Record<string, ExerciseProgressSnapshot>>({});
  const insets = useSafeAreaInsets();
  const setCompletionOverlayVisible = useSessionStore((state) => state.setCompletionOverlayVisible);
  const exerciseNamesSignatureRef = useRef<string>('');
  const hasInitializedExpansionsRef = useRef<boolean>(sessionExercises.length > 0);
  const hasUserAddedExerciseRef = useRef<boolean>(false);

  const handleAddExercisePress = useCallback(() => {
    triggerHaptic('selection');
    setActiveMenu(null);
    setReplaceTargetName(null);
    setPickerVisible(true);
    setSearchTerm('');
    // Ensure list is scrolled to top when opening
    requestAnimationFrame(() => {
      pickerListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, []);

  const { elapsedSeconds } = useElapsedTimer(sessionToDisplay?.startTime ?? null, {
    isActive: isSessionActive,
  });

  // Reset isFinishingWorkout is not strictly needed since we are navigating away,
  // but good for cleanup if component stays mounted for any reason
  useEffect(() => {
    return () => {
      setIsFinishingWorkout(false);
      setCompletionOverlayVisible(false);
    };
  }, [setCompletionOverlayVisible]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      void NavigationBar.setBackgroundColorAsync(theme.surface.tint);
      return () => {
        // Restore to current theme background color when leaving
        void NavigationBar.setBackgroundColorAsync(theme.primary.bg);
      };
    }
  }, [theme.primary.bg]);



  // Merge custom exercises with base catalog
  const exerciseCatalog = useMemo<ExerciseCatalogItem[]>(() => {
    const customCatalogItems = customExercises.map((ce) =>
      createCustomExerciseCatalogItem(ce.id, ce.name, ce.exerciseType)
    );
    return [...baseExerciseCatalog, ...customCatalogItems];
  }, [customExercises]);

  const semanticResults = useSemanticExerciseSearch(searchTerm, exerciseCatalog, {
    limit: exerciseCatalog.length,
  });

  // Build muscle to mid-level group mapping
  const muscleToMidLevelMap = useMemo(() => {
    const map: Record<string, string> = {};
    const hierarchy = hierarchyData.muscle_hierarchy;

    Object.entries(hierarchy).forEach(([l1, l1Data]) => {
      if (l1Data.muscles) {
        Object.entries(l1Data.muscles).forEach(([midLevel, midLevelData]) => {
          // Map the mid-level group to itself
          map[midLevel] = midLevel;

          // Map all low-level muscles to their mid-level parent
          if (midLevelData.muscles) {
            Object.keys(midLevelData.muscles).forEach(lowLevel => {
              map[lowLevel] = midLevel;
            });
          }
        });
      }
    });
    return map;
  }, []);

  const filteredExercises = useMemo(() => {
    const trimmedQuery = searchTerm.trim();
    let candidates = exerciseCatalog;

    if (trimmedQuery) {
      // If semantic search returns results, use them (they're already ranked by relevance)
      if (semanticResults.length > 0) {
        candidates = semanticResults;
      } else {
        // Fallback to basic token matching if semantic search finds nothing
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

    // Filter out exercises that are already in the session to prevent duplicates
    const existingNames = new Set(sessionExercises.map((e) => e.name));
    const filtered = candidates.filter((exercise) => !existingNames.has(exercise.name));

    // Sort alphabetically A-Z by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [searchTerm, semanticResults, sessionExercises]);

  const dismissPicker = useCallback(() => {
    runOnJS(Keyboard.dismiss)();
    setPickerVisible(false);
    setSearchTerm('');
    setReplaceTargetName(null);
  }, []);

  const handleReplaceExercisePress = useCallback(
    (exerciseName: string) => {
      console.log('[WorkoutSession] Replace exercise pressed:', exerciseName);
      console.log('[WorkoutSession] Setting pickerVisible to true');
      triggerHaptic('selection');
      setActiveMenu(null);
      setReplaceTargetName(exerciseName);
      setPickerVisible(true);
      setSearchTerm('');
      // Ensure list is scrolled to top when opening
      requestAnimationFrame(() => {
        pickerListRef.current?.scrollToOffset({ offset: 0, animated: false });
      });
      console.log('[WorkoutSession] State updates dispatched');
    },
    [],
  );

  const handleSelectExercise = (exercise: Exercise) => {
    const targetName = replaceTargetName;
    const allWorkouts = useWorkoutSessionsStore.getState().workouts;

    if (targetName) {
      const existing = sessionExercises.find((item) => item.name === targetName);
      let sets = existing?.sets;
      let historySetCount = 0;

      if (!sets) {
        const result = createSetsWithHistory(exercise.name, allWorkouts);
        sets = result.sets;
        historySetCount = result.historySetCount;
      }

      const nextExercise: WorkoutExercise = {
        name: exercise.name,
        sets,
      };

      updateExercise(targetName, nextExercise);

      // Update history set count for the new exercise
      if (historySetCount > 0) {
        const currentSession = useSessionStore.getState().currentSession;
        if (currentSession) {
          useSessionStore.setState({
            currentSession: {
              ...currentSession,
              historySetCounts: {
                ...currentSession.historySetCounts,
                [exercise.name]: historySetCount,
              },
            },
          });
        }
      }

      setExpandedExercises((prev) => {
        if (!prev.has(targetName)) {
          return prev;
        }

        const next = new Set(prev);
        next.delete(targetName);
        next.add(nextExercise.name);
        return next;
      });
      setExerciseProgress((prev) => {
        if (!prev[targetName]) {
          return prev;
        }

        const { [targetName]: _omitted, ...rest } = prev;
        return rest;
      });
    } else {
      const { sets, historySetCount } = createSetsWithHistory(exercise.name, allWorkouts);
      const nextExercise: WorkoutExercise = {
        name: exercise.name,
        sets,
      };

      addExerciseToSession(nextExercise, historySetCount);
      hasUserAddedExerciseRef.current = true;
    }

    triggerHaptic('selection');
    dismissPicker();
  };

  const handleToggleExercise = useCallback((exerciseName: string) => {
    triggerHaptic('selection');
    setActiveMenu(null);
    setExpandedExercises((prev) => {
      const next = new Set(prev);

      if (next.has(exerciseName)) {
        next.delete(exerciseName);
      } else {
        next.add(exerciseName);
      }

      return next;
    });
    // Note: We no longer delete the exercise progress snapshot when collapsing
    // This preserves the completion state even when the card is collapsed
  }, []);

  const handleExerciseProgressChange = useCallback((exerciseName: string, progress: ExerciseProgressSnapshot) => {
    setExerciseProgress((prev) => {
      const existing = prev[exerciseName];

      if (existing && existing.completedSets === progress.completedSets && existing.totalSets === progress.totalSets) {
        return prev;
      }

      return {
        ...prev,
        [exerciseName]: progress,
      };
    });
  }, []);

  const handleExerciseSetsChange = useCallback((exerciseName: string, sets: SetLog[]) => {
    updateExercise(exerciseName, {
      name: exerciseName,
      sets,
    });
  }, [updateExercise]);

  const handleFinishWorkout = useCallback(async () => {
    setFinishModalVisible(true);
  }, []);

  const handleConfirmFinish = useCallback(async () => {
    // Prevent multiple concurrent finish operations
    if (isFinishingWorkout) {
      return;
    }

    setIsFinishingWorkout(true);
    setFinishModalVisible(false);

    // Build workout object WITHOUT clearing session state yet
    // This keeps the session active so the UI doesn't flash to "Start your next session"
    const currentSessionData = sessionToDisplay;

    if (!currentSessionData) {
      setIsFinishingWorkout(false);
      return;
    }

    // Create workout object manually to avoid clearing session state
    const endTime = Date.now();
    const durationMilliseconds = endTime - currentSessionData.startTime;
    const durationSeconds = Math.max(Math.floor(durationMilliseconds / 1000), 0);

    const workout = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      planId: currentSessionData.planId,
      name: currentSessionData.name,
      date: new Date(currentSessionData.startTime).toISOString(),
      startTime: currentSessionData.startTime,
      endTime,
      duration: durationSeconds,
      exercises: currentSessionData.exercises,
    };

    try {
      await addWorkout(workout);

      // If this workout corresponds to the active rotation, advance it
      if (activeRotation && currentSessionData.planId === activeRotation.programId) {
        await advanceRotation();
      }

      // Navigate to success screen to show confirmation message before redirecting home
      // Session clearing is handled here to ensure it happens reliably before navigation
      endSession();
      router.replace('/workout-success');
      // Reset isFinishingWorkout is not strictly needed since we are navigating away,
      // but good for cleanup if component stays mounted for any reason
      setIsFinishingWorkout(false);
    } catch (error) {
      console.error('[workout-session] Failed to persist workout', error);
      setIsFinishingWorkout(false);
      router.replace('/(tabs)');
    }
  }, [isFinishingWorkout, sessionToDisplay, endSession, addWorkout, router, activeRotation, advanceRotation]);

  const handleCancel = useCallback(() => {
    clearSession();
    router.replace('/(tabs)');
  }, [clearSession, router]);

  const openExerciseMenu = useCallback((exerciseName: string, pageX: number, pageY: number, width: number, height: number) => {
    console.log('[Menu] Opening at:', { pageX, pageY, width, height, insetsTop: insets.top });
    triggerHaptic('selection');
    setActiveMenu({ type: 'exercise', exerciseName });
    // Position menu below the button
    // Removing insets.top subtraction to push the menu down further
    const top = pageY + height + spacing.xs;
    const right = Dimensions.get('window').width - (pageX + width);
    console.log('[Menu] Calculated position:', { top, right });

    setMenuPosition({
      top,
      right,
    });
  }, [insets.top]);

  const closeAllMenus = useCallback(() => {
    setActiveMenu(null);
  }, []);

  const handleOpenSetMenu = useCallback((exerciseName: string, setIndex: number) => {
    setActiveMenu({ type: 'set', exerciseName, setIndex });
  }, []);

  const [exerciseToDelete, setExerciseToDelete] = useState<string | null>(null);

  const handleDeleteExercise = useCallback(() => {
    if (activeMenu?.type !== 'exercise') {
      return;
    }

    const { exerciseName } = activeMenu;
    setExerciseToDelete(exerciseName);
    closeAllMenus();
  }, [activeMenu, closeAllMenus]);

  const confirmDeleteExercise = useCallback(() => {
    if (!exerciseToDelete) return;

    removeExercise(exerciseToDelete);
    // Clean up exercise progress for the deleted exercise
    setExerciseProgress((prev) => {
      const { [exerciseToDelete]: _omitted, ...rest } = prev;
      return rest;
    });
    setExerciseToDelete(null);
  }, [exerciseToDelete, removeExercise]);

  const handleHistoryPress = useCallback((exerciseName: string) => {
    console.log('[WorkoutSession] History pressed:', exerciseName);
    console.log('[WorkoutSession] Setting historyModalVisible to true');
    triggerHaptic('selection');
    setActiveMenu(null);
    setHistoryTargetName(exerciseName);
    setHistoryModalVisible(true);
    console.log('[WorkoutSession] State updates dispatched');
  }, []);

  const closeHistoryModal = useCallback(() => {
    setHistoryModalVisible(false);
  }, []);

  const exerciseNames = useMemo(
    () => sessionExercises.map((exercise) => exercise.name),
    [sessionExercises],
  );

  useEffect(() => {
    const signature = JSON.stringify(exerciseNames);

    if (exerciseNamesSignatureRef.current === signature) {
      return;
    }
    const previousNames: string[] = exerciseNamesSignatureRef.current
      ? JSON.parse(exerciseNamesSignatureRef.current)
      : [];

    exerciseNamesSignatureRef.current = signature;

    if (exerciseNames.length === 0) {
      hasInitializedExpansionsRef.current = false;
      hasUserAddedExerciseRef.current = false;
    }

    if (exerciseNames.length === 0) {
      setExpandedExercises((prev) => {
        if (prev.size === 0) {
          return prev;
        }

        return new Set();
      });
      // Clear exercise progress when all exercises are removed
      setExerciseProgress({});
      return;
    }

    setExpandedExercises((prev) => {
      const next = new Set<string>();

      exerciseNames.forEach((name) => {
        if (prev.has(name)) {
          next.add(name);
        }
      });

      if (
        next.size === 0 &&
        exerciseNames.length > 0 &&
        !hasUserAddedExerciseRef.current &&
        !hasInitializedExpansionsRef.current &&
        previousNames.length === 0
      ) {
        next.add(exerciseNames[0]);
        hasInitializedExpansionsRef.current = true;
      }

      if (next.size > 0) {
        hasInitializedExpansionsRef.current = true;
      }

      if (next.size === prev.size && Array.from(prev).every((name) => next.has(name))) {
        return prev;
      }

      return next;
    });
  }, [exerciseNames]);

  const exerciseCount = sessionExercises.length;
  const hasExercises = exerciseCount > 0;

  const completedExercisesCount = useMemo(() => {
    return sessionExercises.filter((exercise) => {
      const totalSets = exerciseProgress[exercise.name]?.totalSets ?? exercise.sets.length;
      const completedSets = exerciseProgress[exercise.name]?.completedSets ?? exercise.sets.filter((set) => set.completed).length;
      return totalSets > 0 && completedSets === totalSets;
    }).length;
  }, [sessionExercises, exerciseProgress]);

  useEffect(() => {
    // If we are explicitly finishing the workout, we handle navigation manually.
    if (isFinishingWorkout) return;

    if (!isSessionActive || !currentSession) {
      router.replace('/(tabs)/workout');
    }
  }, [currentSession, isSessionActive, router, isFinishingWorkout]);

  /* Manual sheet logic removed for SheetModal */

  const listHeaderComponent = useMemo(() => (
    <View style={styles.listHeader}>
      <View style={styles.headerCard}>
        <Text variant="heading2" color="primary">{activePlanName ?? 'Current Session'}</Text>
        <View style={styles.headerRow}>
          <View style={styles.headerStat}>
            <Text variant="label" color="secondary">
              Elapsed Time
            </Text>
            <Text variant="heading3" color="primary">{formatElapsed(elapsedSeconds)}</Text>
          </View>
          <View style={styles.headerStat}>
            <Text variant="label" color="secondary">
              Completed Exercises
            </Text>
            <Text variant="heading3" color="primary">{completedExercisesCount}/{exerciseCount}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <Text variant="heading3">Exercises</Text>
      </View>
    </View>
  ), [activePlanName, elapsedSeconds, exerciseCount, completedExercisesCount]);

  const tabBarBottomOffset = useMemo(() => insets.bottom + spacing.sm, [insets.bottom]);
  const tabBarMaskHeight = useMemo(
    () => sizing.iconLG + spacing.xs * 2 + spacing.xxxs * 2,
    [],
  );
  const tabBarTopOffset = useMemo(
    () => tabBarBottomOffset + tabBarMaskHeight,
    [tabBarBottomOffset, tabBarMaskHeight],
  );

  const listContentStyle = useMemo(
    () => [
      styles.listContent,
      {
        paddingTop: spacing.sm,
        paddingBottom: spacing.xl,
      },
    ],
    []
  );

  const listFooterComponent = useMemo(
    () => (
      <View
        style={[styles.footerStack, { paddingBottom: 320 }]}
      >
        <Button
          label="Add Exercise"
          variant="ghost"
          size="md"
          onPress={handleAddExercisePress}
          disabled={isFinishingWorkout}
        />
        {hasExercises ? (
          <Button
            label="Finish Workout"
            size="md"
            onPress={handleFinishWorkout}
            disabled={isFinishingWorkout}
            loading={isFinishingWorkout}
          />
        ) : (
          <Button
            label="Cancel Workout"
            variant="ghost"
            size="md"
            onPress={handleCancel}
            disabled={isFinishingWorkout}
            contentStyle={styles.cancelButton}
            textColor={colors.accent.red}
          />
        )}
      </View>
    ),
    [handleAddExercisePress, handleFinishWorkout, handleCancel, hasExercises, isFinishingWorkout]
  );
  const listEmptyComponent = useMemo(
    () => (
      <View
        style={[
          styles.listEmptyContainer,
          { paddingBottom: spacing['2xl'] },
        ]}
      >
        <View style={styles.listEmptyCard}>
          <Text variant="heading3">No exercises yet.</Text>
        </View>
      </View>
    ),
    [tabBarTopOffset]
  );
  const renderExerciseSeparator = useCallback(() => <View style={styles.exerciseSeparator} />, []);

  // If we are active or have a session to display (even if finishing), render the UI.
  // Otherwise return null to allow redirect effect to handle navigation.
  if ((!isSessionActive || !currentSession) && !isFinishingWorkout) {
    return null;
  }

  return (
    <View style={[styles.safeAreaRoot, { paddingTop: insets.top, backgroundColor: theme.surface.tint }]}>
      <StatusBar style="dark" backgroundColor="transparent" translucent />
      <View style={styles.root}>
        {activeMenu?.type === 'exercise' ? (
          <Pressable style={styles.menuBackdrop} onPress={closeAllMenus} accessibilityLabel="Dismiss exercise menu" />
        ) : null}
        <FlatList
          data={sessionExercises}
          keyExtractor={(item) => item.name}
          style={[styles.list, { marginBottom: tabBarTopOffset }]}
          contentContainerStyle={listContentStyle}
          extraData={{ expandedExercises: Array.from(expandedExercises), exerciseProgress, activeMenu }}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          ListHeaderComponent={listHeaderComponent}
          ListEmptyComponent={listEmptyComponent}
          ListFooterComponent={listFooterComponent}
          ItemSeparatorComponent={renderExerciseSeparator}
          renderItem={({ item, index }) => {
            const totalSets = exerciseProgress[item.name]?.totalSets ?? item.sets.length;
            const completedSets = exerciseProgress[item.name]?.completedSets ?? item.sets.filter((set) => set.completed).length;
            const isComplete = totalSets > 0 && completedSets === totalSets;
            const isExpanded = expandedExercises.has(item.name);

            const badgeGradientColors: readonly [ColorValue, ColorValue] = [
              colors.accent.gradientStart,
              colors.accent.gradientEnd,
            ];

            const isMenuOpen = activeMenu?.type === 'exercise' && activeMenu.exerciseName === item.name;

            return (
              <Animated.View
                layout={Layout.duration(200)}
                style={[styles.exerciseItem, isMenuOpen && styles.exerciseItemMenuActive]}
              >
                <View style={[styles.exerciseCard, isMenuOpen && styles.exerciseCardMenuActive]}>
                  <Pressable
                    style={[styles.exerciseHeader, { minHeight: spacing.md }]}
                    onPress={() => handleToggleExercise(item.name)}
                    hitSlop={spacing.sm}
                    pressRetentionOffset={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
                    android_ripple={{ color: colors.surface.subtle }}
                    accessibilityLabel={`Toggle exercise ${item.name}`}
                  >
                    <View style={styles.exerciseCardRow}>
                      <View style={styles.badgeContainer}>
                        {isComplete ? (
                          <LinearGradient
                            colors={badgeGradientColors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.badge}
                          >
                            <Text variant="bodySemibold" color="onAccent">
                              {index + 1}
                            </Text>
                          </LinearGradient>
                        ) : (
                          <View style={styles.badgeNeutral}>
                            <Text variant="bodySemibold" color="primary">
                              {index + 1}
                            </Text>
                          </View>
                        )}
                        <View style={styles.cardBody}>
                          <View style={styles.exerciseNameContainer}>
                            <Text variant="bodySemibold">{item.name}</Text>
                          </View>
                          <View style={styles.cardMeta}>
                            <Text
                              variant="bodySemibold"
                              color="secondary"
                              style={styles.completionText}
                            >
                              {`${completedSets}/${totalSets || 0}`}
                            </Text>
                            <Pressable
                              style={styles.menuButton}
                              onPress={(event) => {
                                event.stopPropagation();
                                if (isMenuOpen) {
                                  closeAllMenus();
                                } else {
                                  // Get button position and open menu
                                  const target = event.currentTarget as any;
                                  target.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
                                    openExerciseMenu(item.name, pageX, pageY, width, height);
                                  });
                                }
                              }}
                            >
                              <MaterialCommunityIcons
                                name="dots-vertical"
                                size={sizing.iconSM}
                                color={colors.overlay.navigation}
                              />
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    </View>
                  </Pressable>

                  {/* Menu is now rendered at root level */}

                  {isExpanded ? (
                    <View style={styles.exerciseContent} pointerEvents="box-none">
                      <ExerciseSetEditor
                        isExpanded
                        embedded
                        exerciseName={item.name}
                        initialSets={item.sets}
                        onSetsChange={(updatedSets) => handleExerciseSetsChange(item.name, updatedSets)}
                        onProgressChange={(progress) => handleExerciseProgressChange(item.name, progress)}
                        exerciseType={exerciseCatalog.find(e => e.name === item.name)?.exerciseType || 'weight'}
                        historySetCount={sessionToDisplay?.historySetCounts?.[item.name] ?? 0}
                        supportsGpsTracking={exerciseCatalog.find(e => e.name === item.name)?.supportsGpsTracking ?? false}
                        activeSetMenuIndex={activeMenu?.type === 'set' && activeMenu.exerciseName === item.name ? activeMenu.setIndex : null}
                        onOpenSetMenu={(index) => handleOpenSetMenu(item.name, index)}
                        onCloseSetMenu={closeAllMenus}
                        onShowHistory={() => handleHistoryPress(item.name)}
                      />
                    </View>
                  ) : null}
                </View>
              </Animated.View>
            );
          }}
        />
      </View>

      <SheetModal
        visible={pickerVisible}
        onClose={dismissPicker}
        title={replaceTargetName ? 'Replace Exercise' : 'Add Exercise'}
        headerContent={
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search by name or category"
            placeholderTextColor={colors.text.tertiary}
            style={styles.searchInput}
          />
        }
      >
        <FlatList
          ref={pickerListRef}
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          style={styles.modalList}
          contentContainerStyle={styles.modalListContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={(
            <View style={styles.modalEmptyState}>
              <Text variant="body" color="secondary">
                No exercises match that search yet.
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const musclesLabel = getExerciseDisplayTagText({
              muscles: item.muscles,
              exerciseType: item.exerciseType,
            });

            return (
              <Pressable
                style={styles.modalItem}
                onPress={() => handleSelectExercise(item)}
                accessibilityRole="button"
                accessibilityLabel={replaceTargetName ? `Replace with ${item.name}` : `Add ${item.name}`}
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
                dismissPicker();
                setCreateExerciseModalVisible(true);
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
      </SheetModal>
      {/* Render menu at root level for reliable touch handling */}
      {activeMenu?.type === 'exercise' && (
        <View style={[styles.menuPopover, { top: menuPosition.top, right: menuPosition.right }]} pointerEvents="auto">
          <Pressable
            style={styles.menuPopoverItem}
            onPress={() => {
              console.log('[Menu] History item pressed');
              handleHistoryPress(activeMenu.exerciseName);
            }}
          >
            <Text variant="body">History</Text>
          </Pressable>
          <Pressable
            style={styles.menuPopoverItem}
            onPress={() => {
              console.log('[Menu] Replace item pressed');
              handleReplaceExercisePress(activeMenu.exerciseName);
            }}
          >
            <Text variant="body">Replace Exercise</Text>
          </Pressable>
          <Pressable
            style={styles.menuPopoverItem}
            onPress={() => {
              console.log('[Menu] Delete item pressed');
              handleDeleteExercise();
            }}
          >
            <Text variant="body" color="warning">Delete</Text>
          </Pressable>
        </View>
      )}
      <ExerciseHistoryModal
        visible={historyModalVisible}
        onClose={closeHistoryModal}
        exerciseName={historyTargetName}
        exerciseType={exerciseCatalog.find(e => e.name === historyTargetName)?.exerciseType}
      />
      <FinishConfirmationModal
        visible={finishModalVisible}
        onClose={() => setFinishModalVisible(false)}
        onConfirm={handleConfirmFinish}
        isLoading={isFinishingWorkout}
      />
      <CreateExerciseModal
        visible={createExerciseModalVisible}
        onClose={() => setCreateExerciseModalVisible(false)}
        onExerciseCreated={(exerciseName, exerciseType) => {
          // Find the newly created exercise and add it to the session
          const newExercise = exerciseCatalog.find(e => e.name === exerciseName);
          if (newExercise) {
            handleSelectExercise(newExercise);
          }
          setCreateExerciseModalVisible(false);
        }}
      />
      <DeleteConfirmationModal
        visible={!!exerciseToDelete}
        onClose={() => setExerciseToDelete(null)}
        onConfirm={confirmDeleteExercise}
        title="Remove Exercise?"
        message="Are you sure you want to remove this exercise from your session? All progress for this exercise will be lost."
        confirmLabel="Remove"
        cancelLabel="Keep"
      />
    </View>
  );
};

export default WorkoutSessionScreen;

const styles = StyleSheet.create({
  safeAreaRoot: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  list: {
    flex: 1,
  },
  headerCard: {
    paddingVertical: spacing.mdCompact,
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.accent.orange,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.mdCompact,
    flex: 1,
  },
  headerStat: {
    flex: 1,
    gap: spacing.xxs,
  },
  listHeader: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  exerciseItem: {
    gap: spacing.sm,
    overflow: 'visible',
  },
  exerciseItemMenuActive: {
    zIndex: zIndex.dropdown,
    elevation: 10, // Ensure it floats above other items on Android
  },
  sectionHeading: {
    marginTop: spacing.sm,
  },
  exerciseCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: colors.accent.orange,
    overflow: 'visible',
    position: 'relative',
  },
  exerciseCardMenuActive: {
    borderColor: colors.accent.orange,
    elevation: 11, // Ensure card is above item
  },
  exerciseCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  exerciseHeader: {
    paddingVertical: spacing.sm,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    width: sizing.iconLG,
    height: sizing.iconLG,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent.gradientStart,
  },
  badgeNeutral: {
    width: sizing.iconLG,
    height: sizing.iconLG,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.accent.orange,
  },
  cardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    minHeight: sizing.iconLG,
  },
  exerciseNameContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  completionText: {
    textAlign: 'right',
  },
  exerciseContent: {
    paddingTop: spacing.sm,
  },
  menuButton: {
    padding: spacing.sm,
  },
  menuPopover: {
    position: 'absolute',
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent.orange,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    zIndex: zIndex.modal,
    elevation: 10,
    minWidth: 150,
  },
  menuPopoverItem: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.overlay.scrimTransparent,
    zIndex: zIndex.dropdown - 1,
  },
  bottomSafeFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: zIndex.base,
  },
  bottomTabMask: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    zIndex: zIndex.dropdown,
  },
  exerciseSeparator: {
    height: spacing.md,
  },
  footerStack: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  listEmptyContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  listEmptyCard: {
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent.orange,
    backgroundColor: colors.surface.card,
    padding: spacing.lg,
  },
  /* styles removed */
  searchInput: {
    borderWidth: 1,
    borderColor: colors.accent.orange,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    color: colors.text.primary,
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
    paddingBottom: spacing.lg,
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
  },
  createExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  cancelButton: {
    backgroundColor: colors.surface.card,
    borderWidth: 1.5,
    borderColor: colors.accent.red,
    borderRadius: radius.lg,
  },
});
