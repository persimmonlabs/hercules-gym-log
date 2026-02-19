/**
 * GpsActivityTracker
 * GPS-based activity tracker for outdoor cardio exercises.
 * Shows Start button initially, then live timer/distance with Pause/Stop controls.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Text } from '@/components/atoms/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useGpsTrackingLegacy as useGpsTracking } from '@/hooks/useGpsTrackingLegacy';
import { springBouncy } from '@/constants/animations';
import { useSettingsStore } from '@/store/settingsStore';

interface GpsActivityTrackerProps {
  onComplete: (durationSeconds: number, distanceMiles: number) => void;
  distanceUnit?: 'miles' | 'meters' | 'floors';
  setNumber?: number;
}

const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatPace = (paceMinutesPerMile: number, distanceUnit: 'mi' | 'km'): string => {
  if (paceMinutesPerMile === 0 || !isFinite(paceMinutesPerMile)) {
    return '--:--';
  }

  const pacePerUnit = distanceUnit === 'km' ? paceMinutesPerMile * 1.60934 : paceMinutesPerMile;
  const mins = Math.floor(pacePerUnit);
  const secs = Math.floor((pacePerUnit - mins) * 60);

  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface ActionButtonProps {
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  variant: 'start' | 'pause' | 'resume' | 'stop' | 'done';
}

const ActionButton: React.FC<ActionButtonProps> = ({ iconName, label, onPress, variant }) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, springBouncy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, springBouncy);
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [onPress]);

  const getButtonStyle = () => {
    switch (variant) {
      case 'start':
        return { 
          backgroundColor: theme.accent.orange,
          borderWidth: 0,
        };
      case 'pause':
        return { 
          backgroundColor: '#FFFFFF',
          borderWidth: 2,
          borderColor: theme.accent.orange,
        };
      case 'resume':
        return { 
          backgroundColor: theme.accent.orange,
          borderWidth: 0,
        };
      case 'stop':
        return { 
          backgroundColor: '#FFFFFF',
          borderWidth: 2,
          borderColor: '#FF0000',
        };
      case 'done':
        return { 
          backgroundColor: theme.accent.orange,
          borderWidth: 0,
        };
      default:
        return { 
          backgroundColor: theme.accent.orange,
          borderWidth: 0,
        };
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'pause':
        return theme.accent.orange;
      case 'stop':
        return '#FF0000';
      case 'done':
        return '#FFFFFF';
      default:
        return '#FFFFFF';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'pause':
        return theme.accent.orange;
      case 'stop':
        return '#FF0000';
      case 'done':
        return '#FFFFFF';
      default:
        return '#FFFFFF';
    }
  };

  const isFullWidth = variant === 'start';

  return (
    <Animated.View
      style={[
        animatedStyle,
        styles.actionButton,
        getButtonStyle(),
        isFullWidth && styles.fullWidthButton,
      ]}
    >
      <Animated.View
        style={styles.actionButtonInner}
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
        onTouchCancel={handlePressOut}
      >
        <View style={styles.actionButtonContent} onTouchEnd={handlePress}>
          <MaterialCommunityIcons name={iconName} size={24} color={getIconColor()} />
          <Text style={[styles.actionButtonLabel, { color: getTextColor() }]}>{label}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export const GpsActivityTracker: React.FC<GpsActivityTrackerProps> = ({ onComplete, setNumber = 1 }) => {
  const { theme } = useTheme();
  // Subscribe to distanceUnit to trigger re-renders when units change
  useSettingsStore((state) => state.distanceUnit);
  const { convertDistance, getDistanceUnitShort } = useSettingsStore();
  const {
    state,
    elapsedSeconds,
    distanceMiles,
    currentPace,
    permissionDenied,
    start,
    pause,
    resume,
    stop,
    reset,
  } = useGpsTracking();

  // After stopping, briefly show a "Resume" option before finalizing
  const [justStopped, setJustStopped] = useState(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedDataRef = useRef<{ elapsed: number; distance: number }>({ elapsed: 0, distance: 0 });

  const handleStop = useCallback(() => {
    // Capture data before stopping
    stoppedDataRef.current = { elapsed: elapsedSeconds, distance: distanceMiles };
    stop();
    setJustStopped(true);
  }, [stop, elapsedSeconds, distanceMiles]);

  // Auto-finalize after 5 seconds if user doesn't resume
  useEffect(() => {
    if (justStopped) {
      resumeTimerRef.current = setTimeout(() => {
        const { elapsed, distance } = stoppedDataRef.current;
        onComplete(elapsed, distance);
        reset();
        setJustStopped(false);
      }, 5000);
    }
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [justStopped, onComplete, reset]);

  const handleResume = useCallback(() => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    setJustStopped(false);
    resume();
  }, [resume]);

  const handleConfirmStop = useCallback(() => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    const { elapsed, distance } = stoppedDataRef.current;
    onComplete(elapsed, distance);
    reset();
    setJustStopped(false);
  }, [onComplete, reset]);

  const displayDistance = convertDistance(distanceMiles);
  const unitLabel = getDistanceUnitShort();
  const distanceUnit = useSettingsStore((state) => state.distanceUnit);
  const displayPace = formatPace(currentPace, distanceUnit);
  const paceUnit = distanceUnit === 'km' ? '/km' : '/mi';

  if (permissionDenied) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface.elevated }]}>
        <View style={styles.permissionDenied}>
          <MaterialCommunityIcons
            name="map-marker-off"
            size={32}
            color={theme.accent.warning}
          />
          <Text variant="body" color="secondary" style={styles.permissionText}>
            Location permission required for GPS tracking
          </Text>
        </View>
      </View>
    );
  }

  if (state === 'idle') {
    return (
      <Pressable
        style={styles.startButton}
        onPress={start}
        accessibilityRole="button"
        accessibilityLabel="Start Activity"
      >
        <Text style={styles.startButtonText}>Start Activity</Text>
      </Pressable>
    );
  }

  // "Just stopped" state: show metrics with Resume / Done buttons
  if (justStopped && state === 'stopped') {
    const stoppedDistance = convertDistance(stoppedDataRef.current.distance);
    const stoppedElapsed = stoppedDataRef.current.elapsed;
    const stoppedPaceRaw = stoppedDataRef.current.distance > 0 && stoppedElapsed > 0
      ? (stoppedElapsed / 3600) / stoppedDataRef.current.distance * 60
      : 0;
    const stoppedPace = formatPace(stoppedPaceRaw, distanceUnit);

    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        style={[styles.container, { backgroundColor: theme.surface.elevated }]}
      >
        <View style={styles.setIndicator}>
          <Text style={[styles.setIndicatorText, { color: theme.accent.orange }]}>
            Set {setNumber}
          </Text>
          <View style={[styles.setIndicatorLine, { backgroundColor: theme.accent.orange }]} />
        </View>

        <View style={styles.liveStats}>
          <View style={styles.statRow}>
            <Text variant="label" color="tertiary" style={styles.statLabel}>Time</Text>
            <Text style={[styles.liveValue, { color: theme.text.primary }]}>
              {formatTime(stoppedElapsed)}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border.light }]} />
          <View style={styles.statRow}>
            <Text variant="label" color="tertiary" style={styles.statLabel}>Distance</Text>
            <Text style={[styles.liveValue, { color: theme.text.primary }]}>
              {stoppedDistance.toFixed(2)} {unitLabel}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border.light }]} />
          <View style={styles.statRow}>
            <Text variant="label" color="tertiary" style={styles.statLabel}>Avg Pace</Text>
            <Text style={[styles.liveValue, { color: theme.text.primary }]}>
              {stoppedPace} <Text variant="label" color="tertiary">{paceUnit}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          <ActionButton
            iconName="play"
            label="Resume"
            onPress={handleResume}
            variant="resume"
          />
          <ActionButton
            iconName="check"
            label="Done"
            onPress={handleConfirmStop}
            variant="done"
          />
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[styles.container, { backgroundColor: theme.surface.elevated }]}
    >
      <View style={styles.setIndicator}>
        <Text style={[styles.setIndicatorText, { color: theme.accent.orange }]}>
          Set {setNumber}
        </Text>
        <View style={[styles.setIndicatorLine, { backgroundColor: theme.accent.orange }]} />
      </View>

      <View style={styles.liveStats}>
        <View style={styles.statRow}>
          <Text variant="label" color="tertiary" style={styles.statLabel}>Time</Text>
          <Text style={[styles.liveValue, { color: theme.text.primary }]}>
            {formatTime(elapsedSeconds)}
          </Text>
        </View>
        
        <View style={[styles.statDivider, { backgroundColor: theme.border.light }]} />
        
        <View style={styles.statRow}>
          <Text variant="label" color="tertiary" style={styles.statLabel}>Distance</Text>
          <Text style={[styles.liveValue, { color: theme.text.primary }]}>
            {displayDistance.toFixed(2)} {unitLabel}
          </Text>
        </View>
        
        <View style={[styles.statDivider, { backgroundColor: theme.border.light }]} />
        
        <View style={styles.statRow}>
          <Text variant="label" color="tertiary" style={styles.statLabel}>Pace</Text>
          <Text style={[styles.liveValue, { color: theme.text.primary }]}>
            {displayPace} <Text variant="label" color="tertiary">{paceUnit}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        {state === 'running' ? (
          <ActionButton
            iconName="pause"
            label="Pause"
            onPress={pause}
            variant="pause"
          />
        ) : (
          <ActionButton
            iconName="play"
            label="Resume"
            onPress={resume}
            variant="resume"
          />
        )}
        <ActionButton
          iconName="stop"
          label="Stop"
          onPress={handleStop}
          variant="stop"
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionDenied: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    width: '100%',
  },
  permissionText: {
    textAlign: 'center',
  },
  liveStats: {
    flexDirection: 'column',
    marginBottom: spacing.lg,
    width: '100%',
    gap: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  statLabel: {
    minWidth: 80,
  },
  statDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  liveValue: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    justifyContent: 'center',
  },
  actionButton: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    maxWidth: 200,
  },
  fullWidthButton: {
    width: '100%',
    maxWidth: '100%',
  },
  actionButtonInner: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  setIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  setIndicatorText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  setIndicatorLine: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  startButton: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#FF6B35',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
});
