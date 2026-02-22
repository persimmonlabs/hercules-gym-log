/**
 * FeaturesSlide
 * "What You Can Do" screen with feature list and premium crown hints.
 * Covers all major app capabilities: tracking, analytics, programs, AI, cardio, scheduling.
 */

import React from 'react';
import { View, StyleSheet, Text as RNText, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/atoms/Button';
import { spacing, typography } from '@/constants/theme';
import { lt, slideStyles } from '@/constants/onboarding';

interface FeaturesSlideProps {
  onNext: () => void;
}

interface FeatureItem {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  premium?: boolean;
}

// ICON OPTIONS FOR SMART TARGETS (pick one):
// 1. 'ellipse-outline' - full circle (current)
// 2. 'radio-outline' - radio/bullseye 
// 3. 'location-outline' - location pin/target
// 4. 'flag-outline' - flag/goal
// 5. 'navigate-outline' - compass/navigation
// 6. 'compass-outline' - compass
// 7. 'target-outline' - target (if exists)
// 8. 'checkmark-circle-outline' - target circle
// 9. 'radio-button-on-outline' - bullseye dot
// 10. 'disc-outline' - disc/circle
// 11. 'albums-outline' - stacked circles
// 12. 'easel-outline' - target stand
// 13. 'camera-outline' - lens/circle
// 14. 'watch-outline' - watch face/circle
// 15. 'timer-outline' - timer circle

const FEATURES: FeatureItem[] = [
  { icon: 'barbell-outline', text: 'Log workouts in real time' },
  { icon: 'bicycle-outline', text: 'Record outdoor cardio activities with GPS & pace tracking' },
  { icon: 'calendar-outline', text: 'Build plans and schedule your workouts' },
  { icon: 'trophy-outline', text: 'Track personal records' },
  { icon: 'heart-outline', text: 'Set and achieve cardio goals' },
  { icon: 'stats-chart-outline', text: 'View training volume, consistency & history' },
  { icon: 'sparkles-outline', text: 'Hercules AI — your 24/7 personal workout coach', premium: true },
  { icon: 'disc-outline', text: 'Smart weight & rep targets for progressive overload', premium: true },
  { icon: 'analytics-outline', text: 'Advanced analytics, charts & training insights', premium: true },
  { icon: 'library-outline', text: 'Full premade workout & program library', premium: true },
];

export const FeaturesSlide: React.FC<FeaturesSlideProps> = ({ onNext }) => {
  return (
    <View style={[slideStyles.slide]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        <RNText style={[typography.heading2, styles.title, { color: lt.text.primary }]}>
          Everything You Need to Train Smarter
        </RNText>
        
        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.iconWrap}>
                <Ionicons name={f.icon} size={22} color={lt.accent.orange} />
              </View>
              
              <View style={styles.textContainer}>
                {/* Adding slight paddingBottom to prevent custom font descenders from getting clipped */}
                <RNText style={[typography.body, { color: lt.text.primary, paddingBottom: 2 }]}>
                  {f.text}
                </RNText>
              </View>

              {f.premium && (
                <View style={styles.crownBadge}>
                  <Ionicons name="diamond" size={12} color={lt.accent.orange} />
                  <RNText style={[typography.captionSmall, { color: lt.accent.orange, marginLeft: 2 }]}>
                    PRO
                  </RNText>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Gradient overlay at bottom to hint more content */}
      <LinearGradient
        colors={['transparent', 'rgba(249, 250, 251, 0.8)', 'rgba(249, 250, 251, 1)']}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />

      <Button label="Continue" variant="primary" onPress={onNext} style={{ width: '100%', marginTop: spacing.md }} />
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  featureList: {
    gap: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 74, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  crownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 74, 0.14)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: spacing.sm,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    height: 60,
  },
});
