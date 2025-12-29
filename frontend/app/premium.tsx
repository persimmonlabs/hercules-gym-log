import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { useTheme } from '@/hooks/useTheme';
import { colors, spacing, radius, typography, shadows, sizing } from '@/constants/theme';

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  index: number;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description, index }) => {
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <View style={styles.featureItem}>
        <View style={[styles.iconContainer, { backgroundColor: theme.surface.tint }]}>
          <Ionicons name={icon} size={24} color={theme.accent.orange} />
        </View>
        <View style={styles.featureText}>
          <Text variant="heading4" style={{ marginBottom: spacing.xs }}>
            {title}
          </Text>
          <Text variant="body" color="secondary">
            {description}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

export default function PremiumScreen() {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  const handlePurchase = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('Purchase premium');
  };

  const handleBack = () => {
    Haptics.selectionAsync();
    router.back();
  };

  const features = [
    {
      icon: 'analytics' as const,
      title: 'Advanced Analytics',
      description: 'Deep insights into your training with detailed charts and progress tracking',
    },
    {
      icon: 'calendar' as const,
      title: 'Unlimited Programs',
      description: 'Create and manage unlimited workout programs with custom schedules',
    },
    {
      icon: 'barbell' as const,
      title: 'Custom Exercises',
      description: 'Add your own exercises with custom tracking parameters',
    },
    {
      icon: 'cloud-upload' as const,
      title: 'Cloud Backup',
      description: 'Automatic cloud sync and backup of all your workout data',
    },
    {
      icon: 'trophy' as const,
      title: 'Personal Records',
      description: 'Track unlimited PRs across all exercises and time periods',
    },
    {
      icon: 'notifications' as const,
      title: 'Smart Reminders',
      description: 'Intelligent workout reminders based on your training schedule',
    },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xs, paddingBottom: insets.bottom, backgroundColor: theme.primary.bg }]}>
      <View style={[styles.container, { backgroundColor: theme.primary.bg }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{
    flexGrow: 1,
    paddingBottom: spacing.xs + sizing.tabBarHeight + insets.bottom,
  }}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[theme.accent.orange, theme.primary.bg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 320, // Reduced from 400 to stop even higher
            }}
          />
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>

        <Animated.View entering={FadeInUp.springify()}>
          <View style={styles.heroGradient}>
            <View style={styles.heroContent}>
              <Ionicons name="diamond" size={64} color={colors.text.primary} />
              <Text
                variant="display1"
                style={[styles.heroTitle, { color: theme.text.primary }]}
              >
                Hercules Pro
              </Text>
              <Text
                variant="body"
                style={[styles.heroSubtitle, { color: theme.text.secondary }]}
              >
                Unlock your full potential
              </Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.content}>
          <View style={styles.featuresContainer}>
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

          <Animated.View entering={FadeInDown.delay(800).springify()}>
            <SurfaceCard tone="card" style={styles.pricingCard} showAccentStripe={false}>
              <View style={styles.pricingHeader}>
                <Text variant="heading2" style={styles.pricingTitle}>
                  Simple Pricing
                </Text>
                <Text variant="body" color="secondary" style={styles.pricingSubtitle}>
                  Choose the plan that works for you
                </Text>
              </View>

              <View style={styles.pricingOptions}>
                <View style={[styles.pricingOption, { borderColor: theme.border.light }]}>
                  <Text variant="caption" color="secondary" style={styles.pricingLabel}>
                    MONTHLY
                  </Text>
                  <View style={styles.priceRow}>
                    <Text variant="display1" style={styles.priceAmount}>
                      $4.99
                    </Text>
                    <Text variant="body" color="secondary" style={styles.priceUnit}>
                      /month
                    </Text>
                  </View>
                  <Text variant="caption" color="tertiary" style={styles.pricingNote}>
                    Cancel anytime
                  </Text>
                </View>

                <View
                  style={[
                    styles.pricingOption,
                    styles.pricingOptionRecommended,
                    { borderColor: theme.accent.orange },
                  ]}
                >
                  <View style={[styles.recommendedBadge, { backgroundColor: theme.accent.orange }]}>
                    <Text
                      variant="captionSmall"
                      style={[styles.recommendedText, { color: theme.text.onAccent }]}
                    >
                      BEST VALUE
                    </Text>
                  </View>
                  <Text variant="caption" color="secondary" style={styles.pricingLabel}>
                    YEARLY
                  </Text>
                  <View style={styles.priceRow}>
                    <Text variant="display1" style={styles.priceAmount}>
                      $49.99
                    </Text>
                    <Text variant="body" color="secondary" style={styles.priceUnit}>
                      /year
                    </Text>
                  </View>
                  <Text variant="caption" style={[styles.pricingNote, { color: theme.accent.success }]}>
                    Save 17%
                  </Text>
                </View>
              </View>
            </SurfaceCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(1000).springify()}>
            <View style={styles.ctaContainer}>
              <Button
                label="Unlock Hercules Pro"
                onPress={handlePurchase}
                variant="primary"
                size="xl"
              />
              <Text variant="caption" color="tertiary" style={styles.disclaimer}>
                7-day free trial • Cancel anytime • No commitment
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(1100).springify()}>
            <View style={styles.guaranteeContainer}>
              <Ionicons name="shield-checkmark" size={32} color={theme.accent.success} />
              <View style={styles.guaranteeText}>
                <Text variant="heading4" style={{ marginBottom: spacing.xs }}>
                  30-Day Money-Back Guarantee
                </Text>
                <Text variant="body" color="secondary">
                  Not satisfied? Get a full refund within 30 days, no questions asked.
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  backButton: {
    padding: spacing.md,
    marginTop: spacing.xl,
    zIndex: 10,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroGradient: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  heroSubtitle: {
    textAlign: 'center',
    fontSize: 18,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  sectionTitleContainer: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  sectionDivider: {
    height: 2,
    borderRadius: 1,
    marginHorizontal: 0,
  },
  featuresContainer: {
    marginBottom: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  featureText: {
    flex: 1,
  },
  pricingCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  pricingHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  pricingTitle: {
    marginBottom: spacing.sm,
  },
  pricingSubtitle: {
    textAlign: 'center',
  },
  pricingOptions: {
    gap: spacing.md,
  },
  pricingOption: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    position: 'relative',
  },
  pricingOptionRecommended: {
    borderWidth: 2,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  recommendedText: {
    fontWeight: '700',
  },
  pricingLabel: {
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  priceAmount: {
    marginRight: spacing.sm,
  },
  priceUnit: {
    fontSize: 16,
  },
  pricingNote: {
    fontWeight: '600',
  },
  ctaContainer: {
    marginBottom: spacing.lg,
  },
  disclaimer: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  guaranteeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  guaranteeText: {
    flex: 1,
  },
});
