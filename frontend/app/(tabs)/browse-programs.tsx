import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { StyleSheet, FlatList, Pressable, View, BackHandler } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { ProgramCard } from '@/components/molecules/ProgramCard';
import { WorkoutFilters, type WorkoutFilterState } from '@/components/molecules/WorkoutFilters';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, spacing, radius, sizing } from '@/constants/theme';
import { useProgramsStore } from '@/store/programsStore';
import { usePlansStore } from '@/store/plansStore';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import type { PremadeProgram, UserProgram, ExperienceLevel, PremadeWorkout } from '@/types/premadePlan';


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
  titleWrapper: {
    paddingBottom: spacing.xs,
  },
    listContent: {
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

  const { premadePrograms, premadeWorkouts, userPrograms } = useProgramsStore();
  const { plans } = usePlansStore();
  const { isPremium } = usePremiumStatus();

  const [filters, setFilters] = useState<WorkoutFilterState>({
    experienceLevel: 'all',
    equipment: 'all',
    goal: 'all',
    duration: 'all',
  });

  const filteredItems = useMemo(() => {
    if (isWorkoutMode) {
      let filtered = premadeWorkouts;

      // Apply experience level filter
      if (filters.experienceLevel !== 'all') {
        filtered = filtered.filter(p => p.metadata.experienceLevel === filters.experienceLevel);
      }

      // Apply equipment filter
      if (filters.equipment !== 'all') {
        filtered = filtered.filter(p => p.metadata.equipment === filters.equipment);
      }

      // Apply goal filter
      if (filters.goal !== 'all') {
        filtered = filtered.filter(p => p.metadata.goal === filters.goal);
      }

      // Apply duration filter
      if (filters.duration !== 'all') {
        filtered = filtered.filter(p => {
          const duration = (p as PremadeWorkout).metadata.durationMinutes;
          switch (filters.duration) {
            case 'quick':
              return duration <= 30;
            case 'medium':
              return duration > 30 && duration <= 60;
            case 'long':
              return duration > 60;
            default:
              return true;
          }
        });
      }

      // Filter out workouts that have been added to My Workouts
      // Compare by name (case-insensitive) since premade workouts get new IDs when added
      const addedWorkoutNames = new Set(
        plans
          .filter(plan => plan.source === 'premade' || plan.source === 'library' || plan.source === 'recommended')
          .map(plan => plan.name.trim().toLowerCase())
      );
      filtered = filtered.filter(w => !addedWorkoutNames.has(w.name.trim().toLowerCase()));

      return filtered;
    } else {
      let filtered = premadePrograms;

      // Apply experience level filter
      if (filters.experienceLevel !== 'all') {
        filtered = filtered.filter(p => p.metadata.experienceLevel === filters.experienceLevel);
      }

      // Apply equipment filter
      if (filters.equipment !== 'all') {
        filtered = filtered.filter(p => p.metadata.equipment === filters.equipment);
      }

      // Apply goal filter
      if (filters.goal !== 'all') {
        filtered = filtered.filter(p => p.metadata.goal === filters.goal);
      }

      // Filter out already-added plans
      const addedSourceIds = new Set(userPrograms.map(up => up.sourceId).filter(Boolean));
      filtered = filtered.filter(p => !addedSourceIds.has(p.id));

      return filtered;
    }
  }, [premadePrograms, premadeWorkouts, filters, isWorkoutMode, userPrograms, plans]);

  const handleBack = useCallback(() => {
    triggerHaptic('selection');
    router.replace('/(tabs)/plans');
  }, [router]);

  // Handle Android hardware back button
  useEffect(() => {
    const backAction = () => {
      handleBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [handleBack]);

  const handleUnlock = useCallback(() => {
    triggerHaptic('selection');
    router.push('/premium');
  }, [router]);

  const handleProgramPress = useCallback((item: PremadeProgram | UserProgram | PremadeWorkout) => {
    triggerHaptic('selection');

    if (isWorkoutMode) {
      // Navigate to workout preview (take-it-or-leave-it style, like program-details)
      const workout = item as PremadeWorkout;
      router.push({
        pathname: '/(tabs)/workout-preview',
        params: { workoutId: workout.id, from: 'browse' }
      });
    } else {
      router.push({
        pathname: '/(tabs)/program-details',
        params: { programId: item.id, from: 'browse' }
      });
    }
  }, [router, isWorkoutMode]);


  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + sizing.tabBarHeight }]}>
      <FlatList
        data={filteredItems as any}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Text variant="heading2" color="primary">
                  {isWorkoutMode ? 'Browse Workouts' : 'Browse Plans'}
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
            <WorkoutFilters
              filters={filters}
              onFiltersChange={setFilters}
              showDurationFilter={isWorkoutMode}
            />
          </>
        }
        renderItem={({ item }) => {
          // Check if this is a premium workout that should be locked
          const isWorkout = 'durationMinutes' in item.metadata;
          const isLocked = isWorkout && !(item as any).isFree && !isPremium;
          
          return (
            <View style={{ paddingHorizontal: spacing.md }}>
              <ProgramCard
                program={item}
                onPress={handleProgramPress}
                isLocked={isLocked}
                onUnlock={handleUnlock}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="search" size={48} color={colors.neutral.gray400} />
            <Text variant="body" color="secondary">
              {Object.values(filters).filter(v => v !== 'all').length > 0 
                ? `No ${isWorkoutMode ? 'workouts' : 'programs'} found matching your filters.` 
                : `No ${isWorkoutMode ? 'workouts' : 'programs'} found.`}
            </Text>
          </View>
        }
      />
    </View>
  );
}
