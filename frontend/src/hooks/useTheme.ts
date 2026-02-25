/**
 * useTheme hook
 * Provides theme-aware colors based on user preference, system color scheme,
 * and the user's selected accent color.
 * Returns the appropriate color palette (light or dark) with accent colors merged in.
 */

import { useMemo } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, darkColors } from '@/constants/theme';
import { getAccentPalette } from '@/constants/accentColors';

export type ColorScheme = 'light' | 'dark';

interface ThemeResult {
  /** The resolved color scheme ('light' or 'dark') */
  colorScheme: ColorScheme;
  /** Whether dark mode is active */
  isDarkMode: boolean;
  /** The active color palette with accent colors applied */
  theme: typeof colors;
}

/**
 * Hook to get the current theme based on user preference and system settings.
 * Merges the selected accent color palette into the theme's accent section,
 * preserving semantic colors (red, success, warning, info).
 */
export function useTheme(): ThemeResult {
  const themePreference = useSettingsStore((state) => state.themePreference);
  const accentColor = useSettingsStore((state) => state.accentColor);
  const systemColorScheme = useRNColorScheme();

  const result = useMemo(() => {
    let resolvedScheme: ColorScheme;

    if (themePreference === 'system') {
      resolvedScheme = systemColorScheme === 'dark' ? 'dark' : 'light';
    } else {
      resolvedScheme = themePreference;
    }

    const isDarkMode = resolvedScheme === 'dark';
    const baseTheme = isDarkMode ? darkColors : colors;
    const accentPalette = getAccentPalette(accentColor, isDarkMode);

    // Merge accent palette into the theme, preserving semantic colors
    const theme: typeof colors = {
      ...baseTheme,
      accent: {
        ...baseTheme.accent,
        orange: accentPalette.orange,
        orangeLight: accentPalette.orangeLight,
        orangeMuted: accentPalette.orangeMuted,
        orangeSolid: accentPalette.orangeSolid,
        primary: accentPalette.primary,
        gradientStart: accentPalette.gradientStart,
        gradientEnd: accentPalette.gradientEnd,
      },
    };

    return {
      colorScheme: resolvedScheme,
      isDarkMode,
      theme,
    };
  }, [themePreference, accentColor, systemColorScheme]);

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
