/**
 * Onboarding Screen
 * Redesigned multi-slide onboarding with early account creation and phase-based progress.
 * Flow: Welcome → Features → Signup → Profile slides → Premium upsell → Dashboard
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, FlatList, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { OnboardingProgress } from '@/components/molecules/OnboardingProgress';
import { WelcomeSlide } from '@/components/organisms/onboarding/WelcomeSlide';
import { FeaturesSlide } from '@/components/organisms/onboarding/FeaturesSlide';
import { SignupSlide } from '@/components/organisms/onboarding/SignupSlide';
import { OptionSlide } from '@/components/organisms/onboarding/OptionSlide';
import { DateOfBirthSlide } from '@/components/organisms/onboarding/DateOfBirthSlide';
import { TrainingDaysSlide } from '@/components/organisms/onboarding/TrainingDaysSlide';
import { MeasurementSlide } from '@/components/organisms/onboarding/MeasurementSlide';
import { PremiumSlide } from '@/components/organisms/onboarding/PremiumSlide';
import { spacing } from '@/constants/theme';
import { SLIDES, PROFILE_SLIDES, lt } from '@/constants/onboarding';
import type { SlideType } from '@/constants/onboarding';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuth } from '@/providers/AuthProvider';
import { triggerHaptic } from '@/utils/haptics';

export default function OnboardingScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { profile, updateProfileField, updateBodyMetrics } = useUserProfileStore();
  const {
    sizeUnit, setSizeUnit, weightUnit, setWeightUnit,
    themePreference, setThemePreference,
  } = useSettingsStore();
  
  const { width: screenWidth } = useWindowDimensions();

  // Force light mode during onboarding; restore user's preference on unmount
  const savedThemeRef = useRef(themePreference);
  useEffect(() => {
    savedThemeRef.current = themePreference;
    if (themePreference !== 'light') setThemePreference('light');
    return () => {
      if (savedThemeRef.current !== 'light') setThemePreference(savedThemeRef.current);
    };
  }, []);

  // If user is already authenticated (e.g. app restart mid-onboarding), skip to post-signup slide
  useEffect(() => {
    if (session && currentIndex < SLIDES.indexOf('dob')) {
      const dobIdx = SLIDES.indexOf('dob');
      flatListRef.current?.scrollToIndex({ index: dobIdx, animated: false });
      setCurrentIndex(dobIdx);
    }
  }, [session]);

  // Local input state
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [heightMetric, setHeightMetric] = useState(sizeUnit === 'cm');
  const [weightMetric, setWeightMetric] = useState(weightUnit === 'kg');

  const currentSlide = SLIDES[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex]);

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      triggerHaptic('selection');
      // Skip back over signup slide if user is already authenticated
      let target = currentIndex - 1;
      if (session && SLIDES[target] === 'signup') target = Math.max(0, target - 1);
      flatListRef.current?.scrollToIndex({ index: target, animated: true });
      setCurrentIndex(target);
    }
  }, [currentIndex, session]);

  const finishOnboarding = useCallback(async () => {
    triggerHaptic('success');
    if (savedThemeRef.current !== 'light') setThemePreference(savedThemeRef.current);
    await updateProfileField('onboardingCompleted', true);
    router.replace('/(tabs)');
  }, [updateProfileField, router, setThemePreference]);

  const handleSignIn = useCallback(() => {
    if (savedThemeRef.current !== 'light') setThemePreference(savedThemeRef.current);
    router.push('/auth/login');
  }, [router, setThemePreference]);

  const handleSignupComplete = useCallback((firstName: string, lastName: string) => {
    if (firstName) updateProfileField('firstName', firstName);
    if (lastName) updateProfileField('lastName', lastName);
    goNext();
  }, [updateProfileField, goNext]);

  const selectOption = useCallback((field: string, value: string | number) => {
    const finalValue = field === 'trainingDaysPerWeek' ? Number(value) : value;
    updateProfileField(field, finalValue);
    goNext();
  }, [updateProfileField, goNext]);

  const saveDob = useCallback(() => {
    const m = parseInt(dobMonth, 10);
    const d = parseInt(dobDay, 10);
    const y = parseInt(dobYear, 10);
    if (m && d && y && m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900) {
      updateProfileField('dateOfBirth', `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    goNext();
  }, [dobMonth, dobDay, dobYear, updateProfileField, goNext]);

  const saveHeight = useCallback(() => {
    if (heightMetric) {
      const cm = parseInt(heightCm, 10) || 0;
      const totalIn = cm / 2.54;
      updateBodyMetrics(Math.floor(totalIn / 12), Math.round(totalIn % 12), profile?.weightLbs || 0);
      setSizeUnit('cm');
    } else {
      updateBodyMetrics(parseInt(heightFt, 10) || 0, parseInt(heightIn, 10) || 0, profile?.weightLbs || 0);
      setSizeUnit('in');
    }
    goNext();
  }, [heightMetric, heightCm, heightFt, heightIn, profile?.weightLbs, updateBodyMetrics, goNext, setSizeUnit]);

  const saveWeight = useCallback(() => {
    const val = parseFloat(weightInput) || 0;
    const lbs = weightMetric ? Math.round(val * 2.20462) : val;
    if (lbs > 0) updateBodyMetrics(profile?.heightFeet || 0, profile?.heightInches || 0, lbs);
    if (weightMetric) setWeightUnit('kg'); else setWeightUnit('lbs');
    goNext();
  }, [weightMetric, weightInput, profile?.heightFeet, profile?.heightInches, updateBodyMetrics, goNext, setWeightUnit]);

  const renderSlide = ({ item }: { item: SlideType }) => {
    let slideContent = null;
    switch (item) {
      case 'welcome':
        slideContent = <WelcomeSlide onNext={goNext} onSignIn={handleSignIn} />;
        break;
      case 'features':
        slideContent = <FeaturesSlide onNext={goNext} />;
        break;
      case 'signup':
        slideContent = <SignupSlide onSignupComplete={handleSignupComplete} />;
        break;
      case 'dob':
        slideContent = (
          <DateOfBirthSlide
            dobMonth={dobMonth} dobDay={dobDay} dobYear={dobYear}
            setDobMonth={setDobMonth} setDobDay={setDobDay} setDobYear={setDobYear}
            onSave={saveDob} onSkip={goNext}
          />
        );
        break;
      case 'gender':
        slideContent = (
          <OptionSlide
            title="Gender" subtitle="Used to personalize muscle group targeting and recovery recommendations"
            field="gender" selectedValue={profile?.gender}
            options={[
              { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' }, { value: 'prefer_not_to_say', label: 'Prefer not to say' },
            ]}
            onSelect={selectOption} onSkip={goNext}
          />
        );
        break;
      case 'experience':
        slideContent = (
          <OptionSlide
            title="Experience Level" subtitle="We'll suggest programs that match your level"
            field="experienceLevel" selectedValue={profile?.experienceLevel}
            options={[
              { value: 'beginner', label: 'Beginner' },
              { value: 'intermediate', label: 'Intermediate' },
              { value: 'advanced', label: 'Advanced' },
            ]}
            onSelect={selectOption} onSkip={goNext}
          />
        );
        break;
      case 'goal':
        slideContent = (
          <OptionSlide
            title="Primary Goal" subtitle="Helps us tailor your training recommendations"
            field="primaryGoal" selectedValue={profile?.primaryGoal}
            options={[
              { value: 'build-muscle', label: 'Build Muscle' }, { value: 'lose-fat', label: 'Lose Fat' },
              { value: 'gain-strength', label: 'Gain Strength' }, { value: 'general-fitness', label: 'General Fitness' },
              { value: 'improve-endurance', label: 'Improve Endurance' },
            ]}
            onSelect={selectOption} onSkip={goNext}
          />
        );
        break;
      case 'equipment':
        slideContent = (
          <OptionSlide
            title="Available Equipment" subtitle="What do you have access to?"
            field="availableEquipment" selectedValue={profile?.availableEquipment}
            options={[
              { value: 'full-gym', label: 'Full Gym' }, { value: 'dumbbells-only', label: 'Dumbbells Only' },
              { value: 'bodyweight', label: 'Bodyweight Only' },
              { value: 'resistance-bands', label: 'Resistance Bands' },
            ]}
            onSelect={selectOption} onSkip={goNext}
          />
        );
        break;
      case 'trainingDays':
        slideContent = (
          <TrainingDaysSlide
            selectedDays={profile?.trainingDaysPerWeek}
            onSelect={selectOption} onSkip={goNext}
          />
        );
        break;
      case 'height':
        slideContent = (
          <MeasurementSlide
            type="height" isMetric={heightMetric}
            onToggleUnit={() => setHeightMetric((p) => !p)}
            heightFt={heightFt} heightIn={heightIn} heightCm={heightCm}
            weightInput={weightInput}
            setHeightFt={setHeightFt} setHeightIn={setHeightIn} setHeightCm={setHeightCm}
            setWeightInput={setWeightInput}
            onSave={saveHeight} onSkip={goNext}
          />
        );
        break;
      case 'weight':
        slideContent = (
          <MeasurementSlide
            type="weight" isMetric={weightMetric}
            onToggleUnit={() => setWeightMetric((p) => !p)}
            heightFt={heightFt} heightIn={heightIn} heightCm={heightCm}
            weightInput={weightInput}
            setHeightFt={setHeightFt} setHeightIn={setHeightIn} setHeightCm={setHeightCm}
            setWeightInput={setWeightInput}
            onSave={saveWeight} onSkip={goNext}
          />
        );
        break;
      case 'premium':
        slideContent = (
          <PremiumSlide
            experienceLevel={profile?.experienceLevel}
            primaryGoal={profile?.primaryGoal}
            onUpgrade={finishOnboarding}
            onSkip={finishOnboarding}
          />
        );
        break;
      default:
        slideContent = null;
    }

    return (
      <View style={{ width: screenWidth, flex: 1 }}>
        {slideContent}
      </View>
    );
  };

  const showProgress = PROFILE_SLIDES.includes(currentSlide);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: lt.primary.bg }]}>
      <StatusBar style="dark" />
      <View style={styles.headerRow}>
        {currentIndex > 0 ? (
          <Pressable onPress={goBack} style={styles.backButton} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={lt.text.primary} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        {showProgress ? (
          <View style={styles.progressArea}>
            <OnboardingProgress currentSlide={currentSlide} />
          </View>
        ) : (
          <View style={styles.progressArea} />
        )}
        <View style={styles.backPlaceholder} />
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
        style={{ width: screenWidth }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backPlaceholder: { width: 36 },
  progressArea: { flex: 1 },
});
