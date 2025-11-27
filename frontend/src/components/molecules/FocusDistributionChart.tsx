import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { View, Dimensions, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent, TouchableOpacity, LayoutChangeEvent, Platform, UIManager, Animated, Easing } from 'react-native';
import { VictoryPie } from 'victory-native';
import { useFocusEffect } from '@react-navigation/native';

import { Text } from '@/components/atoms/Text';
import { colors, spacing, radius } from '@/constants/theme';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';

// Import data
import exercisesData from '@/data/exercises.json';
import hierarchyData from '@/data/hierarchy.json';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.xl * 2;
const PIE_SIZE = 220; // Reduced size

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

interface ChartDataItem {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

interface ChartPageProps {
  title: string;
  data: ChartDataItem[];
  selectedSlice: string | null;
  onSelectSlice: (name: string) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}

const ChartPage: React.FC<ChartPageProps> = ({ title, data, selectedSlice, onSelectSlice, onLayout }) => {
  // Prepare chart data for Victory
  const chartData = useMemo(() => {
    return data.map((item) => ({
      x: item.name,
      y: item.population,
      color: item.color, // Always use the actual color, never grey out initially
      label: `${Math.round(item.population * 100)}%`
    }));
  }, [data]);

  const colorScale = chartData.map(d => d.color);

  return (
    <View style={styles.pageContainer} onLayout={onLayout}>
      <Text variant="heading3" color="primary" style={styles.chartTitle}>{title}</Text>
      {data.length > 0 ? (
        <>
          <View style={styles.chartContainer}>
            <VictoryPie
              data={chartData}
              width={PIE_SIZE + 40}
              height={PIE_SIZE + 40}
              colorScale={colorScale}
              innerRadius={50}
              radius={({ datum }) => (selectedSlice === datum.x ? PIE_SIZE / 2 + 10 : PIE_SIZE / 2)}
              padAngle={2}
              style={{
                data: {
                  fill: ({ datum }) => selectedSlice && selectedSlice !== datum.x ? colors.neutral.gray200 : datum.color,
                },
                labels: {
                  fill: 'transparent', // Hide labels on the chart itself for cleaner look, or use them if desired
                }
              }}
              events={[{
                target: "data",
                eventHandlers: {
                  onPressIn: () => {
                    return [
                      {
                        target: "data",
                        mutation: (props) => {
                          onSelectSlice(props.datum.x);
                          return null;
                        }
                      }
                    ];
                  }
                }
              }]}
            />
            {/* Center Text or Overlay if needed */}
          </View>
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

// Constants for reliable height calculation
const PIE_CHART_HEIGHT = PIE_SIZE + 40; // 260px for pie chart area
const TITLE_HEIGHT = 30; // Approximate title height
const LEGEND_ROW_HEIGHT = 24; // Approximate height per legend row
const MIN_CHART_HEIGHT = PIE_CHART_HEIGHT + TITLE_HEIGHT + spacing.md + spacing.sm; // Minimum fallback

// Calculate expected height based on data item count
const calculateExpectedHeight = (itemCount: number): number => {
  if (itemCount === 0) return 220 + TITLE_HEIGHT + spacing.md; // Empty state height
  // Estimate legend rows: ~3 items per row at current width
  const legendRows = Math.ceil(itemCount / 3);
  return PIE_CHART_HEIGHT + TITLE_HEIGHT + (legendRows * LEGEND_ROW_HEIGHT) + spacing.md + spacing.sm;
};

export const FocusDistributionChart: React.FC = () => {
  const workouts = useWorkoutSessionsStore((state) => state.workouts);
  const [currentPage, setCurrentPage] = useState(0);
  const [selections, setSelections] = useState<Record<number, string | null>>({});
  const [pageHeights, setPageHeights] = useState<Record<number, number>>({});

  const heightAnim = useRef(new Animated.Value(MIN_CHART_HEIGHT)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [isHeightInitialized, setIsHeightInitialized] = useState(false);
  const lastWorkoutCount = useRef(workouts.length);

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

    const formatData = (dist: Record<string, number>) => {
      const sortedEntries = Object.entries(dist).sort((a, b) => b[1] - a[1]);
      const totalItems = sortedEntries.length;

      return sortedEntries
        .map(([name, value], index) => {
          // Interpolate opacity: Largest (index 0) is 1.0, Smallest (last index) is 0.3
          // Formula: 1.0 - (ratio * 0.7) where ratio is index / (total - 1)
          let opacity = 1.0;
          if (totalItems > 1) {
            const ratio = index / (totalItems - 1);
            opacity = 1.0 - (ratio * 0.7);
          }
          
          return {
            name,
            population: totalSets > 0 ? value / totalSets : 0,
            color: `rgba(255, 107, 74, ${opacity})`,
            legendFontColor: colors.text.primary,
            legendFontSize: 12,
          };
        })
        .filter(item => item.population > 0);
    };

    const dataL1 = formatData(distL1);
    const dataL2 = formatData(distL2);
    const dataL3 = formatData(distL3);

    return { dataL1, dataL2, dataL3 };
  }, [workouts]);

  // Get data item counts for height calculation
  const dataItemCounts = useMemo(() => [dataL1.length, dataL2.length, dataL3.length], [dataL1, dataL2, dataL3]);

  // Initialize height on mount and when data changes
  useEffect(() => {
    const expectedHeight = calculateExpectedHeight(dataItemCounts[currentPage]);
    if (!isHeightInitialized) {
      heightAnim.setValue(expectedHeight);
      setIsHeightInitialized(true);
    }
  }, [dataItemCounts, isHeightInitialized]);

  // Animate height when page changes or measured heights update
  useEffect(() => {
    const measuredHeight = pageHeights[currentPage];
    const expectedHeight = calculateExpectedHeight(dataItemCounts[currentPage]);
    const targetHeight = measuredHeight || expectedHeight;
    
    if (targetHeight > 0 && isHeightInitialized) {
      Animated.timing(heightAnim, {
        toValue: targetHeight,
        duration: 300,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic),
      }).start();
    }
  }, [currentPage, pageHeights, dataItemCounts, isHeightInitialized]);

  // Clear page-specific selections when switching pages
  useEffect(() => {
    setSelections({});
  }, [currentPage]);

  // Reset pageHeights when workout data changes significantly
  useEffect(() => {
    if (workouts.length !== lastWorkoutCount.current) {
      lastWorkoutCount.current = workouts.length;
      setPageHeights({});
    }
  }, [workouts.length]);

  // Reset state when user returns to the performance tab
  useFocusEffect(
    useCallback(() => {
      setCurrentPage(0);
      setSelections({});
      // Don't reset height initialization to avoid flicker
      // Just reset scroll position
      scrollViewRef.current?.scrollTo({ x: 0, animated: false });
      
      // Sync height to page 0's expected/measured height
      const measuredHeight = pageHeights[0];
      const expectedHeight = calculateExpectedHeight(dataItemCounts[0]);
      const targetHeight = measuredHeight || expectedHeight;
      if (targetHeight > 0) {
        heightAnim.setValue(targetHeight);
      }
    }, [pageHeights, dataItemCounts])
  );

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(contentOffsetX / CHART_WIDTH);
    if (pageIndex !== currentPage) {
      setCurrentPage(pageIndex);
    }
  };

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, velocity, targetContentOffset } = event.nativeEvent;

    // 1. Trust the OS prediction if available (iOS mostly)
    if (targetContentOffset) {
      const targetPage = Math.round(targetContentOffset.x / CHART_WIDTH);
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
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
    }
  };

