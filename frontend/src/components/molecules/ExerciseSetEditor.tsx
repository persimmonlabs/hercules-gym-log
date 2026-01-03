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
import { HoldRepeatIconButton } from '@/components/atoms/HoldRepeatIconButton';
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
  historySetCount?: number;
}

const DEFAULT_NEW_SET: SetLog = {
  reps: 8,
  weight: 0,
  completed: false,
};

interface SetDraft extends SetLog {
  weightInput: string;
  repsInput: string;
  durationInput: string;      // For cardio (minutes) and duration (seconds) - format MM:SS
  minutesInput: string;       // Minutes portion (2 digits max)
  secondsInput: string;       // Seconds portion (2 digits max, 0-59)
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

// Format duration for session input (always MM:SS with 2 digits each)
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Format duration for summary display (drop leading zero on minutes)
const formatDurationForSummary = (seconds: number): string => {
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

// Parse minutes and seconds into total seconds
const parseDurationFromParts = (minutes: string, seconds: string): number => {
  const mins = parseInt(minutes, 10) || 0;
  let secs = parseInt(seconds, 10) || 0;
  // Clamp seconds to 0-59
  if (secs > 59) secs = 59;
  return mins * 60 + secs;
};

// Sanitize time input (digits only, max 2 characters)
const sanitizeTimeInput = (value: string, maxVal?: number): string => {
  // Keep only digits
  const digits = value.replace(/[^0-9]/g, '');
  // Limit to 2 digits
  let result = digits.slice(0, 2);
  // If maxVal provided, clamp the value
  if (maxVal !== undefined && result.length > 0) {
    const num = parseInt(result, 10);
    if (num > maxVal) {
      result = maxVal.toString().padStart(2, '0');
    }
  }
  return result;
};

// Format distance with 2 decimal places (hundredths)
const formatDistanceValue = (value: number): string => {
  return value.toFixed(2);
};

const createDraftFromSet = (set: SetLog): SetDraft => {
  const duration = set.duration ?? 0;
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  return {
    ...set,
    weightInput: formatWeightInputValue(set.weight ?? 0),
    repsInput: String(set.reps ?? 0),
    durationInput: formatDuration(duration),
    minutesInput: mins.toString().padStart(2, '0'),
    secondsInput: secs.toString().padStart(2, '0'),
    distanceInput: formatDistanceValue(set.distance ?? 0),
    assistanceWeightInput: formatWeightInputValue(set.assistanceWeight ?? 0),
  };
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

const AUTO_SAVE_DEBOUNCE_MS = 600;

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
  historySetCount = 0,
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
  const weightInputRefs = useRef<Record<number, TextInput | null>>({});
  const repsInputRefs = useRef<Record<number, TextInput | null>>({});
  const distanceInputRefs = useRef<Record<number, TextInput | null>>({});
  const durationInputRefs = useRef<Record<number, TextInput | null>>({});
  const minutesInputRefs = useRef<Record<number, TextInput | null>>({});
  const secondsInputRefs = useRef<Record<number, TextInput | null>>({});
  const setsRef = useRef<SetDraft[]>([]);
  const completedSetsRef = useRef(0);
  const totalSetsRef = useRef(0);

  const initialSignature = useMemo(() => JSON.stringify(initialSets), [initialSets]);

  useEffect(() => {
    onSetsChangeRef.current = onSetsChange;
  }, [onSetsChange]);

  useEffect(() => {
    onProgressChangeRef.current = onProgressChange ?? null;
  }, [onProgressChange]);

  useEffect(() => {
    setsRef.current = sets;
  }, [sets]);


  useEffect(() => {
    const wasExpanded = prevIsExpandedRef.current;
    prevIsExpandedRef.current = isExpanded;

    if (!isExpanded) {
      return;
    }

    if (wasExpanded) {
      return;
    }

    skipNextEmitRef.current = true;
    const nextDrafts = initialSets.map((set) => createDraftFromSet(set));
    setsRef.current = nextDrafts;
    totalSetsRef.current = nextDrafts.length;
    completedSetsRef.current = nextDrafts.filter((set) => set.completed).length;
    setSets(nextDrafts);
    setOpenMenuIndex(null);
    lastSyncedSignatureRef.current = initialSignature;

    emitProgress();

    setTimeout(() => {
      nextDrafts.forEach((draft, index) => {
        const weightRef = weightInputRefs.current[index];
        const repsRef = repsInputRefs.current[index];
        const distanceRef = distanceInputRefs.current[index];
        const durationRef = durationInputRefs.current[index];
        const minutesRef = minutesInputRefs.current[index];
        const secondsRef = secondsInputRefs.current[index];

        if (weightRef) {
          const text = exerciseType === 'assisted' ? draft.assistanceWeightInput : draft.weightInput;
          weightRef.setNativeProps({ text });
        }

        if (repsRef) {
          repsRef.setNativeProps({ text: draft.repsInput });
        }

        if (distanceRef) {
          distanceRef.setNativeProps({ text: draft.distanceInput });
        }

        if (durationRef) {
          durationRef.setNativeProps({ text: draft.durationInput });
        }

        if (minutesRef) {
          minutesRef.setNativeProps({ text: draft.minutesInput });
        }

        if (secondsRef) {
          secondsRef.setNativeProps({ text: draft.secondsInput });
        }
      });
    }, 0);
  }, [initialSignature, initialSets, isExpanded]);

  const hasSets = useMemo(() => sets.length > 0, [sets.length]);

  const emitProgress = useCallback(() => {
    if (!onProgressChangeRef.current) {
      return;
    }

    onProgressChangeRef.current({ completedSets: completedSetsRef.current, totalSets: totalSetsRef.current });
  }, []);

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

  const updateSet = useCallback((index: number, updater: Partial<SetDraft> | ((current: SetDraft) => Partial<SetDraft>)) => {
    setSets((prev) => {
      const current = prev[index];
      if (!current) return prev;
      const updates = typeof updater === 'function' ? updater(current) : updater;
      const next = [...prev];
      next[index] = { ...current, ...updates };
      setsRef.current = next;
      return next;
    });
  }, []);

  const adjustSetValue = useCallback((index: number, field: 'weight' | 'reps' | 'assistanceWeight', delta: number) => {
    const current = setsRef.current[index];
    if (!current) {
      return;
    }

    const weightInputRef = weightInputRefs.current[index];
    const repsInputRef = repsInputRefs.current[index];

    const currentValue = (current[field] ?? 0) as number;

    if (field === 'reps') {
      const nextValue = Math.max(0, Math.round(currentValue + delta));
      const nextText = String(nextValue);
      if (repsInputRef) {
        repsInputRef.setNativeProps({ text: nextText });
      }
      updateSet(index, { reps: nextValue, repsInput: nextText });
      return;
    }

    const isMultipleOf2_5 = currentValue % 2.5 === 0;
    let nextValue: number;
    if (!isMultipleOf2_5) {
      nextValue = delta > 0 ? Math.ceil(currentValue / 2.5) * 2.5 : Math.floor(currentValue / 2.5) * 2.5;
    } else {
      nextValue = currentValue + delta;
    }

    nextValue = Math.max(0, Number.parseFloat(nextValue.toFixed(1)));
    const nextText = formatWeightInputValue(nextValue);

    if (weightInputRef) {
      weightInputRef.setNativeProps({ text: nextText });
    }

    if (field === 'assistanceWeight') {
      updateSet(index, { assistanceWeight: nextValue, assistanceWeightInput: nextText });
      return;
    }

    updateSet(index, { weight: nextValue, weightInput: nextText });
  }, [updateSet]);

  const addSet = useCallback(() => {
    void Haptics.selectionAsync();
    setSets((prev) => {
      // Find the last completed set to use its values
      const lastCompletedSet = [...prev].reverse().find((set) => set.completed);

      // Priority:
      // 1. Use last completed set's values (if any sets have been completed in this session)
      // 2. Use last history set's values (if there's history data)
      // 3. Fall back to defaults
      let sourceSet: SetDraft | null = null;

      if (lastCompletedSet) {
        // Use the last completed set from this session
        sourceSet = lastCompletedSet;
      } else if (historySetCount > 0 && prev.length > 0) {
        // Use the last history set (or last available set if fewer sets than history)
        const lastHistoryIndex = Math.min(historySetCount - 1, prev.length - 1);
        sourceSet = prev[lastHistoryIndex];
      }

      let newSetLog: SetLog;
      if (sourceSet) {
        newSetLog = {
          weight: sourceSet.weight ?? 0,
          reps: sourceSet.reps ?? 8,
          duration: sourceSet.duration ?? 0,
          distance: sourceSet.distance ?? 0,
          assistanceWeight: sourceSet.assistanceWeight ?? 0,
          completed: false,
        };
      } else {
        newSetLog = DEFAULT_NEW_SET;
      }

      const newSetValues = createDraftFromSet(newSetLog);

      const next = [...prev, newSetValues];
      setsRef.current = next;
      totalSetsRef.current = next.length;
      completedSetsRef.current = next.filter((set) => set.completed).length;
      setTimeout(emitProgress, 0);
      return next;
    });
  }, [emitProgress, historySetCount]);

  const removeSet = useCallback((index: number) => {
    void Haptics.selectionAsync();
    setSets((prev) => prev.filter((_, idx) => idx !== index));
    const next = setsRef.current.filter((_, idx) => idx !== index);
    setsRef.current = next;
    totalSetsRef.current = next.length;
    completedSetsRef.current = next.filter((set) => set.completed).length;
    setTimeout(emitProgress, 0);
  }, [emitProgress]);

  const handleWeightInput = useCallback((index: number, value: string) => {
    const sanitized = sanitizeWeightInput(value);
    const parsed = sanitized.length > 0 ? Number.parseFloat(sanitized) : null;
    setActiveSelection(null);

    const weightInputRef = weightInputRefs.current[index];
    if (weightInputRef && sanitized !== value) {
      weightInputRef.setNativeProps({ text: sanitized });
    }

    if (exerciseType === 'assisted') {
      updateSet(index, {
        assistanceWeightInput: sanitized,
        assistanceWeight: parsed === null || Number.isNaN(parsed) ? 0 : parsed,
      });
      return;
    }

    updateSet(index, {
      weightInput: sanitized,
      weight: parsed === null || Number.isNaN(parsed) ? 0 : parsed,
    });
  }, [exerciseType, updateSet]);

  const handleRepsInput = useCallback((index: number, value: string) => {
    const sanitized = sanitizeRepsInput(value);
    const parsed = sanitized.length > 0 ? Number.parseInt(sanitized, 10) : null;
    setActiveSelection(null);

    const repsInputRef = repsInputRefs.current[index];
    if (repsInputRef && sanitized !== value) {
      repsInputRef.setNativeProps({ text: sanitized });
    }

    updateSet(index, {
      repsInput: sanitized,
      reps: parsed === null || Number.isNaN(parsed) ? 0 : parsed,
    });
  }, [updateSet]);

  const handleWeightBlur = useCallback((index: number) => {
    setActiveSelection(null);

    const weightInputRef = weightInputRefs.current[index];

    setSets((prev) =>
      prev.map((set, idx) => {
        const shouldDefaultToZero = exerciseType === 'assisted' ? set.assistanceWeightInput.length === 0 : set.weightInput.length === 0;
        if (idx !== index || !shouldDefaultToZero) {
          return set;
        }

        if (weightInputRef) {
          weightInputRef.setNativeProps({ text: formatWeightInputValue(0) });
        }

        return {
          ...set,
          weight: exerciseType === 'assisted' ? set.weight : 0,
          weightInput: exerciseType === 'assisted' ? set.weightInput : formatWeightInputValue(0),
          assistanceWeight: exerciseType === 'assisted' ? 0 : set.assistanceWeight,
          assistanceWeightInput: exerciseType === 'assisted' ? formatWeightInputValue(0) : set.assistanceWeightInput,
        };
      }),
    );
  }, [exerciseType]);

  const handleRepsBlur = useCallback((index: number) => {
    setActiveSelection(null);

    const repsInputRef = repsInputRefs.current[index];

    setSets((prev) =>
      prev.map((set, idx) => {
        if (idx !== index || set.repsInput.length > 0) {
          return set;
        }

        if (repsInputRef) {
          repsInputRef.setNativeProps({ text: '0' });
        }

        return {
          ...set,
          reps: 0,
          repsInput: '0',
        };
      }),
    );
  }, []);

  const toggleSetCompletion = useCallback((index: number) => {
    void Haptics.selectionAsync();
    const prev = setsRef.current;
    if (!prev[index]) {
      return;
    }

    const updatedSets = prev.map((set, idx) => {
      if (idx === index) {
        return { ...set, completed: !set.completed };
      }
      return set;
    });

    const justCompleted = !prev[index].completed && updatedSets[index].completed;
    let propagatedIndex: number | null = null;

    if (justCompleted) {
      const completedSet = updatedSets[index];
      const nextUncompletedIndex = updatedSets.findIndex((set, idx) => idx > index && !set.completed);
      if (nextUncompletedIndex !== -1 && nextUncompletedIndex >= historySetCount) {
        const nextSet = updatedSets[nextUncompletedIndex];
        propagatedIndex = nextUncompletedIndex;
        updatedSets[nextUncompletedIndex] = {
          ...nextSet,
          weight: completedSet.weight ?? 0,
          reps: completedSet.reps ?? 8,
          weightInput: formatWeightInputValue(completedSet.weight ?? 0),
          repsInput: String(completedSet.reps ?? 8),
          duration: completedSet.duration,
          distance: completedSet.distance,
          durationInput: completedSet.durationInput,
          distanceInput: completedSet.distanceInput,
          assistanceWeight: completedSet.assistanceWeight,
          assistanceWeightInput: completedSet.assistanceWeightInput,
        };
      }
    }

    setsRef.current = updatedSets;
    totalSetsRef.current = updatedSets.length;
    completedSetsRef.current = updatedSets.filter((set) => set.completed).length;
    setSets(updatedSets);
    emitProgress();

    if (propagatedIndex !== null) {
      const propagatedSet = updatedSets[propagatedIndex];
      setTimeout(() => {
        const weightRef = weightInputRefs.current[propagatedIndex];
        const repsRef = repsInputRefs.current[propagatedIndex];
        const distanceRef = distanceInputRefs.current[propagatedIndex];
        const durationRef = durationInputRefs.current[propagatedIndex];

        if (weightRef) {
          const text = exerciseType === 'assisted' ? propagatedSet.assistanceWeightInput : propagatedSet.weightInput;
          weightRef.setNativeProps({ text });
        }

        if (repsRef) {
          repsRef.setNativeProps({ text: propagatedSet.repsInput });
        }

        if (distanceRef) {
          distanceRef.setNativeProps({ text: propagatedSet.distanceInput });
        }

        if (durationRef) {
          durationRef.setNativeProps({ text: propagatedSet.durationInput });
        }
      }, 0);
    }
  }, [emitProgress, exerciseType, historySetCount]);

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
                summaryText = `${set.assistanceWeight ?? 0} ${weightUnit} assist × ${set.reps ?? 0} reps`;
                break;
              case 'duration':
                const dMins = Math.floor((set.duration ?? 0) / 60);
                const dSecs = (set.duration ?? 0) % 60;
                summaryText = dMins > 0 ? `${dMins}:${dSecs.toString().padStart(2, '0')}` : `${dSecs}s`;
                break;
              case 'weight':
              default:
                summaryText = `${set.weight ?? 0} ${weightUnit} × ${set.reps ?? 0} reps`;
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
                          <HoldRepeatIconButton
                            iconName="minus"
                            style={styles.adjustButton}
                            accessibilityLabel={`Decrease weight for set ${index + 1}`}
                            onStep={() => adjustSetValue(index, exerciseType === 'assisted' ? 'assistanceWeight' : 'weight', exerciseType === 'assisted' ? -5 : -2.5)}
                          />
                          <TextInput
                            ref={(ref) => {
                              weightInputRefs.current[index] = ref;
                            }}
                            defaultValue={exerciseType === 'assisted' ? set.assistanceWeightInput : set.weightInput}
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
                          <HoldRepeatIconButton
                            iconName="plus"
                            style={styles.adjustButton}
                            accessibilityLabel={`Increase weight for set ${index + 1}`}
                            onStep={() => adjustSetValue(index, exerciseType === 'assisted' ? 'assistanceWeight' : 'weight', exerciseType === 'assisted' ? 5 : 2.5)}
                          />
                        </View>
                      </View>
                    )}

