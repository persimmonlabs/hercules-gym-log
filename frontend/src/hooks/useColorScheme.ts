/**
 * useColorScheme hook
 * Wraps React Native's useColorScheme to provide color scheme detection.
 */

import { useColorScheme as useRNColorScheme, type ColorSchemeName } from 'react-native';

export function useColorScheme(): NonNullable<ColorSchemeName> {
  const colorScheme = useRNColorScheme();
  // Default to 'light' if color scheme is null/undefined
  return colorScheme ?? 'light';
}
