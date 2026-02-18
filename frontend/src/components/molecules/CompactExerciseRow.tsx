/**
 * CompactExerciseRow
 * A clean, spacious exercise row for workout builders.
 * Features drag handle for reordering and simple delete action.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { triggerHaptic } from '@/utils/haptics';
import { colors, radius, spacing } from '@/constants/theme';
import type { Exercise } from '@/constants/exercises';

interface CompactExerciseRowProps {
  exercise: Exercise;
  index: number;
  totalCount: number;
  onRemove: (exerciseId: string) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  showReorderControls?: boolean;
}

export const CompactExerciseRow: React.FC<CompactExerciseRowProps> = React.memo(({
  exercise,
  index,
  totalCount,
  onRemove,
  onMoveUp,
  onMoveDown,
  showReorderControls = true,
}) => {
  const isFirst = index === 0;
  const isLast = index === totalCount - 1;

  const handleRemove = useCallback(() => {
    triggerHaptic('warning');
    onRemove(exercise.id);
  }, [exercise.id, onRemove]);

  const handleMoveUp = useCallback(() => {
    if (onMoveUp && !isFirst) {
      triggerHaptic('selection');
      onMoveUp(index);
    }
  }, [index, isFirst, onMoveUp]);

  const handleMoveDown = useCallback(() => {
    if (onMoveDown && !isLast) {
      triggerHaptic('selection');
      onMoveDown(index);
    }
  }, [index, isLast, onMoveDown]);

  return (
    <View style={styles.container}>
      {/* Drag Handle / Reorder Area */}
      {showReorderControls && totalCount > 1 ? (
        <View style={styles.reorderArea}>
          <Pressable
            onPress={handleMoveUp}
            disabled={isFirst}
            style={styles.reorderButton}
            hitSlop={4}
          >
            <IconSymbol
              name="keyboard-arrow-up"
              size={20}
              color={isFirst ? colors.text.muted : colors.text.secondary}
            />
          </Pressable>
          <Pressable
            onPress={handleMoveDown}
            disabled={isLast}
            style={styles.reorderButton}
            hitSlop={4}
          >
            <IconSymbol
              name="keyboard-arrow-down"
              size={20}
              color={isLast ? colors.text.muted : colors.text.secondary}
            />
          </Pressable>
        </View>
      ) : (
        <View style={styles.indexBadge}>
          <Text variant="bodySemibold" color="secondary">
            {index + 1}
          </Text>
        </View>
      )}

      {/* Exercise Name */}
      <View style={styles.nameContainer}>
        <Text
          variant="body"
          color="primary"
          numberOfLines={1}
        >
          {exercise.name}
        </Text>
      </View>

      {/* Delete Button */}
      <Pressable
        onPress={handleRemove}
        style={styles.removeButton}
        hitSlop={12}
      >
        <IconSymbol
          name="close"
          size={18}
          color={colors.text.tertiary}
        />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    paddingLeft: spacing.sm,
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    minHeight: 56,
    gap: spacing.sm,
  },
  reorderArea: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
  },
  reorderButton: {
    padding: 2,
  },
  indexBadge: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
