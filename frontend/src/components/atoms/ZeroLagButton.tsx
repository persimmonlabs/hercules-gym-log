import React, { memo, useCallback, useRef } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, sizing, spacing } from '@/constants/theme';

interface ZeroLagButtonProps {
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const ZeroLagButtonInner: React.FC<ZeroLagButtonProps> = ({
  iconName,
  onPress,
  accessibilityLabel,
  disabled = false,
  style,
}): React.ReactElement => {
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const handlePress = useCallback(() => {
    if (disabled) return;
    
    // Absolutely nothing between press and callback
    onPressRef.current();
  }, [disabled]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={spacing.xs}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessible
      // COMPLETELY disable all Pressable visual feedback
      style={({ pressed }) => [
        styles.button, 
        disabled && styles.buttonDisabled, 
        style,
        // Force no visual changes even when pressed
        pressed && styles.noVisualChange
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

// Minimal styling with explicit no-change override
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
  // Explicitly override any Pressable visual changes
  noVisualChange: {
    opacity: 1,
    backgroundColor: colors.surface.card,
    transform: [{ scale: 1 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export const ZeroLagButton = memo(
  ZeroLagButtonInner,
  (prevProps, nextProps) => {
    return (
      prevProps.iconName === nextProps.iconName &&
      prevProps.accessibilityLabel === nextProps.accessibilityLabel &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.style === nextProps.style
    );
  }
);
