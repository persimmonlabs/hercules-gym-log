/**
 * Color utility functions for dynamic accent color support.
 */

/**
 * Convert a hex color string to rgba with a given opacity.
 * Supports both 3-char (#RGB) and 6-char (#RRGGBB) hex values.
 */
export const hexToRgba = (hex: string, opacity: number): string => {
  let r = 0;
  let g = 0;
  let b = 0;

  const cleaned = hex.replace('#', '');

  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else if (cleaned.length === 6) {
    r = parseInt(cleaned.substring(0, 2), 16);
    g = parseInt(cleaned.substring(2, 4), 16);
    b = parseInt(cleaned.substring(4, 6), 16);
  }

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
