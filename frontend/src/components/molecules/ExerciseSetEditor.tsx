/**
 * ExerciseSetEditor
 * Inline drop-down editor for workout exercise sets.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { springGentle } from '@/constants/animations';
import { colors, radius, shadows, sizing, spacing, zIndex } from '@/constants/theme';
import type { SetLog } from '@/types/workout';
import type { ExerciseType } from '@/types/exercise';
import { useSettingsStore } from '@/store/settingsStore';

interface ExerciseSetEditorProps {
  isExpanded: boolean;
  exerciseName: string;
  initialSets: SetLog[];
  onSetsChange: (sets: SetLog[]) => void;
  onProgressChange?: (progress: { completedSets: number; totalSets: number }) => void;
  embedded?: boolean;
  exerciseType?: ExerciseType;
  distanceUnit?: 'miles' | 'meters' | 'floors';
}

const DEFAULT_NEW_SET: SetLog = {
  reps: 8,
  weight: 0,
  completed: false,
};

interface SetDraft extends SetLog {
  weightInput: string;
  repsInput: string;
  durationInput: string;      // For cardio (minutes) and duration (seconds)
  distanceInput: string;      // For cardio
  assistanceWeightInput: string; // For assisted
}

type ActiveSelectionTarget = {
  type: 'weight' | 'reps';
  index: number;
};

const formatWeightInputValue = (value: number): string => {
  return value.toFixed(1);
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const parseDuration = (input: string): number => {
  // Handle mm:ss format or just seconds
  if (input.includes(':')) {
    const [mins, secs] = input.split(':').map(Number);
    return (mins || 0) * 60 + (secs || 0);
  }
  return parseInt(input, 10) || 0;
};

const createDraftFromSet = (set: SetLog): SetDraft => ({
  ...set,
  weightInput: formatWeightInputValue(set.weight ?? 0),
  repsInput: String(set.reps ?? 0),
  durationInput: set.duration ? formatDuration(set.duration) : '0:00',
  distanceInput: String(set.distance ?? 0),
  assistanceWeightInput: formatWeightInputValue(set.assistanceWeight ?? 0),
});

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

const AUTO_SAVE_DEBOUNCE_MS = 120;

const mapDraftsToSetLogs = (drafts: SetDraft[]): SetLog[] =>
  drafts.map((draft) => ({
    completed: Boolean(draft.completed),
    // Weight exercises
    reps: draft.reps !== undefined ? Math.max(draft.reps, 0) : undefined,
    weight: draft.weight !== undefined ? Math.max(draft.weight, 0) : undefined,
    // Cardio exercises
    duration: draft.duration !== undefined ? Math.max(draft.duration, 0) : undefined,
    distance: draft.distance !== undefined ? Math.max(draft.distance, 0) : undefined,
    // Assisted exercises
    assistanceWeight: draft.assistanceWeight !== undefined ? Math.max(draft.assistanceWeight, 0) : undefined,
  }));

export const ExerciseSetEditor: React.FC<ExerciseSetEditorProps> = ({
  isExpanded,
  exerciseName,
  initialSets,
  onSetsChange,
  onProgressChange,
  embedded = false,
  exerciseType = 'weight',
  distanceUnit = 'miles',
}) => {
  const { getWeightUnit, formatWeight, getDistanceUnitShort, formatDistance, convertDistance, convertDistanceToMiles } = useSettingsStore();
  const weightUnit = getWeightUnit();
  const distanceUnitLabel = getDistanceUnitShort();
  const [sets, setSets] = useState<SetDraft[]>(() => initialSets.map((set) => createDraftFromSet(set)));
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const [activeSelection, setActiveSelection] = useState<ActiveSelectionTarget | null>(null);

  const containerStyle = embedded ? [styles.container, styles.containerEmbedded] : styles.container;
  const contentStyle = embedded ? [styles.contentEmbedded] : styles.content;
  const skipNextEmitRef = useRef(true);
  const emitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedSignatureRef = useRef<string | null>(null);
  const prevIsExpandedRef = useRef<boolean>(isExpanded);
  const onSetsChangeRef = useRef<(sets: SetLog[]) => void>(onSetsChange);
  const onProgressChangeRef = useRef<((progress: { completedSets: number; totalSets: number }) => void) | null>(
    onProgressChange ?? null,
  );

  const initialSignature = useMemo(() => JSON.stringify(initialSets), [initialSets]);

  useEffect(() => {
    onSetsChangeRef.current = onSetsChange;
  }, [onSetsChange]);

  useEffect(() => {
    onProgressChangeRef.current = onProgressChange ?? null;
  }, [onProgressChange]);

  useEffect(() => {
    const wasExpanded = prevIsExpandedRef.current;
    prevIsExpandedRef.current = isExpanded;

    if (!isExpanded) {
      return;
    }

    const shouldHydrate = !wasExpanded || lastSyncedSignatureRef.current !== initialSignature;

    if (!shouldHydrate) {
      return;
    }

    skipNextEmitRef.current = true;
    setSets(initialSets.map((set) => createDraftFromSet(set)));
    setOpenMenuIndex(null);
    lastSyncedSignatureRef.current = initialSignature;
  }, [initialSignature, initialSets, isExpanded]);

  const hasSets = useMemo(() => sets.length > 0, [sets.length]);

  useEffect(() => {
    if (!onProgressChangeRef.current) {
      return;
    }

    const completedCount = sets.filter((set) => set.completed).length;
    onProgressChangeRef.current({ completedSets: completedCount, totalSets: sets.length });
  }, [sets]);

  useEffect(() => {
    if (skipNextEmitRef.current) {
      skipNextEmitRef.current = false;
      return;
    }

    if (emitTimerRef.current) {
      clearTimeout(emitTimerRef.current);
    }

    emitTimerRef.current = setTimeout(() => {
      const nextSets = mapDraftsToSetLogs(sets);
      lastSyncedSignatureRef.current = JSON.stringify(nextSets);
      onSetsChangeRef.current(nextSets);
    }, AUTO_SAVE_DEBOUNCE_MS);
  }, [sets]);

  useEffect(() => {
    return () => {
      if (emitTimerRef.current) {
        clearTimeout(emitTimerRef.current);
        emitTimerRef.current = null;
      }
    };
  }, []);

  const updateSet = (index: number, updates: Partial<SetDraft>) => {
    setSets((prev) => prev.map((set, idx) => (idx === index ? { ...set, ...updates } : set)));
  };

  const adjustSetValue = (index: number, field: 'weight' | 'reps', delta: number) => {
    void Haptics.selectionAsync();
    setSets((prev) =>
      prev.map((set, idx) => {
        if (idx !== index) return set;

        const currentValue = set[field] ?? 0;

        let nextValue: number;
        if (field === 'weight') {
          // Check if current value is a multiple of 2.5
          const isMultipleOf2_5 = currentValue % 2.5 === 0;

          if (!isMultipleOf2_5) {
            // Snap to nearest 2.5 multiple
            if (delta > 0) {
              nextValue = Math.ceil(currentValue / 2.5) * 2.5;
            } else {
              nextValue = Math.floor(currentValue / 2.5) * 2.5;
            }
          } else {
            // Already a multiple, increment normally
            nextValue = currentValue + delta;
          }

          nextValue = Math.max(0, Number.parseFloat(nextValue.toFixed(1)));

          return {
            ...set,
            weight: nextValue,
            weightInput: formatWeightInputValue(nextValue),
          };
        }

        nextValue = Math.max(0, Math.round(currentValue + delta));
        return {
          ...set,
          reps: nextValue,
          repsInput: String(nextValue),
        };
      }),
    );
  };

  const addSet = () => {
    void Haptics.selectionAsync();
    setSets((prev) => {
      // Find the last completed set to use its values
      const lastCompletedSet = [...prev].reverse().find((set) => set.completed);

      const newSetValues: SetDraft = lastCompletedSet
        ? {
          weight: lastCompletedSet.weight ?? 0,
          reps: lastCompletedSet.reps ?? 8,
          duration: lastCompletedSet.duration ?? 0,
          distance: lastCompletedSet.distance ?? 0,
          assistanceWeight: lastCompletedSet.assistanceWeight ?? 0,
          completed: false,
          weightInput: formatWeightInputValue(lastCompletedSet.weight ?? 0),
          repsInput: String(lastCompletedSet.reps ?? 8),
          durationInput: lastCompletedSet.durationInput ?? '0:00',
          distanceInput: lastCompletedSet.distanceInput ?? '0',
          assistanceWeightInput: lastCompletedSet.assistanceWeightInput ?? '0.0',
        }
        : {
          ...DEFAULT_NEW_SET,
          weightInput: formatWeightInputValue(DEFAULT_NEW_SET.weight ?? 0),
          repsInput: String(DEFAULT_NEW_SET.reps ?? 8),
          durationInput: '0:00',
          distanceInput: '0',
          assistanceWeightInput: '0.0',
        };

      return [...prev, newSetValues];
    });
  };

  const removeSet = (index: number) => {
    void Haptics.selectionAsync();
    setSets((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleWeightInput = (index: number, value: string) => {
    const sanitized = sanitizeWeightInput(value);
    const parsed = sanitized.length > 0 ? Number.parseFloat(sanitized) : null;
    setActiveSelection(null);
    updateSet(index, {
      weightInput: sanitized,
      weight: parsed === null || Number.isNaN(parsed) ? 0 : parsed,
    });
  };

  const handleRepsInput = (index: number, value: string) => {
    const sanitized = sanitizeRepsInput(value);
    const parsed = sanitized.length > 0 ? Number.parseInt(sanitized, 10) : null;
    setActiveSelection(null);
    updateSet(index, {
      repsInput: sanitized,
      reps: parsed === null || Number.isNaN(parsed) ? 0 : parsed,
    });
  };

  const handleWeightBlur = (index: number) => {
    setActiveSelection(null);
    setSets((prev) =>
      prev.map((set, idx) => {
        if (idx !== index || set.weightInput.length > 0) {
          return set;
        }

        return {
          ...set,
          weight: 0,
          weightInput: formatWeightInputValue(0),
        };
      }),
    );
  };

  const handleRepsBlur = (index: number) => {
    setActiveSelection(null);
    setSets((prev) =>
      prev.map((set, idx) => {
        if (idx !== index || set.repsInput.length > 0) {
          return set;
        }

        return {
          ...set,
          reps: 0,
          repsInput: '0',
        };
      }),
    );
  };

  const toggleSetCompletion = useCallback((index: number) => {
    void Haptics.selectionAsync();
    setSets((prev) => {
      const updatedSets = prev.map((set, idx) => {
        if (idx === index) {
          return { ...set, completed: !set.completed };
        }
        return set;
      });

      // If we just marked a set as completed, populate the next uncompleted set
      const justCompleted = !prev[index].completed && updatedSets[index].completed;
      if (justCompleted) {
        const completedSet = updatedSets[index];

        // Find the next uncompleted set
        const nextUncompletedIndex = updatedSets.findIndex(
          (set, idx) => idx > index && !set.completed
        );

        if (nextUncompletedIndex !== -1) {
          const nextSet = updatedSets[nextUncompletedIndex];

          // Only update if the next set has default values (0 weight and 8 reps)
          if ((nextSet.weight ?? 0) === 0 && (nextSet.reps ?? 8) === 8) {
            updatedSets[nextUncompletedIndex] = {
              ...nextSet,
              weight: completedSet.weight ?? 0,
              reps: completedSet.reps ?? 8,
              weightInput: formatWeightInputValue(completedSet.weight ?? 0),
              repsInput: String(completedSet.reps ?? 8),
            };
          }
        }
      }

      return updatedSets;
    });
  }, []);

  const handleCompleteSetPress = useCallback((index: number) => {
    toggleSetCompletion(index);
  }, [toggleSetCompletion]);

  const handleWeightFocus = useCallback((index: number) => {
    setActiveSelection({ type: 'weight', index });
  }, []);

  const handleRepsFocus = useCallback((index: number) => {
    setActiveSelection({ type: 'reps', index });
  }, []);

  if (!isExpanded) {
    return null;
  }

  return (
    <Animated.View
      style={containerStyle}
    >
      <ScrollView
        stickyHeaderIndices={embedded ? undefined : [0]}
        contentContainerStyle={contentStyle}
        keyboardShouldPersistTaps="handled"
      >
        {embedded ? null : (
          <View style={styles.headerRow}>
            <Text variant="heading2" color="primary">
              {exerciseName}
            </Text>
          </View>
        )}
        {hasSets ? (
          sets.map((set, index) => {
            const isCompleted = set.completed;
            
            // Generate summary text based on exercise type
            let summaryText = '';
            switch (exerciseType) {
              case 'cardio':
                const mins = Math.floor((set.duration ?? 0) / 60);
                const secs = (set.duration ?? 0) % 60;
                summaryText = `${mins}:${secs.toString().padStart(2, '0')} • ${formatDistance(set.distance ?? 0)}`;
                break;
              case 'bodyweight':
              case 'reps_only':
                summaryText = `${set.reps ?? 0} reps`;
                break;
              case 'assisted':
                summaryText = `${formatWeight(set.assistanceWeight ?? 0)} assist × ${set.reps ?? 0} reps`;
                break;
              case 'duration':
                const dMins = Math.floor((set.duration ?? 0) / 60);
                const dSecs = (set.duration ?? 0) % 60;
                summaryText = dMins > 0 ? `${dMins}:${dSecs.toString().padStart(2, '0')}` : `${dSecs}s`;
                break;
              case 'weight':
              default:
                summaryText = `${formatWeight(set.weight ?? 0)} × ${set.reps ?? 0} reps`;
            }

            return (
              <View
                key={`set-${index}`}
                style={[
                  styles.setCard,
                  isCompleted ? styles.setCardCompleted : null,
                  index > 0 ? styles.setCardSpacer : null,
                ]}
              >
                {isCompleted ? (
                  <Pressable
                    style={styles.completedRow}
                    onPress={() => toggleSetCompletion(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit set ${index + 1}`}
                  >
                    <Text variant="bodySemibold" color="onAccent">
                      {summaryText}
                    </Text>
                  </Pressable>
                ) : (
                  <>
                    <View style={styles.setHeader} pointerEvents="box-none">
                      <Text variant="bodySemibold" color="primary">
                        Set {index + 1}
                      </Text>
                      <Pressable
                        onPress={(event) => {
                          event.stopPropagation();
                          setOpenMenuIndex((prev) => (prev === index ? null : index));
                        }}
                        hitSlop={spacing.xs}
                        style={styles.menuButton}
                        accessibilityRole="button"
                        accessibilityLabel={`Open menu for set ${index + 1}`}
                      >
                        <MaterialCommunityIcons
                          name="dots-vertical"
                          size={sizing.iconMD}
                          color={colors.text.secondary}
                        />
                      </Pressable>
                      {openMenuIndex === index ? (
                        <View style={styles.menuPopover} pointerEvents="box-none">
                          <Pressable
                            style={styles.menuItem}
                            onPress={() => {
                              removeSet(index);
                              setOpenMenuIndex(null);
                            }}
                          >
                            <Text variant="body">Remove set</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>

                    {/* Type-specific input fields */}
                    {(exerciseType === 'weight' || exerciseType === 'assisted') && (
                      <View style={styles.metricSection} pointerEvents="box-none">
                        <Text variant="label" color="neutral" style={styles.metricLabel}>
                          {exerciseType === 'assisted' ? `Assistance (${weightUnit})` : `Weight (${weightUnit})`}
                        </Text>
                        <View style={styles.metricControls}>
                          <Pressable
                            style={styles.adjustButton}
                            onPressIn={() => adjustSetValue(index, 'weight', exerciseType === 'assisted' ? -5 : -2.5)}
                            accessibilityRole="button"
                            accessibilityLabel={`Decrease weight for set ${index + 1}`}
                          >
                            <MaterialCommunityIcons
                              name="minus"
                              size={sizing.iconMD}
                              color={colors.text.primary}
                            />
                          </Pressable>
                          <TextInput
                            value={exerciseType === 'assisted' ? set.assistanceWeightInput : set.weightInput}
                            onChangeText={(value) => handleWeightInput(index, value)}
                            keyboardType="decimal-pad"
                            style={styles.metricValue}
                            textAlign="center"
                            placeholder="0"
                            placeholderTextColor={colors.text.tertiary}
                            cursorColor={colors.accent.primary}
                            selectionColor={colors.accent.orangeLight}
                            selection={
                              activeSelection?.type === 'weight' && activeSelection.index === index
                                ? { start: 0, end: (exerciseType === 'assisted' ? set.assistanceWeightInput : set.weightInput).length }
                                : undefined
                            }
                            onFocus={() => handleWeightFocus(index)}
                            onBlur={() => handleWeightBlur(index)}
                          />
                          <Pressable
                            style={styles.adjustButton}
                            onPressIn={() => adjustSetValue(index, 'weight', exerciseType === 'assisted' ? 5 : 2.5)}
                            accessibilityRole="button"
                            accessibilityLabel={`Increase weight for set ${index + 1}`}
                          >
                            <MaterialCommunityIcons
                              name="plus"
                              size={sizing.iconMD}
                              color={colors.text.primary}
                            />
                          </Pressable>
                        </View>
                      </View>
                    )}

                    {exerciseType === 'cardio' && (
                      <View style={styles.metricSection} pointerEvents="box-none">
                        <Text variant="label" color="neutral" style={styles.metricLabel}>
                          Distance ({distanceUnitLabel})
                        </Text>
                        <View style={styles.metricControls}>
                          <Pressable
                            style={styles.adjustButton}
                            onPressIn={() => {
                              // Decrement in display units, then convert back to miles for storage
                              const currentDisplayValue = convertDistance(set.distance ?? 0);
                              const decrement = distanceUnitLabel === 'km' ? 0.1 : 0.1;
                              const newDisplayValue = Math.max(0, currentDisplayValue - decrement);
                              const newMiles = convertDistanceToMiles(newDisplayValue);
                              updateSet(index, { 
                                distance: Math.round(newMiles * 100) / 100,
                                distanceInput: newDisplayValue.toFixed(1)
                              });
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Decrease distance for set ${index + 1}`}
                          >
                            <MaterialCommunityIcons
                              name="minus"
                              size={sizing.iconMD}
                              color={colors.text.primary}
                            />
                          </Pressable>
                          <TextInput
                            value={set.distanceInput}
                            onChangeText={(value) => {
                              const sanitized = sanitizeWeightInput(value);
                              const displayValue = parseFloat(sanitized) || 0;
                              // Convert from display unit to miles for storage
                              const distanceInMiles = convertDistanceToMiles(displayValue);
                              updateSet(index, { 
                                distanceInput: sanitized,
                                distance: Math.round(distanceInMiles * 100) / 100
                              });
                            }}
                            keyboardType="decimal-pad"
                            style={styles.metricValue}
                            textAlign="center"
                            placeholder="0"
                            placeholderTextColor={colors.text.tertiary}
                            cursorColor={colors.accent.primary}
                            selectionColor={colors.accent.orangeLight}
                          />
                          <Pressable
                            style={styles.adjustButton}
                            onPressIn={() => {
                              // Increment in display units, then convert back to miles for storage
                              const currentDisplayValue = convertDistance(set.distance ?? 0);
                              const increment = distanceUnitLabel === 'km' ? 0.1 : 0.1;
                              const newDisplayValue = Math.round((currentDisplayValue + increment) * 10) / 10;
                              const newMiles = convertDistanceToMiles(newDisplayValue);
                              updateSet(index, { 
                                distance: Math.round(newMiles * 100) / 100,
                                distanceInput: newDisplayValue.toFixed(1)
                              });
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Increase distance for set ${index + 1}`}
                          >
                            <MaterialCommunityIcons
                              name="plus"
                              size={sizing.iconMD}
                              color={colors.text.primary}
                            />
                          </Pressable>
                        </View>
                      </View>
                    )}

                    {(exerciseType === 'cardio' || exerciseType === 'duration') && (
                      <View style={styles.metricSection} pointerEvents="box-none">
                        <Text variant="label" color="neutral" style={styles.metricLabel}>
                          {exerciseType === 'cardio' ? 'Time (min:sec)' : 'Time (sec)'}
                        </Text>
                        <View style={styles.metricControls}>
                          <Pressable
                            style={styles.adjustButton}
                            onPressIn={() => {
                              const decrement = exerciseType === 'cardio' ? -60 : -5; // 1 min or 5 sec
                              updateSet(index, { duration: Math.max(0, (set.duration ?? 0) + decrement) });
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Decrease duration for set ${index + 1}`}
                          >
                            <MaterialCommunityIcons
                              name="minus"
                              size={sizing.iconMD}
                              color={colors.text.primary}
                            />
                          </Pressable>
                          <TextInput
                            value={set.durationInput}
                            onChangeText={(value) => {
                              const sanitized = value.replace(/[^0-9:]/g, '');
                              const seconds = parseDuration(sanitized);
                              updateSet(index, { 
                                durationInput: sanitized,
                                duration: seconds 
                              });
                            }}
                            keyboardType="numeric"
                            style={styles.metricValue}
                            textAlign="center"
                            placeholder={exerciseType === 'cardio' ? '0:00' : '0'}
                            placeholderTextColor={colors.text.tertiary}
                            cursorColor={colors.accent.primary}
                            selectionColor={colors.accent.orangeLight}
                          />
                          <Pressable
                            style={styles.adjustButton}
                            onPressIn={() => {
                              const increment = exerciseType === 'cardio' ? 60 : 5; // 1 min or 5 sec
                              const newDuration = (set.duration ?? 0) + increment;
                              updateSet(index, { 
                                duration: newDuration,
                                durationInput: formatDuration(newDuration)
                              });
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Increase duration for set ${index + 1}`}
                          >
                            <MaterialCommunityIcons
                              name="plus"
                              size={sizing.iconMD}
                              color={colors.text.primary}
                            />
                          </Pressable>
                        </View>
                      </View>
                    )}

                    {(exerciseType === 'weight' || exerciseType === 'bodyweight' || exerciseType === 'assisted' || exerciseType === 'reps_only') && (
                      <View style={styles.metricSection} pointerEvents="box-none">
                        <Text variant="label" color="neutral" style={styles.metricLabel}>
                          Reps
                        </Text>
                        <View style={styles.metricControls}>
                          <Pressable
                            style={styles.adjustButton}
                            onPressIn={() => adjustSetValue(index, 'reps', -1)}
                            accessibilityRole="button"
                            accessibilityLabel={`Decrease reps for set ${index + 1}`}
                          >
                            <MaterialCommunityIcons
                              name="minus"
                              size={sizing.iconMD}
                              color={colors.text.primary}
                            />
                          </Pressable>
                          <TextInput
                            value={set.repsInput}
                            onChangeText={(value) => handleRepsInput(index, value)}
                            keyboardType="numeric"
                            style={styles.metricValue}
                            textAlign="center"
                            placeholder="0"
                            placeholderTextColor={colors.text.tertiary}
                            cursorColor={colors.accent.primary}
                            selectionColor={colors.accent.orangeLight}
                            selection={
                              activeSelection?.type === 'reps' && activeSelection.index === index
                                ? { start: 0, end: set.repsInput.length }
                                : undefined
                            }
                            onFocus={() => handleRepsFocus(index)}
                            onBlur={() => handleRepsBlur(index)}
                        />
                        <Pressable
                          style={styles.adjustButton}
                          onPressIn={() => adjustSetValue(index, 'reps', 1)}
                          accessibilityRole="button"
                          accessibilityLabel={`Increase reps for set ${index + 1}`}
                        >
                          <MaterialCommunityIcons
                            name="plus"
                            size={sizing.iconMD}
                            color={colors.text.primary}
                          />
                          </Pressable>
                        </View>
                      </View>
                    )}

                    <Pressable
                      style={[styles.setActionButton, styles.setActionButtonPressable]}
                      onPress={() => handleCompleteSetPress(index)}
                      hitSlop={spacing.xs}
                      accessibilityRole="button"
                      accessibilityLabel={`Mark set ${index + 1} as complete`}
                    >
                      <Text variant="bodySemibold" color="onAccent">
                        Complete set
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            );
          })
        ) : (
          <Text color="secondary">No sets yet. Add one to get started.</Text>
        )}
        <Pressable
          style={styles.addSetButton}
          onPress={addSet}
          accessibilityRole="button"
          accessibilityLabel="Add set"
        >
          <Text variant="bodySemibold" color="orange">
            Add set
          </Text>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.lg,
    overflow: 'hidden',
  },
  content: {
    gap: spacing.sm,
    paddingTop: spacing.mdCompact,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  headerRow: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: spacing.md,
  },
  setCard: {
    borderWidth: 1,
    borderColor: colors.accent.orange,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.mdCompact,
    backgroundColor: colors.surface.card,
    gap: spacing.md,
  },
  setCardCompleted: {
    backgroundColor: colors.accent.orange,
    borderColor: colors.accent.orange,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: spacing.xl,
    height: spacing.xl,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuPopover: {
    position: 'absolute',
    top: spacing.xl + spacing.xs,
    right: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingVertical: spacing.xs,
    zIndex: zIndex.dropdown,
  },
  menuItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  metricSection: {
    gap: spacing.xs,
  },
  metricLabel: {
    textAlign: 'center',
  },
  metricControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  adjustButton: {
    width: sizing.iconLG,
    height: sizing.iconLG,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.accent.orange,
  },
  metricValue: {
    minWidth: spacing['2xl'] + spacing.lg,
    fontSize: sizing.iconLG,
    color: colors.text.primary,
    fontWeight: '600',
    paddingVertical: spacing.xxxs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
  },
  setActionButton: {
    marginTop: spacing.xs,
  },
  setActionButtonPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    minHeight: sizing.buttonSM,
    borderRadius: radius.md,
    backgroundColor: colors.accent.orange,
    borderWidth: 1,
    borderColor: colors.accent.orange,
  },
  addSetButton: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent.orange,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    minHeight: sizing.buttonSM,
  },
  containerEmbedded: {
    marginTop: spacing.sm,
    borderWidth: 0,
    borderRadius: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  contentEmbedded: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  headerRowEmbedded: {
    marginBottom: spacing.sm,
  },
  actionRowEmbedded: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  setCardSpacer: {
    marginTop: spacing.md,
  },
});