  const handlePageLayout = (index: number) => (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (Math.abs((pageHeights[index] || 0) - height) > 1) {
      setPageHeights(prev => ({ ...prev, [index]: height }));
    }
  };

  const handleSelectSlice = (pageIndex: number, name: string) => {
    setSelections(prev => {
      const current = prev[pageIndex];
      if (current === name) {
        const next = { ...prev };
        delete next[pageIndex];
        return next;
      }
      return { ...prev, [pageIndex]: name };
    });
  };

  if (workouts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>No workout data available yet.</Text>
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

      <Animated.View style={[styles.chartWrapper, { height: heightAnim }]}>
        <ScrollView
          ref={scrollViewRef}
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
            selectedSlice={selections[0] || null}
            onSelectSlice={(name) => handleSelectSlice(0, name)}
            onLayout={handlePageLayout(0)}
          />
          <ChartPage
            title="Muscle Group"
            data={dataL2}
            selectedSlice={selections[1] || null}
            onSelectSlice={(name) => handleSelectSlice(1, name)}
            onLayout={handlePageLayout(1)}
          />
          <ChartPage
            title="Specific Muscle"
            data={dataL3}
            selectedSlice={selections[2] || null}
            onSelectSlice={(name) => handleSelectSlice(2, name)}
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
    width: '100%',
  },
  chartWrapper: {
    overflow: 'hidden',
    minHeight: MIN_CHART_HEIGHT,
  },
  pageContainer: {
    width: CHART_WIDTH,
    alignItems: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  chartTitle: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: spacing.sm,
    alignItems: 'center',
    minHeight: 60,
  },
  emptyChart: {
    height: 120,
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
