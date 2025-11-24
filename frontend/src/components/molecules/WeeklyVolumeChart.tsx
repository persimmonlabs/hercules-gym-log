import React, { useMemo, useState, useEffect } from 'react';
import { View, Dimensions, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent, TouchableOpacity } from 'react-native';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTheme } from 'victory-native';

import { Text } from '@/components/atoms/Text';
import { colors, spacing, radius } from '@/constants/theme';
import { useWorkoutSessionsStore } from '@/store/workoutSessionsStore';

// Import data
import exercisesData from '@/data/exercises.json';
import hierarchyData from '@/data/hierarchy.json';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.sm * 2;

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
        values: number[];
    };
    selectedBar: { label: string; value: number } | null;
    setSelectedBar: (bar: { label: string; value: number } | null) => void;
}

const ChartPage: React.FC<ChartPageProps> = ({ title, data, selectedBar, setSelectedBar }) => {
    // Calculate Max Value and Y-axis ticks
    const rawMax = Math.max(...data.values, 0);

    // Allowed increment values
    const allowedIncrements = [
        0.1, 0.25, 0.5, 1, 2.5, 5, 10, 25, 50, 100, 200, 250, 300, 400, 500,
        1000, 2000, 2500, 3000, 4000, 5000, 10000, 20000, 25000, 50000, 100000
    ];

    let targetMax = 10;
    let increment = 2.5;

    if (rawMax > 0) {
        // Find the best increment that gives us 2-5 segments
        for (const inc of allowedIncrements) {
            const segs = Math.ceil(rawMax / inc);
            if (segs >= 2 && segs <= 5) {
                targetMax = segs * inc;
                increment = inc;
                break;
            }
        }

        // Fallback: if no increment gives 2-5 segments, use the last one that fits
        if (targetMax < rawMax) {
            for (const inc of allowedIncrements) {
                const segs = Math.ceil(rawMax / inc);
                if (segs <= 5) {
                    targetMax = segs * inc;
                    increment = inc;
                    break;
                }
            }
        }
    }

    // Generate Y-axis tick values
    const yTickValues: number[] = [];
    for (let i = 0; i <= targetMax; i += increment) {
        yTickValues.push(i);
    }

    // Prepare chart data
    const chartData = data.labels.map((label, index) => ({
        x: label,
        y: data.values[index] || 0,
    }));

    // Calculate tooltip position based on selected bar value and position
    const getTooltipPosition = () => {
        if (!selectedBar) return { top: 10, left: 0 };
        
        const chartHeight = 250;
        const chartWidth = CHART_WIDTH - spacing.sm * 2;
        const chartPadding = { top: 20, bottom: 40, left: 50, right: 30 };
        const usableHeight = chartHeight - chartPadding.top - chartPadding.bottom;
        const usableWidth = chartWidth - chartPadding.left - chartPadding.right;
        const maxValue = Math.max(...data.values, 1);
        
        // Find the index of the selected bar
        const barIndex = data.labels.indexOf(selectedBar.label);
        const numBars = data.labels.length;
        
        // Calculate bar position (center of the bar)
        const barWidth = 20; // VictoryBar width from style
        const domainPadding = 40; // domainPadding from VictoryChart
        const barSpacing = (usableWidth - domainPadding * 2) / numBars;
        const barCenterX = chartPadding.left + domainPadding + (barIndex * barSpacing) + (barSpacing / 2);
        
        // Calculate vertical position (just above the bar top)
        const barHeight = (selectedBar.value / maxValue) * usableHeight;
        const tooltipTop = chartPadding.top + usableHeight - barHeight - 25; // 25px above bar top
        
        return { 
            top: Math.max(chartPadding.top, tooltipTop),
            left: barCenterX,
        };
    };

    return (
        <View style={styles.pageContainer}>
            <Text variant="heading3" color="primary" style={styles.chartTitle}>{title}</Text>
            <View style={styles.chartContainer}>
                <VictoryChart
                    theme={VictoryTheme.material}
                    domainPadding={{ x: 40 }}
                    padding={{ top: 20, bottom: 40, left: 50, right: 30 }}
                    height={250}
                    width={CHART_WIDTH - spacing.sm * 2}
                >
                    <VictoryAxis
                        tickValues={data.labels}
                        style={{
                            axis: { stroke: 'none' },
                            tickLabels: { fill: colors.text.primary, fontSize: 10, padding: 5 },
                            grid: { stroke: 'none' }
                        }}
                    />
                    <VictoryAxis
                        dependentAxis
                        tickValues={yTickValues}
                        tickFormat={(t) => `${Math.round(t)}`}
                        style={{
                            axis: { stroke: 'none' },
                            tickLabels: { fill: colors.text.secondary, fontSize: 10, padding: 5 },
                            grid: { stroke: colors.neutral.gray200, strokeDasharray: '4, 4' }
                        }}
                    />
                    <VictoryBar
                        data={chartData}
                        style={{
                            data: {
                                fill: '#FF5500',
                                width: 20,
                            }
                        }}
                        cornerRadius={{ top: 4 }}
                        animate={{
                            duration: 500,
                            onLoad: { duration: 500 }
                        }}
                        events={[{
                            target: "data",
                            eventHandlers: {
                                onPressIn: () => {
                                    return [
                                        {
                                            target: "data",
                                            mutation: (props) => {
                                                const barData = {
                                                    label: props.datum.x,
                                                    value: props.datum.y
                                                };
                                                // Toggle: if same bar is selected, close it; otherwise show new bar
                                                const newBarData = selectedBar?.label === barData.label ? null : barData;
                                                setSelectedBar(newBarData);
                                                return null;
                                            }
                                        }
                                    ];
                                }
                            }
                        }]}
                    />
                </VictoryChart>
                
                {/* Tooltip */}
                {selectedBar && (
                    <View style={[styles.tooltip, getTooltipPosition()]}>
                        <Text variant="caption" color="primary" style={styles.tooltipText}>
                            {selectedBar.label}: {Math.round(selectedBar.value)} lbs
                        </Text>
                    </View>
                )}
            </View>
            
            {/* Transparent overlay to capture taps anywhere on screen */}
            {selectedBar && (
                <TouchableOpacity 
                    style={styles.fullScreenOverlay}
                    onPress={() => setSelectedBar(null)}
                    activeOpacity={1}
                />
            )}
        </View>
    );
};

