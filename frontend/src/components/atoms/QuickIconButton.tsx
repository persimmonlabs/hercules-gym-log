import React, { memo, useCallback, useRef } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, radius, sizing, spacing } from '@/constants/theme';

interface QuickIconButtonProps {
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const QuickIconButtonInner: React.FC<QuickIconButtonProps> = ({
  iconName,
  onPress,
  accessibilityLabel,
  disabled = false,
  style,
}): React.ReactElement => {
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    // Instant visual feedback - minimal duration
    scale.value = withTiming(0.9, { duration: 30 });
    // Instant callback - no delays
    onPressRef.current();
  }, [disabled, scale]);

  const handlePressOut = useCallback(() => {
    // Quick recovery
    scale.value = withTiming(1, { duration: 50 });
  }, [scale]);

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

export const QuickIconButton = memo(
  QuickIconButtonInner,
  (prevProps, nextProps) => {
    return (
      prevProps.iconName === nextProps.iconName &&
      prevProps.accessibilityLabel === nextProps.accessibilityLabel &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.style === nextProps.style
    );
  }
);
