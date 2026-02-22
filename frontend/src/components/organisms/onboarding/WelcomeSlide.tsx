/**
 * WelcomeSlide
 * First onboarding screen with compelling headline and sign-in option.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { spacing } from '@/constants/theme';
import { lt, slideStyles, SCREEN_WIDTH } from '@/constants/onboarding';

interface WelcomeSlideProps {
  onNext: () => void;
  onSignIn: () => void;
}

export const WelcomeSlide: React.FC<WelcomeSlideProps> = ({ onNext, onSignIn }) => {
  return (
    <View style={[slideStyles.slide, { width: SCREEN_WIDTH }]}>
      <View style={slideStyles.centeredContent}>
        <Text variant="heading1" style={[slideStyles.slideTitle, { color: lt.text.primary }]}>
          Welcome to Hercules!
        </Text>
        <Text variant="body" style={[slideStyles.slideSubtitle, { color: lt.text.secondary }]}>
          Track workouts. Analyze progress.{`\n`}Reach your goals with AI-powered coaching.
        </Text>
      </View>
      <View style={styles.footer}>
        <Button label="Get Started" variant="primary" onPress={onNext} style={slideStyles.mainButton} />
        <View style={styles.signInRow}>
          <Text variant="body" style={{ color: lt.text.tertiary }}>
            Already have an account?
          </Text>
          <TouchableOpacity onPress={onSignIn}>
            <Text variant="bodySemibold" style={{ color: lt.accent.primary }}> Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.lg,
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
});
