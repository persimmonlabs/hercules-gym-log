/**
 * WorkoutFilters
 * Collapsible filter section for workout browsing with Equipment, Goal, and Duration filters
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { QuickFilterChip } from '@/components/atoms/QuickFilterChip';
import { FilterChip } from '@/components/atoms/FilterChip';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, spacing, radius } from '@/constants/theme';
import { springBouncy } from '@/constants/animations';

export type WorkoutFilterState = {
  experienceLevel: 'all' | 'beginner' | 'intermediate' | 'advanced';
  equipment: 'all' | 'full-gym' | 'dumbbells-only' | 'bodyweight';
  goal: 'all' | 'build-muscle' | 'strength' | 'lose-fat' | 'general-fitness';
  duration: 'all' | 'quick' | 'medium' | 'long';
};

interface WorkoutFiltersProps {
  filters: WorkoutFilterState;
  onFiltersChange: (filters: WorkoutFilterState) => void;
  showDurationFilter?: boolean;
}

const EQUIPMENT_FILTERS = [
  { label: 'All Equipment', value: 'all' as const },
  { label: 'Full Gym', value: 'full-gym' as const },
  { label: 'Dumbbells Only', value: 'dumbbells-only' as const },
  { label: 'Bodyweight', value: 'bodyweight' as const },
];

const GOAL_FILTERS = [
  { label: 'All Goals', value: 'all' as const },
  { label: 'Build Muscle', value: 'build-muscle' as const },
  { label: 'Strength', value: 'strength' as const },
  { label: 'Lose Fat', value: 'lose-fat' as const },
  { label: 'General Fitness', value: 'general-fitness' as const },
];

const DURATION_FILTERS = [
  { label: 'All Durations', value: 'all' as const },
  { label: 'Quick (≤30min)', value: 'quick' as const },
  { label: 'Medium (31-60min)', value: 'medium' as const },
  { label: 'Long (>60min)', value: 'long' as const },
];

const EXPERIENCE_FILTERS = [
  { label: 'All Levels', value: 'all' as const },
  { label: 'Beginner', value: 'beginner' as const },
  { label: 'Intermediate', value: 'intermediate' as const },
  { label: 'Advanced', value: 'advanced' as const },
];

export const WorkoutFilters: React.FC<WorkoutFiltersProps> = ({ filters, onFiltersChange, showDurationFilter = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const rotation = useSharedValue(0);

  const animatedRotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const toggleExpanded = () => {
    triggerHaptic('selection');
    setIsExpanded(!isExpanded);
    rotation.value = withSpring(isExpanded ? 0 : 180, springBouncy);
  };

  const updateFilter = (key: keyof WorkoutFilterState, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.experienceLevel !== 'all') count++;
    if (filters.equipment !== 'all') count++;
    if (filters.goal !== 'all') count++;
    if (showDurationFilter && filters.duration !== 'all') count++;
    return count;
  };

  const getFilterLabel = (key: keyof WorkoutFilterState, value: string) => {
    switch (key) {
      case 'experienceLevel':
        return EXPERIENCE_FILTERS.find(f => f.value === value)?.label || value;
      case 'equipment':
        return EQUIPMENT_FILTERS.find(f => f.value === value)?.label || value;
      case 'goal':
        return GOAL_FILTERS.find(f => f.value === value)?.label || value;
      case 'duration':
        return DURATION_FILTERS.find(f => f.value === value)?.label || value;
      default:
        return value;
    }
  };

  const clearFilter = (key: keyof WorkoutFilterState) => {
    updateFilter(key, 'all');
  };

  const clearAllFilters = () => {
    onFiltersChange({
      experienceLevel: 'all',
      equipment: 'all',
      goal: 'all',
      duration: 'all',
    });
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <View style={styles.container}>
      {/* Header with active filter chips */}
      <Pressable style={styles.header} onPress={toggleExpanded}>
        <View style={styles.headerTop}>
          <View style={styles.titleRow}>
            <Text variant="bodySemibold" color="primary">Filters</Text>
            {activeFiltersCount > 0 && (
              <View style={styles.badge}>
                <Text variant="caption" color="onAccent">{activeFiltersCount}</Text>
              </View>
            )}
          </View>
          <View style={styles.expandHint}>
            <Text variant="caption" color="secondary">
              {isExpanded ? 'Show less' : 'Show more'}
            </Text>
            <Animated.View style={[styles.expandButton, animatedRotationStyle]}>
              <IconSymbol 
                name="keyboard-arrow-down" 
                size={20} 
                color={colors.text.secondary} 
              />
            </Animated.View>
          </View>
        </View>

        {/* Active filter chips */}
        {activeFiltersCount > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.activeFiltersScroll}
            contentContainerStyle={styles.activeFiltersContent}
          >
            {filters.experienceLevel !== 'all' && (
              <FilterChip
                label={getFilterLabel('experienceLevel', filters.experienceLevel)}
                onRemove={() => clearFilter('experienceLevel')}
              />
            )}
            {filters.equipment !== 'all' && (
              <FilterChip
                label={getFilterLabel('equipment', filters.equipment)}
                onRemove={() => clearFilter('equipment')}
              />
            )}
            {filters.goal !== 'all' && (
              <FilterChip
                label={getFilterLabel('goal', filters.goal)}
                onRemove={() => clearFilter('goal')}
              />
            )}
            {showDurationFilter && filters.duration !== 'all' && (
              <FilterChip
                label={getFilterLabel('duration', filters.duration)}
                onRemove={() => clearFilter('duration')}
              />
            )}
          </ScrollView>
        )}
      </Pressable>

      {/* Expandable filter options */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Experience Level */}
          <View style={styles.filterSection}>
            <Text variant="captionMedium" color="primary" style={styles.sectionTitle}>Experience Level:</Text>
            <View style={styles.chipsContainer}>
              {EXPERIENCE_FILTERS.map((filter) => (
                <QuickFilterChip
                  key={filter.value}
                  label={filter.label}
                  active={filters.experienceLevel === filter.value}
                  onPress={() => updateFilter('experienceLevel', filter.value)}
                />
              ))}
            </View>
          </View>

          {/* Equipment */}
          <View style={styles.filterSection}>
            <Text variant="captionMedium" color="primary" style={styles.sectionTitle}>Equipment:</Text>
            <View style={styles.chipsContainer}>
              {EQUIPMENT_FILTERS.map((filter) => (
                <QuickFilterChip
                  key={filter.value}
                  label={filter.label}
                  active={filters.equipment === filter.value}
                  onPress={() => updateFilter('equipment', filter.value)}
                />
              ))}
            </View>
          </View>

          {/* Goal */}
          <View style={styles.filterSection}>
            <Text variant="captionMedium" color="primary" style={styles.sectionTitle}>Goal:</Text>
            <View style={styles.chipsContainer}>
              {GOAL_FILTERS.map((filter) => (
                <QuickFilterChip
                  key={filter.value}
                  label={filter.label}
                  active={filters.goal === filter.value}
                  onPress={() => updateFilter('goal', filter.value)}
                />
              ))}
            </View>
          </View>

          {/* Duration */}
          {showDurationFilter && (
            <View style={styles.filterSection}>
              <Text variant="captionMedium" color="primary" style={styles.sectionTitle}>Duration:</Text>
              <View style={styles.chipsContainer}>
                {DURATION_FILTERS.map((filter) => (
                  <QuickFilterChip
                    key={filter.value}
                    label={filter.label}
                    active={filters.duration === filter.value}
                    onPress={() => updateFilter('duration', filter.value)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Clear all button */}
          {activeFiltersCount > 0 && (
            <View style={styles.clearAllContainer}>
              <QuickFilterChip
                label="Clear All Filters"
                active={false}
                onPress={clearAllFilters}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  header: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  expandButton: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.subtle,
  },
  expandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  activeFiltersScroll: {
    marginTop: spacing.sm,
  },
  activeFiltersContent: {
    gap: spacing.sm,
  },
  expandedContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  filterSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    marginLeft: spacing.xs,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  clearAllContainer: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
});
