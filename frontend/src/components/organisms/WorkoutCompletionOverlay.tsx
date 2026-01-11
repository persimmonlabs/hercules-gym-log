import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { triggerHaptic } from '@/utils/haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { springBouncy, timingMedium } from '@/constants/animations';
import { colors, radius, shadows, sizing, spacing } from '@/constants/theme';

interface WorkoutCompletionOverlayProps {
  onDismiss: () => void;
  autoDismissDurationMs?: number | null;
}

const DEFAULT_AUTO_DISMISS_MS = 1700;

export const WorkoutCompletionOverlay: React.FC<WorkoutCompletionOverlayProps> = ({
  onDismiss,
  autoDismissDurationMs = DEFAULT_AUTO_DISMISS_MS,
}) => {
  const scale = useSharedValue(0.7);
  const cardOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    overlayOpacity.value = withTiming(1, timingMedium);
    cardOpacity.value = withTiming(1, timingMedium);
    scale.value = withSpring(1, springBouncy);
    triggerHaptic('success');

    let timeoutId: NodeJS.Timeout | null = null;

    if (autoDismissDurationMs != null) {
      timeoutId = setTimeout(() => {
        onDismiss();
      }, autoDismissDurationMs);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [autoDismissDurationMs, cardOpacity, onDismiss, overlayOpacity, scale]);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={handleDismiss} accessibilityRole="button" />
      <Animated.View style={[styles.card, cardStyle]}>
        <View style={styles.iconWrapper}>
          <MaterialCommunityIcons name="check" size={sizing.iconLG} color={colors.text.onAccent} />
        </View>
        <View style={styles.textGroup}>
          <Text variant="heading2" color="primary">
            Workout Complete
          </Text>
          <Text variant="body" color="secondary">
            Nice work! Tracking saved.
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.scrim,
  },
  card: {
    width: '80%',
    maxWidth: 360,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: shadows.md.shadowColor,
    shadowOffset: shadows.md.shadowOffset,
    shadowOpacity: shadows.md.shadowOpacity,
    shadowRadius: shadows.md.shadowRadius,
    elevation: shadows.md.elevation,
  },
  iconWrapper: {
    width: sizing.iconXL,
    height: sizing.iconXL,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    gap: spacing.xs,
    alignItems: 'center',
  },
});
