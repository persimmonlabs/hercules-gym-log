import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { AnimatedChevron } from '@/components/atoms/AnimatedChevron';
import { FeatureComparisonTable } from '@/components/molecules/FeatureComparisonTable';
import { useTheme } from '@/hooks/useTheme';
import { triggerHaptic } from '@/utils/haptics';
import { spacing } from '@/constants/theme';

import { PREMIUM_FEATURES } from '@/constants/premiumFeatures';

export default function PremiumScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const handlePurchase = () => {
    triggerHaptic('medium');
    console.log('Purchase premium');
  };

  const handleBack = useCallback(() => {
    triggerHaptic('selection');
    router.back();
  }, []);

  // Handle Android hardware back button
  useEffect(() => {
    const backAction = () => {
      handleBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [handleBack]);

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: theme.primary.bg }]}>
      {/* Close button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="close" size={28} color={theme.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Animated.View entering={FadeInUp.springify()} style={styles.heroSection}>
          <Ionicons name="fitness" size={56} color={theme.accent.orange} />
          <Text variant="heading1" style={styles.heroTitle}>
            Hercules Pro
          </Text>
          <Text variant="body" color="secondary" style={styles.heroSubtitle}>
            Unlock your full potential
          </Text>
        </Animated.View>

        {/* "This is included" + animated chevron */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.includedSection}>
          <Text variant="heading4" color="primary" style={styles.includedText}>
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
      <View
        style={[
          styles.stickyFooter,
          { paddingBottom: Math.max(insets.bottom, spacing.md), backgroundColor: theme.primary.bg },
        ]}
      >
        <Button
          label="Unlock Hercules Pro"
          onPress={handlePurchase}
          variant="primary"
          size="xl"
          style={styles.purchaseButton}
        />
        <Text variant="caption" color="tertiary" style={styles.cancelText}>
          Cancel anytime.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    width: '100%',
    zIndex: 10,
  },
  closeButton: {
    padding: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
  purchaseButton: {
    width: '100%',
  },
  cancelText: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
