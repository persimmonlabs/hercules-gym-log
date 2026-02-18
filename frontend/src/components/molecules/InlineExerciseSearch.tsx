/**
 * InlineExerciseSearch
 * A lightweight inline search component for quick exercise discovery.
 * Shows suggestions that expand on focus with one-tap add functionality.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { triggerHaptic } from '@/utils/haptics';
import { colors, radius, spacing, typography, sizing } from '@/constants/theme';
import { timingFast, timingMedium } from '@/constants/animations';
import { useSemanticExerciseSearch } from '@/hooks/useSemanticExerciseSearch';
import { exercises as exerciseCatalog, type Exercise } from '@/constants/exercises';
import { getExerciseDisplayTags } from '@/utils/exerciseDisplayTags';

interface InlineExerciseSearchProps {
  onAddExercise: (exercise: Exercise) => void;
  excludeIds?: string[];
  placeholder?: string;
  maxSuggestions?: number;
  onBrowseAll?: () => void;
}

export const InlineExerciseSearch: React.FC<InlineExerciseSearchProps> = ({
  onAddExercise,
  excludeIds = [],
  placeholder = 'Search exercises...',
  maxSuggestions = 5,
  onBrowseAll,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const focusProgress = useSharedValue(0);

  // Get suggestions based on search term
  const suggestions = useSemanticExerciseSearch(searchTerm, exerciseCatalog, {
    limit: maxSuggestions,
    excludeIds,
  });

  // Show popular exercises when search is empty and focused
  const popularExercises = useMemo(() => {
    if (searchTerm.trim()) return [];
    const excluded = new Set(excludeIds);
    const popularIds = [
      'bench-press', 'squat', 'deadlift', 'lat-pulldown', 'shoulder-press',
      'bicep-curl', 'tricep-pushdown', 'leg-press', 'pull-up', 'dumbbell-row'
    ];
    return exerciseCatalog
      .filter(ex => popularIds.includes(ex.id) && !excluded.has(ex.id))
      .slice(0, maxSuggestions);
  }, [excludeIds, searchTerm, maxSuggestions]);

  const displayExercises = searchTerm.trim() ? suggestions : popularExercises;
  const showSuggestions = isFocused && displayExercises.length > 0;

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: focusProgress.value > 0 ? colors.accent.primary : colors.border.light,
  }));

  const handleFocus = useCallback(() => {
    focusProgress.value = withTiming(1, timingFast);
    setIsFocused(true);
  }, [focusProgress]);

  const handleBlur = useCallback(() => {
    focusProgress.value = withTiming(0, timingFast);
    // Delay blur to allow tap on suggestions
    setTimeout(() => setIsFocused(false), 150);
  }, [focusProgress]);

  const handleAddExercise = useCallback((exercise: Exercise) => {
    triggerHaptic('light');
    onAddExercise(exercise);
    setSearchTerm('');
  }, [onAddExercise]);

  const handleClearSearch = useCallback(() => {
    triggerHaptic('selection');
    setSearchTerm('');
  }, []);

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <Animated.View style={[styles.inputContainer, animatedBorderStyle]}>
        <IconSymbol
          name="search"
          size={sizing.iconSM}
          color={isFocused ? colors.accent.primary : colors.text.tertiary}
        />
        <TextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder={placeholder}
          placeholderTextColor={colors.text.muted}
          selectionColor={colors.accent.primary}
          cursorColor={colors.accent.primary}
          style={styles.textInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchTerm.length > 0 && (
          <Pressable onPress={handleClearSearch} hitSlop={8}>
            <IconSymbol
              name="close"
              size={sizing.iconSM}
              color={colors.text.tertiary}
            />
          </Pressable>
        )}
      </Animated.View>

      {/* Suggestions */}
      {showSuggestions && (
        <Animated.View
          entering={FadeInDown.duration(200).springify()}
          exiting={FadeOutUp.duration(150)}
          style={styles.suggestionsContainer}
        >
          <View style={styles.suggestionsHeader}>
            <Text variant="caption" color="secondary">
              {searchTerm.trim() ? 'Suggested' : 'Popular exercises'}
            </Text>
            {onBrowseAll && (
              <Pressable onPress={onBrowseAll} hitSlop={8}>
                <Text variant="caption" style={styles.browseAllText}>
                  Browse all
                </Text>
              </Pressable>
            )}
          </View>
          <View style={styles.suggestionsList}>
            {displayExercises.map((exercise) => (
              <SuggestionRow
                key={exercise.id}
                exercise={exercise}
                onAdd={handleAddExercise}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {/* Empty State for Search */}
      {isFocused && searchTerm.trim() && suggestions.length === 0 && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
          style={styles.emptyState}
        >
          <Text variant="body" color="secondary">
            No exercises found for &quot;{searchTerm}&quot;
          </Text>
          {onBrowseAll && (
            <Pressable onPress={onBrowseAll}>
              <Text variant="bodySemibold" style={styles.browseAllText}>
                Browse all exercises
              </Text>
            </Pressable>
          )}
        </Animated.View>
      )}
    </View>
  );
};

// Suggestion Row Sub-component
interface SuggestionRowProps {
  exercise: Exercise;
  onAdd: (exercise: Exercise) => void;
}

const SuggestionRow: React.FC<SuggestionRowProps> = ({ exercise, onAdd }) => {
  const tags = getExerciseDisplayTags({
    muscles: exercise.muscles,
    exerciseType: exercise.exerciseType,
  }, { maxTags: 1 });
  const primaryTag = tags[0] || null;

  const handlePress = useCallback(() => {
    onAdd(exercise);
  }, [exercise, onAdd]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.suggestionRow,
        pressed && styles.suggestionRowPressed,
      ]}
    >
      <View style={styles.suggestionInfo}>
        <Text variant="body" color="primary" numberOfLines={1}>
          {exercise.name}
        </Text>
        {primaryTag && (
          <Text variant="captionSmall" color="tertiary">
            {primaryTag}
          </Text>
        )}
      </View>
      <View style={styles.addButton}>
        <IconSymbol
          name="add"
          size={18}
          color={colors.accent.orange}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    fontWeight: typography.body.fontWeight as any,
    color: colors.text.primary,
    paddingVertical: spacing.xs,
  },
  suggestionsContainer: {
    gap: spacing.xs,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  suggestionsList: {
    gap: spacing.xs,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  suggestionRowPressed: {
    backgroundColor: colors.accent.orangeMuted,
    borderColor: colors.accent.orange,
  },
  suggestionInfo: {
    flex: 1,
    gap: 2,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.accent.orangeMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  browseAllText: {
    color: colors.accent.orange,
  },
});
