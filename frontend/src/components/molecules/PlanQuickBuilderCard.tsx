import React, { useCallback, useEffect, type MutableRefObject, type RefObject } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type TextInput,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { triggerHaptic } from '@/utils/haptics';
import { InputField } from '@/components/atoms/InputField';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Text } from '@/components/atoms/Text';
import { QuickFilterChip } from '@/components/atoms/QuickFilterChip';
import { PlanQuickBuilderSuggestionRow } from '@/components/molecules/PlanQuickBuilderSuggestionRow';
import type { Exercise } from '@/constants/exercises';
import { colors, radius, spacing } from '@/constants/theme';
import { timingMedium } from '@/constants/animations';
import type { PlanQuickBuilderField } from '@/types/planQuickBuilder';

interface PlanQuickBuilderCardProps {
  planName: string;
  onPlanNameChange: (value: string) => void;
  planNameLabel?: string;
  planNamePlaceholder?: string;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  suggestions: Exercise[];
  onAddExercise: (exercise: Exercise) => void;
  quickFilterCategories?: string[];
  activeQuickFilter?: string | null;
  onQuickFilterCategory?: (category: string) => void;
  emptyHint?: string;
  searchInputRef?: RefObject<TextInput | null> | MutableRefObject<TextInput | null>;
  onFocusSearch?: () => void;
  onCardLayout?: (y: number) => void;
  onFieldLayout?: (field: PlanQuickBuilderField, y: number) => void;
  onFieldFocus?: (field: PlanQuickBuilderField) => void;
  onFieldBlur?: () => void;
  isFieldFocused?: boolean;
  isNameDuplicate?: boolean;
}

export const PlanQuickBuilderCard: React.FC<PlanQuickBuilderCardProps> = ({
  planName,
  onPlanNameChange,
  planNameLabel,
  planNamePlaceholder,
  searchTerm,
  onSearchTermChange,
  suggestions,
  onAddExercise,
  quickFilterCategories = [],
  activeQuickFilter = null,
  onQuickFilterCategory,
  emptyHint,
  searchInputRef,
  onFocusSearch,
  onCardLayout,
  onFieldLayout,
  onFieldFocus,
  onFieldBlur,
  isNameDuplicate = false,
}) => {
  const fadeProgress = useSharedValue(0);
  
  useEffect(() => {
    fadeProgress.value = withTiming(1, timingMedium);
  }, [fadeProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeProgress.value,
    transform: [{ translateY: withTiming(fadeProgress.value === 1 ? 0 : spacing.md, timingMedium) }],
  }));

  const handleEmptyStatePress = useCallback(() => {
    triggerHaptic('selection');
    onFocusSearch?.();
  }, [onFocusSearch]);

  const handleCardLayout = useCallback((event: LayoutChangeEvent) => {
    onCardLayout?.(event.nativeEvent.layout.y);
  }, [onCardLayout]);

  const handleFieldLayout = useCallback((field: PlanQuickBuilderField) => (event: LayoutChangeEvent) => {
    onFieldLayout?.(field, event.nativeEvent.layout.y);
  }, [onFieldLayout]);

  const displayPlanNameLabel = planNameLabel ?? 'Plan name';
  const displayPlanNamePlaceholder = planNamePlaceholder ?? 'e.g. Push Day';
  const displayEmptyHint = emptyHint ?? 'Search for exercises to add them instantly.';
  const hasSuggestions = suggestions.length > 0;
  const showQuickFilters = quickFilterCategories.length > 0;

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]} onLayout={handleCardLayout}>
      <SurfaceCard tone="card" padding="xl" showAccentStripe>
        <View style={styles.content}>
          <View onLayout={handleFieldLayout('planName')}>
            <InputField
              label={displayPlanNameLabel}
              value={planName}
              onChangeText={onPlanNameChange}
              placeholder={displayPlanNamePlaceholder}
              returnKeyType="next"
              autoCapitalize="words"
              testID="plan-builder-name-input"
              onFocus={() => onFieldFocus?.('planName')}
              onBlur={onFieldBlur}
            />
            {isNameDuplicate && planName.trim().length > 0 && (
              <Text variant="caption" color="red" style={styles.errorMessage}>
                Invalid name - a plan with this name already exists
              </Text>
            )}
          </View>

          <View onLayout={handleFieldLayout('search')}>
            <InputField
              label="Search exercises"
              value={searchTerm}
              onChangeText={onSearchTermChange}
              placeholder="Find by movement or muscle group"
              returnKeyType="search"
              inputRef={searchInputRef}
              autoCapitalize="none"
              testID="plan-builder-search-input"
              onFocus={() => onFieldFocus?.('search')}
              onBlur={onFieldBlur}
            />
          </View>

          {showQuickFilters && onQuickFilterCategory ? (
            <View style={styles.quickAddRow}>
              <Text variant="caption" color="secondary">Quick filters</Text>
              <View style={styles.quickAddChips}>
                {quickFilterCategories.map((category) => (
                  <QuickFilterChip
                    key={category}
                    label={category}
                    active={activeQuickFilter === category}
                    onPress={() => onQuickFilterCategory(category)}
                    testID={`quick-filter-${category}`}
                  />
                ))}
              </View>
            </View>
          ) : null}
          
          <View style={styles.suggestionsSection}>
            <Text variant="caption" color="secondary">Suggested exercises</Text>
            {hasSuggestions ? (
              <View style={styles.suggestionList}>
                {suggestions.map((exercise) => (
                  <PlanQuickBuilderSuggestionRow key={exercise.id} exercise={exercise} onAdd={onAddExercise} />
                ))}
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityHint="Focus the exercise search input"
                style={styles.emptyState}
                onPress={handleEmptyStatePress}
              >
                <Text variant="body" color="secondary">
                  {displayEmptyHint}
                </Text>
                <Text variant="caption" color="secondary">Tap to search exercises</Text>
              </Pressable>
            )}
          </View>
        </View>
      </SurfaceCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  content: { gap: spacing.lg },
  quickAddRow: { gap: spacing.xs },
  quickAddChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
    rowGap: spacing.xs,
  },
  suggestionsSection: { gap: spacing.sm },
  suggestionList: { gap: spacing.xs },
  emptyState: {
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  errorMessage: {
    marginTop: spacing.xs,
  },
});
