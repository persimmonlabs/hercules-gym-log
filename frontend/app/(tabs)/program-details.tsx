import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { triggerHaptic } from '@/utils/haptics';

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
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.sm,
    paddingTop: spacing.xs,
    borderRadius: radius.full,
  },
  titleContainer: {
    flex: 1,
    gap: spacing.sm,
  },
  metaBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  outerCardContent: {
    gap: spacing.md,
  },
  workoutSection: {
    gap: spacing.xs,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  workoutDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.light,
    marginVertical: spacing.md,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 5,
    paddingLeft: spacing.xs,
  },
  exerciseDash: {
    width: 8,
    flexShrink: 0,
  },
  workoutsList: {
    gap: 0,
  },
});

export default function ProgramDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const { premadePrograms, userPrograms, clonePremadeProgram, setActiveRotation } = useProgramsStore();
  const [isAdding, setIsAdding] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitType, setLimitType] = useState<'workout' | 'plan'>('plan');

  const program = premadePrograms.find(p => p.id === programId) || userPrograms.find(p => p.id === programId);
  const isUserProgram = program && !program.isPremade;

  const handleBack = useCallback(() => {
    triggerHaptic('selection');
    router.back();
  }, [router]);

  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      // Small timeout to ensure layout is done and previous transition completed
      const timeout = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
      return () => clearTimeout(timeout);
    }, [])
  );

  // Handle Android hardware back button
  useEffect(() => {
    const backAction = () => {
      handleBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [handleBack]);

  const handleAddToPlans = useCallback(async () => {
    if (isAdding || !program) return;
    setIsAdding(true);
    triggerHaptic('selection');

    try {
      await clonePremadeProgram(program.id);
      triggerHaptic('success');

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
  }, [clonePremadeProgram, isAdding, program, router]);

  const handleSetRotation = useCallback(async () => {
    if (isAdding || !program) return;
    setIsAdding(true);
    triggerHaptic('selection');

    try {
      const rotation: RotationSchedule = {
        id: `rot-${Date.now()}`,
        name: program.name,
        programId: program.id,
        workoutSequence: program.workouts.map((w) => w.id),
        currentIndex: 0,
      };

      await setActiveRotation(rotation);
      triggerHaptic('success');

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
  return (
    <>
      <PremiumLimitModal
        visible={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limitType={limitType}
      />
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + sizing.tabBarHeight }]}>
        {/* Content */}
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text variant="heading2" color="primary">
                {program.name}
              </Text>
              <Text variant="body" color="secondary" style={{ lineHeight: 22 }}>
                {program.metadata.description}
              </Text>
              <View style={styles.metaBadges}>
                {program.metadata.goal && <Badge label={String(program.metadata.goal).replace('-', ' ')} variant="workout" size="sm" />}
                {program.metadata.experienceLevel && <Badge label={String(program.metadata.experienceLevel)} variant="workout" size="sm" />}
                {program.metadata.equipment && <Badge label={String(program.metadata.equipment).replace('-', ' ')} variant="workout" size="sm" />}
                {program.metadata.daysPerWeek && <Badge label={`${program.metadata.daysPerWeek} days/week`} variant="workout" size="sm" />}
              </View>
            </View>
            <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
              <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
            </Pressable>
          </View>

          <SurfaceCard padding="xl" tone="neutral">
            <View style={styles.outerCardContent}>
              <Text variant="heading3" color="primary">
                Workouts Included
              </Text>
              <View style={styles.workoutsList}>
                {program.workouts
                  .filter(w => w.exercises.length > 0)
                  .map((workout, index, arr) => (
                    <View key={workout.id} style={styles.workoutSection}>
                      <View style={styles.workoutHeader}>
                        <Text variant="bodySemibold" color="primary">
                          {workout.name}
                        </Text>
                      </View>

                      {workout.exercises.map((ex) => (
                        <View key={ex.id} style={styles.exerciseRow}>
                          <Text variant="caption" color="tertiary" style={styles.exerciseDash}>–</Text>
                          <Text variant="body" color="secondary">
                            {ex.name}
                          </Text>
                        </View>
                      ))}

                      {index < arr.length - 1 && <View style={styles.workoutDivider} />}
                    </View>
                  ))}
              </View>
            </View>
          </SurfaceCard>

          {program.metadata.recommendation && (
            <SurfaceCard padding="xl" tone="neutral">
              <View style={styles.outerCardContent}>
                <Text variant="heading3" color="primary">Recommendation</Text>
                <Text variant="body" color="secondary" style={{ lineHeight: 24 }}>
                  {program.metadata.recommendation}
                </Text>
              </View>
            </SurfaceCard>
          )}

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
