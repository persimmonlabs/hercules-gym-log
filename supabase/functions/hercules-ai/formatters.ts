/**
 * Formatting utilities for Hercules AI responses
 * Converts raw values to human-readable formats
 */

/**
 * Format duration in seconds to human-readable string
 * e.g., 62249 seconds → "17 hours 17 minutes"
 */
export const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0 seconds';
  
  const totalSeconds = Math.round(seconds);
  
  if (totalSeconds < 60) {
    return `${totalSeconds} second${totalSeconds !== 1 ? 's' : ''}`;
  }
  
  if (totalSeconds < 3600) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (secs === 0) {
      return `${mins} minute${mins !== 1 ? 's' : ''}`;
    }
    return `${mins} minute${mins !== 1 ? 's' : ''} ${secs} second${secs !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  
  if (mins === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
};

/**
 * Format a number with thousands separators
 * e.g., 65790 → "65,790"
 */
export const formatNumber = (num: number): string => {
  if (!Number.isFinite(num)) return '0';
  return Math.round(num).toLocaleString('en-US');
};

/**
 * Format weight in pounds with thousands separator
 * e.g., 65790 → "65,790 lbs"
 */
export const formatWeight = (lbs: number): string => {
  return `${formatNumber(lbs)} lbs`;
};

/**
 * Format volume (weight × reps) with thousands separator
 * e.g., 125000 → "125,000 lbs"
 */
export const formatVolume = (volume: number): string => {
  return `${formatNumber(volume)} lbs`;
};

/**
 * Format a decimal number to a fixed precision with thousands separator
 * e.g., 1234.567 with precision 1 → "1,234.6"
 */
export const formatDecimal = (num: number, precision: number = 1): string => {
  if (!Number.isFinite(num)) return '0';
  const rounded = Number(num.toFixed(precision));
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
};

/**
 * Format a count with proper pluralization
 * e.g., formatCount(1, 'workout') → "1 workout"
 * e.g., formatCount(5, 'workout') → "5 workouts"
 */
export const formatCount = (count: number, singular: string, plural?: string): string => {
  const pluralForm = plural ?? `${singular}s`;
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`;
};
