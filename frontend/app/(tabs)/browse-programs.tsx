import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { StyleSheet, FlatList, Pressable, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { ProgramCard } from '@/components/molecules/ProgramCard';
import { QuickFilterChip } from '@/components/atoms/QuickFilterChip';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, spacing, radius, sizing } from '@/constants/theme';
import { useProgramsStore } from '@/store/programsStore';
import type { PremadeProgram, UserProgram, ExperienceLevel, PremadeWorkout } from '@/types/premadePlan';

const FILTERS: { label: string; value: ExperienceLevel | 'all' }[] = [
  { label: 'All Levels', value: 'all' },
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.sm,
    paddingTop: spacing.xs,
    borderRadius: radius.full,
  },
  titleContainer: {
    flex: 1,
  },
  filtersContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  filtersContent: {
    gap: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    gap: spacing.md,
  },
});

export default function BrowseProgramsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: 'program' | 'workout' }>();
  const isWorkoutMode = mode === 'workout';

  const { premadePrograms, premadeWorkouts } = useProgramsStore();

  const [selectedFilter, setSelectedFilter] = useState<ExperienceLevel | 'all'>('all');

  const filteredItems = useMemo(() => {
    const items = isWorkoutMode ? premadeWorkouts : premadePrograms;

    if (selectedFilter === 'all') {
      return items;
    }
    return items.filter(p => p.metadata.experienceLevel === selectedFilter);
  }, [premadePrograms, premadeWorkouts, selectedFilter, isWorkoutMode]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync().catch(() => { });
    router.push({
      pathname: '/(tabs)/add-workout',
      params: { mode: isWorkoutMode ? 'workout' : 'program' }
    });
  }, [router, isWorkoutMode]);
  const handleProgramPress = useCallback((item: PremadeProgram | UserProgram | PremadeWorkout) => {
    Haptics.selectionAsync().catch(() => { });

    if (isWorkoutMode) {
      const workout = item as PremadeWorkout;
      router.push({
        pathname: '/(tabs)/create-workout',
        params: { premadeWorkoutId: workout.id }
      });
    } else {
      router.push({
        pathname: '/(tabs)/program-details',
        params: { programId: item.id, from: 'browse' }
      });
    }
  }, [router, isWorkoutMode]);

  const handleFilterPress = useCallback((value: ExperienceLevel | 'all') => {
    setSelectedFilter(value);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + sizing.tabBarHeight }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text variant="heading2" color="primary">
            {isWorkoutMode ? 'Browse Workouts' : 'Browse Programs'}
          </Text>
          <Text variant="body" color="secondary">
            {isWorkoutMode ? 'Find a session that fits your goals' : 'Find a plan that fits your goals'}
          </Text>
        </View>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
          <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
      </View>

      {/* Filters */}
      <View>
        <FlatList
          horizontal
          data={FILTERS}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filtersContent, styles.filtersContainer]}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <QuickFilterChip
              label={item.label}
              active={selectedFilter === item.value}
              onPress={() => handleFilterPress(item.value)}
            />
          )}
        />
      </View>

      {/* List */}
      <FlatList
        data={filteredItems}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProgramCard program={item} onPress={handleProgramPress} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="search" size={48} color={colors.neutral.gray400} />
            <Text variant="body" color="secondary">No {isWorkoutMode ? 'workouts' : 'programs'} found for this level.</Text>
          </View>
        }
      />
    </View>
  );
}
