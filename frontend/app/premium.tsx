import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { triggerHaptic } from '@/utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { InputField } from '@/components/atoms/InputField';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/store/settingsStore';
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
  const { isPro, setPro } = useSettingsStore();
  const [promoCode, setPromoCode] = useState('');
  const [isSubmittingPromo, setIsSubmittingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');

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

  const handlePromoCodeSubmit = async () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a promo code');
      return;
    }

    setIsSubmittingPromo(true);
    setPromoError('');

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (promoCode.toUpperCase() === 'OWEN2026') {
      triggerHaptic('success');
      await setPro(true);
      router.back();
    } else {
      triggerHaptic('error');
      setPromoError('Invalid promo code');
    }

    setIsSubmittingPromo(false);
  };

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

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: theme.primary.bg }]}>
      <LinearGradient
        colors={[theme.accent.orange, theme.primary.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.springify()} style={styles.heroSection}>
          <Ionicons name="diamond" size={80} color={colors.text.primary} />
          <Text variant="display1" style={[styles.heroTitle, { color: theme.text.primary }]}>
            Hercules Pro
          </Text>
          <Text variant="body" style={[styles.heroSubtitle, { color: theme.text.secondary }]}>
            Unlock your full potential
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
              editable={!isSubmittingPromo}
              helperText={promoError}
            />
            <Button
              label={isSubmittingPromo ? "Applying..." : "Apply Promo Code"}
              onPress={handlePromoCodeSubmit}
              variant="secondary"
              size="md"
              disabled={isSubmittingPromo}
              style={styles.promoButton}
            />
          </SurfaceCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.footer}>
          <Button
            label="Unlock Hercules Pro"
            onPress={handlePurchase}
            variant="primary"
            size="xl"
            style={styles.purchaseButton}
          />
        </Animated.View>
      </ScrollView>
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
  backButton: {
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 0,
  },
  heroTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  heroSubtitle: {
    textAlign: 'center',
    fontSize: 18,
    opacity: 0.9,
  },
  featuresSection: {
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
  },
  footer: {
    width: '100%',
    paddingTop: spacing.md,
  },
  promoSection: {
    width: '100%',
    marginBottom: spacing.lg,
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
});
