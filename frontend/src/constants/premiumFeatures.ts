/**
 * Premium Features
 * Single source of truth for the Free vs Premium feature comparison table.
 * Each entry maps to an actual feature gate in the app.
 */

interface PremiumFeature {
  label: string;
  free: boolean;
  premium: boolean;
  isNew?: boolean;
}

export const PREMIUM_FEATURES: PremiumFeature[] = [
  // Free features (available to all users)
  { label: 'Track your workouts', free: true, premium: true },
  { label: 'Create and save workout routines', free: true, premium: true },
  { label: 'Smart set suggestions', free: true, premium: true },

  // Premium-only features
  { label: 'Unlimited workouts and plans', free: false, premium: true },
  { label: 'Advanced analytics & charts', free: false, premium: true },
  { label: 'Deep dive volume & distribution', free: false, premium: true },
  { label: 'Balance score & training insights', free: false, premium: true },
  { label: 'Hercules AI assistant', free: false, premium: true },
  { label: 'Premium workout & plan library', free: false, premium: true },
  { label: 'All future premium updates', free: false, premium: true },
];
