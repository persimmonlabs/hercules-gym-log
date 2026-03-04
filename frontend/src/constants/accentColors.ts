/**
 * Accent Color Palettes
 * Defines all available accent color options for theme customization.
 * Each palette provides light and dark mode variants.
 *
 * The field names (orange, orangeLight, etc.) are kept for backward
 * compatibility — they represent accent roles, not literal colors.
 */

// =============================================================================
// TYPES
// =============================================================================

export type AccentColorKey =
  | 'orange'
  | 'blue'
  | 'red'
  | 'darkRed'
  | 'pink'
  | 'green'
  | 'brown'
  | 'yellow'
  | 'purple';

/** The accent-specific subset of theme colors that changes with user selection */
export interface AccentPalette {
  orange: string;
  orangeLight: string;
  orangeMuted: string;
  orangeSolid: string;
  primary: string;
  gradientStart: string;
  gradientEnd: string;
}

export interface AccentColorOption {
  key: AccentColorKey;
  label: string;
  preview: string;
  light: AccentPalette;
  dark: AccentPalette;
}

// =============================================================================
// PALETTE DEFINITIONS
// =============================================================================

export const ACCENT_COLOR_OPTIONS: AccentColorOption[] = [
  {
    key: 'orange',
    label: 'Orange',
    preview: '#FF6B4A',
    light: {
      orange: '#FF6B4A',
      orangeLight: '#FFB88C',
      orangeMuted: 'rgba(255, 107, 74, 0.20)',
      orangeSolid: '#FF9070',
      primary: '#FF6B4A',
      gradientStart: '#FF6B4A',
      gradientEnd: '#FF6B4A',
    },
    dark: {
      orange: '#CC5533',
      orangeLight: '#B3724D',
      orangeMuted: 'rgba(204, 85, 51, 0.25)',
      orangeSolid: '#B36048',
      primary: '#CC5533',
      gradientStart: '#CC5533',
      gradientEnd: '#CC5533',
    },
  },
  {
    key: 'red',
    label: 'Red',
    preview: '#E53E3E',
    light: {
      orange: '#E53E3E',
      orangeLight: '#FC8181',
      orangeMuted: 'rgba(229, 62, 62, 0.20)',
      orangeSolid: '#F06060',
      primary: '#E53E3E',
      gradientStart: '#E53E3E',
      gradientEnd: '#E53E3E',
    },
    dark: {
      orange: '#B83030',
      orangeLight: '#D45A5A',
      orangeMuted: 'rgba(184, 48, 48, 0.25)',
      orangeSolid: '#C44040',
      primary: '#B83030',
      gradientStart: '#B83030',
      gradientEnd: '#B83030',
    },
  },
  {
    key: 'darkRed',
    label: 'Dark Red',
    preview: '#9B2C2C',
    light: {
      orange: '#9B2C2C',
      orangeLight: '#C05050',
      orangeMuted: 'rgba(155, 44, 44, 0.20)',
      orangeSolid: '#A83E3E',
      primary: '#9B2C2C',
      gradientStart: '#9B2C2C',
      gradientEnd: '#9B2C2C',
    },
    dark: {
      orange: '#7A2222',
      orangeLight: '#9A3F3F',
      orangeMuted: 'rgba(122, 34, 34, 0.25)',
      orangeSolid: '#8A3030',
      primary: '#7A2222',
      gradientStart: '#7A2222',
      gradientEnd: '#7A2222',
    },
  },
  {
    key: 'yellow',
    label: 'Gold',
    preview: '#D97706',
    light: {
      orange: '#D97706',
      orangeLight: '#F59E0B',
      orangeMuted: 'rgba(217, 119, 6, 0.20)',
      orangeSolid: '#B45309',
      primary: '#D97706',
      gradientStart: '#D97706',
      gradientEnd: '#D97706',
    },
    dark: {
      orange: '#B45309',
      orangeLight: '#D97706',
      orangeMuted: 'rgba(180, 83, 9, 0.25)',
      orangeSolid: '#92400E',
      primary: '#B45309',
      gradientStart: '#B45309',
      gradientEnd: '#B45309',
    },
  },
  {
    key: 'green',
    label: 'Green',
    preview: '#228B22',
    light: {
      orange: '#228B22',
      orangeLight: '#32CD32',
      orangeMuted: 'rgba(34, 139, 34, 0.20)',
      orangeSolid: '#2E7D2E',
      primary: '#228B22',
      gradientStart: '#228B22',
      gradientEnd: '#228B22',
    },
    dark: {
      orange: '#2E7D2E',
      orangeLight: '#228B22',
      orangeMuted: 'rgba(46, 125, 46, 0.25)',
      orangeSolid: '#1F5F1F',
      primary: '#2E7D2E',
      gradientStart: '#2E7D2E',
      gradientEnd: '#2E7D2E',
    },
  },
  {
    key: 'blue',
    label: 'Blue',
    preview: '#1E90FF',
    light: {
      orange: '#1E90FF',
      orangeLight: '#4FA8FF',
      orangeMuted: 'rgba(30, 144, 255, 0.20)',
      orangeSolid: '#0080FF',
      primary: '#1E90FF',
      gradientStart: '#1E90FF',
      gradientEnd: '#1E90FF',
    },
    dark: {
      orange: '#0080FF',
      orangeLight: '#1E90FF',
      orangeMuted: 'rgba(0, 128, 255, 0.25)',
      orangeSolid: '#0066CC',
      primary: '#0080FF',
      gradientStart: '#0080FF',
      gradientEnd: '#0080FF',
    },
  },
  {
    key: 'brown',
    label: 'Brown',
    preview: '#92400E',
    light: {
      orange: '#92400E',
      orangeLight: '#B45309',
      orangeMuted: 'rgba(146, 64, 14, 0.20)',
      orangeSolid: '#78350F',
      primary: '#92400E',
      gradientStart: '#92400E',
      gradientEnd: '#92400E',
    },
    dark: {
      orange: '#78350F',
      orangeLight: '#92400E',
      orangeMuted: 'rgba(120, 53, 15, 0.25)',
      orangeSolid: '#451A03',
      primary: '#78350F',
      gradientStart: '#78350F',
      gradientEnd: '#78350F',
    },
  },
  {
    key: 'pink',
    label: 'Pink',
    preview: '#D484B8',
    light: {
      orange: '#D484B8',
      orangeLight: '#E0A4CC',
      orangeMuted: 'rgba(212, 132, 184, 0.20)',
      orangeSolid: '#C874A8',
      primary: '#D484B8',
      gradientStart: '#D484B8',
      gradientEnd: '#D484B8',
    },
    dark: {
      orange: '#B8689C',
      orangeLight: '#C878AC',
      orangeMuted: 'rgba(184, 104, 156, 0.25)',
      orangeSolid: '#A8588C',
      primary: '#B8689C',
      gradientStart: '#B8689C',
      gradientEnd: '#B8689C',
    },
  },
  {
    key: 'purple',
    label: 'Purple',
    preview: '#A78BFA',
    light: {
      orange: '#A78BFA',
      orangeLight: '#C4B5FD',
      orangeMuted: 'rgba(167, 139, 250, 0.20)',
      orangeSolid: '#8B5CF6',
      primary: '#A78BFA',
      gradientStart: '#A78BFA',
      gradientEnd: '#A78BFA',
    },
    dark: {
      orange: '#8B5CF6',
      orangeLight: '#A78BFA',
      orangeMuted: 'rgba(139, 92, 246, 0.25)',
      orangeSolid: '#7C3AED',
      primary: '#8B5CF6',
      gradientStart: '#8B5CF6',
      gradientEnd: '#8B5CF6',
    },
  },
];

/** Look up an accent option by key */
export function getAccentOption(key: AccentColorKey): AccentColorOption {
  return ACCENT_COLOR_OPTIONS.find((o) => o.key === key) ?? ACCENT_COLOR_OPTIONS[0];
}

/** Get the accent palette for a given key and mode */
export function getAccentPalette(
  key: AccentColorKey,
  isDarkMode: boolean
): AccentPalette {
  const option = getAccentOption(key);
  return isDarkMode ? option.dark : option.light;
}
