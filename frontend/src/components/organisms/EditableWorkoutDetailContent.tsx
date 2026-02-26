/**
 * EditableWorkoutDetailContent
 * Organism that renders editable exercise list for workout session editing.
 * Summary section auto-updates based on exercise data.
 */

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TextInput, Pressable, FlatList } from 'react-native';
import Animated, { Layout, FadeIn, FadeOut } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { TimePickerModal } from '@/components/molecules/TimePickerModal';
import { SheetModal } from '@/components/molecules/SheetModal';
import { CreateExerciseModal } from '@/components/molecules/CreateExerciseModal';
import { spacing, colors, radius, sizing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { exercises as exerciseCatalog, getExerciseTypeByName, createCustomExerciseCatalogItem } from '@/constants/exercises';
import { useCustomExerciseStore } from '@/store/customExerciseStore';
import { triggerHaptic } from '@/utils/haptics';
import { formatDurationLabel, getWorkoutTotals, getWorkoutVolume } from '@/utils/workout';
import { useSemanticExerciseSearch } from '@/hooks/useSemanticExerciseSearch';
import { normalizeSearchText } from '@/utils/strings';
import { getExerciseDisplayTagText } from '@/utils/exerciseDisplayTags';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserProfileStore } from '@/store/userProfileStore';
import type { Workout, WorkoutExercise, SetLog } from '@/types/workout';
import type { ExerciseType, ExerciseCatalogItem } from '@/types/exercise';

interface EditableWorkoutDetailContentProps {
  workout: Workout;
  onExercisesChange: (exercises: WorkoutExercise[]) => void;
}

interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: { name: string; exerciseType: ExerciseType }) => void;
  existingExerciseNames: string[];
}

interface EditableSetRowProps {
  set: SetLog;
  setIndex: number;
  setId: string;
  exerciseType: ExerciseType;
  distanceUnit?: 'miles' | 'meters' | 'floors';
  onSetChange: (index: number, set: SetLog) => void;
  onDeleteSet: (index: number) => void;
}

type ActiveSelectionTarget = {
  type: 'weight' | 'reps' | 'distance' | 'assistance';
  index: number;
};

// Format duration for display (drop leading zero on hours/minutes)
const formatDurationForSummary = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const sanitizeWeightInput = (value: string): string => {
  if (!value) {
    return '';
  }

  const cleaned = value.replace(/[^0-9.]/g, '');
  if (!cleaned) {
    return '';
  }

  const [integerPartRaw, ...decimalParts] = cleaned.split('.');
  const integerPart = integerPartRaw.replace(/^0+(?=\d)/, '') || (decimalParts.length > 0 ? '0' : '');
  const decimalPart = decimalParts.join('').replace(/\./g, '');

  // If there's a decimal point in the input, preserve it even if no digits follow
  if (decimalParts.length > 0) {
    return decimalPart.length > 0 ? `${integerPart}.${decimalPart}` : `${integerPart}.`;
  }

  return integerPart;
};

const sanitizeRepsInput = (value: string): string => {
  if (!value) {
    return '';
  }

  const digitsOnly = value.replace(/[^0-9]/g, '');
  if (!digitsOnly) {
    return '';
  }

  return digitsOnly.replace(/^0+(?=\d)/, '');
};

