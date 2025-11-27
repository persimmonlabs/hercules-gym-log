import React, { useCallback, useState, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, spacing, sizing } from '@/constants/theme';
import { usePlansStore, type Plan } from '@/store/plansStore';
import { useProgramBuilderContext } from '@/providers/ProgramBuilderProvider';

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
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  workoutInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  checkIcon: {
    padding: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    gap: spacing.md,
  },
});

export default function AddWorkoutsToProgramScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plans } = usePlansStore();
  const { selectedWorkouts, addWorkouts } = useProgramBuilderContext();
  
  // Initialize selected IDs from context (workouts already added)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => 
    new Set(selectedWorkouts.map(w => w.id))
  );

  const handleBack = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  }, [router]);

  const handleToggleWorkout = useCallback((workoutId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(workoutId)) {
        next.delete(workoutId);
      } else {
        next.add(workoutId);
      }
      return next;
    });
  }, []);

  const handleAddSelected = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    // Get the selected workouts from plans
    const workoutsToAdd = plans.filter(p => selectedIds.has(p.id));
    addWorkouts(workoutsToAdd);
    router.back();
  }, [router, selectedIds, plans, addWorkouts]);

  const selectedCount = selectedIds.size;

  const renderWorkoutItem = useCallback(({ item }: { item: Plan }) => {
    const isSelected = selectedIds.has(item.id);
    
    return (
      <Pressable onPress={() => handleToggleWorkout(item.id)}>
        <SurfaceCard 
          tone="neutral" 
          padding="md" 
          showAccentStripe={false}
          style={isSelected ? { borderColor: colors.accent.primary, borderWidth: 2 } : undefined}
        >
          <View style={styles.workoutCard}>
            <View style={styles.workoutInfo}>
              <Text variant="bodySemibold" color="primary">{item.name}</Text>
              <Text variant="caption" color="secondary">
                {item.exercises.length} {item.exercises.length === 1 ? 'exercise' : 'exercises'}
              </Text>
            </View>
            <View style={styles.checkIcon}>
              <IconSymbol 
                name={isSelected ? "check-circle" : "radio-button-unchecked"} 
                size={24} 
                color={isSelected ? colors.accent.primary : colors.text.tertiary} 
              />
            </View>
          </View>
        </SurfaceCard>
      </Pressable>
    );
  }, [selectedIds, handleToggleWorkout]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text variant="heading2" color="primary">
            Add Workouts
          </Text>
          <Text variant="body" color="secondary">
            Select workouts to add to your plan
          </Text>
        </View>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
          <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
      </View>

      {/* List */}
      <FlatList
        data={plans}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        renderItem={renderWorkoutItem}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="fitness-center" size={48} color={colors.neutral.gray400} />
            <Text variant="body" color="secondary">No workouts available</Text>
          </View>
        }
      />

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          label={selectedCount > 0 ? `Add ${selectedCount} Workout${selectedCount > 1 ? 's' : ''}` : 'Select Workouts'}
          onPress={handleAddSelected}
          disabled={selectedCount === 0}
          size="lg"
        />
      </View>
    </View>
  );
}