                    {exerciseType === 'cardio' && (
                      <View style={styles.metricSection} pointerEvents="box-none">
                        <Text variant="label" color="neutral" style={styles.metricLabel}>
                          Distance ({distanceUnitLabel})
                        </Text>
                        <View style={styles.metricControls}>
                          <HoldRepeatIconButton
                            iconName="minus"
                            style={styles.adjustButton}
                            accessibilityLabel={`Decrease distance for set ${index + 1}`}
                            onStep={() => {
                              const current = setsRef.current[index];
                              if (!current) {
                                return;
                              }

                              const currentDisplayValue = convertDistance(current.distance ?? 0);
                              const newDisplayValue = Math.max(0, currentDisplayValue - 0.25);
                              const newMiles = convertDistanceToMiles(newDisplayValue);
                              const nextDistance = Math.round(newMiles * 100) / 100;
                              const nextText = formatDistanceValue(newDisplayValue);

                              const distanceRef = distanceInputRefs.current[index];
                              if (distanceRef) {
                                distanceRef.setNativeProps({ text: nextText });
                              }

                              updateSet(index, {
                                distance: nextDistance,
                                distanceInput: nextText,
                              });
                            }}
                          />
                          <TextInput
                            ref={(ref) => {
                              distanceInputRefs.current[index] = ref;
                            }}
                            defaultValue={set.distanceInput}
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
                            onBlur={() => {
                              // Format to 2 decimal places on blur
                              const current = setsRef.current[index];
                              if (current) {
                                const displayValue = convertDistance(current.distance ?? 0);
                                const nextText = formatDistanceValue(displayValue);
                                const distanceRef = distanceInputRefs.current[index];
                                if (distanceRef) {
                                  distanceRef.setNativeProps({ text: nextText });
                                }
                                updateSet(index, { distanceInput: nextText });
                              }
                            }}
                            keyboardType="decimal-pad"
                            style={styles.metricValue}
                            textAlign="center"
                            placeholder="0.00"
                            placeholderTextColor={colors.text.tertiary}
                            cursorColor={colors.accent.primary}
                            selectionColor={colors.accent.orangeLight}
                          />
                          <HoldRepeatIconButton
                            iconName="plus"
                            style={styles.adjustButton}
                            accessibilityLabel={`Increase distance for set ${index + 1}`}
                            onStep={() => {
                              const current = setsRef.current[index];
                              if (!current) {
                                return;
                              }

                              const currentDisplayValue = convertDistance(current.distance ?? 0);
                              const newDisplayValue = Math.round((currentDisplayValue + 0.25) * 100) / 100;
                              const newMiles = convertDistanceToMiles(newDisplayValue);
                              const nextDistance = Math.round(newMiles * 100) / 100;
                              const nextText = formatDistanceValue(newDisplayValue);

                              const distanceRef = distanceInputRefs.current[index];
                              if (distanceRef) {
                                distanceRef.setNativeProps({ text: nextText });
                              }

                              updateSet(index, {
                                distance: nextDistance,
                                distanceInput: nextText,
                              });
                            }}
                          />
                        </View>
                      </View>
                    )}

