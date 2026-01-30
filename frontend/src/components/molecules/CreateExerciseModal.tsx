/**
 * CreateExerciseModal
 * Modal for creating custom exercises with name and exercise type selection.
 */

import React, { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, ScrollView } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';

import { Button } from '@/components/atoms/Button';
import { InputField } from '@/components/atoms/InputField';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { colors, radius, spacing } from '@/constants/theme';
import { useCustomExerciseStore } from '@/store/customExerciseStore';
import { EXERCISE_TYPE_LABELS, type ExerciseType } from '@/types/exercise';
import { exercises as baseExerciseCatalog } from '@/constants/exercises';
import { useTheme } from '@/hooks/useTheme';

interface CreateExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onExerciseCreated?: (exerciseName: string, exerciseType: ExerciseType) => void;
}

const EXERCISE_TYPE_OPTIONS: { value: ExerciseType; label: string; description: string }[] = [
  { value: 'weight', label: 'Weight + Reps', description: 'Track weight and reps (e.g., Bench Press)' },
  { value: 'bodyweight', label: 'Bodyweight', description: 'Track reps only (e.g., Push-ups)' },
  { value: 'assisted', label: 'Assisted', description: 'Track assistance weight and reps (e.g., Assisted Pull-ups)' },
  { value: 'duration', label: 'Timed', description: 'Track duration (e.g., Plank)' },
  { value: 'cardio', label: 'Cardio', description: 'Track distance and time (e.g., Running)' },
  { value: 'reps_only', label: 'Resistance Band', description: 'Track reps with band resistance' },
];

export const CreateExerciseModal: React.FC<CreateExerciseModalProps> = ({
  visible,
  onClose,
  onExerciseCreated,
}) => {
  const { theme } = useTheme();
  const addCustomExercise = useCustomExerciseStore((state) => state.addCustomExercise);
  const customExercises = useCustomExerciseStore((state) => state.customExercises);

  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<ExerciseType>('weight');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    setName('');
    setSelectedType('weight');
    setError(null);
    setIsSubmitting(false);
    onClose();
  }, [onClose]);

  const handleSelectType = useCallback((type: ExerciseType) => {
    triggerHaptic('selection');
    setSelectedType(type);
    setError(null);
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Please enter an exercise name');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    const existingCustom = customExercises.find(
      (e) => e.name.toLowerCase() === trimmedName.toLowerCase()
    );
    const existingBuiltIn = baseExerciseCatalog.find(
      (e) => e.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existingCustom || existingBuiltIn) {
      setError('An exercise with this name already exists');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await addCustomExercise({
        name: trimmedName,
        exerciseType: selectedType,
      });

      if (result) {
        triggerHaptic('success');
        onExerciseCreated?.(result.name, result.exerciseType);
        handleClose();
      } else {
        setError('Failed to create exercise. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setIsSubmitting(false);
    }
  }, [name, selectedType, customExercises, addCustomExercise, onExerciseCreated, handleClose]);

  const isValid = name.trim().length >= 2;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.modalContainer, { backgroundColor: theme.surface.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode="on-drag"
          >
            <View style={styles.header}>
              <Text variant="heading3" color="primary">
                Create Exercise
              </Text>
              <Text variant="body" color="secondary">
                Add a custom exercise to your library
              </Text>
            </View>

            <View style={styles.form}>
              <InputField
                label="Exercise Name"
                value={name}
                onChangeText={(text) => {
                  if (text.length <= 50) {
                    setName(text);
                    setError(null);
                  }
                }}
                placeholder="e.g., Bulgarian Split Squat"
                autoCapitalize="words"
                testID="create-exercise-name-input"
              />

              <View style={styles.typeSection}>
                <Text variant="labelMedium" color="secondary" style={styles.typeLabel}>
                  Exercise Type
                </Text>
                <View style={styles.typeGrid}>
                  {EXERCISE_TYPE_OPTIONS.map((option) => {
                    const isSelected = selectedType === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        style={[
                          styles.typeOption,
                          { 
                            backgroundColor: isSelected 
                              ? colors.accent.primary 
                              : theme.surface.elevated,
                            borderColor: isSelected 
                              ? colors.accent.primary 
                              : theme.border.light,
                          },
                        ]}
                        onPress={() => handleSelectType(option.value)}
                      >
                        <Text
                          variant="bodySemibold"
                          color={isSelected ? 'onAccent' : 'primary'}
                        >
                          {option.label}
                        </Text>
                        <Text
                          variant="caption"
                          color={isSelected ? 'onAccent' : 'secondary'}
                          numberOfLines={2}
                        >
                          {option.description}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {error ? (
                <Text variant="caption" style={styles.errorText}>
                  {error}
                </Text>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Button
              label="Cancel"
              variant="ghost"
              size="md"
              onPress={handleClose}
              style={styles.actionButton}
            />
            <Button
              label={isSubmitting ? 'Creating...' : 'Create'}
              variant="primary"
              size="md"
              onPress={handleCreate}
              disabled={!isValid || isSubmitting}
              style={styles.actionButton}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  header: {
    gap: spacing.xxs,
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  form: {
    gap: spacing.md,
  },
  typeSection: {
    gap: spacing.xs,
  },
  typeLabel: {
    marginBottom: spacing.xxxs,
  },
  typeGrid: {
    gap: spacing.xs,
  },
  typeOption: {
    padding: spacing.mdCompact,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xxxs,
  },
  errorText: {
    color: colors.accent.warning,
    paddingHorizontal: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.light,
  },
  actionButton: {
    flex: 1,
  },
});
