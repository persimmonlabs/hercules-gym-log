import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Dimensions, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent, TouchableOpacity, LayoutChangeEvent, Platform, UIManager, Animated, Easing } from 'react-native';
import PieChart from 'react-native-chart-kit/dist/PieChart';

import { Text } from '@/components/atoms/Text';
import { colors, spacing, radius } from '@/constants/theme';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';

// Import data
import exercisesData from '@/data/exercises.json';
import hierarchyData from '@/data/hierarchy.json';

import muscleColorsData from '@/data/muscleColors.json';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.xl * 2;

// Build Maps
const buildMaps = () => {
  const leafToL1: Record<string, string> = {}; // Specific -> Body Part (Upper/Lower/Core)
  const leafToL2: Record<string, string> = {}; // Specific -> Muscle Group (Chest/Back/etc)
  const leafToL3: Record<string, string> = {}; // Specific -> Specific (Identity)

  const hierarchy = hierarchyData.muscle_hierarchy;

  Object.entries(hierarchy).forEach(([l1, l1Data]) => {
    if (l1Data?.muscles) {
      Object.entries(l1Data.muscles).forEach(([l2, l2Data]) => {
        // l2 is "Chest", l2Data contains the low-level muscles
        // Map the Group Name itself (sometimes used as a key in weights)
        leafToL1[l2] = l1;
        leafToL2[l2] = l2;
        leafToL3[l2] = l2;

        if (l2Data?.muscles) {
          Object.keys(l2Data.muscles).forEach(l3 => {
            leafToL1[l3] = l1;
            leafToL2[l3] = l2;
            leafToL3[l3] = l3;
          });
        }
      });
    }
  });

  return { leafToL1, leafToL2, leafToL3 };
};

const { leafToL1, leafToL2, leafToL3 } = buildMaps();

const EXERCISE_NAME_TO_MUSCLES = exercisesData.reduce((acc, ex) => {
  if (ex.muscles) {
    acc[ex.name] = ex.muscles as unknown as Record<string, number>;
  }
  return acc;
}, {} as Record<string, Record<string, number>>);

interface ChartPageProps {
  title: string;
  data: Array<{
    name: string;
    population: number;
    color: string;
    legendFontColor: string;
    legendFontSize: number;
  }>;
  selectedSlice: string | null;
  onSelectSlice: (name: string) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}

const ChartPage: React.FC<ChartPageProps> = ({ title, data, selectedSlice, onSelectSlice, onLayout }) => {
  // Process data for visual feedback
  const displayData = useMemo(() => {
    if (!selectedSlice) return data;
    return data.map(item => ({
      ...item,
      color: item.name === selectedSlice ? item.color : colors.neutral.gray200,
    }));
  }, [data, selectedSlice]);

  return (
    <View style={styles.pageContainer} onLayout={onLayout}>
      <Text variant="heading3" color="primary" style={styles.chartTitle}>{title}</Text>
      {data.length > 0 ? (
        <>
          <PieChart
            data={displayData}
            width={CHART_WIDTH}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => colors.text.primary,
            }}
            accessor={'population'}
            backgroundColor={'transparent'}
            paddingLeft={'85'}
            center={[0, 0]}
            absolute
            hasLegend={false}
          />
          <View style={styles.customLegend}>
            {data.map((item, index) => {
              const isSelected = selectedSlice === item.name;
              const isDimmed = selectedSlice && !isSelected;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.legendItem,
                    { opacity: isDimmed ? 0.3 : 1 }
                  ]}
                  onPress={() => onSelectSlice(item.name)}
                >
                  <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                  <Text variant="caption" color="primary">{item.name}</Text>
                  <Text variant="caption" color="secondary"> {Math.round(item.population * 100)}%</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.emptyChart}>
          <Text variant="body" color="secondary">No data available</Text>
        </View>
      )}
    </View>
  );
};

