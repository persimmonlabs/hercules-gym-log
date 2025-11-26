import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ProgramCard } from '@/components/molecules/ProgramCard';
import { colors, spacing, radius } from '@/constants/theme';
import { useProgramRecommendation, type QuizPreferences } from '@/hooks/useProgramRecommendation';
import type { TrainingGoal, ExperienceLevel, EquipmentType, PremadeProgram, UserProgram } from '@/types/premadePlan';

type Step = 'intro' | 'goal' | 'experience' | 'equipment' | 'days' | 'results';

const STEPS: Step[] = ['intro', 'goal', 'experience', 'equipment', 'days', 'results'];

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
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.md,
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
    flex: 1,
    gap: spacing.xl,
  },
  optionsGrid: {
    gap: spacing.md,
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
});

export default function QuizScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getRecommendations } = useProgramRecommendation();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [recommendations, setRecommendations] = useState<PremadeProgram[]>([]);
  
  const [preferences, setPreferences] = useState<QuizPreferences>({
    goal: null,
    experienceLevel: null,
    equipment: null,
    daysPerWeek: null,
  });

  const currentStep = STEPS[currentStepIndex];
  const isLastQuestion = currentStep === 'days';

  const handleNext = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    
    if (isLastQuestion) {
      const results = getRecommendations(preferences);
      setRecommendations(results);
    }
    
    setCurrentStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
  }, [isLastQuestion, preferences, getRecommendations]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    if (currentStepIndex === 0) {
      router.back();
      return;
    }
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, [currentStepIndex, router]);

  const updatePreference = useCallback((key: keyof QuizPreferences, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleProgramPress = useCallback((program: PremadeProgram | UserProgram) => {
    router.push({
      pathname: '/program-details',
      params: { programId: program.id }
    });
  }, [router]);

  const renderOption = (label: string, description: string, isSelected: boolean, onPress: () => void) => (
    <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress(); }}>
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
          <View style={styles.stepContainer}>
            <View style={{ alignItems: 'center', gap: spacing.md, marginTop: spacing['2xl'] }}>
              <IconSymbol name="auto-awesome" size={64} color={colors.accent.primary} />
              <Text variant="heading1" color="primary" style={{ textAlign: 'center' }}>
                Personalized Plan
              </Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                Answer 4 quick questions and we'll recommend the perfect workout program for you.
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
              {[2, 3, 4, 5, 6].map((num) => (
                <View key={num}>
                  {renderOption(`${num} Days`, '', preferences.daysPerWeek === num, () => updatePreference('daysPerWeek', num))}
                </View>
              ))}
            </View>
          </View>
        );

      case 'results':
        return (
          <ScrollView contentContainerStyle={styles.resultsList}>
            <View style={{ marginBottom: spacing.lg }}>
              <Text variant="heading2" color="primary">Recommended Plans</Text>
              <Text variant="body" color="secondary">Based on your preferences</Text>
            </View>

            {recommendations.length > 0 ? (
              recommendations.map(program => (
                <ProgramCard key={program.id} program={program} onPress={handleProgramPress} />
              ))
            ) : (
              <SurfaceCard tone="neutral" padding="xl" showAccentStripe={false} style={{ alignItems: 'center', gap: spacing.md }}>
                <IconSymbol name="sentiment-dissatisfied" size={48} color={colors.text.tertiary} />
                <Text variant="bodySemibold" color="primary">No exact matches</Text>
                <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                  Try adjusting your filters to see more results. We are adding new plans weekly!
                </Text>
                <Button label="Browse All Plans" variant="secondary" onPress={() => router.replace('/browse-programs')} />
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
        <Button 
          label={currentStep === 'results' ? "Close" : "Back"} 
          variant="ghost" 
          onPress={currentStep === 'results' ? () => router.back() : handleBack} 
          size="sm"
        />
        {currentStep !== 'results' && currentStep !== 'intro' && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(currentStepIndex / (STEPS.length - 2)) * 100}%` }]} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Animated.View 
          key={currentStep} 
          entering={FadeInRight} 
          exiting={FadeOutLeft}
          style={{ flex: 1 }}
        >
          {renderStepContent()}
        </Animated.View>
      </View>

      {/* Footer */}
      {currentStep !== 'results' && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button 
            label={currentStep === 'intro' ? "Start Quiz" : isLastQuestion ? "Show Results" : "Next"} 
            onPress={handleNext} 
            disabled={!canProceed()}
            size="lg"
          />
        </View>
      )}
    </View>
  );
}