export const WeeklyVolumeChart: React.FC = () => {
    const workouts = useWorkoutSessionsStore((state) => state.workouts);
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedBar, setSelectedBar] = useState<{ label: string; value: number } | null>(null);

    // Clear selected bar when switching pages
    useEffect(() => {
        setSelectedBar(null);
    }, [currentPage]);

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
            values: values.map(v => Math.round(v))
        });

        // L1 Data
        const dataL1 = formatData(
            ['Upper\nBody', 'Lower\nBody', 'Core'],
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
                <Text variant="body" color="secondary">No workout data available for this week.</Text>
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
                <ChartPage title="Total Volume (lbs)" data={dataL1} selectedBar={selectedBar} setSelectedBar={setSelectedBar} />
                <ChartPage title="Upper Body" data={dataUpper} selectedBar={selectedBar} setSelectedBar={setSelectedBar} />
                <ChartPage title="Lower Body" data={dataLower} selectedBar={selectedBar} setSelectedBar={setSelectedBar} />
                <ChartPage title="Core" data={dataCore} selectedBar={selectedBar} setSelectedBar={setSelectedBar} />
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
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: spacing.sm,
    },
    chartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
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
    tooltip: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: radius.sm,
        transform: [{ translateX: -50 }], // Center the tooltip on the calculated position
    },
    tooltipText: {
        textAlign: 'center',
    },
    fullScreenOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
    },
});