const EditableSetRow: React.FC<EditableSetRowProps> = ({
  set,
  setIndex,
  setId,
  exerciseType,
  distanceUnit,
  onSetChange,
  onDeleteSet,
}) => {
  const { theme } = useTheme();
  // Subscribe to unit preferences so the row re-renders when units change
  const weightUnit = useSettingsStore((state) => state.weightUnit);
  const distanceUnitPref = useSettingsStore((state) => state.distanceUnit);

  const {
    convertWeight,
    convertWeightToLbs,
    getDistanceUnitForExercise,
    convertDistanceForExercise,
    convertDistanceToMilesForExercise,
  } = useSettingsStore();
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [activeSelection, setActiveSelection] = useState<ActiveSelectionTarget | null>(null);
  
  // Track the last values we sent to parent to distinguish user edits from external changes
  const lastSentValuesRef = useRef({
    weight: set.weight ?? 0,
    reps: set.reps ?? 0,
    distance: set.distance ?? 0,
    assistanceWeight: set.assistanceWeight ?? 0,
  });
  
  const effectiveDistanceUnit = distanceUnit ?? 'miles';
  const distanceUnitLabel = getDistanceUnitForExercise(effectiveDistanceUnit);

  // Helper to convert weight (stored as lbs) for display
  const formatWeightForDisplay = useCallback((weightLbs: number) => {
    if (weightLbs === 0) return '';
    const display = convertWeight(weightLbs);
    return display % 1 === 0 ? display.toFixed(0) : display.toFixed(1);
  }, [convertWeight, weightUnit]);

  // Helper to convert distance (stored as miles) for display
  const formatDistanceForDisplay = useCallback((miles: number) => {
    if (miles === 0) return '';
    const display = convertDistanceForExercise(miles, effectiveDistanceUnit);

    if (effectiveDistanceUnit === 'meters' || effectiveDistanceUnit === 'floors') {
      return Math.round(display).toString();
    }

    return display.toFixed(2);
  }, [convertDistanceForExercise, effectiveDistanceUnit, distanceUnitPref]);
  
  // Local string state for inputs
  const [weightInput, setWeightInput] = useState(() => formatWeightForDisplay(set.weight ?? 0));
  const [repsInput, setRepsInput] = useState(() => set.reps?.toString() ?? '');
  const [distanceInput, setDistanceInput] = useState(() => formatDistanceForDisplay(set.distance ?? 0));
  const [assistanceInput, setAssistanceInput] = useState(() => formatWeightForDisplay(set.assistanceWeight ?? 0));
  
  // Sync local state only when props change from EXTERNAL source (not our own updates)
  useEffect(() => {
    const currentWeight = set.weight ?? 0;
    const currentReps = set.reps ?? 0;
    const currentDistance = set.distance ?? 0;
    const currentAssistance = set.assistanceWeight ?? 0;
    
    // Check if the change came from outside (values differ from what we last sent)
    const weightDiff = Math.abs(currentWeight - lastSentValuesRef.current.weight) > 0.01;
    const repsDiff = currentReps !== lastSentValuesRef.current.reps;
    const distanceDiff = Math.abs(currentDistance - lastSentValuesRef.current.distance) > 0.01;
    const assistanceDiff = Math.abs(currentAssistance - lastSentValuesRef.current.assistanceWeight) > 0.01;
    
    if (weightDiff || repsDiff || distanceDiff || assistanceDiff) {
      // External change (deletion/reorder) - sync local state
      setWeightInput(formatWeightForDisplay(currentWeight));
      setRepsInput(currentReps?.toString() ?? '');
      setDistanceInput(formatDistanceForDisplay(currentDistance));
      setAssistanceInput(formatWeightForDisplay(currentAssistance));
      
      // Update our tracking ref
      lastSentValuesRef.current = {
        weight: currentWeight,
        reps: currentReps,
        distance: currentDistance,
        assistanceWeight: currentAssistance,
      };
    }
  }, [set.weight, set.reps, set.distance, set.assistanceWeight, formatWeightForDisplay, formatDistanceForDisplay]);

  // If units change while the editor is open, update *display* strings from the stored base values.
  useEffect(() => {
    setWeightInput(formatWeightForDisplay(set.weight ?? 0));
    setAssistanceInput(formatWeightForDisplay(set.assistanceWeight ?? 0));
    setDistanceInput(formatDistanceForDisplay(set.distance ?? 0));
  }, [weightUnit, distanceUnitPref, effectiveDistanceUnit]);

  const handleWeightChange = useCallback((text: string) => {
    const sanitized = sanitizeWeightInput(text);
    setActiveSelection(null);
    setWeightInput(sanitized);

    const numValue = sanitized.length > 0 ? parseFloat(sanitized) : 0;
    const weightInLbs = convertWeightToLbs(numValue);

    lastSentValuesRef.current.weight = weightInLbs;
    onSetChange(setIndex, { ...set, weight: weightInLbs });
  }, [set, setIndex, onSetChange, convertWeightToLbs]);

  const handleRepsChange = useCallback((text: string) => {
    const sanitized = sanitizeRepsInput(text);
    setActiveSelection(null);
    setRepsInput(sanitized);
    const numValue = sanitized.length > 0 ? parseInt(sanitized, 10) : 0;
    lastSentValuesRef.current.reps = numValue;
    onSetChange(setIndex, { ...set, reps: numValue });
  }, [set, setIndex, onSetChange]);

  const handleTimePickerConfirm = useCallback((totalSeconds: number) => {
    onSetChange(setIndex, { ...set, duration: totalSeconds });
    setIsTimePickerVisible(false);
  }, [set, setIndex, onSetChange]);

  const handleDistanceChange = useCallback((text: string) => {
    const sanitized = sanitizeWeightInput(text);
    setActiveSelection(null);
    setDistanceInput(sanitized);

    const numValue = sanitized.length > 0 ? parseFloat(sanitized) : 0;
    const milesValue = convertDistanceToMilesForExercise(numValue, effectiveDistanceUnit);

    lastSentValuesRef.current.distance = milesValue;
    onSetChange(setIndex, { ...set, distance: milesValue });
  }, [set, setIndex, onSetChange, convertDistanceToMilesForExercise, effectiveDistanceUnit]);

  const handleAssistanceChange = useCallback((text: string) => {
    const sanitized = sanitizeWeightInput(text);
    setActiveSelection(null);
    setAssistanceInput(sanitized);

    const numValue = sanitized.length > 0 ? parseFloat(sanitized) : 0;
    const weightInLbs = convertWeightToLbs(numValue);

    lastSentValuesRef.current.assistanceWeight = weightInLbs;
    onSetChange(setIndex, { ...set, assistanceWeight: weightInLbs });
  }, [set, setIndex, onSetChange, convertWeightToLbs]);

  const renderInputs = () => {
    switch (exerciseType) {
      case 'cardio':
        return (
          <>
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.metricInput, { backgroundColor: theme.surface.card, color: theme.text.primary, borderColor: theme.accent.orangeMuted }]}
                value={distanceInput}
                onChangeText={handleDistanceChange}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.text.tertiary}
                textAlign="center"
                cursorColor={theme.accent.primary}
                selectionColor={theme.accent.orangeLight}
              />
              <Text variant="caption" color="secondary">{distanceUnitLabel}</Text>
            </View>
            <Pressable 
              style={[styles.timeDisplayButton, { borderColor: theme.accent.orangeMuted, backgroundColor: theme.surface.card }]}
              onPress={() => setIsTimePickerVisible(true)}
            >
              <Text style={[styles.timeDisplayText, { color: theme.text.primary }]}>
                {formatDurationForSummary(set.duration ?? 0)}
              </Text>
            </Pressable>
          </>
        );

      case 'duration':
        return (
          <Pressable 
            style={[styles.timeDisplayButton, { borderColor: theme.accent.orangeMuted, backgroundColor: theme.surface.card }]}
            onPress={() => setIsTimePickerVisible(true)}
          >
            <Text style={[styles.timeDisplayText, { color: theme.text.primary }]}>
              {formatDurationForSummary(set.duration ?? 0)}
            </Text>
          </Pressable>
        );

      case 'assisted':
        return (
          <>
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.metricInput, { backgroundColor: theme.surface.card, color: theme.text.primary, borderColor: theme.accent.orangeMuted }]}
                value={assistanceInput}
                onChangeText={handleAssistanceChange}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.text.tertiary}
                textAlign="center"
                cursorColor={theme.accent.primary}
                selectionColor={theme.accent.orangeLight}
              />
              <Text variant="caption" color="secondary">{weightUnit}</Text>
            </View>
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.metricInput, { backgroundColor: theme.surface.card, color: theme.text.primary, borderColor: theme.accent.orangeMuted }]}
                value={repsInput}
                onChangeText={handleRepsChange}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.text.tertiary}
                textAlign="center"
                cursorColor={theme.accent.primary}
                selectionColor={theme.accent.orangeLight}
              />
              <Text variant="caption" color="secondary">reps</Text>
            </View>
          </>
        );

      case 'weight':
      default:
        return (
          <>
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.metricInput, { backgroundColor: theme.surface.card, color: theme.text.primary, borderColor: theme.accent.orangeMuted }]}
                value={weightInput}
                onChangeText={handleWeightChange}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.text.tertiary}
                textAlign="center"
                cursorColor={theme.accent.primary}
                selectionColor={theme.accent.orangeLight}
              />
              <Text variant="caption" color="secondary">{weightUnit}</Text>
            </View>
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.metricInput, { backgroundColor: theme.surface.card, color: theme.text.primary, borderColor: theme.accent.orangeMuted }]}
                value={repsInput}
                onChangeText={handleRepsChange}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.text.tertiary}
                textAlign="center"
                cursorColor={theme.accent.primary}
                selectionColor={theme.accent.orangeLight}
              />
              <Text variant="caption" color="secondary">reps</Text>
            </View>
          </>
        );
    }
  };

  return (
    <>
      <Animated.View 
        entering={FadeIn.duration(200)} 
        exiting={FadeOut.duration(200)}
        layout={Layout.springify()}
        style={[styles.setRow, { backgroundColor: theme.surface.subtle }]}
      >
        <View 
          style={[
            styles.setCircle, 
            { backgroundColor: theme.surface.card, borderColor: theme.accent.orangeMuted }
          ]}
        >
          <Text variant="bodySemibold" style={[styles.setCircleText, { color: theme.text.secondary }]}>
            {setIndex + 1}
          </Text>
        </View>
        
        <View style={styles.inputsContainer}>
          {renderInputs()}
        </View>
        
        <Pressable 
          style={styles.deleteSetButton}
          onPress={() => {
            triggerHaptic('selection');
            onDeleteSet(setIndex);
          }}
        >
          <MaterialCommunityIcons name="close" size={18} color={theme.text.tertiary} />
        </Pressable>
      </Animated.View>
      <TimePickerModal
        visible={isTimePickerVisible}
        onClose={() => setIsTimePickerVisible(false)}
        onConfirm={handleTimePickerConfirm}
        initialSeconds={set.duration ?? 0}
      />
    </>
  );
};

