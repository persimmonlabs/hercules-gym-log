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

interface ExerciseSetEditorProps {
  isExpanded: boolean;
  exerciseName: string;
  initialSets: SetLog[];
  onSetsChange: (sets: SetLog[]) => void;
  onProgressChange?: (progress: { completedSets: number; totalSets: number }) => void;
  embedded?: boolean;
}

const DEFAULT_NEW_SET: SetLog = {
  reps: 8,
  weight: 0,
  completed: false,
};

interface SetDraft extends SetLog {
  weightInput: string;
  repsInput: string;
}

type ActiveSelectionTarget = {
  type: 'weight' | 'reps';
  index: number;
};

const formatWeightInputValue = (value: number): string => {
  return value.toFixed(1);
};

const createDraftFromSet = (set: SetLog): SetDraft => ({
  ...set,
  weightInput: formatWeightInputValue(set.weight ?? 0),
  repsInput: String(set.reps ?? 0),
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
    reps: Number.isFinite(draft.reps) ? Math.max(draft.reps ?? 0, 0) : 0,
    weight: Number.isFinite(draft.weight) ? Math.max(draft.weight ?? 0, 0) : 0,
    completed: Boolean(draft.completed),
  }));

export const ExerciseSetEditor: React.FC<ExerciseSetEditorProps> = ({
  isExpanded,
  exerciseName,
  initialSets,
  onSetsChange,
  onProgressChange,
  embedded = false,
}) => {
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

      const newSetValues = lastCompletedSet
        ? {
          weight: lastCompletedSet.weight,
          reps: lastCompletedSet.reps,
          completed: false,
          weightInput: formatWeightInputValue(lastCompletedSet.weight),
          repsInput: String(lastCompletedSet.reps),
        }
        : {
          ...DEFAULT_NEW_SET,
          weightInput: formatWeightInputValue(DEFAULT_NEW_SET.weight),
          repsInput: String(DEFAULT_NEW_SET.reps),
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
          if (nextSet.weight === 0 && nextSet.reps === 8) {
            updatedSets[nextUncompletedIndex] = {
              ...nextSet,
              weight: completedSet.weight,
              reps: completedSet.reps,
              weightInput: formatWeightInputValue(completedSet.weight),
              repsInput: String(completedSet.reps),
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
            const summaryText = `${String(set.weight ?? 0)} lbs × ${String(set.reps ?? 0)} reps`;

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

                    <View style={styles.metricSection} pointerEvents="box-none">
                      <Text variant="label" color="neutral" style={styles.metricLabel}>
                        Weight (lbs)
                      </Text>
                      <View style={styles.metricControls}>
                        <Pressable
                          style={styles.adjustButton}
                          onPressIn={() => adjustSetValue(index, 'weight', -2.5)}
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
                          value={set.weightInput}
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
                              ? { start: 0, end: set.weightInput.length }
                              : undefined
                          }
                          onFocus={() => handleWeightFocus(index)}
                          onBlur={() => handleWeightBlur(index)}
                        />
                        <Pressable
                          style={styles.adjustButton}
                          onPressIn={() => adjustSetValue(index, 'weight', 2.5)}
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
