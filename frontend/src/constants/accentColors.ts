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
  | 'neonGreen'
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
    key: 'blue',
    label: 'Blue',
    preview: '#4A90D9',
    light: {
      orange: '#4A90D9',
      orangeLight: '#8CB8F0',
      orangeMuted: 'rgba(74, 144, 217, 0.20)',
      orangeSolid: '#6AA3E0',
      primary: '#4A90D9',
      gradientStart: '#4A90D9',
      gradientEnd: '#4A90D9',
    },
    dark: {
      orange: '#3A72B0',
      orangeLight: '#5A8AC0',
      orangeMuted: 'rgba(58, 114, 176, 0.25)',
      orangeSolid: '#4A80B8',
      primary: '#3A72B0',
      gradientStart: '#3A72B0',
      gradientEnd: '#3A72B0',
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
    key: 'pink',
    label: 'Pink',
    preview: '#ED64A6',
    light: {
      orange: '#ED64A6',
      orangeLight: '#F8A4C8',
      orangeMuted: 'rgba(237, 100, 166, 0.20)',
      orangeSolid: '#F084B4',
      primary: '#ED64A6',
      gradientStart: '#ED64A6',
      gradientEnd: '#ED64A6',
    },
    dark: {
      orange: '#C44E88',
      orangeLight: '#D47AA0',
      orangeMuted: 'rgba(196, 78, 136, 0.25)',
      orangeSolid: '#CC6898',
      primary: '#C44E88',
      gradientStart: '#C44E88',
      gradientEnd: '#C44E88',
    },
  },
  {
    key: 'green',
    label: 'Green',
    preview: '#38A169',
    light: {
      orange: '#38A169',
      orangeLight: '#68D391',
      orangeMuted: 'rgba(56, 161, 105, 0.20)',
      orangeSolid: '#50B87A',
      primary: '#38A169',
      gradientStart: '#38A169',
      gradientEnd: '#38A169',
    },
    dark: {
      orange: '#2D8254',
      orangeLight: '#4CA87A',
      orangeMuted: 'rgba(45, 130, 84, 0.25)',
      orangeSolid: '#3C9565',
      primary: '#2D8254',
      gradientStart: '#2D8254',
      gradientEnd: '#2D8254',
    },
  },
  {
    key: 'neonGreen',
    label: 'Neon Green',
    preview: '#00E676',
    light: {
      orange: '#00C853',
      orangeLight: '#69F0AE',
      orangeMuted: 'rgba(0, 200, 83, 0.20)',
      orangeSolid: '#33D17A',
      primary: '#00C853',
      gradientStart: '#00C853',
      gradientEnd: '#00C853',
    },
    dark: {
      orange: '#00A040',
      orangeLight: '#40C878',
      orangeMuted: 'rgba(0, 160, 64, 0.25)',
      orangeSolid: '#28B060',
      primary: '#00A040',
      gradientStart: '#00A040',
      gradientEnd: '#00A040',
    },
  },
  {
    key: 'yellow',
    label: 'Yellow',
    preview: '#D69E2E',
    light: {
      orange: '#D69E2E',
      orangeLight: '#ECC94B',
      orangeMuted: 'rgba(214, 158, 46, 0.20)',
      orangeSolid: '#E0B030',
      primary: '#D69E2E',
      gradientStart: '#D69E2E',
      gradientEnd: '#D69E2E',
    },
    dark: {
      orange: '#B8862A',
      orangeLight: '#C8A840',
      orangeMuted: 'rgba(184, 134, 42, 0.25)',
      orangeSolid: '#C09528',
      primary: '#B8862A',
      gradientStart: '#B8862A',
      gradientEnd: '#B8862A',
    },
  },
  {
    key: 'purple',
    label: 'Purple',
    preview: '#805AD5',
    light: {
      orange: '#805AD5',
      orangeLight: '#B794F4',
      orangeMuted: 'rgba(128, 90, 213, 0.20)',
      orangeSolid: '#9B77E0',
      primary: '#805AD5',
      gradientStart: '#805AD5',
      gradientEnd: '#805AD5',
    },
    dark: {
      orange: '#6B48B8',
      orangeLight: '#9070D0',
      orangeMuted: 'rgba(107, 72, 184, 0.25)',
      orangeSolid: '#7C5CC4',
      primary: '#6B48B8',
      gradientStart: '#6B48B8',
      gradientEnd: '#6B48B8',
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
