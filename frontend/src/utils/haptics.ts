import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@/store/settingsStore';

const HAPTIC_THROTTLE_MS = 80;

export type HapticPattern = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const impactMap: Record<Exclude<HapticPattern, 'selection' | 'success' | 'warning' | 'error'>, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

const notificationMap: Record<Extract<HapticPattern, 'success' | 'warning' | 'error'>, Haptics.NotificationFeedbackType> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
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

  // Check global setting
  const hapticsEnabled = useSettingsStore.getState().hapticsEnabled;
  if (!hapticsEnabled) {
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

    if (['success', 'warning', 'error'].includes(resolvedPattern)) {
      const notificationType = notificationMap[resolvedPattern as keyof typeof notificationMap];
      void Haptics.notificationAsync(notificationType);
      return;
    }

    // Default to impact
    const impactStyle = impactMap[resolvedPattern as keyof typeof impactMap];
    if (impactStyle) {
      void Haptics.impactAsync(impactStyle);
    }
  } catch (error) {
    // If haptics fail, we don't want to crash the app, but we reset timestamp
    // just in case it was a temporary glitch
    lastTriggerTimestamp = 0;
  }
};
