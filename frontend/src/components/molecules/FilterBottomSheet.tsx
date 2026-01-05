/**
 * FilterBottomSheet
 * Bottom sheet modal for exercise filtering with all filter categories using the shared SheetModal
 */
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/atoms/Button';
import { Text } from '@/components/atoms/Text';
import { QuickFilterChip } from '@/components/atoms/QuickFilterChip';
import { ExerciseFilterGroup } from '@/components/molecules/ExerciseFilterGroup';
import { colors, spacing } from '@/constants/theme';
import type { ExerciseFilters, ExerciseType, FilterDifficulty, FilterEquipment, FilterMuscleGroup, MuscleGroup } from '@/types/exercise';
import { EXERCISE_TYPES, EXERCISE_TYPE_LABELS } from '@/types/exercise';
import type { exerciseFilterOptions } from '@/constants/exercises';
import hierarchyData from '@/data/hierarchy.json';
import { toggleFilterValue } from '@/utils/exerciseFilters';
import { SheetModal } from '@/components/molecules/SheetModal';

const MUSCLE_HIERARCHY = hierarchyData.muscle_hierarchy as unknown as Record<string, { muscles: Record<string, any> }>;

interface FilterBottomSheetProps {
  visible: boolean;
  filters: ExerciseFilters;
  filterOptions: typeof exerciseFilterOptions;
  onClose: () => void;
  onApply: (filters: ExerciseFilters) => void;
  // Legacy props (unused in new implementation)
  toggleMuscleGroupFilter?: (value: FilterMuscleGroup) => void;
  toggleSpecificMuscleFilter?: (value: MuscleGroup) => void;
  toggleEquipmentFilter?: (value: FilterEquipment) => void;
  toggleDifficultyFilter?: (value: FilterDifficulty) => void;
  toggleBodyweightOnly?: () => void;
  toggleCompoundOnly?: () => void;
}

export const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  visible,
  filters,
  filterOptions,
  onClose,
  onApply,
}) => {
  // Local state for buffering filter changes
  const [localFilters, setLocalFilters] = React.useState<ExerciseFilters>(filters);

  // Sync local state with props when sheet opens or external filters change
  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
    }
  }, [visible, filters]);

  const handleToggleMuscleGroup = (value: FilterMuscleGroup) => {
    setLocalFilters((prev) => ({
      ...prev,
      muscleGroups: toggleFilterValue(prev.muscleGroups, value),
    }));
  };

  const handleToggleSpecificMuscle = (value: MuscleGroup) => {
    setLocalFilters((prev) => ({
      ...prev,
      specificMuscles: toggleFilterValue(prev.specificMuscles, value),
    }));
  };

  const handleToggleEquipment = (value: FilterEquipment) => {
    setLocalFilters((prev) => ({
      ...prev,
      equipment: toggleFilterValue(prev.equipment, value),
    }));
  };

  const handleToggleDifficulty = (value: FilterDifficulty) => {
    setLocalFilters((prev) => ({
      ...prev,
      difficulty: toggleFilterValue(prev.difficulty, value),
    }));
  };

  const handleToggleBodyweight = () => {
    setLocalFilters((prev) => ({ ...prev, bodyweightOnly: !prev.bodyweightOnly }));
  };

  const handleToggleCompound = () => {
    setLocalFilters((prev) => ({ ...prev, compoundOnly: !prev.compoundOnly }));
  };

  const handleApply = () => {
    onApply(localFilters);
  };

  // Calculate active specific muscles for display
  const activeSpecificOptions = React.useMemo(() => {
    const options: { group: FilterMuscleGroup; muscles: MuscleGroup[] }[] = [];

    localFilters.muscleGroups.forEach((group) => {
      const hierarchy = MUSCLE_HIERARCHY[group];
      if (hierarchy && hierarchy.muscles) {
        options.push({
          group,
          muscles: Object.keys(hierarchy.muscles) as MuscleGroup[],
        });
      }
    });

    return options;
  }, [localFilters.muscleGroups]);

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title="Filter exercises"
      height="92%"
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.filterGroups}>
          <ExerciseFilterGroup
            title="Muscle group"
            values={filterOptions.muscleGroups}
            selected={localFilters.muscleGroups}
            onToggle={handleToggleMuscleGroup}
            testIDPrefix="filter-muscle"
          />

          {activeSpecificOptions.map(({ group, muscles }) => (
            <View key={group} style={styles.nestedFilterGroup}>
              <ExerciseFilterGroup
                title={group}
                values={muscles}
                selected={localFilters.specificMuscles}
                onToggle={handleToggleSpecificMuscle}
                testIDPrefix={`filter-specific-${group}`}
              />
            </View>
          ))}

          <ExerciseFilterGroup
            title="Equipment"
            values={filterOptions.equipment}
            selected={localFilters.equipment}
            onToggle={handleToggleEquipment}
            testIDPrefix="filter-equipment"
          />

          <ExerciseFilterGroup
            title="Difficulty"
            values={filterOptions.difficulty}
            selected={localFilters.difficulty}
            onToggle={handleToggleDifficulty}
            testIDPrefix="filter-difficulty"
          />

          <ExerciseFilterGroup
            title="Exercise Type"
            values={EXERCISE_TYPES.map(t => EXERCISE_TYPE_LABELS[t])}
            selected={localFilters.exerciseTypes.map(t => EXERCISE_TYPE_LABELS[t])}
            onToggle={(label) => {
              const type = (Object.keys(EXERCISE_TYPE_LABELS) as ExerciseType[]).find(
                t => EXERCISE_TYPE_LABELS[t] === label
              );
              if (type) {
                setLocalFilters((prev) => ({
                  ...prev,
                  exerciseTypes: toggleFilterValue(prev.exerciseTypes, type),
                }));
              }
            }}
            testIDPrefix="filter-exercisetype"
          />

          <View style={styles.toggleSection}>
            <Text variant="caption" color="secondary">
              Special filters
            </Text>
            <View style={styles.toggleRow}>
              <QuickFilterChip
                label="Bodyweight"
                active={localFilters.bodyweightOnly}
                onPress={handleToggleBodyweight}
                testID="filter-bodyweight"
              />
              <QuickFilterChip
                label="Compound"
                active={localFilters.compoundOnly}
                onPress={handleToggleCompound}
                testID="filter-compound"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Apply Filters"
          variant="primary"
          size="lg"
          onPress={handleApply}
        />
      </View>
    </SheetModal>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    flexGrow: 1,
  },
  filterGroups: {
    gap: spacing.lg,
  },
  toggleSection: {
    gap: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  nestedFilterGroup: {
    marginLeft: spacing.lg,
    paddingLeft: spacing.md,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border.light,
    gap: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
});

