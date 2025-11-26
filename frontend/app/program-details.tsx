import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { ScreenHeader } from '@/components/molecules/ScreenHeader';
import { TabSwipeContainer } from '@/components/templates/TabSwipeContainer';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, spacing, radius } from '@/constants/theme';
import { useProgramsStore } from '@/store/programsStore';
import type { PremadeProgram, UserProgram, RotationSchedule } from '@/types/premadePlan';

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    backgroundColor: colors.primary.bg,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xl,
  },
  outerCardContent: {
    gap: spacing.lg,
  },
  scrollContent: {
    paddingBottom: spacing['2xl'],
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  workoutCard: {
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.md,
    gap: spacing.xs,
  },
  exerciseCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});

export default function ProgramDetailsScreen() {
  const router = useRouter();
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const { premadePrograms, userPrograms, clonePremadeProgram, setActiveRotation } = useProgramsStore();
  const [isAdding, setIsAdding] = useState(false);

  const program = premadePrograms.find(p => p.id === programId) || userPrograms.find(p => p.id === programId);
  const isUserProgram = program && !program.isPremade;

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  if (!program) {
    return (
      <TabSwipeContainer contentContainerStyle={styles.contentContainer}>
        <ScreenHeader title="Program Not Found" subtitle="The requested program could not be found." />
        <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Button label="Go Back" onPress={handleClose} />
        </View>
      </TabSwipeContainer>
    );
  }

  const handleAddToPlans = useCallback(async () => {
    if (isAdding) return;
    setIsAdding(true);
    Haptics.selectionAsync().catch(() => {});

    try {
      await clonePremadeProgram(program!.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      
      // Navigate back to Plans tab
      router.dismissAll();
      router.replace('/(tabs)/plans');
    } catch (error) {
      console.error('Failed to add program:', error);
      Alert.alert('Error', 'Failed to add program to your library.');
    } finally {
      setIsAdding(false);
    }
  }, [clonePremadeProgram, isAdding, program!.id, router]);

  const handleSetRotation = useCallback(async () => {
    if (isAdding) return;
    setIsAdding(true);
    Haptics.selectionAsync().catch(() => {});

    try {
      const rotation: RotationSchedule = {
        id: `rot-${Date.now()}`,
        name: program!.name,
        programId: program!.id,
        workoutSequence: program!.workouts.map(w => w.id),
        currentIndex: 0,
      };

      await setActiveRotation(rotation);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      
      Alert.alert(
        'Schedule Updated',
        'This program is now your active rotation schedule. Check the Dashboard for your next workout.',
        [{ text: 'OK', onPress: () => {
          router.dismissAll();
          router.replace('/(tabs)');
        }}]
      );
    } catch (error) {
      console.error('Failed to set rotation:', error);
      Alert.alert('Error', 'Failed to update schedule.');
    } finally {
      setIsAdding(false);
    }
  }, [isAdding, program, setActiveRotation, router]);

  return (
    <TabSwipeContainer contentContainerStyle={styles.contentContainer}>
      <ScreenHeader title={program.name} subtitle={program.metadata.description} />

      <SurfaceCard padding="xl" tone="neutral">
        <View style={styles.outerCardContent}>
          <View style={styles.tags}>
             <Badge label={program.metadata.goal} variant="accent" />
             <Badge label={program.metadata.experienceLevel} variant="neutral" />
             <Badge label={program.metadata.equipment} variant="outline" />
             <Badge label={`${program.metadata.daysPerWeek} days/week`} variant="primary" />
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard padding="xl" tone="neutral">
        <View style={styles.outerCardContent}>
          <Text variant="heading3" color="primary">Workouts Included</Text>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {program.workouts.map((workout, index) => (
              <View key={workout.id} style={styles.workoutCard}>
                <Text variant="bodySemibold" color="primary">
                  {index + 1}. {workout.name}
                </Text>
                <View style={styles.exerciseCount}>
                  <IconSymbol name="fitness-center" size={14} color={colors.text.secondary} />
                  <Text variant="caption" color="secondary">
                    {workout.exercises.length} exercises
                  </Text>
                </View>
                {/* List first 3 exercises as preview */}
                <View style={{ marginTop: spacing.xs, paddingLeft: spacing.sm }}>
                  {workout.exercises.slice(0, 3).map(ex => (
                    <Text key={ex.id} variant="caption" color="secondary">• {ex.name}</Text>
                  ))}
                  {workout.exercises.length > 3 && (
                    <Text variant="caption" color="tertiary" style={{ marginLeft: spacing.xs }}>
                      +{workout.exercises.length - 3} more
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </SurfaceCard>

      <SurfaceCard padding="xl" tone="neutral">
        <View style={styles.outerCardContent}>
          {isUserProgram ? (
            <Button 
              label="Start Rotation Schedule" 
              onPress={handleSetRotation}
              loading={isAdding}
              size="lg"
              variant="primary"
            />
          ) : (
            <Button 
              label="Add to My Plans" 
              onPress={handleAddToPlans}
              loading={isAdding}
              size="lg"
            />
          )}
        </View>
      </SurfaceCard>
    </TabSwipeContainer>
  );
}
