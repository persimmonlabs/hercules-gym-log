/**
 * useTheme hook
 * Provides theme-aware colors based on user preference and system color scheme.
 * Returns the appropriate color palette (light or dark) and the active color scheme.
 */

import { useMemo } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, darkColors } from '@/constants/theme';

export type ColorScheme = 'light' | 'dark';

interface ThemeResult {
  /** The resolved color scheme ('light' or 'dark') */
  colorScheme: ColorScheme;
  /** Whether dark mode is active */
  isDarkMode: boolean;
  /** The active color palette */
  theme: typeof colors;
}

/**
 * Hook to get the current theme based on user preference and system settings.
 * - 'light': Always uses light colors
 * - 'dark': Always uses dark colors
 * - 'system': Follows the device's color scheme
 */
export function useTheme(): ThemeResult {
  const themePreference = useSettingsStore((state) => state.themePreference);
  const systemColorScheme = useRNColorScheme();

  const result = useMemo(() => {
    let resolvedScheme: ColorScheme;

    if (themePreference === 'system') {
      resolvedScheme = systemColorScheme === 'dark' ? 'dark' : 'light';
    } else {
      resolvedScheme = themePreference;
    }

    const isDarkMode = resolvedScheme === 'dark';
    const theme = isDarkMode ? darkColors : colors;

    return {
      colorScheme: resolvedScheme,
      isDarkMode,
      theme,
    };
  }, [themePreference, systemColorScheme]);

  return result;
}

/**
 * Hook to get just the resolved color scheme.
 * Useful for components that only need to know light/dark, not the full palette.
 */
export function useResolvedColorScheme(): ColorScheme {
  const { colorScheme } = useTheme();
  return colorScheme;
}
