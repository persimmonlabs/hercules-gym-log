/**
 * OnboardingProgress
 * Phase-based progress indicator for onboarding.
 * Groups slides into labeled phases with dot indicators.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { spacing, radius } from '@/constants/theme';
import { PHASES, PROFILE_SLIDES, lt } from '@/constants/onboarding';
import type { SlideType } from '@/constants/onboarding';

interface OnboardingProgressProps {
  currentSlide: SlideType;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({ currentSlide }) => {
  const profileIndex = PROFILE_SLIDES.indexOf(currentSlide);
  if (profileIndex < 0) return null;

  const currentPhase = PHASES.find((p) => p.slides.includes(currentSlide));
  if (!currentPhase) return null;

  return (
    <View style={styles.container}>
      <Text variant="caption" style={{ color: lt.text.tertiary, textAlign: 'center' }}>
        {currentPhase.label}
      </Text>
      <View style={styles.dotsRow}>
        {PHASES.map((phase) =>
          phase.slides.map((slide) => {
            const slideGlobalIdx = PROFILE_SLIDES.indexOf(slide);
            const isActive = slideGlobalIdx <= profileIndex;
            const isCurrent = slide === currentSlide;
            return (
              <View
                key={slide}
                style={[
                  styles.dot,
                  { backgroundColor: isActive ? lt.accent.orange : lt.border.light },
                  isCurrent && styles.dotCurrent,
                ]}
              />
            );
          })
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 4,
    borderRadius: 2,
  },
  dotCurrent: {
    width: 20,
    borderRadius: radius.sm,
  },
});
