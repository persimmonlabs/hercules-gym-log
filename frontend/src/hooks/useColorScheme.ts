/**
 * useColorScheme hook
 * Returns the resolved color scheme based on user preference and system settings.
 * Uses the settings store for theme preference.
 */

import { useColorScheme as useRNColorScheme, type ColorSchemeName } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';

export function useColorScheme(): NonNullable<ColorSchemeName> {
  const themePreference = useSettingsStore((state) => state.themePreference);
  const systemColorScheme = useRNColorScheme();

  // Resolve the color scheme based on preference
  if (themePreference === 'system') {
    return systemColorScheme ?? 'light';
  }

  return themePreference;
}