const AddExerciseModal: React.FC<AddExerciseModalProps> = ({
  visible,
  onClose,
  onSelectExercise,
  existingExerciseNames,
}) => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  
  const customExercises = useCustomExerciseStore((state) => state.customExercises);
  const allExercises = useMemo<ExerciseCatalogItem[]>(() => {
    const customCatalogItems = customExercises.map((ce) =>
      createCustomExerciseCatalogItem(ce.id, ce.name, ce.exerciseType, ce.supportsGpsTracking)
    );
    return [...exerciseCatalog, ...customCatalogItems];
  }, [customExercises]);

  const semanticResults = useSemanticExerciseSearch(searchTerm, allExercises, {
    limit: allExercises.length,
  });

  const filteredExercises = useMemo(() => {
    const trimmedQuery = searchTerm.trim();
    let candidates = allExercises;

    if (trimmedQuery) {
      if (semanticResults.length > 0) {
        candidates = semanticResults;
      } else {
        const normalizedQuery = normalizeSearchText(trimmedQuery);
        if (normalizedQuery) {
          const tokens = normalizedQuery.split(' ').filter(Boolean);
          if (tokens.length > 0) {
            candidates = allExercises.filter((exercise) => {
              const normalizedName = normalizeSearchText(exercise.name);
              const target = `${normalizedName} ${exercise.searchIndex}`;
              return tokens.every((token) => target.includes(token));
            });
          }
        }
      }
    }

    // Filter out exercises already in the workout
    const existingNames = new Set(existingExerciseNames);
    const filtered = candidates.filter((exercise) => !existingNames.has(exercise.name));

    // Only sort alphabetically when NOT searching - preserve relevance ranking when searching
    if (!trimmedQuery) {
      return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [searchTerm, semanticResults, existingExerciseNames, allExercises]);

  const handleOpenCreateModal = useCallback(() => {
    triggerHaptic('selection');
    onClose();
    setIsCreateModalVisible(true);
  }, [onClose]);

  const handleExerciseCreated = useCallback((exerciseName: string, exerciseType: ExerciseType) => {
    onSelectExercise({ name: exerciseName, exerciseType });
    setSearchTerm('');
    setIsCreateModalVisible(false);
  }, [onSelectExercise]);
  
  return (
    <>
      <SheetModal
        visible={visible}
        onClose={onClose}
        title="Add Exercise"
        headerContent={
          <TextInput
            style={[styles.searchInput, { borderColor: theme.accent.orange, color: theme.text.primary }]}
            placeholder="Search by name or category"
            placeholderTextColor={theme.text.tertiary}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        }
      >
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          style={styles.modalList}
          contentContainerStyle={styles.modalListContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <View style={styles.modalEmptyState}>
              <Text variant="body" color="secondary">
                No exercises match that search yet.
              </Text>
              <Pressable
                onPress={handleOpenCreateModal}
                style={styles.createExerciseRow}
                accessibilityRole="button"
                accessibilityLabel="Create a new custom exercise"
              >
                <MaterialCommunityIcons name="plus-circle-outline" size={sizing.iconMD} color={theme.accent.primary} />
                <Text variant="bodySemibold" style={{ color: theme.accent.primary }}>
                  Create Exercise
                </Text>
              </Pressable>
            </View>
          }
          ListFooterComponent={
            <Pressable
              onPress={handleOpenCreateModal}
              style={styles.createExerciseRow}
              accessibilityRole="button"
              accessibilityLabel="Create a new custom exercise"
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={sizing.iconMD} color={theme.accent.primary} />
              <Text variant="bodySemibold" style={{ color: theme.accent.primary }}>
                Create Exercise
              </Text>
            </Pressable>
          }
          renderItem={({ item }) => {
            const musclesLabel = getExerciseDisplayTagText({
              muscles: item.muscles,
              exerciseType: item.exerciseType || 'weight',
            });

            return (
              <Pressable
                style={styles.modalItem}
                onPress={() => {
                  triggerHaptic('selection');
                  onSelectExercise({ name: item.name, exerciseType: item.exerciseType });
                  setSearchTerm('');
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.name}`}
              >
                <Text variant="bodySemibold" color="primary">{item.name}</Text>
                <Text variant="caption" color="secondary">{musclesLabel || 'General'}</Text>
              </Pressable>
            );
          }}
        />
      </SheetModal>
      <CreateExerciseModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onExerciseCreated={handleExerciseCreated}
      />
    </>
  );
};

export const EditableWorkoutDetailContent: React.FC<EditableWorkoutDetailContentProps> = ({ 
  workout,
  onExercisesChange,
}) => {
  const { theme } = useTheme();
  const weightUnit = useSettingsStore((state) => state.weightUnit);
  const { formatWeight } = useSettingsStore();
  const [isAddExerciseModalVisible, setIsAddExerciseModalVisible] = useState(false);
  const durationLabel = useMemo(() => formatDurationLabel(workout.duration), [workout.duration]);
  const { completedSets } = useMemo(() => getWorkoutTotals(workout), [workout]);
  const userBodyWeight = useUserProfileStore((state) => state.profile?.weightLbs);
  const totalVolume = useMemo(() => getWorkoutVolume(workout, userBodyWeight), [workout, userBodyWeight]);
  const volumeLabel = useMemo(() => {
    if (totalVolume === 0) return '—';
    return formatWeight(totalVolume);
  }, [totalVolume, formatWeight, weightUnit]);
  
  const existingExerciseNames = useMemo(() => 
    workout.exercises.map(ex => ex.name), 
    [workout.exercises]
  );

  const handleSetChange = useCallback((exerciseIndex: number, setIndex: number, updatedSet: SetLog) => {
    const newExercises = [...workout.exercises];
    newExercises[exerciseIndex] = {
      ...newExercises[exerciseIndex],
      sets: newExercises[exerciseIndex].sets.map((s, i) => i === setIndex ? updatedSet : s),
    };
    onExercisesChange(newExercises);
  }, [workout.exercises, onExercisesChange]);

  const handleDeleteSet = useCallback((exerciseIndex: number, setIndex: number) => {
    const newExercises = [...workout.exercises];
    newExercises[exerciseIndex] = {
      ...newExercises[exerciseIndex],
      sets: newExercises[exerciseIndex].sets.filter((_, i) => i !== setIndex),
    };
    onExercisesChange(newExercises);
  }, [workout.exercises, onExercisesChange]);

  const handleAddSet = useCallback((exerciseIndex: number) => {
    triggerHaptic('selection');
    const exercise = workout.exercises[exerciseIndex];
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet: SetLog = lastSet 
      ? { ...lastSet, completed: false }
      : { weight: 0, reps: 8, completed: false };
    
    const newExercises = [...workout.exercises];
    newExercises[exerciseIndex] = {
      ...newExercises[exerciseIndex],
      sets: [...newExercises[exerciseIndex].sets, newSet],
    };
    onExercisesChange(newExercises);
  }, [workout.exercises, onExercisesChange]);

  const handleDeleteExercise = useCallback((exerciseIndex: number) => {
    triggerHaptic('selection');
    const newExercises = workout.exercises.filter((_, i) => i !== exerciseIndex);
    onExercisesChange(newExercises);
  }, [workout.exercises, onExercisesChange]);
  
  const handleAddExercise = useCallback((exercise: { name: string; exerciseType: ExerciseType }) => {
    triggerHaptic('selection');
    const newExercise: WorkoutExercise = {
      name: exercise.name,
      sets: [{ weight: 0, reps: 8, completed: true }],
    };
    onExercisesChange([...workout.exercises, newExercise]);
  }, [workout.exercises, onExercisesChange]);
  
  const handleMoveExercise = useCallback((exerciseIndex: number, direction: 'up' | 'down') => {
    triggerHaptic('selection');
    const newExercises = [...workout.exercises];
    const targetIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= newExercises.length) return;
    
    [newExercises[exerciseIndex], newExercises[targetIndex]] = 
      [newExercises[targetIndex], newExercises[exerciseIndex]];
    
    onExercisesChange(newExercises);
  }, [workout.exercises, onExercisesChange]);

  return (
    <Animated.View layout={Layout.springify()} style={[styles.container, { paddingBottom: 100 }]}>
      <View style={styles.summarySection}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: theme.text.secondary }}>
          Summary
        </Text>
        <SurfaceCard tone="card" padding="xl" showAccentStripe={false} style={styles.metricsCard}>
          <View style={styles.metricsColumn}>
            <View style={styles.metricRow}>
              <Text style={{ fontSize: 20, fontWeight: '500', color: theme.text.secondary }}>
                Duration:
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.accent.orange, textAlign: 'right', flexShrink: 0 }}>
                {durationLabel}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={{ fontSize: 20, fontWeight: '500', color: theme.text.secondary }}>
                Sets:
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.accent.orange, textAlign: 'right', flexShrink: 0 }}>
                {completedSets}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={{ fontSize: 20, fontWeight: '500', color: theme.text.secondary }}>
                Volume:
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.accent.orange, textAlign: 'right', flexShrink: 0 }}>
                {volumeLabel}
              </Text>
            </View>
          </View>
        </SurfaceCard>
      </View>

      <View style={styles.exerciseSection}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: theme.text.secondary }}>
          Exercises
        </Text>
        <View style={styles.exerciseList}>
          {workout.exercises.map((exercise, exerciseIndex) => {
            const catalogEntry = exerciseCatalog.find(e => e.name === exercise.name);
            const exerciseType: ExerciseType = getExerciseTypeByName(exercise.name, useCustomExerciseStore.getState().customExercises);
            const exerciseDistanceUnit = catalogEntry?.distanceUnit;

            return (
              <Animated.View 
                key={`${exercise.name}-${exerciseIndex}`}
                layout={Layout.springify()}
              >
                <SurfaceCard 
                  tone="card" 
                  padding="lg" 
                  showAccentStripe={false} 
                  style={[styles.exerciseCard, { borderColor: theme.accent.orangeMuted }]}
                >
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseTitleGroup}>
                      <Text style={{ fontSize: 18, fontWeight: '500', color: theme.text.secondary }}>
                        {exercise.name}
                      </Text>
                    </View>
                    <View style={styles.exerciseActions}>
                      <Pressable
                        style={[styles.reorderButton, { opacity: exerciseIndex === 0 ? 0.3 : 1 }]}
                        onPress={() => handleMoveExercise(exerciseIndex, 'up')}
                        disabled={exerciseIndex === 0}
                      >
                        <MaterialCommunityIcons name="chevron-up" size={22} color={theme.text.secondary} />
                      </Pressable>
                      <Pressable
                        style={[styles.reorderButton, { opacity: exerciseIndex === workout.exercises.length - 1 ? 0.3 : 1 }]}
                        onPress={() => handleMoveExercise(exerciseIndex, 'down')}
                        disabled={exerciseIndex === workout.exercises.length - 1}
                      >
                        <MaterialCommunityIcons name="chevron-down" size={22} color={theme.text.secondary} />
                      </Pressable>
                      <Pressable
                        style={styles.deleteExerciseButton}
                        onPress={() => handleDeleteExercise(exerciseIndex)}
                      >
                        <MaterialCommunityIcons 
                          name="trash-can-outline" 
                          size={20} 
                          color={theme.accent.orange} 
                        />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.setList}>
                    {exercise.sets.map((set, setIndex) => (
                      <EditableSetRow
                        key={`set-${exerciseIndex}-${setIndex}`}
                        set={set}
                        setIndex={setIndex}
                        setId={`${exerciseIndex}-${setIndex}`}
                        exerciseType={exerciseType}
                        distanceUnit={exerciseDistanceUnit}
                        onSetChange={(idx, updatedSet) => handleSetChange(exerciseIndex, idx, updatedSet)}
                        onDeleteSet={(idx) => handleDeleteSet(exerciseIndex, idx)}
                      />
                    ))}
                  </View>

                  <Pressable 
                    style={[styles.addSetButton, { borderColor: theme.accent.orangeMuted }]}
                    onPress={() => handleAddSet(exerciseIndex)}
                  >
                    <MaterialCommunityIcons name="plus" size={18} color={theme.accent.orange} />
                    <Text variant="bodySemibold" style={{ color: theme.accent.orange }}>
                      Add Set
                    </Text>
                  </Pressable>
                </SurfaceCard>
              </Animated.View>
            );
          })}
          
          <Pressable 
            style={[styles.addExerciseButton, { borderColor: theme.accent.orangeMuted }]}
            onPress={() => {
              triggerHaptic('selection');
              setIsAddExerciseModalVisible(true);
            }}
          >
            <MaterialCommunityIcons name="plus" size={20} color={theme.accent.orange} />
            <Text variant="bodySemibold" style={{ color: theme.accent.orange }}>
              Add Exercise
            </Text>
          </Pressable>
        </View>
      </View>
      
      <AddExerciseModal
        visible={isAddExerciseModalVisible}
        onClose={() => setIsAddExerciseModalVisible(false)}
        onSelectExercise={handleAddExercise}
        existingExerciseNames={existingExerciseNames}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing['2xl'],
  },
  metricsCard: {
    gap: spacing.lg,
    overflow: 'hidden',
  },
  metricsColumn: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summarySection: {
    gap: spacing.md,
  },
  exerciseSection: {
    gap: spacing.md,
  },
  exerciseList: {
    gap: spacing.md,
  },
  exerciseCard: {
    gap: spacing.md,
    borderWidth: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseTitleGroup: {
    flex: 1,
    gap: spacing.xs,
    flexShrink: 1,
  },
  deleteExerciseButton: {
    padding: spacing.xs,
    borderRadius: radius.full,
  },
  setList: {
    gap: spacing.sm,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
    borderRadius: radius.md,
  },
  setCircle: {
    width: sizing.iconLG,
    height: sizing.iconLG,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  setCircleCompleted: {
  },
  setCircleText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
    includeFontPadding: false,
  },
  inputsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  setInput: {
    minWidth: 60,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  metricInput: {
    minWidth: 60,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  deleteSetButton: {
    padding: spacing.xs,
    borderRadius: radius.full,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  timeDisplayButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplayText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
    marginHorizontal: 0,
  },
  exerciseListModal: {
    flex: 1,
  },
  exerciseListItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.xxs,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: spacing.sm,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reorderButton: {
    padding: spacing.xs,
    borderRadius: radius.full,
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
  modalEmptyState: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  modalItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    minHeight: 'auto',
  },
  createExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  spacer: {
    height: spacing.xl * 2,
  },
});
