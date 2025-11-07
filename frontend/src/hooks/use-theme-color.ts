/**
 * useThemeColor Hook
 * Returns themed colors from the Hercules design system
 */

import { colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName?: keyof typeof colors.accent
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  // Return a default color if no colorName specified
  if (!colorName) {
    return colors.accent.orange;
  }

  return colors.accent[colorName] || colors.accent.orange;
}