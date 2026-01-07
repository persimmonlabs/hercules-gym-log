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
import { Button } from '@/components/atoms/Button';
import { HoldRepeatIconButton } from '@/components/atoms/HoldRepeatIconButton';
import { GpsActivityTracker } from '@/components/molecules/GpsActivityTracker';
import { TimePickerModal } from '@/components/molecules/TimePickerModal';
import { springGentle } from '@/constants/animations';
import { colors, radius, shadows, sizing, spacing, zIndex } from '@/constants/theme';
import type { SetLog } from '@/types/workout';
import type { ExerciseType } from '@/types/exercise';
import { useSettingsStore } from '@/store/settingsStore';
import { useTimer } from '@/hooks/useTimer';

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
  supportsGpsTracking?: boolean;
}

const DEFAULT_NEW_SET: SetLog = {
  reps: 8,
  weight: 0,
  completed: false,
};

interface SetDraft extends SetLog {
  weightInput: string;
  repsInput: string;
  durationInput: string;      // For cardio (minutes) and duration (seconds) - format HH:MM:SS
  hoursInput: string;         // Hours portion (2 digits max)
  minutesInput: string;       // Minutes portion (2 digits max)
  secondsInput: string;       // Seconds portion (2 digits max, 0-59)
  distanceInput: string;      // For cardio
  assistanceWeightInput: string; // For assisted
}

type ActiveSelectionTarget = {
  type: 'weight' | 'reps' | 'hours' | 'minutes' | 'seconds' | 'distance' | 'duration' | 'assistanceWeight';
  index: number;
};

type TimeInputState = {
  index: number;
  field: 'hours' | 'minutes' | 'seconds';
  digitsEntered: number; // 0, 1, or 2
};

const formatWeightInputValue = (value: number): string => {
  return value.toFixed(1);
};

// Format duration for session input (always HH:MM:SS with 2 digits each)
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Format duration for summary display (drop leading zero on hours/minutes)
const formatDurationForSummary = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const parseDuration = (input: string): number => {
  // Handle hh:mm:ss, mm:ss format or just seconds
  if (input.includes(':')) {
    const parts = input.split(':').map(Number);
    if (parts.length === 3) {
      // hh:mm:ss format
      const [hours, mins, secs] = parts;
      return (hours || 0) * 3600 + (mins || 0) * 60 + (secs || 0);
    } else if (parts.length === 2) {
      // mm:ss format
      const [mins, secs] = parts;
      return (mins || 0) * 60 + (secs || 0);
    }
  }
  return parseInt(input, 10) || 0;
};

// Parse hours, minutes and seconds into total seconds
const parseDurationFromParts = (hours: string, minutes: string, seconds: string): number => {
  const hrs = parseInt(hours, 10) || 0;
  const mins = parseInt(minutes, 10) || 0;
  let secs = parseInt(seconds, 10) || 0;
  // Clamp seconds to 0-59
  if (secs > 59) secs = 59;
  return hrs * 3600 + mins * 60 + secs;
};

// Parse minutes and seconds into total seconds (for duration exercises)
const parseDurationFromPartsMMSS = (minutes: string, seconds: string): number => {
  const mins = parseInt(minutes, 10) || 0;
  let secs = parseInt(seconds, 10) || 0;
  // Clamp seconds to 0-59
  if (secs > 59) secs = 59;
  return mins * 60 + secs;
};

