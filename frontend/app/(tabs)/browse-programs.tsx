import React, { useMemo, useState, useCallback, useEffect, Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, FlatList, Pressable, View, BackHandler } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { ProgramCard } from '@/components/molecules/ProgramCard';
import { WorkoutFilters, type WorkoutFilterState } from '@/components/molecules/WorkoutFilters';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, spacing, radius, sizing } from '@/constants/theme';
import { useProgramsStore } from '@/store/programsStore';
import { usePlansStore } from '@/store/plansStore';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import type { PremadeProgram, UserProgram, ExperienceLevel, PremadeWorkout } from '@/types/premadePlan';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class BrowseErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode; onReset: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[BrowseProgramsScreen] Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.primary.bg }}>
          <Text variant="heading3" color="primary" style={{ marginBottom: 12 }}>Something went wrong</Text>
          <Text variant="body" color="secondary" style={{ marginBottom: 20, textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <Button label="Go Back" onPress={this.props.onReset} />
        </View>
      );
    }
    return this.props.children;
  }
}


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

function BrowseProgramsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: 'program' | 'workout' }>();
  const modeString = Array.isArray(mode) ? mode[0] : mode;
  const isWorkoutMode = modeString === 'workout';

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
    try {
      if (isWorkoutMode) {
        let filtered = premadeWorkouts || [];

        // Apply experience level filter
        if (filters.experienceLevel !== 'all') {
          filtered = filtered.filter(p => p?.metadata?.experienceLevel === filters.experienceLevel);
        }

        // Apply equipment filter
        if (filters.equipment !== 'all') {
          filtered = filtered.filter(p => p?.metadata?.equipment === filters.equipment);
        }

        // Apply goal filter
        if (filters.goal !== 'all') {
          filtered = filtered.filter(p => p?.metadata?.goal === filters.goal);
        }

        // Apply duration filter
        if (filters.duration !== 'all') {
          filtered = filtered.filter(p => {
            const duration = (p as PremadeWorkout)?.metadata?.durationMinutes;
            if (typeof duration !== 'number') return true;
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
        const safePlans = (plans || []).filter(plan => plan && typeof plan.name === 'string');
        const addedWorkoutNames = new Set(
          safePlans
            .filter(plan => plan.source === 'premade' || plan.source === 'library' || plan.source === 'recommended')
            .map(plan => plan.name.trim().toLowerCase())
        );
        filtered = filtered.filter(w => w?.name && !addedWorkoutNames.has(w.name.trim().toLowerCase()));

        return filtered;
      } else {
        let filtered = premadePrograms || [];

        // Apply experience level filter
        if (filters.experienceLevel !== 'all') {
          filtered = filtered.filter(p => p?.metadata?.experienceLevel === filters.experienceLevel);
        }

        // Apply equipment filter
        if (filters.equipment !== 'all') {
          filtered = filtered.filter(p => p?.metadata?.equipment === filters.equipment);
        }

        // Apply goal filter
        if (filters.goal !== 'all') {
          filtered = filtered.filter(p => p?.metadata?.goal === filters.goal);
        }

        // Filter out already-added plans
        const safeUserPrograms = (userPrograms || []).filter(up => up && up.sourceId);
        const addedSourceIds = new Set(safeUserPrograms.map(up => up.sourceId));
        filtered = filtered.filter(p => p?.id && !addedSourceIds.has(p.id));

        return filtered;
      }
    } catch (error) {
      console.error('[BrowseProgramsScreen] Error filtering items:', error);
      return [];
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

    // Ensure ID is a string, not an object
    const itemId = typeof item?.id === 'string' ? item.id : String(item?.id || '');
    if (!itemId) {
      console.error('[BrowseProgramsScreen] Invalid item ID:', item);
      return;
    }

    if (isWorkoutMode) {
      // Navigate to workout preview (take-it-or-leave-it style, like program-details)
      router.push({
        pathname: '/(tabs)/workout-preview',
        params: { workoutId: itemId, from: 'browse' }
      });
    } else {
      router.push({
        pathname: '/(tabs)/program-details',
        params: { programId: itemId, from: 'browse' }
      });
    }
  }, [router, isWorkoutMode]);


  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + sizing.tabBarHeight }]}>
      <FlatList
        data={filteredItems as any}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item, index) => item?.id || `item-${index}`}
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
          // Skip rendering if item is invalid
          if (!item || !item.metadata) {
            return null;
          }
          
          // Check if this is a premium workout that should be locked
          const isWorkout = item.metadata && 'durationMinutes' in item.metadata;
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

export default function BrowseProgramsScreenWithErrorBoundary() {
  const router = useRouter();
  
  const handleReset = useCallback(() => {
    router.replace('/(tabs)/plans');
  }, [router]);

  return (
    <BrowseErrorBoundary onReset={handleReset}>
      <BrowseProgramsScreen />
    </BrowseErrorBoundary>
  );
}
