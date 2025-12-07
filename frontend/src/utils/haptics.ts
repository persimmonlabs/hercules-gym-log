import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const HAPTIC_THROTTLE_MS = 80;

export type HapticPattern = 'selection' | 'light' | 'medium' | 'heavy';

const impactMap: Record<Exclude<HapticPattern, 'selection'>, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

let lastTriggerTimestamp = 0;

const isSupportedPlatform = Platform.OS === 'ios' || Platform.OS === 'android';

const resolvePattern = (pattern: HapticPattern): HapticPattern => {
  if (Platform.OS === 'android' && pattern === 'light') {
    return 'selection';
  }

  return pattern;
};

export const triggerHaptic = (pattern: HapticPattern = 'selection'): void => {
  if (!isSupportedPlatform) {
    return;
  }

  const now = Date.now();
  if (now - lastTriggerTimestamp < HAPTIC_THROTTLE_MS) {
    return;
  }

  lastTriggerTimestamp = now;

  try {
    const resolvedPattern = resolvePattern(pattern);

    if (resolvedPattern === 'selection') {
      void Haptics.selectionAsync();
      return;
    }

    const impactStyle = impactMap[resolvedPattern];
    void Haptics.impactAsync(impactStyle);
  } catch {
    lastTriggerTimestamp = 0;
  }
};
