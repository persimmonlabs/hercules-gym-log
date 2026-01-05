import React, { memo, useCallback, useRef } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, sizing, spacing } from '@/constants/theme';

interface InstantButtonProps {
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const InstantButtonInner: React.FC<InstantButtonProps> = ({
  iconName,
  onPress,
  accessibilityLabel,
  disabled = false,
  style,
}): React.ReactElement => {
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const isPressedRef = useRef(false);
  const lastPressTimeRef = useRef(0);

  const handlePress = useCallback(() => {
    if (disabled) return;
    
    const now = Date.now();
    // Prevent duplicate presses within 16ms (60fps) but allow rapid tapping
    if (isPressedRef.current && now - lastPressTimeRef.current < 16) {
      return;
    }
    
    isPressedRef.current = true;
    lastPressTimeRef.current = now;
    
    // Instant callback - absolutely no delays
    onPressRef.current();
    
    // Reset press state immediately
    setTimeout(() => {
      isPressedRef.current = false;
    }, 16);
  }, [disabled]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={spacing.xs}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessible
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        style,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <MaterialCommunityIcons
        name={iconName}
        size={sizing.iconMD}
        color={colors.text.primary}
      />
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
  buttonPressed: {
    backgroundColor: colors.accent.orangeLight,
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export const InstantButton = memo(
  InstantButtonInner,
  (prevProps, nextProps) => {
    return (
      prevProps.iconName === nextProps.iconName &&
      prevProps.accessibilityLabel === nextProps.accessibilityLabel &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.style === nextProps.style
    );
  }
);
