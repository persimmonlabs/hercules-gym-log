import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInRight, FadeOutLeft, useSharedValue, useDerivedValue, withSpring, useAnimatedProps } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ProgramCard } from '@/components/molecules/ProgramCard';
import { colors, spacing, radius } from '@/constants/theme';
import { useProgramRecommendation, type QuizPreferences } from '@/hooks/useProgramRecommendation';
import type { TrainingGoal, ExperienceLevel, EquipmentType, PremadeProgram, UserProgram, PremadeWorkout } from '@/types/premadePlan';

type Step = 'intro' | 'goal' | 'experience' | 'equipment' | 'days' | 'results';

const PLAN_STEPS: Step[] = ['intro', 'goal', 'experience', 'equipment', 'days', 'results'];
const WORKOUT_STEPS: Step[] = ['intro', 'goal', 'experience', 'equipment', 'results'];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  topProgressBar: {
    height: 4,
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.full,
    marginHorizontal: spacing.md,
    overflow: 'hidden',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.full,
    marginHorizontal: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent.primary,
  },
  stepContainer: {
    gap: spacing.xl,
  },
  optionsGrid: {
    gap: spacing.md,
  },
  compactOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  dayOption: {
    width: '22%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.card,
  },
  dayOptionSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.surface.elevated,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  optionCardSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.surface.elevated,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  resultsList: {
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  progressText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -6 }],
  },
});

