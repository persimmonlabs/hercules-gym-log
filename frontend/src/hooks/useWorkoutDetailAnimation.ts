/**
 * useWorkoutDetailAnimation
 * Handles entry/exit animations and back press feedback for the workout detail modal.
 */

import { useCallback } from 'react';
import type { ViewStyle } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type AnimatedStyle,
} from 'react-native-reanimated';

import { buttonPressAnimation, springTight } from '@/constants/animations';

interface UseWorkoutDetailAnimationParams {
  onDismiss: () => void;
}

interface UseWorkoutDetailAnimationResult {
  animatedBackStyle: AnimatedStyle<ViewStyle>;
  animatedContainerStyle: AnimatedStyle<ViewStyle>;
  handleBackPress: () => void;
}

export const useWorkoutDetailAnimation = ({ onDismiss }: UseWorkoutDetailAnimationParams): UseWorkoutDetailAnimationResult => {
  const backScale = useSharedValue(1);
  const backTranslateY = useSharedValue(0);
  const containerTranslateY = useSharedValue(0);

  const animatedBackStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: backTranslateY.value },
      { scale: backScale.value },
    ],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: containerTranslateY.value }],
  }));

  const animateOut = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const handleBackPress = useCallback(() => {
    triggerHaptic('selection');
    backScale.value = withSpring(0.92, springTight);

    setTimeout(() => {
      backScale.value = withSpring(1, springTight);
      animateOut();
    }, buttonPressAnimation.duration);
  }, [animateOut, backScale]);

  return {
    animatedBackStyle,
    animatedContainerStyle,
    handleBackPress,
  };
};
