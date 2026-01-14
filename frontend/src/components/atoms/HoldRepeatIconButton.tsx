import React, { memo, useCallback, useRef } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { triggerHaptic } from '@/utils/haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, radius, sizing, spacing } from '@/constants/theme';

interface HoldRepeatIconButtonProps {
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onStep: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** If true, triggers onStep on release instead of press (useful to avoid accidental triggers during swipes) */
  triggerOnRelease?: boolean;
}

const HoldRepeatIconButtonInner: React.FC<HoldRepeatIconButtonProps> = ({
  iconName,
  onStep,
  accessibilityLabel,
  disabled = false,
  style,
  triggerOnRelease = false,
}): React.ReactElement => {
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;

  const scale = useSharedValue(1);
  const wasPressed = useRef(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    // Instant visual feedback
    scale.value = withTiming(0.85, { duration: 40 });
    wasPressed.current = true;

    if (!triggerOnRelease) {
      // Instant haptic feedback - fire synchronously
      triggerHaptic('light');
      // Instant callback
      onStepRef.current();
    }
  }, [disabled, scale, triggerOnRelease]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 80 });

    if (triggerOnRelease && wasPressed.current && !disabled) {
      // Trigger on release for reps buttons to avoid accidental triggers during swipes
      triggerHaptic('light');
      onStepRef.current();
    }
    wasPressed.current = false;
  }, [scale, triggerOnRelease, disabled]);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={spacing.xs}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessible
    >
      <Animated.View style={[styles.button, disabled && styles.buttonDisabled, style, animatedStyle]}>
        <MaterialCommunityIcons
          name={iconName}
          size={sizing.iconMD}
          color={colors.text.primary}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: sizing.iconLG,
    height: sizing.iconLG,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.accent.orange,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export const HoldRepeatIconButton = memo(
  HoldRepeatIconButtonInner,
  (prevProps, nextProps) => {
    return (
      prevProps.iconName === nextProps.iconName &&
      prevProps.accessibilityLabel === nextProps.accessibilityLabel &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.style === nextProps.style
    );
  }
);