export const FocusDistributionChart: React.FC = () => {
  const workouts = useWorkoutSessionsStore((state) => state.workouts);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);
  const [pageHeights, setPageHeights] = useState<Record<number, number>>({});

  const heightAnim = useRef(new Animated.Value(0)).current;
  const [isHeightInitialized, setIsHeightInitialized] = useState(false);

  const { dataL1, dataL2, dataL3 } = useMemo(() => {
    const distL1: Record<string, number> = {};
    const distL2: Record<string, number> = {};
    const distL3: Record<string, number> = {};
    let totalSets = 0;

    workouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
        const weights = EXERCISE_NAME_TO_MUSCLES[exercise.name];
        if (!weights) return;

        // Exclude sets with 0 weight
        const completedSets = exercise.sets.filter(s => s.completed && s.weight > 0).length;
        if (completedSets === 0) return;

        totalSets += completedSets;

        Object.entries(weights).forEach(([muscle, weight]) => {
          const contribution = completedSets * weight;

          // Level 1
          const cat1 = leafToL1[muscle];
          if (cat1) distL1[cat1] = (distL1[cat1] || 0) + contribution;

          // Level 2
          const cat2 = leafToL2[muscle];
          if (cat2) distL2[cat2] = (distL2[cat2] || 0) + contribution;

          // Level 3
          const cat3 = leafToL3[muscle];
          if (cat3) distL3[cat3] = (distL3[cat3] || 0) + contribution;
        });
      });
    });

    const formatData = (dist: Record<string, number>, colorMap: Record<string, string>) => {
      return Object.entries(dist)
        .sort((a, b) => b[1] - a[1]) // Sort by value descending
        .map(([name, value]) => ({
          name,
          population: totalSets > 0 ? value / totalSets : 0,
          color: colorMap[name as keyof typeof colorMap] || colors.neutral.gray600,
          legendFontColor: colors.text.primary,
          legendFontSize: 12,
        }))
        .filter(item => item.population > 0);
    };

    const dataL1 = formatData(distL1, muscleColorsData.colors.high_level);
    const dataL2 = formatData(distL2, muscleColorsData.colors.mid_level);
    const dataL3 = formatData(distL3, muscleColorsData.colors.low_level);

    return { dataL1, dataL2, dataL3 };
  }, [workouts]);

  useEffect(() => {
    const targetHeight = pageHeights[currentPage];
    if (targetHeight) {
      if (!isHeightInitialized) {
        heightAnim.setValue(targetHeight);
        setIsHeightInitialized(true);
      } else {
        Animated.timing(heightAnim, {
          toValue: targetHeight,
          duration: 400,
          useNativeDriver: false,
          easing: Easing.out(Easing.cubic),
        }).start();
      }
    }
  }, [currentPage, pageHeights]);

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(contentOffsetX / CHART_WIDTH);
    if (pageIndex !== currentPage) {
      setCurrentPage(pageIndex);
      setSelectedSlice(null); // Reset selection on page change
    }
  };

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, velocity, targetContentOffset } = event.nativeEvent;

    // 1. Trust the OS prediction if available (iOS mostly)
    if (targetContentOffset) {
      const targetPage = Math.round(targetContentOffset.x / CHART_WIDTH);
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
        setSelectedSlice(null);
      }
      return;
    }

    // 2. Fallback for Android/others: Predict based on velocity + position
    let targetPage = currentPage;
    const currentPosition = contentOffset.x / CHART_WIDTH;

    if (velocity && Math.abs(velocity.x) > 0.2) {
      // Significant velocity: snap in direction of swipe
      if (velocity.x > 0) {
        targetPage = Math.ceil(currentPosition);
      } else {
        targetPage = Math.floor(currentPosition);
      }
    } else {
      // Low velocity: snap to nearest
      targetPage = Math.round(currentPosition);
    }

    // Clamp and update
    targetPage = Math.max(0, Math.min(2, targetPage));

    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
      setSelectedSlice(null);
    }
  };

  const handlePageLayout = (index: number) => (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (Math.abs((pageHeights[index] || 0) - height) > 1) {
      setPageHeights(prev => ({ ...prev, [index]: height }));
    }
  };

  const handleSelectSlice = (name: string) => {
    if (selectedSlice === name) {
      setSelectedSlice(null); // Deselect
    } else {
      setSelectedSlice(name);
    }
  };

  if (workouts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="body" color="secondary">No workout data available yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.pagination}>
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentPage ? styles.activeDot : styles.inactiveDot
            ]}
          />
        ))}
      </View>

      <Animated.View style={[{ overflow: 'hidden' }, isHeightInitialized ? { height: heightAnim } : null]}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScrollEndDrag={handleScrollEndDrag}
          style={{ width: CHART_WIDTH }}
          contentContainerStyle={{ alignItems: 'flex-start' }}
        >
          <ChartPage
            title="Body Region"
            data={dataL1}
            selectedSlice={selectedSlice}
            onSelectSlice={handleSelectSlice}
            onLayout={handlePageLayout(0)}
          />
          <ChartPage
            title="Muscle Group"
            data={dataL2}
            selectedSlice={selectedSlice}
            onSelectSlice={handleSelectSlice}
            onLayout={handlePageLayout(1)}
          />
          <ChartPage
            title="Specific Muscle"
            data={dataL3}
            selectedSlice={selectedSlice}
            onSelectSlice={handleSelectSlice}
            onLayout={handlePageLayout(2)}
          />
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageContainer: {
    width: CHART_WIDTH,
    alignItems: 'center',
  },
  chartTitle: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyChart: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  activeDot: {
    backgroundColor: colors.accent.primary,
  },
  inactiveDot: {
    backgroundColor: colors.neutral.gray400,
  },
  customLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: spacing.xs,
  }
});
