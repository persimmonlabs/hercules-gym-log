/**
 * InputField
 * Atom for thematically-styled text input with label, helper, and focus animation.
 */
import React, { useCallback, useState, type MutableRefObject, type RefObject } from 'react';
import { StyleSheet, TextInput, View, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/atoms/Text';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { timingFast } from '@/constants/animations';
import { useTheme } from '@/hooks/useTheme';

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  returnKeyType?: 'done' | 'next' | 'search';
  blurOnSubmit?: boolean;
  onSubmitEditing?: () => void;
  testID?: string;
  inputRef?: RefObject<TextInput | null> | MutableRefObject<TextInput | null>;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  helperText,
  onFocus,
  onBlur,
  autoFocus = false,
  returnKeyType = 'done',
  blurOnSubmit = true,
  onSubmitEditing,
  testID,
  inputRef,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  editable = true,
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const focusProgress = useSharedValue(0);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: focusProgress.value > 0 ? theme.accent.primary : theme.accent.orange,
  }));

  const handleFocus = useCallback(() => {
    focusProgress.value = withTiming(1, timingFast);
    setIsFocused(true);
    onFocus?.();
  }, [focusProgress, onFocus]);

  const handleBlur = useCallback(() => {
    focusProgress.value = withTiming(0, timingFast);
    setIsFocused(false);
    onBlur?.();
  }, [focusProgress, onBlur]);

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.labelRow}>
        <Text
          variant="bodySemibold"
          style={[styles.labelText, { color: isFocused ? theme.accent.primary : theme.text.secondary }]}
        >
          {label}
        </Text>
        {helperText ? (
          <Text variant="caption" color="secondary">
            {helperText}
          </Text>
        ) : null}
      </View>

      <Animated.View style={[styles.inputContainer, { backgroundColor: theme.surface.card, borderColor: focusProgress.value > 0 ? theme.accent.primary : theme.border.light }, animatedBorderStyle]}>
        <TextInput
          ref={inputRef as unknown as React.Ref<TextInput> | undefined}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.text.muted}
          selectionColor={theme.accent.primary}
          cursorColor={theme.accent.primary}
          style={[styles.textInput, { color: theme.text.primary }]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoFocus={autoFocus}
          returnKeyType={returnKeyType}
          blurOnSubmit={blurOnSubmit}
          onSubmitEditing={onSubmitEditing}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
        />
      </Animated.View>
    </View>
  );
};

interface Styles {
  container: ViewStyle;
  labelRow: ViewStyle;
  inputContainer: ViewStyle;
  labelText: TextStyle;
  labelTextFocused: TextStyle;
  textInput: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    width: '100%',
    gap: spacing.formField,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  labelText: {
    // Color is now applied dynamically via theme
  },
  labelTextFocused: {
    // Color is now applied dynamically via theme
  },
  textInput: {
    ...typography.body,
    fontWeight: typography.body.fontWeight as TextStyle['fontWeight'],
    // Color is now applied dynamically via theme
  },
});
