/**
 * BodyHeatmap
 * Anatomical body visualization showing muscle set distribution
 * 
 * Features:
 * - Front and back views with swipe navigation
 * - Detailed muscle regions with proper anatomy
 * - Heat coloring based on workout intensity
 * - Tap interaction for muscle details
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import Svg, { Path, G, Circle, Ellipse } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '@/utils/haptics';

import { Text } from '@/components/atoms/Text';
import { colors, spacing, radius } from '@/constants/theme';
import type { HierarchicalSetData } from '@/types/analytics';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SVG_WIDTH = Math.min(SCREEN_WIDTH - spacing.xl * 2, 260);
const SVG_HEIGHT = SVG_WIDTH * 2;
const SWIPE_THRESHOLD = 50;

type ViewSide = 'front' | 'back';

interface BodyHeatmapProps {
  data: HierarchicalSetData;
  onMusclePress?: (muscleName: string) => void;
}

interface MuscleRegion {
  id: string;
  name: string;
  displayName: string;
  path: string;
  mappedMuscles: string[];
  view: ViewSide;
}

// Front view - athletic body with proper muscular proportions
const FRONT_REGIONS: MuscleRegion[] = [
  // === HEAD & NECK ===
  { id: 'head-f', name: 'Head', displayName: 'Head', view: 'front',
    path: 'M50,6 C58,6 64,13 64,22 C64,31 58,38 50,38 C42,38 36,31 36,22 C36,13 42,6 50,6 Z',
    mappedMuscles: [] },
  { id: 'neck-f', name: 'Neck', displayName: 'Neck', view: 'front',
    path: 'M43,38 L57,38 L58,46 L42,46 Z',
    mappedMuscles: [] },

  // === SHOULDERS & TRAPS ===
  { id: 'trap-l-f', name: 'Traps', displayName: 'Traps', view: 'front',
    path: 'M42,46 L50,46 L50,52 L38,54 L30,50 C34,47 38,46 42,46 Z',
    mappedMuscles: ['Traps', 'Upper Back'] },
  { id: 'trap-r-f', name: 'Traps', displayName: 'Traps', view: 'front',
    path: 'M50,46 L58,46 C62,46 66,47 70,50 L62,54 L50,52 Z',
    mappedMuscles: ['Traps', 'Upper Back'] },
  { id: 'delt-l', name: 'Shoulders', displayName: 'Shoulder', view: 'front',
    path: 'M30,50 L38,54 L34,66 L24,64 C22,58 24,52 30,50 Z',
    mappedMuscles: ['Shoulders', 'Front Delts', 'Side Delts'] },
  { id: 'delt-r', name: 'Shoulders', displayName: 'Shoulder', view: 'front',
    path: 'M70,50 L62,54 L66,66 L76,64 C78,58 76,52 70,50 Z',
    mappedMuscles: ['Shoulders', 'Front Delts', 'Side Delts'] },

  // === CHEST ===
  { id: 'chest-l', name: 'Chest', displayName: 'Chest', view: 'front',
    path: 'M38,54 L50,52 L50,72 L38,74 L34,66 Z',
    mappedMuscles: ['Chest', 'Upper Chest', 'Mid Chest', 'Lower Chest'] },
  { id: 'chest-r', name: 'Chest', displayName: 'Chest', view: 'front',
    path: 'M50,52 L62,54 L66,66 L62,74 L50,72 Z',
    mappedMuscles: ['Chest', 'Upper Chest', 'Mid Chest', 'Lower Chest'] },

  // === ARMS - THICKER ===
  { id: 'bicep-l', name: 'Biceps', displayName: 'Biceps', view: 'front',
    path: 'M24,64 L34,66 L32,84 L20,82 C19,74 20,68 24,64 Z',
    mappedMuscles: ['Arms', 'Biceps', 'Long Head', 'Short Head'] },
  { id: 'bicep-r', name: 'Biceps', displayName: 'Biceps', view: 'front',
    path: 'M76,64 L66,66 L68,84 L80,82 C81,74 80,68 76,64 Z',
    mappedMuscles: ['Arms', 'Biceps', 'Long Head', 'Short Head'] },
  { id: 'forearm-l', name: 'Forearms', displayName: 'Forearms', view: 'front',
    path: 'M20,82 L32,84 L30,108 L18,106 C17,96 18,88 20,82 Z',
    mappedMuscles: ['Arms', 'Forearms'] },
  { id: 'forearm-r', name: 'Forearms', displayName: 'Forearms', view: 'front',
    path: 'M80,82 L68,84 L70,108 L82,106 C83,96 82,88 80,82 Z',
    mappedMuscles: ['Arms', 'Forearms'] },
  { id: 'hand-l', name: 'Hands', displayName: 'Hand', view: 'front',
    path: 'M18,106 L30,108 L28,122 L16,120 C15,114 16,110 18,106 Z',
    mappedMuscles: [] },
  { id: 'hand-r', name: 'Hands', displayName: 'Hand', view: 'front',
    path: 'M82,106 L70,108 L72,122 L84,120 C85,114 84,110 82,106 Z',
    mappedMuscles: [] },

  // === CORE ===
  { id: 'abs', name: 'Abs', displayName: 'Abs', view: 'front',
    path: 'M42,74 L50,72 L58,74 L58,98 L50,100 L42,98 Z',
    mappedMuscles: ['Core', 'Abs'] },
  { id: 'oblique-l', name: 'Obliques', displayName: 'Obliques', view: 'front',
    path: 'M34,66 L38,74 L42,74 L42,98 L38,102 C36,90 34,78 34,66 Z',
    mappedMuscles: ['Core', 'Obliques'] },
  { id: 'oblique-r', name: 'Obliques', displayName: 'Obliques', view: 'front',
    path: 'M66,66 L62,74 L58,74 L58,98 L62,102 C64,90 66,78 66,66 Z',
    mappedMuscles: ['Core', 'Obliques'] },

  // === HIPS ===
  { id: 'hip-l', name: 'Hips', displayName: 'Hip', view: 'front',
    path: 'M38,102 L42,98 L50,100 L50,108 L36,110 Z',
    mappedMuscles: [] },
  { id: 'hip-r', name: 'Hips', displayName: 'Hip', view: 'front',
    path: 'M62,102 L58,98 L50,100 L50,108 L64,110 Z',
    mappedMuscles: [] },

  // === LEGS ===
  { id: 'quad-l', name: 'Quads', displayName: 'Quadriceps', view: 'front',
    path: 'M36,110 L50,108 L48,148 L34,146 C33,132 34,118 36,110 Z',
    mappedMuscles: ['Quads', 'Rectus Femoris', 'Vastus Lateralis', 'Vastus Medialis'] },
  { id: 'quad-r', name: 'Quads', displayName: 'Quadriceps', view: 'front',
    path: 'M64,110 L50,108 L52,148 L66,146 C67,132 66,118 64,110 Z',
    mappedMuscles: ['Quads', 'Rectus Femoris', 'Vastus Lateralis', 'Vastus Medialis'] },
  { id: 'knee-l', name: 'Knee', displayName: 'Knee', view: 'front',
    path: 'M34,146 L48,148 L47,156 L35,154 Z',
    mappedMuscles: [] },
  { id: 'knee-r', name: 'Knee', displayName: 'Knee', view: 'front',
    path: 'M52,148 L66,146 L65,154 L53,156 Z',
    mappedMuscles: [] },
  { id: 'calf-l', name: 'Calves', displayName: 'Calves', view: 'front',
    path: 'M35,154 L47,156 L45,186 L37,186 C36,174 35,164 35,154 Z',
    mappedMuscles: ['Calves', 'Tibialis', 'Gastrocnemius'] },
  { id: 'calf-r', name: 'Calves', displayName: 'Calves', view: 'front',
    path: 'M53,156 L65,154 L65,164 C65,174 64,186 63,186 L55,186 Z',
    mappedMuscles: ['Calves', 'Tibialis', 'Gastrocnemius'] },
  { id: 'foot-l', name: 'Foot', displayName: 'Foot', view: 'front',
    path: 'M37,186 L45,186 L46,194 L34,194 Z',
    mappedMuscles: [] },
  { id: 'foot-r', name: 'Foot', displayName: 'Foot', view: 'front',
    path: 'M55,186 L63,186 L66,194 L54,194 Z',
    mappedMuscles: [] },
];

// Back view - athletic body with proper muscular proportions
const BACK_REGIONS: MuscleRegion[] = [
  // === HEAD & NECK ===
  { id: 'head-b', name: 'Head', displayName: 'Head', view: 'back',
    path: 'M50,6 C58,6 64,13 64,22 C64,31 58,38 50,38 C42,38 36,31 36,22 C36,13 42,6 50,6 Z',
    mappedMuscles: [] },
  { id: 'neck-b', name: 'Neck', displayName: 'Neck', view: 'back',
    path: 'M43,38 L57,38 L58,46 L42,46 Z',
    mappedMuscles: [] },

  // === TRAPS & SHOULDERS ===
  { id: 'trap-l-b', name: 'Traps', displayName: 'Traps', view: 'back',
    path: 'M42,46 L50,46 L50,56 L38,58 L30,50 C34,47 38,46 42,46 Z',
    mappedMuscles: ['Traps', 'Upper Back'] },
  { id: 'trap-r-b', name: 'Traps', displayName: 'Traps', view: 'back',
    path: 'M50,46 L58,46 C62,46 66,47 70,50 L62,58 L50,56 Z',
    mappedMuscles: ['Traps', 'Upper Back'] },
  { id: 'rear-delt-l', name: 'Rear Delts', displayName: 'Rear Delt', view: 'back',
    path: 'M30,50 L38,58 L34,66 L24,64 C22,58 24,52 30,50 Z',
    mappedMuscles: ['Shoulders', 'Rear Delts'] },
  { id: 'rear-delt-r', name: 'Rear Delts', displayName: 'Rear Delt', view: 'back',
    path: 'M70,50 L62,58 L66,66 L76,64 C78,58 76,52 70,50 Z',
    mappedMuscles: ['Shoulders', 'Rear Delts'] },

  // === BACK ===
  { id: 'upper-back', name: 'Upper Back', displayName: 'Upper Back', view: 'back',
    path: 'M38,58 L50,56 L62,58 L60,72 L50,74 L40,72 Z',
    mappedMuscles: ['Back', 'Rhomboids', 'Upper Back'] },
  { id: 'lat-l', name: 'Lats', displayName: 'Lats', view: 'back',
    path: 'M34,66 L40,72 L40,90 L34,94 C32,82 32,72 34,66 Z',
    mappedMuscles: ['Back', 'Lats'] },
  { id: 'lat-r', name: 'Lats', displayName: 'Lats', view: 'back',
    path: 'M66,66 L60,72 L60,90 L66,94 C68,82 68,72 66,66 Z',
    mappedMuscles: ['Back', 'Lats'] },
  { id: 'mid-back', name: 'Mid Back', displayName: 'Mid Back', view: 'back',
    path: 'M40,72 L50,74 L60,72 L60,90 L50,92 L40,90 Z',
    mappedMuscles: ['Back', 'Rhomboids', 'Lower Back'] },
  { id: 'lower-back', name: 'Lower Back', displayName: 'Lower Back', view: 'back',
    path: 'M40,90 L50,92 L60,90 L62,102 L50,104 L38,102 Z',
    mappedMuscles: ['Back', 'Lower Back', 'Core'] },

  // === ARMS - THICKER ===
  { id: 'tricep-l', name: 'Triceps', displayName: 'Triceps', view: 'back',
    path: 'M24,64 L34,66 L32,84 L20,82 C19,74 20,68 24,64 Z',
    mappedMuscles: ['Arms', 'Triceps', 'Lateral Head', 'Medial Head', 'Long Head'] },
  { id: 'tricep-r', name: 'Triceps', displayName: 'Triceps', view: 'back',
    path: 'M76,64 L66,66 L68,84 L80,82 C81,74 80,68 76,64 Z',
    mappedMuscles: ['Arms', 'Triceps', 'Lateral Head', 'Medial Head', 'Long Head'] },
  { id: 'forearm-l-b', name: 'Forearms', displayName: 'Forearms', view: 'back',
    path: 'M20,82 L32,84 L30,108 L18,106 C17,96 18,88 20,82 Z',
    mappedMuscles: ['Arms', 'Forearms'] },
  { id: 'forearm-r-b', name: 'Forearms', displayName: 'Forearms', view: 'back',
    path: 'M80,82 L68,84 L70,108 L82,106 C83,96 82,88 80,82 Z',
    mappedMuscles: ['Arms', 'Forearms'] },
  { id: 'hand-l-b', name: 'Hands', displayName: 'Hand', view: 'back',
    path: 'M18,106 L30,108 L28,122 L16,120 C15,114 16,110 18,106 Z',
    mappedMuscles: [] },
  { id: 'hand-r-b', name: 'Hands', displayName: 'Hand', view: 'back',
    path: 'M82,106 L70,108 L72,122 L84,120 C85,114 84,110 82,106 Z',
    mappedMuscles: [] },

  // === SIDE TORSO ===
  { id: 'side-l-b', name: 'Obliques', displayName: 'Side', view: 'back',
    path: 'M34,94 L40,90 L38,102 L34,106 Z',
    mappedMuscles: ['Core', 'Obliques'] },
  { id: 'side-r-b', name: 'Obliques', displayName: 'Side', view: 'back',
    path: 'M66,94 L60,90 L62,102 L66,106 Z',
    mappedMuscles: ['Core', 'Obliques'] },

  // === GLUTES ===
  { id: 'glute-l', name: 'Glutes', displayName: 'Glutes', view: 'back',
    path: 'M34,106 L38,102 L50,104 L50,112 L36,114 Z',
    mappedMuscles: ['Glutes', 'Gluteus Maximus', 'Gluteus Medius'] },
  { id: 'glute-r', name: 'Glutes', displayName: 'Glutes', view: 'back',
    path: 'M66,106 L62,102 L50,104 L50,112 L64,114 Z',
    mappedMuscles: ['Glutes', 'Gluteus Maximus', 'Gluteus Medius'] },

  // === LEGS ===
  { id: 'ham-l', name: 'Hamstrings', displayName: 'Hamstrings', view: 'back',
    path: 'M36,114 L50,112 L48,148 L34,146 C33,132 34,120 36,114 Z',
    mappedMuscles: ['Hamstrings', 'Biceps Femoris', 'Semitendinosus', 'Semimembranosus'] },
  { id: 'ham-r', name: 'Hamstrings', displayName: 'Hamstrings', view: 'back',
    path: 'M64,114 L50,112 L52,148 L66,146 C67,132 66,120 64,114 Z',
    mappedMuscles: ['Hamstrings', 'Biceps Femoris', 'Semitendinosus', 'Semimembranosus'] },
  { id: 'knee-l-b', name: 'Knee', displayName: 'Knee', view: 'back',
    path: 'M34,146 L48,148 L47,156 L35,154 Z',
    mappedMuscles: [] },
  { id: 'knee-r-b', name: 'Knee', displayName: 'Knee', view: 'back',
    path: 'M52,148 L66,146 L65,154 L53,156 Z',
    mappedMuscles: [] },
  { id: 'calf-l-b', name: 'Calves', displayName: 'Calves', view: 'back',
    path: 'M35,154 L47,156 L45,186 L37,186 C36,174 35,164 35,154 Z',
    mappedMuscles: ['Calves', 'Gastrocnemius', 'Soleus'] },
  { id: 'calf-r-b', name: 'Calves', displayName: 'Calves', view: 'back',
    path: 'M53,156 L65,154 L65,164 C65,174 64,186 63,186 L55,186 Z',
    mappedMuscles: ['Calves', 'Gastrocnemius', 'Soleus'] },
  { id: 'foot-l-b', name: 'Foot', displayName: 'Foot', view: 'back',
    path: 'M37,186 L45,186 L46,194 L34,194 Z',
    mappedMuscles: [] },
  { id: 'foot-r-b', name: 'Foot', displayName: 'Foot', view: 'back',
    path: 'M55,186 L63,186 L66,194 L54,194 Z',
    mappedMuscles: [] },
];

// Get color based on percentage (0 = gray, 100 = bright orange)
const getHeatColor = (percentage: number): string => {
  if (percentage <= 0) return colors.neutral.gray200;
  if (percentage < 5) return `rgba(255, 107, 74, 0.2)`;
  if (percentage < 10) return `rgba(255, 107, 74, 0.35)`;
  if (percentage < 20) return `rgba(255, 107, 74, 0.5)`;
  if (percentage < 30) return `rgba(255, 107, 74, 0.7)`;
  if (percentage < 40) return `rgba(255, 107, 74, 0.85)`;
  return colors.accent.orange;
};

export const BodyHeatmap: React.FC<BodyHeatmapProps> = ({
  data,
  onMusclePress,
}) => {
  const [currentView, setCurrentView] = useState<ViewSide>('front');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  
  // Animation values
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Get regions for current view
  const currentRegions = currentView === 'front' ? FRONT_REGIONS : BACK_REGIONS;
  const allRegions = [...FRONT_REGIONS, ...BACK_REGIONS];

  // Calculate percentage for each muscle region
  const regionPercentages = useMemo(() => {
    const percentages: Record<string, number> = {};
    const allMuscleData: Record<string, number> = {};
    
    // Add root level data
    data.root?.forEach((item) => {
      allMuscleData[item.name] = item.percentage;
    });

    // Add all nested levels
    Object.values(data.byParent || {}).forEach((items) => {
      items.forEach((item) => {
        allMuscleData[item.name] = item.percentage;
      });
    });

    // Map regions to their percentages
    allRegions.forEach((region) => {
      if (region.mappedMuscles.length === 0) {
        percentages[region.id] = 0;
        return;
      }
      
      const musclePercentages = region.mappedMuscles
        .map(m => allMuscleData[m] || 0)
        .filter(p => p > 0);
      
      percentages[region.id] = musclePercentages.length > 0 
        ? Math.max(...musclePercentages)
        : 0;
    });

    return percentages;
  }, [data]);

  // Switch view with animation
  const switchView = useCallback((newView: ViewSide) => {
    if (newView === currentView) return;
    
    triggerHaptic('light');
    setSelectedRegion(null);
    
    const direction = newView === 'back' ? -1 : 1;
    
    // Slide out
    translateX.value = withTiming(direction * 50, { duration: 150 }, () => {
      runOnJS(setCurrentView)(newView);
      // Reset position for slide in
      translateX.value = -direction * 50;
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
    });
  }, [currentView, translateX]);

  // Swipe gesture
  const panGesture = Gesture.Pan()
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        if (event.translationX < 0 && currentView === 'front') {
          runOnJS(switchView)('back');
        } else if (event.translationX > 0 && currentView === 'back') {
          runOnJS(switchView)('front');
        }
      }
    });

  // Animated style for the SVG container
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Get details for selected region
  const selectedDetails = useMemo(() => {
    if (!selectedRegion) return null;

    const region = currentRegions.find((r) => r.id === selectedRegion);
    if (!region) return null;

    const percentage = regionPercentages[region.id] || 0;

    return {
      name: region.displayName,
      percentage,
      hasMuscleData: region.mappedMuscles.length > 0,
    };
  }, [selectedRegion, currentRegions, regionPercentages]);

  const handleRegionPress = useCallback((region: MuscleRegion) => {
    triggerHaptic('light');
    
    if (selectedRegion === region.id) {
      setSelectedRegion(null);
      if (onMusclePress && region.mappedMuscles.length > 0) {
        onMusclePress(region.name);
      }
    } else {
      setSelectedRegion(region.id);
    }
  }, [selectedRegion, onMusclePress]);

  const handleBackgroundPress = useCallback(() => {
    setSelectedRegion(null);
  }, []);

  // Empty state
  if (!data.root || data.root.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="body" color="secondary" style={styles.emptyText}>
          No workout data available yet.
        </Text>
        <Text variant="caption" color="tertiary" style={styles.emptyHint}>
          Complete workouts to see your muscle heatmap.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with view toggle */}
      <View style={styles.header}>
        <Text variant="heading3" color="primary">
          Muscle Heatmap
        </Text>
        <View style={styles.viewToggle}>
          <Pressable
            style={[styles.toggleButton, currentView === 'front' && styles.toggleButtonActive]}
            onPress={() => switchView('front')}
          >
            <Text 
              variant="caption" 
              color={currentView === 'front' ? 'primary' : 'tertiary'}
            >
              Front
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, currentView === 'back' && styles.toggleButtonActive]}
            onPress={() => switchView('back')}
          >
            <Text 
              variant="caption" 
              color={currentView === 'back' ? 'primary' : 'tertiary'}
            >
              Back
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Swipe hint */}
      <View style={styles.swipeHint}>
        <Ionicons name="chevron-back" size={14} color={colors.text.tertiary} />
        <Text variant="caption" color="tertiary">
          Swipe to rotate
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
      </View>

      {/* Body SVG */}
      <GestureDetector gesture={panGesture}>
        <Pressable onPress={handleBackgroundPress} style={styles.svgContainer}>
          <Animated.View style={animatedStyle}>
            <Svg
              width={SVG_WIDTH}
              height={SVG_HEIGHT}
              viewBox="0 0 100 200"
              preserveAspectRatio="xMidYMid meet"
            >
              <G>
                {currentRegions.map((region) => {
                  const percentage = regionPercentages[region.id] || 0;
                  const fillColor = getHeatColor(percentage);
                  const isSelected = selectedRegion === region.id;
                  const strokeColor = isSelected 
                    ? colors.accent.orange 
                    : percentage > 0 
                      ? 'rgba(255, 107, 74, 0.4)' 
                      : 'rgba(0, 0, 0, 0.1)';

                  return (
                    <Path
                      key={region.id}
                      d={region.path}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 1.5 : 0.5}
                      onPress={() => handleRegionPress(region)}
                    />
                  );
                })}
              </G>
            </Svg>
          </Animated.View>

          {/* Tooltip for selected region */}
          {selectedDetails && (
            <Animated.View
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(100)}
              style={styles.tooltip}
            >
              <Text variant="labelMedium" color="primary">
                {selectedDetails.name}
              </Text>
              {selectedDetails.hasMuscleData ? (
                <>
                  <Text variant="heading3" color="primary">
                    {Math.round(selectedDetails.percentage)}%
                  </Text>
                  <Text variant="caption" color="tertiary">
                    Tap again for details
                  </Text>
                </>
              ) : (
                <Text variant="caption" color="tertiary">
                  Not tracked
                </Text>
              )}
            </Animated.View>
          )}
        </Pressable>
      </GestureDetector>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.neutral.gray200 }]} />
          <Text variant="caption" color="tertiary">None</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(255, 107, 74, 0.35)' }]} />
          <Text variant="caption" color="tertiary">Low</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(255, 107, 74, 0.7)' }]} />
          <Text variant="caption" color="tertiary">Med</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent.orange }]} />
          <Text variant="caption" color="tertiary">High</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.gray200,
    borderRadius: radius.sm,
    padding: spacing.xxs,
  },
  toggleButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm - 2,
  },
  toggleButtonActive: {
    backgroundColor: colors.surface.card,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  tooltip: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 100,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: radius.sm,
  },
  emptyContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptyHint: {
    textAlign: 'center',
  },
});