// Smart time input handler for focused typing with digit tracking
const sanitizeTimeInputWithState = (
  value: string,
  currentState: TimeInputState | null,
  index: number,
  field: 'hours' | 'minutes' | 'seconds',
  maxVal?: number
): { sanitized: string; newState: TimeInputState } => {
  // Keep only digits
  const digits = value.replace(/[^0-9]/g, '');
  
  // If no state or different field/index, this is a fresh start
  const isFreshStart = !currentState || currentState.index !== index || currentState.field !== field;
  
  if (digits.length === 0) {
    return {
      sanitized: '00',
      newState: { index, field, digitsEntered: 0 }
    };
  }
  
  // Check if we're continuing to type in the same field
  const isTypingInSameField = currentState && currentState.index === index && currentState.field === field;
  
  if (digits.length === 1) {
    // If we already entered 1 digit and now have 1 digit, user typed second digit
    // (selection replaced both, but we track state)
    if (isTypingInSameField && currentState.digitsEntered === 1) {
      // This is the second digit - combine with previous
      // We need to extract the second digit from the new input
      let result = digits;
      
      // Clamp if needed
      if (maxVal !== undefined) {
        const num = parseInt(result, 10);
        if (num > maxVal) {
          result = maxVal.toString();
        }
      }
      
      return {
        sanitized: result.padStart(2, '0'),
        newState: { index, field, digitsEntered: 2 }
      };
    }
    
    // First digit: show "0X"
    let result = '0' + digits;
    
    // Clamp if needed
    if (maxVal !== undefined) {
      const num = parseInt(result, 10);
      if (num > maxVal) {
        result = '0' + maxVal.toString().charAt(1);
      }
    }
    
    return {
      sanitized: result,
      newState: { index, field, digitsEntered: 1 }
    };
  }
  
  // Two or more digits: show "XY" (last 2 digits)
  let result = digits.slice(-2);
  
  // Clamp if needed
  if (maxVal !== undefined) {
    const num = parseInt(result, 10);
    if (num > maxVal) {
      result = maxVal.toString().padStart(2, '0');
    }
  }
  
  return {
    sanitized: result,
    newState: { index, field, digitsEntered: 2 }
  };
};

// Format distance with 2 decimal places (hundredths)
const formatDistanceValue = (value: number): string => {
  return value.toFixed(2);
};

