/**
 * Theme Constants for Hercules
 * Central source of truth for all colors, spacing, typography, and sizing
 * 
 * Never hardcode values—always import from here.
 * This ensures consistency across the entire app.
 */

// ============================================================================
// COLORS
// ============================================================================

export const colors = {
  // Primary background (warm neutral base)
  primary: {
    bg: '#FFFFFF',        // Crisp white (main background)
    light: '#FFF9F3',     // Soft highlight tone
    dark: '#F4E8DA',      // Slightly richer cream for depth
  },

  // Surface colors for cards and elevated elements
  surface: {
    card: '#FFFFFF',                       // Primary card surface
    elevated: '#FFF7EF',                   // Slightly tinted elevation
    subtle: '#FFF3EC',                     // Soft tinted panels
    tint: 'rgba(255, 107, 74, 0.08)',      // Coral wash for accents
  },

  // Neutral utility colors
  neutral: {
    charcoal: '#2D3748',
    gray200: '#E2E8F0',
    gray400: '#CBD5E0',
    gray600: '#4A5568',
    espresso: '#2B1A12',
  },

  // Vibrant accent system (used sparingly)
  accent: {
    orange: '#FF6B4A',    // Primary orange energy
    red: '#FF4581',       // Pink-red complement
    orangeLight: '#FFB88C', // Lighter orange (hover, subtle)
    success: '#2A9D8F',   // Teal (completed, achievements)
    warning: '#E76F51',   // Burnt orange (caution)
    info: '#457B9D',      // Muted blue (information)
    primary: '#FF6B4A',   // Primary CTA accent
    gradientStart: '#FF6B4A', // Solid orange gradient start
    gradientEnd: '#FF6B4A',   // Solid orange gradient end
  },

  // Glassmorphism effect colors (on cream background)
  glass: {
    light: 'rgba(255, 255, 255, 0.6)',      // Frosted glass (visible on cream)
    lighter: 'rgba(255, 255, 255, 0.4)',    // More transparent
    lightest: 'rgba(255, 255, 255, 0.2)',   // Very subtle
    dark: 'rgba(0, 0, 0, 0.08)',            // Soft dark overlay
  },

  // Text hierarchy (dark on light background)
  text: {
    primary: '#2D2D2D',   // Dark gray (main text, headings)
    secondary: '#5A5A5A', // Medium gray (secondary info)
    tertiary: '#8B8B8B',  // Light gray (captions, hints)
    muted: '#C7C7C7',     // Muted gray for inactive states
    onAccent: '#FFFFFF',  // High-contrast text on accent backgrounds
  },

  // Borders and dividers
  border: {
    light: 'rgba(255, 107, 74, 0.12)',     // Soft coral border
    medium: 'rgba(255, 69, 129, 0.18)',    // Medium pink-orange border
    dark: 'rgba(0, 0, 0, 0.12)',           // Neutral divider
  },

  // Scrims and overlays
  overlay: {
    scrim: 'rgba(45, 45, 45, 0.45)',
    navigation: '#000000',
    scrimTransparent: 'rgba(45, 45, 45, 0)',
  },
};

// ============================================================================
// GRADIENTS (Dynamic accent treatments)
// ============================================================================

export const gradients = {
  accentBreathing: {
    start: ['#FF6B4A', '#FF6B4A'] as const,
    mid: ['#FF6B4A', '#FF6B4A'] as const,
    end: ['#FF6B4A', '#FF6B4A'] as const,
  },
};

// ============================================================================
// SPACING (Tailwind-inspired 4px base)
// ============================================================================

export const spacing = {
  xxxs: 1,      // 1px (ultra-tight adjustments)
  xxs: 2,       // 2px (micro adjustments)
  xs: 4,       // 4px (tight spacing)
  sm: 8,       // 8px (small gaps)
  md: 16,      // 16px (default/standard)
  mdCompact: 12, // 12px (compact vertical padding)
  formField: 8, // 8px spacing between label/input
  lg: 24,      // 24px (large sections)
  xl: 32,      // 32px (major sections)
  '2xl': 48,   // 48px (very large spacing)
};

// ============================================================================
// BORDER RADIUS (smooth, modern curves)
// ============================================================================

export const radius = {
  sm: 8,      // 8px (subtle rounding)
  md: 16,     // 16px (standard cards)
  mdCompact: 12, // 12px (compact cards)
  lg: 24,     // 24px (large containers, modals)
  xl: 32,     // 32px (very rounded)
  full: 9999, // Full circle
};

// ============================================================================
// TYPOGRAPHY (Font sizes and weights)
// ============================================================================

export const typography = {
  heading1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  display1: {
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 48,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  label: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  labelMedium: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  captionMedium: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodySemibold: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  captionSmall: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
  },
} as const;

// ============================================================================
// SIZING (Common dimensions)
// ============================================================================

export const sizing = {
  // Icon sizes
  iconXS: 16,
  iconSM: 20,
  iconMD: 24,
  iconLG: 32,
  iconXL: 48,

  // Avatar and profile
  avatar: 80,

  // Calendar bubbles
  weekBubble: 40,
  exerciseBadge: 40,

  // Component heights
  buttonSM: 36,
  buttonMD: 44,
  buttonLG: 52,
  buttonXL: 56,

  // Input heights
  inputHeight: 48,

  // Tab bar height
  tabBarHeight: 64,

  // Overlay dimensions
  overlayShadeHeight: 50,
};

// ============================================================================
// SHADOWS (Depth and elevation)
// ============================================================================

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardSoft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// ============================================================================
// OPACITY LEVELS (For visual hierarchy)
// ============================================================================

export const opacity = {
  disabled: 0.5,
  secondary: 0.7,
  tertiary: 0.5,
  hover: 0.8,
};

// ============================================================================
// Z-INDEX (Stacking order)
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  toast: 400,
  tooltip: 500,
};