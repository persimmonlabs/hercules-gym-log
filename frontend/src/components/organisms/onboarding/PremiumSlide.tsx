/**
 * PremiumSlide
 * Personalized premium upsell at end of onboarding.
 * Matches the design of the premium.tsx page.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { InputField } from '@/components/atoms/InputField';
import { spacing, radius, sizing } from '@/constants/theme';
import { lt, slideStyles, SCREEN_WIDTH } from '@/constants/onboarding';
import { useSettingsStore } from '@/store/settingsStore';
import { triggerHaptic } from '@/utils/haptics';

interface PremiumSlideProps {
  experienceLevel?: string | null;
  primaryGoal?: string | null;
  onUpgrade: () => void;
  onSkip: () => void;
}

const GOAL_LABELS: Record<string, string> = {
  'build-muscle': 'Build Muscle',
  'lose-fat': 'Lose Fat',
  'gain-strength': 'Gain Strength',
  'general-fitness': 'General Fitness',
  'improve-endurance': 'Improve Endurance',
};

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  index: number;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description, index }) => {
  return (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <View style={styles.featureItem}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={24} color="#D4A017" />
        </View>
        <View style={styles.featureText}>
          <Text variant="heading4" style={{ marginBottom: spacing.xs, color: lt.text.primary }}>
            {title}
          </Text>
          <Text variant="body" style={{ color: lt.text.secondary }}>
            {description}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

export const PremiumSlide: React.FC<PremiumSlideProps> = ({
  experienceLevel,
  primaryGoal,
  onUpgrade,
  onSkip,
}) => {
  const { setPro } = useSettingsStore();
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  const goalLabel = primaryGoal ? GOAL_LABELS[primaryGoal] || primaryGoal : null;
  const expLabel = experienceLevel
    ? experienceLevel.charAt(0).toUpperCase() + experienceLevel.slice(1)
    : null;

  const personalizedText = expLabel && goalLabel
    ? `Based on your ${expLabel} level and ${goalLabel} goal, Hercules Pro will supercharge your results.`
    : 'Unlock the full power of Hercules to reach your fitness goals faster.';

  const features = [
    {
      icon: 'analytics' as const,
      title: 'Advanced Analytics',
      description: 'Deep insights with detailed charts and progress tracking',
    },
    {
      icon: 'create' as const,
      title: 'Create Unlimited Workouts and Plans',
      description: 'Build and save as many workouts and plans as you want',
    },
    {
      icon: 'lock-open' as const,
      title: 'Unlock all Premium Workouts and Plans',
      description: 'Get full access to the entire premium library',
    },
    {
      icon: 'sparkles' as const,
      title: 'Access to all future premium updates',
      description: 'All new premium features and content included',
    },
  ];

  const handlePromo = async () => {
    if (!promoCode.trim()) { 
      setPromoError('Please enter a promo code'); 
      return; 
    }
    setPromoLoading(true);
    setPromoError('');
    await new Promise((r) => setTimeout(r, 800));
    if (promoCode.toUpperCase() === 'OWEN2026') {
      triggerHaptic('success');
      await setPro(true);
      onUpgrade();
    } else {
      triggerHaptic('error');
      setPromoError('Invalid promo code');
    }
    setPromoLoading(false);
  };

  return (
    <View style={[slideStyles.slide, { width: SCREEN_WIDTH, backgroundColor: lt.primary.bg }]}>
      <LinearGradient
        colors={['#D4A017', lt.primary.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.springify()} style={styles.heroSection}>
          <Ionicons name="diamond" size={80} color={lt.text.primary} />
          <Text variant="display1" style={[styles.heroTitle, { color: lt.text.primary }]}>
            Hercules Pro
          </Text>
          <Text variant="body" style={[styles.heroSubtitle, { color: lt.text.secondary }]}>
            {personalizedText}
          </Text>
        </Animated.View>

        <View style={styles.featuresSection}>
          {features.map((feature, index) => (
            <FeatureItem
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={index}
            />
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.promoSection}>
          <SurfaceCard tone="elevated" style={styles.promoCard}>
            <Text variant="heading4" style={styles.promoTitle}>
              Have a promo code?
            </Text>
            <InputField
              label="Promo Code"
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder="Enter promo code"
              autoCapitalize="characters"
              editable={!promoLoading}
              helperText={promoError}
            />
            <Button
              label={promoLoading ? "Applying..." : "Apply Promo Code"}
              onPress={handlePromo}
              variant="secondary"
              size="md"
              disabled={promoLoading}
              style={styles.promoButton}
            />
          </SurfaceCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.footer}>
          <Button
            label="Unlock Hercules Pro"
            onPress={onUpgrade}
            variant="primary"
            size="xl"
            style={styles.purchaseButton}
          />
          <TouchableOpacity onPress={onSkip} style={styles.skipTouch}>
            <Text variant="body" style={{ color: lt.text.tertiary }}>Maybe Later</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  heroTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  heroSubtitle: {
    textAlign: 'center',
    fontSize: 18,
    paddingHorizontal: spacing.xl,
    lineHeight: 24,
  },
  featuresSection: {
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(212, 160, 23, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  promoSection: {
    width: '100%',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  promoCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  promoTitle: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  promoButton: {
    width: '100%',
  },
  purchaseButton: {
    width: '100%',
  },
  skipTouch: {
    paddingVertical: spacing.sm,
  },
});
