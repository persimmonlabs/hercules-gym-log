/**
 * Onboarding Constants
 * Shared types, phase configuration, and slide styles for the onboarding flow.
 */

import { StyleSheet, Dimensions } from 'react-native';

import { colors, spacing, radius, sizing } from '@/constants/theme';

export const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type SlideType =
  | 'welcome'
  | 'features'
  | 'signup'
  | 'dob'
  | 'gender'
  | 'experience'
  | 'goal'
  | 'equipment'
  | 'trainingDays'
  | 'height'
  | 'weight'
  | 'premium';

export const SLIDES: SlideType[] = [
  'welcome',
  'features',
  'signup',
  'dob',
  'gender',
  'experience',
  'goal',
  'equipment',
  'trainingDays',
  'height',
  'weight',
  'premium',
];

/** Slides that show the phase-based progress indicator */
export const PROFILE_SLIDES: SlideType[] = [
  'dob', 'gender', 'experience', 'goal', 'equipment', 'trainingDays', 'height', 'weight',
];

export interface PhaseConfig {
  label: string;
  slides: SlideType[];
}

export const PHASES: PhaseConfig[] = [
  { label: 'About You', slides: ['dob', 'gender'] },
  { label: 'Your Training', slides: ['experience', 'goal', 'equipment', 'trainingDays'] },
  { label: 'Body Stats', slides: ['height', 'weight'] },
];

/** Light-mode color reference (onboarding is always light) */
export const lt = colors;

export const slideStyles = StyleSheet.create({
  slide: {
    flex: 1,
    width: SCREEN_WIDTH,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  slideTitle: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  slideSubtitle: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  mainButton: {
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfButton: {
    flex: 1,
  },
  optionsGrid: {
    width: '100%',
    gap: spacing.sm,
  },
  optionCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  inputGroup: {
    flex: 1,
  },
  textInput: {
    height: sizing.inputHeight,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  skipHint: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