                    {(exerciseType === 'cardio' || exerciseType === 'duration') && (
                      <View style={styles.metricSection} pointerEvents="box-none">
                        <Text variant="label" color="neutral" style={styles.metricLabel}>
                          {exerciseType === 'cardio' ? 'Time (min:sec)' : 'Time (sec)'}
                        </Text>
                        <View style={styles.metricControls}>
                          <HoldRepeatIconButton
                            iconName="minus"
                            style={styles.adjustButton}
                            accessibilityLabel={`Decrease duration for set ${index + 1}`}
                            onStep={() => {
                              const current = setsRef.current[index];
                              if (!current) {
                                return;
                              }

                              const decrement = 15; // 15 seconds
                              const newDuration = Math.max(0, (current.duration ?? 0) - decrement);
                              const nextText = formatDuration(newDuration);
                              const mins = Math.floor(newDuration / 60);
                              const secs = newDuration % 60;

                              const durationRef = durationInputRefs.current[index];
                              const minutesRef = minutesInputRefs.current[index];
                              const secondsRef = secondsInputRefs.current[index];

                              if (durationRef) durationRef.setNativeProps({ text: nextText });
                              if (minutesRef) minutesRef.setNativeProps({ text: mins.toString().padStart(2, '0') });
                              if (secondsRef) secondsRef.setNativeProps({ text: secs.toString().padStart(2, '0') });

                              updateSet(index, {
                                duration: newDuration,
                                durationInput: nextText,
                                minutesInput: mins.toString().padStart(2, '0'),
                                secondsInput: secs.toString().padStart(2, '0'),
                              });
                            }}
                          />

                          <View style={styles.timeInputContainer}>
                            <TextInput
                              ref={(ref) => {
                                minutesInputRefs.current[index] = ref;
                              }}
                              defaultValue={set.minutesInput}
                              onChangeText={(value) => {
                                const sanitized = sanitizeTimeInput(value);
                                if (value !== sanitized) {
                                  minutesInputRefs.current[index]?.setNativeProps({ text: sanitized });
                                }

                                const current = setsRef.current[index];
                                const currentSecs = current?.secondsInput || '00';

                                const totalSeconds = parseDurationFromParts(sanitized, currentSecs);

                                updateSet(index, {
                                  minutesInput: sanitized,
                                  durationInput: formatDuration(totalSeconds),
                                  duration: totalSeconds
                                });
                              }}
                              keyboardType="numeric"
                              style={styles.timeInput}
                              textAlign="center"
                              placeholder="00"
                              placeholderTextColor={colors.text.tertiary}
                              cursorColor={colors.accent.primary}
                              selectionColor={colors.accent.orangeLight}
                              maxLength={2}
                            />
                            <Text style={styles.timeSeparator}>:</Text>
                            <TextInput
                              ref={(ref) => {
                                secondsInputRefs.current[index] = ref;
                              }}
                              defaultValue={set.secondsInput}
                              onChangeText={(value) => {
                                const sanitized = sanitizeTimeInput(value, 59);
                                if (value !== sanitized) {
                                  secondsInputRefs.current[index]?.setNativeProps({ text: sanitized });
                                }

                                const current = setsRef.current[index];
                                const currentMins = current?.minutesInput || '00';

                                const totalSeconds = parseDurationFromParts(currentMins, sanitized);

                                updateSet(index, {
                                  secondsInput: sanitized,
                                  durationInput: formatDuration(totalSeconds),
                                  duration: totalSeconds
                                });
                              }}
                              keyboardType="numeric"
                              style={styles.timeInput}
                              textAlign="center"
                              placeholder="00"
                              placeholderTextColor={colors.text.tertiary}
                              cursorColor={colors.accent.primary}
                              selectionColor={colors.accent.orangeLight}
                              maxLength={2} // Limit to 2 chars, value clamping handled in logic
                            />
                          </View>

                          <HoldRepeatIconButton
                            iconName="plus"
                            style={styles.adjustButton}
                            accessibilityLabel={`Increase duration for set ${index + 1}`}
                            onStep={() => {
                              const current = setsRef.current[index];
                              if (!current) {
                                return;
                              }

                              const increment = 15; // 15 seconds
                              const newDuration = (current.duration ?? 0) + increment;
                              const nextText = formatDuration(newDuration);
                              const mins = Math.floor(newDuration / 60);
                              const secs = newDuration % 60;

                              const durationRef = durationInputRefs.current[index];
                              const minutesRef = minutesInputRefs.current[index];
                              const secondsRef = secondsInputRefs.current[index];

                              if (durationRef) durationRef.setNativeProps({ text: nextText });
                              if (minutesRef) minutesRef.setNativeProps({ text: mins.toString().padStart(2, '0') });
                              if (secondsRef) secondsRef.setNativeProps({ text: secs.toString().padStart(2, '0') });

                              updateSet(index, {
                                duration: newDuration,
                                durationInput: nextText,
                                minutesInput: mins.toString().padStart(2, '0'),
                                secondsInput: secs.toString().padStart(2, '0'),
                              });
                            }}
                          />
                        </View>
                      </View>
                    )}

