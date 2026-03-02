/**
 * OutdoorRouteMapCard
 * Displays a static map with the completed GPS route for outdoor exercise sessions.
 * Used on the workout detail/review page.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { SurfaceCard } from '@/components/atoms/SurfaceCard';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius } from '@/constants/theme';
import { DARK_MAP_STYLE } from '@/constants/mapStyles';
import { segmentRouteByGaps } from '@/utils/geo';
import type { GpsCoordinate } from '@/types/outdoor';

interface OutdoorRouteMapCardProps {
  coordinates: { latitude: number; longitude: number; timestamp: number }[];
}

/**
 * OutdoorRouteMapCard
 *
 * @param coordinates - Array of GPS coordinates forming the completed route.
 */
export const OutdoorRouteMapCard: React.FC<OutdoorRouteMapCardProps> = ({
  coordinates,
}) => {
  const { theme, isDarkMode } = useTheme();
  const mapRef = useRef<MapView>(null);

  const gpsCoords: GpsCoordinate[] = useMemo(
    () =>
      coordinates.map((c) => ({
        latitude: c.latitude,
        longitude: c.longitude,
        timestamp: c.timestamp,
      })),
    [coordinates],
  );

  const routeSegments = useMemo(() => segmentRouteByGaps(gpsCoords), [gpsCoords]);

  const allPoints = useMemo(
    () => coordinates.map((c) => ({ latitude: c.latitude, longitude: c.longitude })),
    [coordinates],
  );

  const handleMapReady = useCallback(() => {
    if (mapRef.current && allPoints.length >= 2) {
      mapRef.current.fitToCoordinates(allPoints, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: false,
      });
    }
  }, [allPoints]);

  if (coordinates.length < 2) {
    return null;
  }

  return (
    <SurfaceCard tone="card" padding="xs" showAccentStripe={false} style={styles.card}>
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          onMapReady={handleMapReady}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
          showsUserLocation={false}
          showsMyLocationButton={false}
          userInterfaceStyle={isDarkMode ? 'dark' : 'light'}
          customMapStyle={isDarkMode && Platform.OS === 'android' ? DARK_MAP_STYLE : undefined}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        >
          {routeSegments.map((segment, idx) =>
            segment.length >= 2 ? (
              <Polyline
                key={`seg-${idx}`}
                coordinates={segment}
                strokeColor={theme.accent.orange}
                strokeWidth={4}
              />
            ) : null,
          )}
          {routeSegments.length >= 2 &&
            routeSegments.slice(0, -1).map((seg, idx) => {
              const nextSeg = routeSegments[idx + 1];
              if (!seg.length || !nextSeg.length) return null;
              return (
                <Polyline
                  key={`gap-${idx}`}
                  coordinates={[seg[seg.length - 1], nextSeg[0]]}
                  strokeColor={theme.accent.orangeMuted}
                  strokeWidth={2}
                  lineDashPattern={[8, 8]}
                />
              );
            })}
        </MapView>
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  mapWrapper: {
    height: 260,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