const createDraftFromSet = (set: SetLog): SetDraft => {
  const duration = set.duration ?? 0;
  const hours = Math.floor(duration / 3600);
  const mins = Math.floor((duration % 3600) / 60);
  const secs = duration % 60;

  return {
    ...set,
    weightInput: formatWeightInputValue(set.weight ?? 0),
    repsInput: String(set.reps ?? 0),
    durationInput: formatDuration(duration),
    hoursInput: hours.toString().padStart(2, '0'),
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

const AUTO_SAVE_DEBOUNCE_MS = 100;

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
  supportsGpsTracking = false,
}) => {
  const { getWeightUnit, formatWeight, getDistanceUnitForExercise, formatDistanceForExercise, convertDistanceForExercise, convertDistanceToMilesForExercise } = useSettingsStore();
  const weightUnit = getWeightUnit();
  const distanceUnitLabel = getDistanceUnitForExercise(distanceUnit);
  const [sets, setSets] = useState<SetDraft[]>(() => initialSets.map((set) => createDraftFromSet(set)));
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const [activeSelection, setActiveSelection] = useState<ActiveSelectionTarget | null>(null);
  const [timeInputState, setTimeInputState] = useState<TimeInputState | null>(null);
  const [timePickerVisible, setTimePickerVisible] = useState<boolean>(false);
  const [timePickerIndex, setTimePickerIndex] = useState<number>(0);
  const [runningTimers, setRunningTimers] = useState<Set<number>>(new Set());
  const [pausedTimers, setPausedTimers] = useState<Set<number>>(new Set());
  const timerIntervalsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const timerStartTimesRef = useRef<Map<number, number>>(new Map());
  const timerPausedSecondsRef = useRef<Map<number, number>>(new Map());

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
  const hoursInputRefs = useRef<Record<number, TextInput | null>>({});
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

    // Update sets when exercise is first expanded OR when initialSets change
    const shouldUpdateSets = !wasExpanded || lastSyncedSignatureRef.current !== initialSignature;
    
    if (!shouldUpdateSets) {
      return;
    }

    // Check if we need to sync completion state
    const currentCompletedSets = setsRef.current.filter((set) => set.completed).length;
    const initialCompletedSets = initialSets.filter((set) => set.completed).length;
    
    // Only update if the completion state differs, to avoid interrupting user editing
    if (wasExpanded && currentCompletedSets === initialCompletedSets) {
      lastSyncedSignatureRef.current = initialSignature;
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
    
    // Clear timer states when sets are refreshed (e.g., after completing and reopening a set)
    setRunningTimers(new Set());
    setPausedTimers(new Set());
    timerIntervalsRef.current.forEach(interval => clearInterval(interval));
    timerIntervalsRef.current.clear();
    timerStartTimesRef.current.clear();
    timerPausedSecondsRef.current.clear();

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

    const repsInputRef = repsInputRefs.current[index];

    const currentValue = (current[field] ?? 0) as number;

    if (field === 'reps') {
      const nextValue = Math.max(0, Math.round(currentValue + delta));
      const nextText = String(nextValue);
      
      // Update input field FIRST for instant visual feedback
      if (repsInputRef) {
        // Use setNativeProps for instant update without React re-render
        repsInputRef.setNativeProps({ 
          text: nextText,
          // Prevent cursor movement/selection issues
          selection: { start: nextText.length, end: nextText.length }
        });
      }
      
      // Update refs immediately without triggering React re-render
      const next = [...setsRef.current];
      next[index] = { ...current, reps: nextValue, repsInput: nextText };
      setsRef.current = next;
      
      // Defer React state update to avoid blocking the UI
      setTimeout(() => {
        setSets(next);
      }, 0);
      return;
    }

    // For weight/assistanceWeight, use the existing logic
    const weightInputRef = weightInputRefs.current[index];

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
  }, []);

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
          // Timed exercises (cardio and duration) should always start at 0
          duration: (exerciseType === 'cardio' || exerciseType === 'duration') ? 0 : (sourceSet.duration ?? 0),
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
  }, [emitProgress, historySetCount, exerciseType]);

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

  const handleDistanceInput = useCallback((index: number, value: string) => {
    const sanitized = sanitizeWeightInput(value);
    const parsed = sanitized.length > 0 ? Number.parseFloat(sanitized) : null;
    setActiveSelection(null);

    const distanceInputRef = distanceInputRefs.current[index];
    if (distanceInputRef && sanitized !== value) {
      distanceInputRef.setNativeProps({ text: sanitized });
    }

    // Convert from display unit to miles for storage
    const displayValue = parsed === null || Number.isNaN(parsed) ? 0 : parsed;
    const distanceInMiles = convertDistanceToMilesForExercise(displayValue, distanceUnit);

    updateSet(index, {
      distanceInput: sanitized,
      distance: Math.round(distanceInMiles * 100) / 100,
    });
  }, [updateSet, convertDistanceToMilesForExercise, distanceUnit]);

  const handleDistanceFocus = useCallback((index: number) => {
    setActiveSelection({ type: 'distance', index });
  }, []);

  const handleDistanceBlur = useCallback((index: number) => {
    setActiveSelection(null);

    const distanceInputRef = distanceInputRefs.current[index];

    setSets((prev) =>
      prev.map((set, idx) => {
        const shouldDefaultToZero = set.distanceInput.length === 0;
        if (idx !== index || !shouldDefaultToZero) {
          return set;
        }

        if (distanceInputRef) {
          distanceInputRef.setNativeProps({ text: '0.00' });
        }

        return {
          ...set,
          distance: 0,
          distanceInput: '0.00',
        };
      }),
    );
  }, []);

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
    
    // Blur any currently focused input and clear selection state immediately
    setActiveSelection((current) => {
      if (current) {
        const currentWeightRef = weightInputRefs.current[current.index];
        const currentRepsRef = repsInputRefs.current[current.index];
        const currentDistanceRef = distanceInputRefs.current[current.index];
        const currentDurationRef = durationInputRefs.current[current.index];

        if (current.type === 'weight') {
          currentWeightRef?.blur?.();
        }

        if (current.type === 'reps') {
          currentRepsRef?.blur?.();
        }

        if (current.type === 'distance') {
          currentDistanceRef?.blur?.();
        }

        if (current.type === 'duration') {
          currentDurationRef?.blur?.();
        }

        if (current.type === 'hours') {
          hoursInputRefs.current[current.index]?.blur?.();
        }

        if (current.type === 'minutes') {
          minutesInputRefs.current[current.index]?.blur?.();
        }

        if (current.type === 'seconds') {
          secondsInputRefs.current[current.index]?.blur?.();
        }

        if (current.type === 'assistanceWeight') {
          currentWeightRef?.blur?.();
        }
      }
      return null;
    });
    setTimeInputState(null);
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
      // Stop timer if this is a timed exercise and timer is running
      if (exerciseType === 'duration' && (runningTimers.has(index) || pausedTimers.has(index))) {
        const interval = timerIntervalsRef.current.get(index);
        if (interval) {
          clearInterval(interval);
          timerIntervalsRef.current.delete(index);
        }
        timerStartTimesRef.current.delete(index);
        timerPausedSecondsRef.current.delete(index);
        setRunningTimers(prev => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
        setPausedTimers(prev => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }

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
  }, [emitProgress, exerciseType, historySetCount, runningTimers, pausedTimers]);

  const handleCompleteSetPress = useCallback((index: number) => {
    toggleSetCompletion(index);
  }, [toggleSetCompletion]);

  const handleWeightFocus = useCallback((index: number) => {
    setActiveSelection({ type: 'weight', index });
  }, []);

  const handleRepsFocus = useCallback((index: number) => {
    setActiveSelection({ type: 'reps', index });
  }, []);

  const handleGpsActivityComplete = useCallback((durationSeconds: number, distanceMiles: number) => {
    const completedSet: SetDraft = {
      completed: true,
      duration: durationSeconds,
      distance: distanceMiles,
      weightInput: '0',
      repsInput: '0',
      durationInput: formatDuration(durationSeconds),
      hoursInput: Math.floor(durationSeconds / 3600).toString().padStart(2, '0'),
      minutesInput: Math.floor((durationSeconds % 3600) / 60).toString().padStart(2, '0'),
      secondsInput: (durationSeconds % 60).toString().padStart(2, '0'),
      distanceInput: distanceMiles.toFixed(2),
      assistanceWeightInput: '0',
    };

    const updatedSets = [completedSet];
    setsRef.current = updatedSets;
    totalSetsRef.current = 1;
    completedSetsRef.current = 1;
    setSets(updatedSets);
    emitProgress();
  }, [emitProgress]);

  const openTimePicker = useCallback((index: number) => {
    void Haptics.selectionAsync();
    setTimePickerIndex(index);
    setTimePickerVisible(true);
  }, []);

  const handleTimePickerConfirm = useCallback((totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const next = [...setsRef.current];
    next[timePickerIndex] = {
      ...next[timePickerIndex],
      duration: totalSeconds,
      durationInput: formatDuration(totalSeconds),
      hoursInput: hours.toString().padStart(2, '0'),
      minutesInput: mins.toString().padStart(2, '0'),
      secondsInput: secs.toString().padStart(2, '0'),
    };
    setsRef.current = next;
    setSets(next);
    setTimePickerVisible(false);
  }, [timePickerIndex]);

  const startTimer = useCallback((index: number) => {
    void Haptics.selectionAsync();
    
    // Clear any existing interval for this index
    const existingInterval = timerIntervalsRef.current.get(index);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Store start time and initial paused seconds
    const currentSet = setsRef.current[index];
    const initialSeconds = currentSet?.duration ?? 0;
    timerStartTimesRef.current.set(index, Date.now());
    timerPausedSecondsRef.current.set(index, initialSeconds);

    // Start interval
    const interval = setInterval(() => {
      const startTime = timerStartTimesRef.current.get(index) ?? Date.now();
      const pausedSeconds = timerPausedSecondsRef.current.get(index) ?? 0;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const totalSeconds = pausedSeconds + elapsed;

      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;

      const next = [...setsRef.current];
      next[index] = {
        ...next[index],
        duration: totalSeconds,
        durationInput: formatDuration(totalSeconds),
        hoursInput: hours.toString().padStart(2, '0'),
        minutesInput: mins.toString().padStart(2, '0'),
        secondsInput: secs.toString().padStart(2, '0'),
      };
      setsRef.current = next;
      setSets(next);
    }, 1000);

    timerIntervalsRef.current.set(index, interval);
    setRunningTimers(prev => new Set(prev).add(index));
    setPausedTimers(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  const pauseTimer = useCallback((index: number) => {
    void Haptics.selectionAsync();
    
    const interval = timerIntervalsRef.current.get(index);
    if (interval) {
      clearInterval(interval);
      timerIntervalsRef.current.delete(index);
    }

    // Store current duration as paused seconds
    const currentSet = setsRef.current[index];
    timerPausedSecondsRef.current.set(index, currentSet?.duration ?? 0);

    setRunningTimers(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    setPausedTimers(prev => new Set(prev).add(index));
  }, []);

  const stopTimer = useCallback((index: number) => {
    void Haptics.selectionAsync();
    
    const interval = timerIntervalsRef.current.get(index);
    if (interval) {
      clearInterval(interval);
      timerIntervalsRef.current.delete(index);
    }

    // Keep the elapsed time but transition to paused state
    const currentSet = setsRef.current[index];
    timerPausedSecondsRef.current.set(index, currentSet?.duration ?? 0);
    timerStartTimesRef.current.delete(index);
    
    setRunningTimers(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    setPausedTimers(prev => new Set(prev).add(index));
  }, []);

  const resetTimer = useCallback((index: number) => {
    void Haptics.selectionAsync();
    
    // Clear all timer state
    const interval = timerIntervalsRef.current.get(index);
    if (interval) {
      clearInterval(interval);
      timerIntervalsRef.current.delete(index);
    }

    timerStartTimesRef.current.delete(index);
    timerPausedSecondsRef.current.delete(index);
    
    // Reset to zero
    const next = [...setsRef.current];
    next[index] = {
      ...next[index],
      duration: 0,
      durationInput: '00:00',
      hoursInput: '00',
      minutesInput: '00',
      secondsInput: '00',
    };
    setsRef.current = next;
    setSets(next);
    
    setRunningTimers(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    setPausedTimers(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timerIntervalsRef.current.forEach(interval => clearInterval(interval));
      timerIntervalsRef.current.clear();
    };
  }, []);

  if (!isExpanded) {
    return null;
  }

  if (supportsGpsTracking) {
    const existingSet = sets[0];
    const isCompleted = existingSet?.completed ?? false;
    const hasData = (existingSet?.duration ?? 0) > 0 || (existingSet?.distance ?? 0) > 0;

    return (
      <Animated.View style={containerStyle}>
        <View style={contentStyle}>
          {embedded ? null : (
            <View style={styles.headerRow}>
              <Text variant="heading2" color="primary">
                {exerciseName}
              </Text>
            </View>
          )}
          {isCompleted ? (
            <View style={[styles.setCard, styles.setCardCompleted, { marginBottom: spacing.lg }]}>
              <Pressable
                style={styles.completedRow}
                onPress={() => toggleSetCompletion(0)}
                accessibilityRole="button"
                accessibilityLabel="Edit activity"
              >
                <Text variant="bodySemibold" color="onAccent">
                  {formatDistanceForExercise(existingSet.distance ?? 0, distanceUnit)} • {formatDurationForSummary(existingSet.duration ?? 0)}
                </Text>
              </Pressable>
            </View>
          ) : hasData && existingSet ? (
            <View style={[styles.setCard, { marginBottom: spacing.lg }]}>
              <View style={styles.setHeader} pointerEvents="box-none">
                <Text variant="bodySemibold" color="primary">
                  Activity
                </Text>
              </View>

              <View style={styles.metricSection} pointerEvents="box-none">
                <Text variant="label" color="neutral" style={styles.metricLabel}>
                  Distance ({distanceUnitLabel})
                </Text>
                <View style={styles.metricControls}>
                  <HoldRepeatIconButton
                    iconName="minus"
                    style={styles.adjustButton}
                    accessibilityLabel="Decrease distance"
                    onStep={() => {
                      const current = setsRef.current[0];
                      if (!current) return;

                      const currentDisplayValue = convertDistanceForExercise(current.distance ?? 0, distanceUnit);
                      const increment = distanceUnit === 'meters' ? 50 : 0.25;
                      const newDisplayValue = Math.max(0, currentDisplayValue - increment);
                      const newMiles = convertDistanceToMilesForExercise(newDisplayValue, distanceUnit);
                      const nextDistance = Math.round(newMiles * 100) / 100;
                      const nextText = formatDistanceValue(newDisplayValue);

                      const distanceRef = distanceInputRefs.current[0];
                      if (distanceRef) {
                        distanceRef.setNativeProps({ text: nextText });
                      }

                      updateSet(0, {
                        distance: nextDistance,
                        distanceInput: nextText,
                      });
                    }}
                  />
                  <TextInput
                    ref={(ref) => {
                      distanceInputRefs.current[0] = ref;
                    }}
                    value={existingSet.distanceInput}
                    onChangeText={(value) => handleDistanceInput(0, value)}
                    keyboardType="decimal-pad"
                    style={styles.metricValue}
                    textAlign="center"
                    placeholder="0.00"
                    placeholderTextColor={colors.text.tertiary}
                    cursorColor={colors.accent.primary}
                    selectionColor={colors.accent.orangeLight}
                    selection={
                      activeSelection?.type === 'distance' && activeSelection.index === 0
                        ? { start: 0, end: existingSet.distanceInput.length }
                        : undefined
                    }
                    onFocus={() => handleDistanceFocus(0)}
                    onBlur={() => handleDistanceBlur(0)}
                  />
                  <HoldRepeatIconButton
                    iconName="plus"
                    style={styles.adjustButton}
                    accessibilityLabel="Increase distance"
                    onStep={() => {
                      const current = setsRef.current[0];
                      if (!current) return;

                      const currentDisplayValue = convertDistanceForExercise(current.distance ?? 0, distanceUnit);
                      const increment = distanceUnit === 'meters' ? 50 : 0.25;
                      const newDisplayValue = distanceUnit === 'meters' ? currentDisplayValue + increment : Math.round((currentDisplayValue + increment) * 100) / 100;
                      const newMiles = convertDistanceToMilesForExercise(newDisplayValue, distanceUnit);
                      const nextDistance = Math.round(newMiles * 100) / 100;
                      const nextText = formatDistanceValue(newDisplayValue);

                      const distanceRef = distanceInputRefs.current[0];
                      if (distanceRef) {
                        distanceRef.setNativeProps({ text: nextText });
                      }

                      updateSet(0, {
                        distance: nextDistance,
                        distanceInput: nextText,
                      });
                    }}
                  />
                </View>
              </View>

              <View style={styles.metricSection} pointerEvents="box-none">
                <Text variant="label" color="neutral" style={styles.metricLabel}>
                  Time {(existingSet.hoursInput !== '00' ? '(hr:min:sec)' : '(min:sec)')}
                </Text>
                <View style={styles.metricControls}>
                  <Pressable
                    style={styles.timeDisplayButton}
                    onPress={() => openTimePicker(0)}
                    accessibilityLabel="Edit time"
                  >
                    <Text style={styles.timeDisplayText}>
                      {(existingSet.hoursInput !== '00' ? `${existingSet.hoursInput}:` : '')}{existingSet.minutesInput || '00'}:{existingSet.secondsInput || '00'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <Button
                label="Complete"
                onPress={() => handleCompleteSetPress(0)}
                variant="primary"
                size="md"
              />
            </View>
          ) : (
            <GpsActivityTracker
              onComplete={handleGpsActivityComplete}
              distanceUnit={distanceUnit}
            />
          )}
        </View>
        <TimePickerModal
          visible={timePickerVisible}
          onClose={() => setTimePickerVisible(false)}
          onConfirm={handleTimePickerConfirm}
          initialSeconds={sets[timePickerIndex]?.duration ?? 0}
        />
      </Animated.View>
    );
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
                summaryText = `${formatDistanceForExercise(set.distance ?? 0, distanceUnit)} • ${formatDurationForSummary(set.duration ?? 0)}`;
                break;
              case 'bodyweight':
              case 'reps_only':
                summaryText = `${set.reps ?? 0} reps`;
                break;
              case 'assisted':
                summaryText = `${set.assistanceWeight ?? 0} ${weightUnit} assist × ${set.reps ?? 0} reps`;
                break;
              case 'duration':
                summaryText = formatDurationForSummary(set.duration ?? 0);
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

                              const currentDisplayValue = convertDistanceForExercise(current.distance ?? 0, distanceUnit);
                              const increment = distanceUnit === 'meters' ? 50 : 0.25;
                              const newDisplayValue = Math.max(0, currentDisplayValue - increment);
                              const newMiles = convertDistanceToMilesForExercise(newDisplayValue, distanceUnit);
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
                            value={set.distanceInput}
                            onChangeText={(value) => handleDistanceInput(index, value)}
                            keyboardType="decimal-pad"
                            style={styles.metricValue}
                            textAlign="center"
                            placeholder="0.00"
                            placeholderTextColor={colors.text.tertiary}
                            cursorColor={colors.accent.primary}
                            selectionColor={colors.accent.orangeLight}
                            selection={
                              activeSelection?.type === 'distance' && activeSelection.index === index
                                ? { start: 0, end: set.distanceInput.length }
                                : undefined
                            }
                            onFocus={() => handleDistanceFocus(index)}
                            onBlur={() => handleDistanceBlur(index)}
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

                              const currentDisplayValue = convertDistanceForExercise(current.distance ?? 0, distanceUnit);
                              const increment = distanceUnit === 'meters' ? 50 : 0.25;
                              const newDisplayValue = distanceUnit === 'meters' ? currentDisplayValue + increment : Math.round((currentDisplayValue + increment) * 100) / 100;
                              const newMiles = convertDistanceToMilesForExercise(newDisplayValue, distanceUnit);
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
                          Time {(set.hoursInput !== '00' ? '(hr:min:sec)' : '(min:sec)')}
                        </Text>
                        <Pressable
                          style={styles.timeDisplayButton}
                          onPress={() => {
                            const isRunning = runningTimers.has(index);
                            if (!isRunning) {
                              openTimePicker(index);
                            }
                          }}
                          disabled={runningTimers.has(index)}
                          accessibilityLabel={`Edit time for set ${index + 1}`}
                        >
                          <Text style={styles.timeDisplayText}>
                            {(set.hoursInput !== '00' ? `${set.hoursInput}:` : '')}{set.minutesInput || '00'}:{set.secondsInput || '00'}
                          </Text>
                        </Pressable>
                        <View style={styles.timerRow}>
                          <Pressable
                            style={[
                              styles.timerButtonCircle,
                              (!pausedTimers.has(index) || (set.duration ?? 0) === 0) && styles.timerButtonDisabled
                            ]}
                            onPress={() => resetTimer(index)}
                            disabled={!pausedTimers.has(index) || (set.duration ?? 0) === 0}
                            accessibilityLabel="Reset timer"
                          >
                            <MaterialCommunityIcons
                              name="restart"
                              size={sizing.iconSM}
                              color={(!pausedTimers.has(index) || (set.duration ?? 0) === 0) ? colors.accent.orangeLight : colors.accent.orange}
                            />
                          </Pressable>
                          <Pressable
                            style={styles.timerButtonCircle}
                            onPress={() => {
                              const isRunning = runningTimers.has(index);
                              if (isRunning) {
                                pauseTimer(index);
                              } else {
                                startTimer(index);
                              }
                            }}
                            accessibilityLabel={runningTimers.has(index) ? "Pause timer" : "Start timer"}
                          >
                            <MaterialCommunityIcons
                              name={runningTimers.has(index) ? "pause" : "play"}
                              size={sizing.iconSM}
                              color={colors.accent.orange}
                            />
                          </Pressable>
                          <Pressable
                            style={[
                              styles.timerButtonCircle,
                              (!runningTimers.has(index) && !pausedTimers.has(index)) && styles.timerButtonDisabled
                            ]}
                            onPress={() => stopTimer(index)}
                            disabled={!runningTimers.has(index) && !pausedTimers.has(index)}
                            accessibilityLabel="Stop timer"
                          >
                            <MaterialCommunityIcons
                              name="stop"
                              size={sizing.iconSM}
                              color={(!runningTimers.has(index) && !pausedTimers.has(index)) ? colors.accent.orangeLight : colors.accent.orange}
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
                          <HoldRepeatIconButton
                            iconName="minus"
                            style={styles.adjustButton}
                            accessibilityLabel={`Decrease reps for set ${index + 1}`}
                            onStep={() => adjustSetValue(index, 'reps', -1)}
                          />
                          <TextInput
                            ref={(ref) => {
                              repsInputRefs.current[index] = ref;
                            }}
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
                            spellCheck={false}
                            autoCorrect={false}
                            autoCapitalize="none"
                          />
                          <HoldRepeatIconButton
                            iconName="plus"
                            style={styles.adjustButton}
                            accessibilityLabel={`Increase reps for set ${index + 1}`}
                            onStep={() => adjustSetValue(index, 'reps', 1)}
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
          <View style={styles.emptyStateContainer}>
            <Text color="secondary">No sets yet.</Text>
          </View>
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
      <TimePickerModal
        visible={timePickerVisible}
        onClose={() => setTimePickerVisible(false)}
        onConfirm={handleTimePickerConfirm}
        initialSeconds={sets[timePickerIndex]?.duration ?? 0}
      />
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
    paddingVertical: spacing.md,
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
    paddingHorizontal: 0,
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
    borderColor: colors.accent.orange,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    zIndex: zIndex.modal,
    elevation: 10,
    minWidth: 150,
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
  timeDisplayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minWidth: 120,
  },
  timeDisplayText: {
    fontSize: sizing.iconLG,
    color: colors.text.primary,
    fontWeight: '600',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  timerButtonCircle: {
    width: sizing.iconLG,
    height: sizing.iconLG,
    borderRadius: radius.full,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.accent.orange,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxWidth: 60,
  },
  timerButtonDisabled: {
    borderColor: colors.accent.orangeLight,
    opacity: 0.6,
  },
  timerButtonSpacer: {
    width: sizing.iconLG,
    height: sizing.iconLG,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
});