export default function QuizScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: 'program' | 'workout' }>();
  const isWorkoutMode = mode === 'workout';
  const STEPS = isWorkoutMode ? WORKOUT_STEPS : PLAN_STEPS;
  const totalQuestions = isWorkoutMode ? 3 : 4;

  const { getRecommendations, getWorkoutRecommendations } = useProgramRecommendation();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [recommendations, setRecommendations] = useState<PremadeProgram[]>([]);
  const [workoutRecommendations, setWorkoutRecommendations] = useState<PremadeWorkout[]>([]);

  const [preferences, setPreferences] = useState<QuizPreferences>({
    goal: null,
    experienceLevel: null,
    equipment: null,
    daysPerWeek: null,
  });

  const currentStep = STEPS[currentStepIndex];
  const isLastQuestion = isWorkoutMode ? currentStep === 'equipment' : currentStep === 'days';

  // Calculate how many questions have been answered
  const answeredCount = useMemo(() => {
    let count = 0;
    if (preferences.goal) count++;
    if (preferences.experienceLevel) count++;
    if (preferences.equipment) count++;
    if (!isWorkoutMode && preferences.daysPerWeek) count++;
    return count;
  }, [preferences, isWorkoutMode]);

  // Animated progress value
  const progressValue = useSharedValue(0);
  const prevCountRef = useRef(0);

  // Update progress animation when answeredCount changes
  React.useEffect(() => {
    const newProgress = answeredCount / totalQuestions;

    if (answeredCount > prevCountRef.current) {
      // Moving forward - animate
      progressValue.value = withSpring(newProgress, {
        damping: 15,
        stiffness: 100,
      });
    } else {
      // Moving backward - instant update
      progressValue.value = newProgress;
    }

    prevCountRef.current = answeredCount;
  }, [answeredCount, progressValue]);

  // Animated props for the circle
  const animatedProps = useAnimatedProps(() => {
    const circumference = 157;
    return {
      strokeDasharray: [progressValue.value * circumference, circumference],
    };
  });

  const handleNext = useCallback(() => {
    Haptics.selectionAsync().catch(() => { });

    if (isLastQuestion) {
      if (isWorkoutMode) {
        const results = getWorkoutRecommendations(preferences);
        setWorkoutRecommendations(results);
      } else {
        const results = getRecommendations(preferences);
        setRecommendations(results);
      }
    }

    setCurrentStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
  }, [isLastQuestion, preferences, getRecommendations, getWorkoutRecommendations, isWorkoutMode, STEPS.length]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync().catch(() => { });
    if (currentStepIndex === 0) {
      router.back();
      return;
    }

    // Clear the current page's selection when going back
    const stepToClear = STEPS[currentStepIndex];
    switch (stepToClear) {
      case 'goal':
        setPreferences(prev => ({ ...prev, goal: null }));
        break;
      case 'experience':
        setPreferences(prev => ({ ...prev, experienceLevel: null }));
        break;
      case 'equipment':
        setPreferences(prev => ({ ...prev, equipment: null }));
        break;
      case 'days':
        setPreferences(prev => ({ ...prev, daysPerWeek: null }));
        break;
      default:
        break;
    }

    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, [currentStepIndex, router]);

  const updatePreference = useCallback((key: keyof QuizPreferences, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleProgramPress = useCallback((program: PremadeProgram | UserProgram | PremadeWorkout) => {
    if ('workouts' in program) {
      // It's a PremadeProgram
      router.push({
        pathname: '/(tabs)/program-details',
        params: { programId: program.id, from: 'quiz' }
      });
    } else {
      // It's a PremadeWorkout
      router.push({
        pathname: '/(tabs)/create-workout',
        params: { premadeWorkoutId: program.id }
      });
    }
  }, [router]);

  const renderOption = (label: string, description: string, isSelected: boolean, onPress: () => void) => (
    <Pressable onPress={() => { Haptics.selectionAsync().catch(() => { }); onPress(); }}>
      <SurfaceCard
        tone="neutral"
        padding="md"
        showAccentStripe={false}
        style={[styles.optionCard, isSelected && styles.optionCardSelected]}
      >
        <View style={styles.optionContent}>
          <IconSymbol
            name={isSelected ? "radio-button-checked" : "radio-button-unchecked"}
            size={24}
            color={isSelected ? colors.accent.primary : colors.text.tertiary}
          />
          <View style={{ flex: 1 }}>
            <Text variant="bodySemibold" color="primary">{label}</Text>
            <Text variant="caption" color="secondary">{description}</Text>
          </View>
        </View>
      </SurfaceCard>
    </Pressable>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'intro':
        return (
          <View style={[styles.stepContainer, { flex: 1, justifyContent: 'center' }]}>
            <View style={{ alignItems: 'center', gap: spacing.md, marginTop: -spacing['2xl'] * 2 }}>
              <IconSymbol name="auto-awesome" size={64} color={colors.accent.primary} />
              <Text variant="heading1" color="primary" style={{ textAlign: 'center' }}>
                {isWorkoutMode ? 'Personalized Workouts' : 'Personalized Plans'}
              </Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                {isWorkoutMode
                  ? "Answer 3 quick questions and we'll recommend the perfect workouts for you."
                  : "Answer 4 quick questions and we'll recommend the perfect workout plans for you."}
              </Text>
            </View>
          </View>
        );

      case 'goal':
        return (
          <View style={styles.stepContainer}>
            <Text variant="heading2" color="primary">What is your main goal?</Text>
            <View style={styles.optionsGrid}>
              {renderOption('Build Muscle', 'Hypertrophy focus', preferences.goal === 'build-muscle', () => updatePreference('goal', 'build-muscle'))}
              {renderOption('Lose Fat', 'High calorie burn focus', preferences.goal === 'lose-fat', () => updatePreference('goal', 'lose-fat'))}
              {renderOption('Strength', 'Powerlifting focus', preferences.goal === 'strength', () => updatePreference('goal', 'strength'))}
              {renderOption('General Fitness', 'Overall health & conditioning', preferences.goal === 'general-fitness', () => updatePreference('goal', 'general-fitness'))}
            </View>
          </View>
        );

      case 'experience':
        return (
          <View style={styles.stepContainer}>
            <Text variant="heading2" color="primary">Your experience level?</Text>
            <View style={styles.optionsGrid}>
              {renderOption('Beginner', 'New to lifting (< 6 months)', preferences.experienceLevel === 'beginner', () => updatePreference('experienceLevel', 'beginner'))}
              {renderOption('Intermediate', 'Consistent training (6mo - 2yrs)', preferences.experienceLevel === 'intermediate', () => updatePreference('experienceLevel', 'intermediate'))}
              {renderOption('Advanced', 'Serious training (2+ years)', preferences.experienceLevel === 'advanced', () => updatePreference('experienceLevel', 'advanced'))}
            </View>
          </View>
        );

      case 'equipment':
        return (
          <View style={styles.stepContainer}>
            <Text variant="heading2" color="primary">Available equipment?</Text>
            <View style={styles.optionsGrid}>
              {renderOption('Full Gym', 'Barbells, machines, cables', preferences.equipment === 'full-gym', () => updatePreference('equipment', 'full-gym'))}
              {renderOption('Dumbbells Only', 'Dumbbells and a bench', preferences.equipment === 'dumbbells-only', () => updatePreference('equipment', 'dumbbells-only'))}
              {renderOption('Bodyweight', 'No equipment needed', preferences.equipment === 'bodyweight', () => updatePreference('equipment', 'bodyweight'))}
            </View>
          </View>
        );

      case 'days':
        return (
          <View style={styles.stepContainer}>
            <Text variant="heading2" color="primary">Days per week?</Text>
            <View style={styles.optionsGrid}>
              {renderOption('1-2 Days', 'Light schedule', preferences.daysPerWeek === 1 || preferences.daysPerWeek === 2, () => updatePreference('daysPerWeek', 2))}
              {renderOption('3-4 Days', 'Moderate schedule', preferences.daysPerWeek === 3 || preferences.daysPerWeek === 4, () => updatePreference('daysPerWeek', 3))}
              {renderOption('5-6 Days', 'Intense schedule', preferences.daysPerWeek === 5 || preferences.daysPerWeek === 6, () => updatePreference('daysPerWeek', 5))}
              {renderOption('7 Days', 'Every day', preferences.daysPerWeek === 7, () => updatePreference('daysPerWeek', 7))}
            </View>
          </View>
        );

      case 'results':
        const resultsData = isWorkoutMode ? workoutRecommendations : recommendations;
        const resultsTitle = isWorkoutMode ? 'Recommended Workouts' : 'Recommended Plans';
        const emptyMessage = isWorkoutMode
          ? 'Try adjusting your filters to see more results. We are adding new workouts weekly!'
          : 'Try adjusting your filters to see more results. We are adding new plans weekly!';
        const browseLabel = isWorkoutMode ? 'Browse All Workouts' : 'Browse All Plans';
        const browsePath = isWorkoutMode ? '/(tabs)/browse-programs?mode=workout' : '/(tabs)/browse-programs?mode=program';

        return (
          <ScrollView contentContainerStyle={styles.resultsList}>
            <View style={{ marginBottom: spacing.lg }}>
              <Text variant="heading2" color="primary">{resultsTitle}</Text>
              <Text variant="body" color="secondary">Based on your preferences</Text>
            </View>

            {resultsData.length > 0 ? (
              resultsData.map(item => (
                <ProgramCard key={item.id} program={item} onPress={handleProgramPress} />
              ))
            ) : (
              <SurfaceCard tone="neutral" padding="xl" showAccentStripe={false} style={{ alignItems: 'center', gap: spacing.md }}>
                <IconSymbol name="sentiment-dissatisfied" size={48} color={colors.text.tertiary} />
                <Text variant="bodySemibold" color="primary">No exact matches</Text>
                <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                  {emptyMessage}
                </Text>
                <Button label={browseLabel} variant="secondary" onPress={() => router.replace(browsePath)} />
              </SurfaceCard>
            )}
          </ScrollView>
        );
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'intro': return true;
      case 'goal': return !!preferences.goal;
      case 'experience': return !!preferences.experienceLevel;
      case 'equipment': return !!preferences.equipment;
      case 'days': return !!preferences.daysPerWeek;
      default: return true;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text variant="heading2" color="primary">
            {" "}
          </Text>
          <Text variant="body" color="secondary">
            {" "}
          </Text>
        </View>
        <Pressable
          onPress={currentStep === 'results' ? () => router.back() : handleBack}
          style={{ padding: spacing.sm, paddingTop: spacing.xs }}
          hitSlop={8}
        >
          <IconSymbol name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View
          key={currentStep}
          style={{ flex: 1 }}
        >
          {renderStepContent()}
        </View>
      </View>

      {/* Circular Progress - fixed position */}
      {currentStep !== 'results' && currentStep !== 'intro' && (
        <View style={styles.progressContainer}>
          <Svg width={60} height={60}>
            <Circle
              cx={30}
              cy={30}
              r={25}
              stroke={colors.surface.elevated}
              strokeWidth={4}
              fill="transparent"
            />
            <AnimatedCircle
              cx={30}
              cy={30}
              r={25}
              stroke={colors.accent.primary}
              strokeWidth={4}
              fill="transparent"
              strokeLinecap="round"
              transform={`rotate(-90 30 30)`}
              animatedProps={animatedProps}
            />
          </Svg>
          {answeredCount === 4 && (
            <Animated.View
              entering={FadeInRight.springify()}
              style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
            >
              <IconSymbol name="check" size={32} color={colors.accent.primary} />
            </Animated.View>
          )}
        </View>
      )}

      {/* Footer */}
      {currentStep !== 'results' && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button
            label={isLastQuestion ? 'Get Recommendations' : 'Next'}
            onPress={handleNext}
            disabled={!canProceed()}
            size="lg"
          />
        </View>
      )}
    </View>
  );
}
