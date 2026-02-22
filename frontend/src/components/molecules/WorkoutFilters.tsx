/**
 * WorkoutFilters
 * Modern collapsible filter section with horizontal scrolling chips
 * Inspired by industry-leading fitness apps for seamless UX
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { QuickFilterChip } from '@/components/atoms/QuickFilterChip';
import { FilterChip } from '@/components/atoms/FilterChip';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { springBouncy } from '@/constants/animations';

export type WorkoutFilterState = {
  experienceLevel: 'all' | 'beginner' | 'intermediate' | 'advanced';
  equipment: 'all' | 'full-gym' | 'dumbbells-only' | 'bodyweight';
  goal: 'all' | 'build-muscle' | 'strength' | 'lose-fat' | 'general-fitness';
  workoutType: 'all' | 'full-body' | 'push' | 'pull' | 'upper-body' | 'lower-body' | 'core-mobility';
  duration: 'all' | 'quick' | 'medium' | 'long';
};

interface WorkoutFiltersProps {
  filters: WorkoutFilterState;
  onFiltersChange: (filters: WorkoutFilterState) => void;
  showDurationFilter?: boolean;
  showWorkoutTypeFilter?: boolean;
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

const WORKOUT_TYPE_FILTERS = [
  { label: 'All Types', value: 'all' as const },
  { label: 'Full Body', value: 'full-body' as const },
  { label: 'Push', value: 'push' as const },
  { label: 'Pull', value: 'pull' as const },
  { label: 'Upper Body', value: 'upper-body' as const },
  { label: 'Lower Body', value: 'lower-body' as const },
  { label: 'Core & Mobility', value: 'core-mobility' as const },
];

const EXPERIENCE_FILTERS = [
  { label: 'All Levels', value: 'all' as const },
  { label: 'Beginner', value: 'beginner' as const },
  { label: 'Intermediate', value: 'intermediate' as const },
  { label: 'Advanced', value: 'advanced' as const },
];

export const WorkoutFilters: React.FC<WorkoutFiltersProps> = ({ filters, onFiltersChange, showDurationFilter = true, showWorkoutTypeFilter = true }) => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const rotation = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const opacity = useSharedValue(0);

  const animatedRotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const toggleExpanded = () => {
    triggerHaptic('selection');
    const expanding = !isExpanded;
    setIsExpanded(expanding);
    
    rotation.value = withSpring(expanding ? 180 : 0, springBouncy);
    opacity.value = withTiming(expanding ? 1 : 0, {
      duration: expanding ? 250 : 200,
      easing: Easing.out(Easing.cubic),
    });
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
    if (showWorkoutTypeFilter && filters.workoutType !== 'all') count++;
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
      case 'workoutType':
        return WORKOUT_TYPE_FILTERS.find(f => f.value === value)?.label || value;
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
      workoutType: 'all',
      duration: 'all',
    });
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <View style={[styles.container, { backgroundColor: theme.surface.card }]}>
      {/* Compact header with toggle */}
      <Pressable style={[styles.header, { borderBottomColor: theme.border.light }]} onPress={toggleExpanded}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <IconSymbol name="filter-list" size={20} color={colors.accent.primary} />
            <Text variant="bodySemibold" color="primary">Filter</Text>
            {activeFiltersCount > 0 && (
              <View style={styles.badge}>
                <Text variant="caption" color="onAccent" style={styles.badgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </View>
          <Animated.View style={animatedRotationStyle}>
            <IconSymbol 
              name="keyboard-arrow-down" 
              size={24} 
              color={colors.text.secondary} 
            />
          </Animated.View>
        </View>
      </Pressable>

      {/* Active filters horizontal scroll */}
      {activeFiltersCount > 0 && !isExpanded && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={[styles.activeFiltersScroll, { borderBottomColor: theme.border.light }]}
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
          {showWorkoutTypeFilter && filters.workoutType !== 'all' && (
            <FilterChip
              label={getFilterLabel('workoutType', filters.workoutType)}
              onRemove={() => clearFilter('workoutType')}
            />
          )}
          {showDurationFilter && filters.duration !== 'all' && (
            <FilterChip
              label={getFilterLabel('duration', filters.duration)}
              onRemove={() => clearFilter('duration')}
            />
          )}
          {activeFiltersCount > 1 && (
            <Pressable onPress={clearAllFilters} style={[styles.clearAllChip, { borderColor: theme.border.light, backgroundColor: theme.surface.subtle }]}>
              <Text variant="caption" color="secondary" style={styles.clearAllText}>Clear All</Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {/* Expandable filter options with smooth animation */}
      {isExpanded && (
        <Animated.View style={[styles.expandedContent, animatedContentStyle]}>
          {/* Experience Level - Horizontal Scroll */}
          <View style={styles.filterSection}>
            <Text variant="captionMedium" color="primary" style={styles.sectionTitle}>LEVEL</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalChipsContent}
            >
              {EXPERIENCE_FILTERS.map((filter) => (
                <QuickFilterChip
                  key={filter.value}
                  label={filter.label}
                  active={filters.experienceLevel === filter.value}
                  onPress={() => updateFilter('experienceLevel', filter.value)}
                />
              ))}
            </ScrollView>
          </View>

          {/* Equipment - Horizontal Scroll */}
          <View style={styles.filterSection}>
            <Text variant="captionMedium" color="primary" style={styles.sectionTitle}>EQUIPMENT</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalChipsContent}
            >
              {EQUIPMENT_FILTERS.map((filter) => (
                <QuickFilterChip
                  key={filter.value}
                  label={filter.label}
                  active={filters.equipment === filter.value}
                  onPress={() => updateFilter('equipment', filter.value)}
                />
              ))}
            </ScrollView>
          </View>

          {/* Goal - Horizontal Scroll */}
          <View style={styles.filterSection}>
            <Text variant="captionMedium" color="primary" style={styles.sectionTitle}>GOAL</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalChipsContent}
            >
              {GOAL_FILTERS.map((filter) => (
                <QuickFilterChip
                  key={filter.value}
                  label={filter.label}
                  active={filters.goal === filter.value}
                  onPress={() => updateFilter('goal', filter.value)}
                />
              ))}
            </ScrollView>
          </View>

          {/* Workout Type - Horizontal Scroll */}
          {showWorkoutTypeFilter && (
            <View style={styles.filterSection}>
              <Text variant="captionMedium" color="primary" style={styles.sectionTitle}>TYPE</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalChipsContent}
              >
                {WORKOUT_TYPE_FILTERS.map((filter) => (
                  <QuickFilterChip
                    key={filter.value}
                    label={filter.label}
                    active={filters.workoutType === filter.value}
                    onPress={() => updateFilter('workoutType', filter.value)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Duration - Horizontal Scroll */}
          {showDurationFilter && (
            <View style={styles.filterSection}>
              <Text variant="captionMedium" color="primary" style={styles.sectionTitle}>DURATION</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalChipsContent}
              >
                {DURATION_FILTERS.map((filter) => (
                  <QuickFilterChip
                    key={filter.value}
                    label={filter.label}
                    active={filters.duration === filter.value}
                    onPress={() => updateFilter('duration', filter.value)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Clear all button */}
          {activeFiltersCount > 0 && (
            <Pressable style={[styles.clearAllButton, { borderColor: theme.border.light, backgroundColor: theme.surface.subtle }]} onPress={clearAllFilters}>
              <Text variant="bodySemibold" color="secondary">Clear All Filters</Text>
            </Pressable>
          )}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    ...shadows.cardSoft,
    overflow: 'hidden',
  },
  header: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  activeFiltersScroll: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  activeFiltersContent: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  clearAllChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
  },
  clearAllText: {
    fontWeight: '600',
  },
  expandedContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  filterSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    paddingHorizontal: spacing.lg,
    letterSpacing: 0.8,
    fontWeight: '700',
    fontSize: 11,
  },
  horizontalChipsContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  clearAllButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
});
