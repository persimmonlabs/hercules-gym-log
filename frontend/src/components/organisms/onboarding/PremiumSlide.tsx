/**
 * PremiumSlide
 * Premium upsell at end of onboarding.
 * Matches the design of the premium.tsx page.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { AnimatedChevron } from '@/components/atoms/AnimatedChevron';
import { FeatureComparisonTable } from '@/components/molecules/FeatureComparisonTable';
import { spacing } from '@/constants/theme';
import { lt, SCREEN_WIDTH } from '@/constants/onboarding';
import { PREMIUM_FEATURES } from '@/constants/premiumFeatures';

interface PremiumSlideProps {
  onUpgrade: () => void;
  onSkip: () => void;
}

export const PremiumSlide: React.FC<PremiumSlideProps> = ({
  onUpgrade,
  onSkip,
}) => {
  return (
    <View style={[styles.root, { width: SCREEN_WIDTH, backgroundColor: lt.primary.bg }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Animated.View entering={FadeInUp.springify()} style={styles.heroSection}>
          <Ionicons name="fitness" size={56} color={lt.accent.orange} />
          <Text variant="heading1" style={[styles.heroTitle, { color: lt.text.primary }]}>
            Hercules Pro
          </Text>
          <Text variant="body" style={[styles.heroSubtitle, { color: lt.text.secondary }]}>
            Unlock your full potential
          </Text>
        </Animated.View>

        {/* "What's included" + animated chevron */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.includedSection}>
          <Text variant="heading4" style={[styles.includedText, { color: lt.text.primary }]}>
            What's included
          </Text>
          <AnimatedChevron size={20} />
        </Animated.View>

        {/* Feature Comparison Table */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.tableSection}>
          <FeatureComparisonTable features={PREMIUM_FEATURES} />
        </Animated.View>

      </ScrollView>

      {/* Sticky Footer */}
      <View style={[styles.stickyFooter, { backgroundColor: lt.primary.bg }]}>
        <Button
          label="Unlock Hercules Pro"
          onPress={onUpgrade}
          variant="primary"
          size="xl"
          style={styles.purchaseButton}
        />
        <Text variant="caption" style={[styles.cancelText, { color: lt.text.tertiary }]}>
          Cancel anytime.
        </Text>
        <TouchableOpacity onPress={onSkip} style={styles.skipTouch}>
          <Text variant="body" style={{ color: lt.text.tertiary }}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  heroTitle: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  heroSubtitle: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  includedSection: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  includedText: {
    textAlign: 'center',
  },
  tableSection: {
    marginBottom: spacing.xl,
  },
  stickyFooter: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  purchaseButton: {
    width: '100%',
  },
  cancelText: {
    textAlign: 'center',
  },
  skipTouch: {
    paddingVertical: spacing.sm,
  },
});