                    {(exerciseType === 'weight' || exerciseType === 'bodyweight' || exerciseType === 'assisted' || exerciseType === 'reps_only') && (
                      <View style={styles.metricSection} pointerEvents="box-none">
                        <Text variant="label" color="neutral" style={styles.metricLabel}>
                          Reps
                        </Text>
                        <View style={styles.metricControls}>
                          <HoldRepeatIconButton
                            iconName="minus"
                            style={styles.adjustButton}
                            accessibilityLabel={`Decrease reps for set ${index + 1}`}
                            onStep={() => adjustSetValue(index, 'reps', -1)}
                            triggerOnRelease
                          />
                          <TextInput
                            ref={(ref) => {
                              repsInputRefs.current[index] = ref;
                            }}
                            defaultValue={set.repsInput}
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
                          <HoldRepeatIconButton
                            iconName="plus"
                            style={styles.adjustButton}
                            accessibilityLabel={`Increase reps for set ${index + 1}`}
                            onStep={() => adjustSetValue(index, 'reps', 1)}
                            triggerOnRelease
                          />
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
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxxs,
    minHeight: sizing.iconLG + spacing.xxxs * 2,
    borderWidth: 1,
    borderColor: 'transparent', // Match other inputs visually if needed, or keep clean
  },
  timeInput: {
    fontSize: sizing.iconLG,
    color: colors.text.primary,
    fontWeight: '600',
    minWidth: 32, // Enough for 2 digits
    padding: 0,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: sizing.iconLG,
    color: colors.text.primary,
    fontWeight: '600',
    marginHorizontal: 1,
    textAlignVertical: 'center',
  },
});
