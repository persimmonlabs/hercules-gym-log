import React, { useMemo, useState } from 'react';
import { View, Dimensions, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

import { Text } from '@/components/atoms/Text';
import { colors, spacing, radius } from '@/constants/theme';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';

// Import data
import exercisesData from '@/data/exercises.json';
import hierarchyData from '@/data/hierarchy.json';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.xl * 2;

// Build Maps
const buildMaps = () => {
    const leafToL1: Record<string, string> = {}; // Specific -> Body Part (Upper/Lower/Core)
    const leafToL2: Record<string, string> = {}; // Specific -> Muscle Group (Chest/Back/etc)
    const l2ToL1: Record<string, string> = {}; // Muscle Group -> Body Part

    const hierarchy = hierarchyData.muscle_hierarchy;

    Object.entries(hierarchy).forEach(([l1, l1Data]) => {
        if (l1Data?.muscles) {
            Object.entries(l1Data.muscles).forEach(([l2, l2Data]) => {
                // l2 is "Chest", l2Data contains the low-level muscles
                leafToL1[l2] = l1;
                leafToL2[l2] = l2;
                l2ToL1[l2] = l1;

                if (l2Data?.muscles) {
                    Object.keys(l2Data.muscles).forEach(l3 => {
                        leafToL1[l3] = l1;
                        leafToL2[l3] = l2;
                    });
                }
            });
        }
    });

    return { leafToL1, leafToL2, l2ToL1 };
};

const { leafToL1, leafToL2, l2ToL1 } = buildMaps();

const EXERCISE_NAME_TO_MUSCLES = exercisesData.reduce((acc, ex) => {
    if (ex.muscles) {
        acc[ex.name] = ex.muscles as unknown as Record<string, number>;
    }
    return acc;
}, {} as Record<string, Record<string, number>>);

interface ChartPageProps {
    title: string;
    data: {
        labels: string[];
        datasets: { data: number[] }[];
    };
}

const ChartPage: React.FC<ChartPageProps> = ({ title, data }) => {
    // Calculate Max Value and Segments
    const rawMax = Math.max(...data.datasets[0].data, 0);

    // Find best step size
    const steps = [1, 5, 10, 25, 50, 100, 200, 250, 500, 1000, 2500, 5000, 10000];
    let targetMax = 10;
    let segments = 4;

    if (rawMax > 0) {
        for (const step of steps) {
            const segs = Math.ceil(rawMax / step);
            if (segs <= 5) {
                targetMax = segs * step;
                segments = segs;
                break;
            }
        }
    }

    // Ensure we have at least 2 segments for aesthetics if possible, or fallback defaults
    if (segments < 2 && targetMax > 0) {
        // If we picked a step that gave 1 segment (e.g. max=4, step=5 -> seg=1, max=5),
        // maybe we prefer smaller steps? 
        // Actually, the loop finds the *first* step where segs <= 5.
        // Since we iterate from small steps, we would have hit a larger segment count first.
        // Example max=4. step=1 -> seg=4. <=5? Yes. Pick step=1. targetMax=4. segments=4.
        // Example max=90. step=10 -> seg=9. >5. step=25 -> seg=4. <=5. Pick step=25. targetMax=100. segments=4.
        // So this logic is sound.
    }

    return (
        <View style={styles.pageContainer}>
            <Text variant="heading3" color="primary" style={styles.chartTitle}>{title}</Text>
            <BarChart
                data={data}
                width={CHART_WIDTH}
                height={220}
                yAxisLabel=""
                yAxisSuffix=" lbs"
                yLabelsOffset={28}
                segments={segments}
                {...({ yMax: targetMax } as any)} // Force yMax
                chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(255, 85, 0, ${opacity})`,
                    labelColor: (opacity = 1) => colors.text.primary,
                    fillShadowGradient: '#FF5500',
                    fillShadowGradientOpacity: 1,
                    style: {
                        borderRadius: 16,
                    },
                    barPercentage: 0.85,
                    propsForBackgroundLines: {
                        strokeDasharray: '4',
                        stroke: colors.neutral.gray400,
                        strokeWidth: 0.5,
                    },
                    propsForLabels: {
                        fontSize: 11,
                    },
                }}
                style={{
                    marginVertical: 8,
                    borderRadius: 16,
                }}
                showValuesOnTopOfBars={false}
                fromZero
            />
        </View>
    );
};

export const WeeklyVolumeChart: React.FC = () => {
    const workouts = useWorkoutSessionsStore((state) => state.workouts);
    const [currentPage, setCurrentPage] = useState(0);

    const { dataL1, dataUpper, dataLower, dataCore, hasData } = useMemo(() => {
        const volumeL1: Record<string, number> = {
            'Upper Body': 0,
            'Lower Body': 0,
            'Core': 0,
        };
        const volumeL2: Record<string, number> = {};

        // Filter for last 7 days
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const recentWorkouts = workouts.filter(w => {
            const wDate = new Date(w.date);
            return wDate >= oneWeekAgo && wDate <= now;
        });

        recentWorkouts.forEach(workout => {
            workout.exercises.forEach(exercise => {
                const weights = EXERCISE_NAME_TO_MUSCLES[exercise.name];
                if (!weights) return;

                exercise.sets.forEach(set => {
                    if (!set.completed || set.weight <= 0 || set.reps <= 0) return;

                    const setVolume = set.weight * set.reps;

                    Object.entries(weights).forEach(([muscle, weight]) => {
                        const contribution = setVolume * weight;

                        // L1 Accumulation
                        const cat1 = leafToL1[muscle];
                        if (cat1 && volumeL1[cat1] !== undefined) {
                            volumeL1[cat1] += contribution;
                        }

                        // L2 Accumulation
                        const cat2 = leafToL2[muscle];
                        if (cat2) {
                            volumeL2[cat2] = (volumeL2[cat2] || 0) + contribution;
                        }
                    });
                });
            });
        });

        const formatData = (labels: string[], values: number[]) => ({
            labels,
            datasets: [{ data: values.map(v => Math.round(v)) }],
        });

        // L1 Data
        const dataL1 = formatData(
            ['Upper Body', 'Lower Body', 'Core'],
            [volumeL1['Upper Body'], volumeL1['Lower Body'], volumeL1['Core']]
        );

        // Helper to get L2 data for a specific L1 parent
        const getL2Data = (parentL1: string) => {
            const muscles = Object.keys(hierarchyData.muscle_hierarchy[parentL1 as keyof typeof hierarchyData.muscle_hierarchy].muscles);
            const values = muscles.map(m => volumeL2[m] || 0);
            const labels = muscles.map(m => m === 'Hip Stabilizers' ? 'Hips' : m);
            return formatData(labels, values);
        };

        const dataUpper = getL2Data('Upper Body');
        const dataLower = getL2Data('Lower Body');
        const dataCore = getL2Data('Core');

        const hasData = [volumeL1, volumeL2].some(dict => Object.values(dict).some(v => v > 0));

        return { dataL1, dataUpper, dataLower, dataCore, hasData };
    }, [workouts]);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const pageIndex = Math.round(contentOffsetX / CHART_WIDTH);
        if (pageIndex !== currentPage) {
            setCurrentPage(pageIndex);
        }
    };

    if (!hasData) {
        return (
            <View style={styles.emptyContainer}>
                <Text variant="body" color="secondary">No volume data for the last week.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.pagination}>
                {[0, 1, 2, 3].map((index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            index === currentPage ? styles.activeDot : styles.inactiveDot
                        ]}
                    />
                ))}
            </View>

            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                style={{ width: CHART_WIDTH }}
            >
                <ChartPage title="Total Volume" data={dataL1} />
                <ChartPage title="Upper Body" data={dataUpper} />
                <ChartPage title="Lower Body" data={dataLower} />
                <ChartPage title="Core" data={dataCore} />
            </ScrollView>
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
});
