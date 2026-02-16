/**
 * Onboarding Screen
 * Multi-slide onboarding for new users. Each profile question gets its own slide.
 * All slides are skippable. Profile data saved to store + Supabase on each selection.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, TextInput, Dimensions, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { colors, spacing, radius } from '@/constants/theme';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useSettingsStore } from '@/store/settingsStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SlideType = 'welcome' | 'features' | 'dob' | 'gender' | 'experience' | 'goal' | 'equipment' | 'trainingDays' | 'height' | 'weight';

const SLIDES: SlideType[] = [
  'welcome', 'features', 'dob', 'gender', 'experience',
  'goal', 'equipment', 'trainingDays', 'height', 'weight',
];

// Light-mode-only color references for onboarding
const lt = colors;

export default function OnboardingScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { profile, updateProfileField, updateBodyMetrics } = useUserProfileStore();
  const { sizeUnit, weightUnit, themePreference, setThemePreference } = useSettingsStore();

  // Force light mode during onboarding; restore user's preference on unmount
  const savedThemeRef = useRef(themePreference);
  useEffect(() => {
    savedThemeRef.current = themePreference;
    if (themePreference !== 'light') {
      setThemePreference('light');
    }
    return () => {
      // Restore only if user had a non-light preference before onboarding
      if (savedThemeRef.current !== 'light') {
        setThemePreference(savedThemeRef.current);
      }
    };
  }, []); // Run once on mount/unmount only

  // Local state for input fields
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightInput, setWeightInput] = useState('');

  const goNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      finishOnboarding();
    }
  }, [currentIndex]);

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      triggerHaptic('selection');
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const finishOnboarding = useCallback(async () => {
    triggerHaptic('success');
    // Restore user's theme preference before navigating to dashboard
    if (savedThemeRef.current !== 'light') {
      setThemePreference(savedThemeRef.current);
    }
    await updateProfileField('onboardingCompleted', true);
    router.replace('/(tabs)');
  }, [updateProfileField, router, setThemePreference]);

  const saveDob = useCallback(() => {
    const m = parseInt(dobMonth, 10);
    const d = parseInt(dobDay, 10);
    const y = parseInt(dobYear, 10);
    if (m && d && y && m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      updateProfileField('dateOfBirth', iso);
    }
    goNext();
  }, [dobMonth, dobDay, dobYear, updateProfileField, goNext]);

  const saveHeight = useCallback(() => {
    const isMetric = sizeUnit === 'cm';
    if (isMetric) {
      const cm = parseInt(heightCm, 10) || 0;
      const totalIn = cm / 2.54;
      updateBodyMetrics(Math.floor(totalIn / 12), Math.round(totalIn % 12), profile?.weightLbs || 0);
    } else {
      updateBodyMetrics(parseInt(heightFt, 10) || 0, parseInt(heightIn, 10) || 0, profile?.weightLbs || 0);
    }
    goNext();
  }, [sizeUnit, heightCm, heightFt, heightIn, profile?.weightLbs, updateBodyMetrics, goNext]);

  const saveWeight = useCallback(() => {
    const isMetric = weightUnit === 'kg';
    const val = parseFloat(weightInput) || 0;
    const lbs = isMetric ? Math.round(val * 2.20462) : val;
    if (lbs > 0) {
      updateBodyMetrics(profile?.heightFeet || 0, profile?.heightInches || 0, lbs);
    }
    finishOnboarding();
  }, [weightUnit, weightInput, profile?.heightFeet, profile?.heightInches, updateBodyMetrics, finishOnboarding]);

  const selectOption = useCallback((field: string, value: string | number) => {
    triggerHaptic('selection');
    const finalValue = field === 'trainingDaysPerWeek' ? Number(value) : value;
    updateProfileField(field, finalValue);
    goNext();
  }, [updateProfileField, goNext]);

  const renderOptionGrid = (field: string, options: { value: string; label: string }[], selected: string | null | undefined) => (
    <View style={slideStyles.optionsGrid}>
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[
              slideStyles.optionCard,
              { backgroundColor: lt.surface.card, borderColor: lt.border.light },
              isSelected && { backgroundColor: lt.accent.orange, borderColor: lt.accent.orange },
            ]}
            onPress={() => selectOption(field, opt.value)}
          >
            <Text variant="bodySemibold" style={{ textAlign: 'center', color: isSelected ? lt.text.onAccent : lt.text.primary }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderSlide = ({ item }: { item: SlideType }) => {
    const isMetricH = sizeUnit === 'cm';
    const isMetricW = weightUnit === 'kg';

    switch (item) {
      case 'welcome':
        return (
          <View style={[slideStyles.slide, { width: SCREEN_WIDTH }]}>
            <View style={slideStyles.centeredContent}>
              <Text style={{ fontSize: 64 }}>🏛️</Text>
              <Text variant="heading1" style={[slideStyles.slideTitle, { color: lt.text.primary }]}>Welcome to Hercules</Text>
              <Text variant="body" style={[slideStyles.slideSubtitle, { color: lt.text.secondary }]}>
                Your personal strength training companion. Let's get you set up in just a few steps.
              </Text>
            </View>
            <Button label="Get Started" variant="primary" onPress={goNext} style={slideStyles.mainButton} />
          </View>
        );

      case 'features':
        return (
          <View style={[slideStyles.slide, { width: SCREEN_WIDTH }]}>
            <View style={slideStyles.centeredContent}>
              <Text variant="heading2" style={[slideStyles.slideTitle, { color: lt.text.primary }]}>What You Can Do</Text>
              <View style={slideStyles.featureList}>
                {[
                  { icon: 'barbell-outline' as const, text: 'Track workouts and log sets in real-time' },
                  { icon: 'analytics-outline' as const, text: 'Visualize your progress with detailed analytics' },
                  { icon: 'calendar-outline' as const, text: 'Follow structured programs or build your own' },
                  { icon: 'sparkles-outline' as const, text: 'Get AI-powered training suggestions' },
                ].map((f, i) => (
                  <View key={i} style={slideStyles.featureRow}>
                    <Ionicons name={f.icon} size={24} color={lt.accent.orange} />
                    <Text variant="body" style={[slideStyles.featureText, { color: lt.text.primary }]}>{f.text}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Button label="Continue" variant="primary" onPress={goNext} style={slideStyles.mainButton} />
          </View>
        );

      case 'dob':
        return (
          <View style={[slideStyles.slide, { width: SCREEN_WIDTH }]}>
            <View style={slideStyles.centeredContent}>
              <Text variant="heading2" style={[slideStyles.slideTitle, { color: lt.text.primary }]}>Date of Birth</Text>
              <Text variant="body" style={[slideStyles.slideSubtitle, { color: lt.text.secondary }]}>Helps personalize your experience</Text>
              <View style={slideStyles.inputRow}>
                <View style={slideStyles.inputGroup}>
                  <Text variant="caption" style={{ color: lt.text.secondary }}>Month</Text>
                  <TextInput value={dobMonth} onChangeText={(t) => setDobMonth(t.replace(/[^0-9]/g, ''))}
                    placeholder="MM" placeholderTextColor={lt.text.tertiary} keyboardType="numeric"
                    style={[slideStyles.textInput, { borderColor: lt.border.light, color: lt.text.primary }]} maxLength={2} />
                </View>
                <View style={slideStyles.inputGroup}>
                  <Text variant="caption" style={{ color: lt.text.secondary }}>Day</Text>
                  <TextInput value={dobDay} onChangeText={(t) => setDobDay(t.replace(/[^0-9]/g, ''))}
                    placeholder="DD" placeholderTextColor={lt.text.tertiary} keyboardType="numeric"
                    style={[slideStyles.textInput, { borderColor: lt.border.light, color: lt.text.primary }]} maxLength={2} />
                </View>
                <View style={[slideStyles.inputGroup, { flex: 1.4 }]}>
                  <Text variant="caption" style={{ color: lt.text.secondary }}>Year</Text>
                  <TextInput value={dobYear} onChangeText={(t) => setDobYear(t.replace(/[^0-9]/g, ''))}
                    placeholder="YYYY" placeholderTextColor={lt.text.tertiary} keyboardType="numeric"
                    style={[slideStyles.textInput, { borderColor: lt.border.light, color: lt.text.primary }]} maxLength={4} />
                </View>
              </View>
            </View>
            <View style={slideStyles.buttonRow}>
              <Button label="Skip" variant="secondary" onPress={goNext} style={slideStyles.halfButton} />
              <Button label="Save" variant="primary" onPress={saveDob} style={slideStyles.halfButton} />
            </View>
          </View>
        );

      case 'gender':
        return (
          <View style={[slideStyles.slide, { width: SCREEN_WIDTH }]}>
            <View style={slideStyles.centeredContent}>
              <Text variant="heading2" style={[slideStyles.slideTitle, { color: lt.text.primary }]}>Gender</Text>
              <Text variant="body" style={[slideStyles.slideSubtitle, { color: lt.text.secondary }]}>Helps tailor exercise recommendations</Text>
              {renderOptionGrid('gender', [
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
                { value: 'prefer_not_to_say', label: 'Prefer not to say' },
              ], profile?.gender)}
            </View>
            <Button label="Skip" variant="secondary" onPress={goNext} style={slideStyles.mainButton} />
          </View>
        );

      case 'experience':
        return (
          <View style={[slideStyles.slide, { width: SCREEN_WIDTH }]}>
            <View style={slideStyles.centeredContent}>
              <Text variant="heading2" style={[slideStyles.slideTitle, { color: lt.text.primary }]}>Experience Level</Text>
              <Text variant="body" style={[slideStyles.slideSubtitle, { color: lt.text.secondary }]}>We'll suggest programs that match your level</Text>
              {renderOptionGrid('experienceLevel', [
                { value: 'beginner', label: 'Beginner' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'advanced', label: 'Advanced' },
              ], profile?.experienceLevel)}
            </View>
            <Button label="Skip" variant="secondary" onPress={goNext} style={slideStyles.mainButton} />
          </View>
        );

      case 'goal':
        return (
          <View style={[slideStyles.slide, { width: SCREEN_WIDTH }]}>
            <View style={slideStyles.centeredContent}>
              <Text variant="heading2" style={[slideStyles.slideTitle, { color: lt.text.primary }]}>Primary Goal</Text>
              <Text variant="body" style={[slideStyles.slideSubtitle, { color: lt.text.secondary }]}>What are you training for?</Text>
              {renderOptionGrid('primaryGoal', [
                { value: 'build-muscle', label: 'Build Muscle' },
                { value: 'lose-fat', label: 'Lose Fat' },
                { value: 'gain-strength', label: 'Gain Strength' },
                { value: 'general-fitness', label: 'General Fitness' },
                { value: 'improve-endurance', label: 'Improve Endurance' },
              ], profile?.primaryGoal)}
            </View>
            <Button label="Skip" variant="secondary" onPress={goNext} style={slideStyles.mainButton} />
          </View>
        );

      case 'equipment':
        return (
          <View style={[slideStyles.slide, { width: SCREEN_WIDTH }]}>
            <View style={slideStyles.centeredContent}>
              <Text variant="heading2" style={[slideStyles.slideTitle, { color: lt.text.primary }]}>Available Equipment</Text>
              <Text variant="body" style={[slideStyles.slideSubtitle, { color: lt.text.secondary }]}>What do you have access to?</Text>
              {renderOptionGrid('availableEquipment', [
                { value: 'full-gym', label: 'Full Gym' },
                { value: 'dumbbells-only', label: 'Dumbbells Only' },
                { value: 'bodyweight', label: 'Bodyweight Only' },
                { value: 'home-gym', label: 'Home Gym' },
                { value: 'resistance-bands', label: 'Resistance Bands' },
              ], profile?.availableEquipment)}
            </View>
            <Button label="Skip" variant="secondary" onPress={goNext} style={slideStyles.mainButton} />
          </View>
        );

      case 'trainingDays':
        return (
          <View style={[slideStyles.slide, { width: SCREEN_WIDTH }]}>
            <View style={slideStyles.centeredContent}>
              <Text variant="heading2" style={[slideStyles.slideTitle, { color: lt.text.primary }]}>Training Days</Text>
              <Text variant="body" style={[slideStyles.slideSubtitle, { color: lt.text.secondary }]}>How many days per week do you train?</Text>
              {renderOptionGrid('trainingDaysPerWeek', [
                { value: '1', label: '1 day' }, { value: '2', label: '2 days' },
                { value: '3', label: '3 days' }, { value: '4', label: '4 days' },
                { value: '5', label: '5 days' }, { value: '6', label: '6 days' },
                { value: '7', label: '7 days' },
              ], profile?.trainingDaysPerWeek != null ? String(profile.trainingDaysPerWeek) : undefined)}
            </View>
            <Button label="Skip" variant="secondary" onPress={goNext} style={slideStyles.mainButton} />
          </View>
        );

      case 'height':
        return (
          <View style={[slideStyles.slide, { width: SCREEN_WIDTH }]}>
            <View style={slideStyles.centeredContent}>
              <Text variant="heading2" style={[slideStyles.slideTitle, { color: lt.text.primary }]}>Height</Text>
              <Text variant="body" style={[slideStyles.slideSubtitle, { color: lt.text.secondary }]}>Used for bodyweight volume calculations</Text>
              {isMetricH ? (
                <View style={slideStyles.inputRow}>
                  <View style={slideStyles.inputGroup}>
                    <TextInput value={heightCm} onChangeText={(t) => setHeightCm(t.replace(/[^0-9]/g, ''))}
                      placeholder="175" placeholderTextColor={lt.text.tertiary} keyboardType="numeric"
                      style={[slideStyles.textInput, { borderColor: lt.border.light, color: lt.text.primary }]} maxLength={3} />
                  </View>
                  <Text variant="body" style={{ color: lt.text.secondary }}>cm</Text>
                </View>
              ) : (
                <View style={slideStyles.inputRow}>
                  <View style={slideStyles.inputGroup}>
                    <TextInput value={heightFt} onChangeText={(t) => setHeightFt(t.replace(/[^0-9]/g, ''))}
                      placeholder="5" placeholderTextColor={lt.text.tertiary} keyboardType="numeric"
                      style={[slideStyles.textInput, { borderColor: lt.border.light, color: lt.text.primary }]} maxLength={1} />
                  </View>
                  <Text variant="body" style={{ color: lt.text.secondary }}>ft</Text>
                  <View style={slideStyles.inputGroup}>
                    <TextInput value={heightIn} onChangeText={(t) => {
                      const c = t.replace(/[^0-9]/g, ''); const n = parseInt(c, 10);
                      if (c === '' || (n >= 0 && n <= 11)) setHeightIn(c);
                    }} placeholder="9" placeholderTextColor={lt.text.tertiary} keyboardType="numeric"
                      style={[slideStyles.textInput, { borderColor: lt.border.light, color: lt.text.primary }]} maxLength={2} />
                  </View>
                  <Text variant="body" style={{ color: lt.text.secondary }}>in</Text>
                </View>
              )}
            </View>
            <View style={slideStyles.buttonRow}>
              <Button label="Skip" variant="secondary" onPress={goNext} style={slideStyles.halfButton} />
              <Button label="Save" variant="primary" onPress={saveHeight} style={slideStyles.halfButton} />
            </View>
          </View>
        );

      case 'weight':
        return (
          <View style={[slideStyles.slide, { width: SCREEN_WIDTH }]}>
            <View style={slideStyles.centeredContent}>
              <Text variant="heading2" style={[slideStyles.slideTitle, { color: lt.text.primary }]}>Body Weight</Text>
              <Text variant="body" style={[slideStyles.slideSubtitle, { color: lt.text.secondary }]}>Used for accurate volume calculations</Text>
              <View style={slideStyles.inputRow}>
                <View style={slideStyles.inputGroup}>
                  <TextInput value={weightInput} onChangeText={(t) => {
                    if (isMetricW) {
                      const cleaned = t.replace(/[^0-9.]/g, '');
                      const parts = cleaned.split('.');
                      if (parts.length <= 2) setWeightInput(cleaned);
                    } else {
                      setWeightInput(t.replace(/[^0-9]/g, ''));
                    }
                  }} placeholder={isMetricW ? '70' : '150'} placeholderTextColor={lt.text.tertiary}
                    keyboardType={isMetricW ? 'decimal-pad' : 'numeric'}
                    style={[slideStyles.textInput, { borderColor: lt.border.light, color: lt.text.primary }]}
                    maxLength={isMetricW ? 5 : 3} />
                </View>
                <Text variant="body" style={{ color: lt.text.secondary }}>{isMetricW ? 'kg' : 'lbs'}</Text>
              </View>
            </View>
            <View style={slideStyles.buttonRow}>
              <Button label="Skip" variant="secondary" onPress={finishOnboarding} style={slideStyles.halfButton} />
              <Button label="Finish" variant="primary" onPress={saveWeight} style={slideStyles.halfButton} />
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[slideStyles.container, { backgroundColor: lt.primary.bg }]}>
      <StatusBar style="dark" />
      {/* Header: back button + progress dots */}
      <View style={slideStyles.headerRow}>
        {currentIndex > 0 ? (
          <Pressable onPress={goBack} style={slideStyles.backButton} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={lt.text.primary} />
          </Pressable>
        ) : (
          <View style={slideStyles.backPlaceholder} />
        )}
        <View style={slideStyles.progressRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                slideStyles.dot,
                { backgroundColor: i <= currentIndex ? lt.accent.orange : lt.border.light },
              ]}
            />
          ))}
        </View>
        <View style={slideStyles.backPlaceholder} />
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
        getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
      />
    </SafeAreaView>
  );
}

const slideStyles = StyleSheet.create({
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
  backPlaceholder: {
    width: 36,
  },
  progressRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  dot: { flex: 1, height: 4, borderRadius: 2 },
  slide: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  slideTitle: { textAlign: 'center', marginTop: spacing.md },
  slideSubtitle: { textAlign: 'center', marginBottom: spacing.lg },
  mainButton: { width: '100%' },
  buttonRow: { flexDirection: 'row', gap: spacing.md },
  halfButton: { flex: 1 },
  optionsGrid: { width: '100%', gap: spacing.sm },
  optionCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  featureList: { gap: spacing.lg, paddingHorizontal: spacing.md, marginTop: spacing.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureText: { flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, width: '100%' },
  inputGroup: { flex: 1 },
  textInput: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
