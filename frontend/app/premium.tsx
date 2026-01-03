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
      description: 'Deep insights with detailed charts and progress tracking',
    },
    {
      icon: 'calendar' as const,
      title: 'Unlimited Programs',
      description: 'Create and manage unlimited workout programs',
    },
    {
      icon: 'trophy' as const,
      title: 'Personal Records',
      description: 'Track unlimited PRs across all exercises',
    },
    {
      icon: 'notifications' as const,
      title: 'Smart Reminders',
      description: 'Intelligent reminders based on your schedule',
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

      <View style={styles.container}>
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

        <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.footer}>
          <Button
            label="Unlock Hercules Pro"
            onPress={handlePurchase}
            variant="primary"
            size="xl"
            style={styles.purchaseButton}
          />
        </Animated.View>
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
  backButton: {
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    paddingBottom: spacing.xl,
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
  purchaseButton: {
    width: '100%',
  },
});
