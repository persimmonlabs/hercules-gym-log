/**
 * AddExercisesSearchCard
 * Search and quick filters block for the Add Exercises screen.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { InputField } from '@/components/atoms/InputField';
import { Text } from '@/components/atoms/Text';
import { QuickFilterChip } from '@/components/atoms/QuickFilterChip';
import { spacing } from '@/constants/theme';

interface AddExercisesSearchCardProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  quickFilterCategories: string[];
  activeQuickFilter: string | null;
  onQuickFilterCategory: (category: string) => void;
}

export const AddExercisesSearchCard: React.FC<AddExercisesSearchCardProps> = ({
  searchTerm,
  onSearchChange,
  quickFilterCategories,
  activeQuickFilter,
  onQuickFilterCategory,
}) => {
  return (
    <SurfaceCard tone="card" padding="xl" showAccentStripe>
      <View style={styles.content}>
        <InputField
          label="Search Exercises"
          value={searchTerm}
          onChangeText={onSearchChange}
          placeholder="Search by movement or muscle"
          returnKeyType="search"
          autoCapitalize="none"
          testID="add-exercises-search"
        />

        {quickFilterCategories.length > 0 ? (
          <View style={styles.filtersSection}>
            <Text variant="caption" color="secondary">
              Quick filters
            </Text>
            <View style={styles.filterChips}>
              {quickFilterCategories.map((category) => (
                <QuickFilterChip
                  key={category}
                  label={category}
                  active={activeQuickFilter === category}
                  onPress={() => onQuickFilterCategory(category)}
                  testID={`add-exercises-filter-${category}`}
                />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  filtersSection: {
    gap: spacing.xs,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
    rowGap: spacing.xs,
  },
});
