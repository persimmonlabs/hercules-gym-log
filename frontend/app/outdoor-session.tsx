/**
 * OutdoorSessionScreen
 * Full-screen outdoor exercise tracker with map, metrics, and controls.
 * Shows GPS route polyline, real-time distance/pace/time.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { Text } from '@/components/atoms/Text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { OutdoorMetricsBar } from '@/components/molecules/OutdoorMetricsBar';
import { OutdoorControlBar } from '@/components/molecules/OutdoorControlBar';
import { useOutdoorSessionStore } from '@/store/outdoorSessionStore';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';
import { useTheme } from '@/hooks/useTheme';
import { outdoorTrackingService } from '@/services/outdoorTrackingService';
import { useSettingsStore } from '@/store/settingsStore';
import { triggerHaptic } from '@/utils/haptics';
import { colors, spacing, radius, sizing } from '@/constants/theme';
import type { Workout } from '@/types/workout';
import * as Location from 'expo-location';

const OutdoorSessionScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDarkMode } = useTheme();
  const { exercise } = useLocalSearchParams<{ exercise: string }>();

  const mapRef = useRef<MapView>(null);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const hascenteredRef = useRef<boolean>(false);

  // Store state
  const status = useOutdoorSessionStore((s) => s.status);
  const exerciseName = useOutdoorSessionStore((s) => s.exerciseName);
  const elapsedSeconds = useOutdoorSessionStore((s) => s.elapsedSeconds);
  const distanceMiles = useOutdoorSessionStore((s) => s.distanceMiles);
  const paceSecondsPerMile = useOutdoorSessionStore((s) => s.paceSecondsPerMile);
  const coordinates = useOutdoorSessionStore((s) => s.coordinates);

  const startSession = useOutdoorSessionStore((s) => s.startSession);
  const beginTracking = useOutdoorSessionStore((s) => s.beginTracking);
  const pauseSession = useOutdoorSessionStore((s) => s.pauseSession);
  const resumeSession = useOutdoorSessionStore((s) => s.resumeSession);
  const endSession = useOutdoorSessionStore((s) => s.endSession);
  const clearSession = useOutdoorSessionStore((s) => s.clearSession);

  const addWorkout = useWorkoutSessionsStore((s) => s.addWorkout);
  const convertDistanceToMiles = useSettingsStore((s) => s.convertDistanceToMiles);

  // Get current location immediately on mount so map centers before tracking starts
  useEffect(() => {
    const fetchInitialLocation = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          setPermissionStatus('granted');
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        } else {
          setPermissionStatus('denied');
        }
      } catch {
        // Permission not yet granted; will be requested when user taps Start
      }
    };
    void fetchInitialLocation();
  }, []);

  // Subscribe to coordinate updates to keep currentLocation in sync while tracking
  useEffect(() => {
    const unsubscribe = useOutdoorSessionStore.subscribe(
      (state) => state.coordinates,
      (coords) => {
        if (coords.length > 0) {
          const latest = coords[coords.length - 1];
          setCurrentLocation({ latitude: latest.latitude, longitude: latest.longitude });
        }
      }
    );
    return unsubscribe;
  }, []);

  // Initialize session on mount if coming from exercise picker
  useEffect(() => {
    if (exercise && !exerciseName) {
      startSession(exercise);
    }
  }, [exercise, exerciseName, startSession]);

  // Center map on current location (only animate when actively tracking, or on first location fix)
  useEffect(() => {
    if (currentLocation && mapRef.current) {
      if (!hascenteredRef.current || status === 'active') {
        mapRef.current.animateToRegion(
          {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          500,
        );
        hascenteredRef.current = true;
      }
    }
  }, [currentLocation, status]);

  // Set Android nav bar color
  useEffect(() => {
    if (Platform.OS === 'android') {
      void NavigationBar.setBackgroundColorAsync(theme.primary.bg);
    }
  }, [theme.primary.bg]);

  // Build polyline coordinates for map
  const routeCoords = useMemo(
    () => coordinates.map((c) => ({ latitude: c.latitude, longitude: c.longitude })),
    [coordinates],
  );

  // Initial region — computed once on mount; animateToRegion handles subsequent centering
  const initialRegion = useMemo(() => ({
    latitude: currentLocation?.latitude ?? 0,
    longitude: currentLocation?.longitude ?? 0,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const handleStart = useCallback(async () => {
    triggerHaptic('selection');
    beginTracking();
    const success = await outdoorTrackingService.startGpsTracking();
    if (success) {
      setPermissionStatus('granted');
      outdoorTrackingService.startTimer();
    } else {
      setPermissionStatus('denied');
    }
  }, [beginTracking]);

  const handlePause = useCallback(() => {
    triggerHaptic('selection');
    pauseSession();
    outdoorTrackingService.stopGpsTracking();
    outdoorTrackingService.stopTimer();
  }, [pauseSession]);

  const handleResume = useCallback(async () => {
    triggerHaptic('selection');
    resumeSession();
    await outdoorTrackingService.startGpsTracking();
    outdoorTrackingService.startTimer();
  }, [resumeSession]);

  const handleFinish = useCallback(async () => {
    if (isFinishing) return;

    triggerHaptic('selection');
    setIsFinishing(true);
    outdoorTrackingService.stopGpsTracking();
    outdoorTrackingService.stopTimer();

    const result = endSession();

    if (!result) {
      setIsFinishing(false);
      clearSession();
      router.replace('/(tabs)/workout');
      return;
    }

    // Build a Workout object compatible with workoutSessionsStore
    const workout: Workout = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      planId: null,
      name: result.exerciseName,
      date: new Date(result.startTime).toISOString(),
      startTime: result.startTime,
      endTime: result.endTime,
      duration: result.durationSeconds,
      exercises: [
        {
          name: result.exerciseName,
          sets: [
            {
              completed: true,
              duration: result.durationSeconds,
              distance: result.distanceMiles,
            },
          ],
        },
      ],
    };

    try {
      await addWorkout(workout);
      router.replace('/workout-success');
    } catch (error) {
      console.error('[outdoor-session] Failed to save workout:', error);
      router.replace('/(tabs)');
    } finally {
      setIsFinishing(false);
    }
  }, [isFinishing, endSession, addWorkout, clearSession, router]);

  // Handle permission denied state
  const showPermissionDenied = permissionStatus === 'denied' && status === 'idle';

  const displayName = exerciseName ?? exercise ?? 'Outdoor Exercise';

  const handleBack = useCallback(() => {
    triggerHaptic('selection');
    router.back();
  }, [router]);

  return (
    <View style={[styles.root, { backgroundColor: theme.primary.bg }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor="transparent" translucent />

      {/* Map Section */}
      <View style={[styles.mapContainer, { paddingTop: insets.top }]}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
          followsUserLocation={status === 'active'}
          userInterfaceStyle={isDarkMode ? 'dark' : 'light'}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          mapPadding={{ top: insets.top, right: 0, bottom: 0, left: 0 }}
        >
          {routeCoords.length >= 2 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor={colors.accent.orange}
              strokeWidth={4}
            />
          )}
        </MapView>

        {/* Back button */}
        <View style={[styles.backButton, { top: insets.top + spacing.sm }]}>
          <Pressable
            onPress={handleBack}
            style={[styles.backButtonPressable, { backgroundColor: theme.surface.card, borderColor: theme.border.light }]}
            hitSlop={spacing.sm}
          >
            <IconSymbol name="arrow-back" color={theme.text.primary} size={sizing.iconMD} />
          </Pressable>
        </View>

        {/* Exercise name overlay */}
        <View style={[styles.nameOverlay, { top: insets.top + spacing.sm }]}>
          <View style={[styles.namePill, { backgroundColor: theme.surface.card, borderColor: theme.border.light }]}>
            <Text variant="bodySemibold" color="primary">
              {displayName}
            </Text>
          </View>
        </View>

        {/* GPS searching indicator — only show when actively tracking but no fix yet */}
        {(status === 'active') && !currentLocation && (
          <View style={[styles.gpsIndicator, { backgroundColor: theme.surface.card, borderColor: theme.border.light }]}>
            <Text variant="caption" color="secondary">
              Searching for GPS signal...
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Panel */}
      <View style={[styles.bottomPanel, { backgroundColor: theme.primary.bg, paddingBottom: insets.bottom + spacing.md }]}>
        {showPermissionDenied && (
          <View style={[styles.permissionBanner, { backgroundColor: theme.accent.orangeMuted }]}>
            <Text variant="bodySemibold" color="orange">
              Location permission required
            </Text>
            <Text variant="caption" color="secondary">
              Enable location access in your device settings to track your route.
            </Text>
          </View>
        )}

        <OutdoorMetricsBar
          elapsedSeconds={elapsedSeconds}
          distanceMiles={distanceMiles}
          paceSecondsPerMile={paceSecondsPerMile}
        />

        <OutdoorControlBar
          status={status}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onFinish={handleFinish}
          isFinishing={isFinishing}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  mapContainer: {
    flex: 6,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 10,
  },
  backButtonPressable: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameOverlay: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
  },
  namePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  gpsIndicator: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  bottomPanel: {
    flex: 4,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
    justifyContent: 'center',
  },
  permissionBanner: {
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
});

export default OutdoorSessionScreen;
