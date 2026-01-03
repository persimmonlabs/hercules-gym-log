import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PremiumLimitModal } from '@/components/molecules/PremiumLimitModal';
import { colors, spacing, radius, sizing } from '@/constants/theme';
import { useProgramsStore } from '@/store/programsStore';
import type { PremadeProgram, UserProgram, RotationSchedule } from '@/types/premadePlan';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
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
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  outerCardContent: {
    gap: spacing.lg,
  },
  workoutCard: {
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  workoutsList: {
    gap: spacing.md,
  },
});

export default function ProgramDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { programId, from } = useLocalSearchParams<{ programId: string; from?: string }>();
  const { premadePrograms, userPrograms, clonePremadeProgram, setActiveRotation } = useProgramsStore();
  const [isAdding, setIsAdding] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitType, setLimitType] = useState<'workout' | 'plan'>('plan');

  const program = premadePrograms.find(p => p.id === programId) || userPrograms.find(p => p.id === programId);
  const isUserProgram = program && !program.isPremade;

  const handleBack = useCallback(() => {
    Haptics.selectionAsync().catch(() => { });
    if (from === 'quiz') {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.navigate('/quiz');
      }
    } else {
      // Default to browse programs
      router.navigate('/(tabs)/browse-programs');
    }
  }, [router, from]);

  if (!program) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + sizing.tabBarHeight }]}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text variant="heading2" color="primary">Program Not Found</Text>
            <Text variant="body" color="secondary">The requested program could not be found.</Text>
          </View>
          <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
            <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
        </View>
        <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Button label="Go Back" onPress={handleBack} />
        </View>
      </View>
    );
  }

  const handleAddToPlans = useCallback(async () => {
    if (isAdding) return;
    setIsAdding(true);
    Haptics.selectionAsync().catch(() => { });

    try {
      await clonePremadeProgram(program!.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });

      // Navigate back to Plans tab
      router.replace('/(tabs)/plans');
    } catch (error: any) {
      if (error?.message === 'FREE_LIMIT_REACHED') {
        setLimitType('plan');
        setShowLimitModal(true);
      } else if (error?.message === 'WORKOUT_LIMIT_REACHED') {
        setLimitType('workout');
        setShowLimitModal(true);
      } else {
        console.error('Failed to add program:', error);
        Alert.alert('Error', 'Failed to add program to your library.');
      }
    } finally {
      setIsAdding(false);
    }
  }, [clonePremadeProgram, isAdding, program!.id, router]);



  const handleSetRotation = useCallback(async () => {
    if (isAdding) return;
    setIsAdding(true);
    Haptics.selectionAsync().catch(() => { });

    try {
      const rotation: RotationSchedule = {
        id: `rot-${Date.now()}`,
        name: program!.name,
        programId: program!.id,
        workoutSequence: program!.workouts.map(w => w.id),
        currentIndex: 0,
      };

      await setActiveRotation(rotation);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });

      Alert.alert(
        'Schedule Updated',
        'This program is now your active rotation schedule. Check the Dashboard for your next workout.',
        [{
          text: 'OK', onPress: () => {
            router.replace('/(tabs)');
          }
        }]
      );
    } catch (error) {
      console.error('Failed to set rotation:', error);
      Alert.alert('Error', 'Failed to update schedule.');
    } finally {
      setIsAdding(false);
    }
  }, [isAdding, program, setActiveRotation, router]);

  return (
    <>
      <PremiumLimitModal
        visible={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limitType={limitType}
      />
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + sizing.tabBarHeight }]}>
        {/* Content */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text variant="heading2" color="primary">
                {program.name}
              </Text>
              <Text variant="body" color="secondary">
                {program.metadata.description}
              </Text>
            </View>
            <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
              <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
            </Pressable>
          </View>



          <SurfaceCard padding="xl" tone="neutral">
            <View style={styles.outerCardContent}>
              <Text variant="heading3" color="primary">Workouts Included</Text>
              <View style={styles.workoutsList}>
                {program.workouts
                  .filter(w => w.exercises.length > 0)
                  .map((workout, index) => (
                    <View
                      key={workout.id}
                      style={styles.workoutCard}
                    >
                      <View style={styles.workoutCardHeader}>
                        <Text variant="heading4" color="primary">
                          {index + 1}. {workout.name}
                        </Text>
                      </View>

                      {/* List all exercises */}
                      <View style={{ marginTop: spacing.xs, paddingLeft: spacing.sm }}>
                        {workout.exercises.map(ex => (
                          <Text key={ex.id} variant="body" color="secondary">• {ex.name}</Text>
                        ))}
                      </View>
                    </View>
                  ))}
              </View>
            </View>
          </SurfaceCard>

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
        </ScrollView>
      </View>
    </>
  );
}
