import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Dimensions, Modal } from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/atoms/Text';
import { colors, radius, shadows, spacing, zIndex } from '@/constants/theme';
import { springGentle } from '@/constants/animations';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_DISMISS_THRESHOLD = spacing['2xl'] * 2;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface SheetModalProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    headerContent?: React.ReactNode;
    children: React.ReactNode;
    height?: string | number;
}

export const SheetModal: React.FC<SheetModalProps> = ({
    visible,
    onClose,
    title,
    headerContent,
    children,
    height = '80%',
}) => {
    const insets = useSafeAreaInsets();
    const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);
    const [isModalVisible, setIsModalVisible] = useState(visible);

    React.useEffect(() => {
        if (visible) {
            setIsModalVisible(true);
            // Small delay to ensure modal is rendered before animating
            requestAnimationFrame(() => {
                sheetTranslateY.value = withSpring(0, springGentle);
            });
        } else {
            // Animate out when visibility changes to false
            sheetTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 }, (finished) => {
                if (finished) {
                    runOnJS(setIsModalVisible)(false);
                }
            });
        }
    }, [visible, sheetTranslateY]);

    const sheetAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: sheetTranslateY.value }],
    }));

    const sheetGesture = Gesture.Pan()
        .activeOffsetY(10)
        .failOffsetY(-10)
        .shouldCancelWhenOutside(false)
        .onUpdate((event) => {
            if (event.translationY < 0) {
                return;
            }
            sheetTranslateY.value = event.translationY;
        })
        .onEnd((event) => {
            if (sheetTranslateY.value > SHEET_DISMISS_THRESHOLD) {
                sheetTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 }, () => {
                    runOnJS(onClose)();
                });
            } else {
                sheetTranslateY.value = withSpring(0, springGentle);
            }
        });

    // Handle backdrop press with animation
    const handleBackdropPress = () => {
        // Just trigger close, the parent will update 'visible' -> false, which triggers the useEffect animation
        onClose();
    };

    const backdropStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            sheetTranslateY.value,
            [0, SCREEN_HEIGHT],
            [1, 0],
            Extrapolation.CLAMP
        );

        return {
            opacity,
        };
    });

    return (
        <Modal
            transparent
            visible={isModalVisible}
            animationType="none"
            onRequestClose={onClose}
        >
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={styles.overlay}>
                    <AnimatedPressable
                        style={[styles.backdrop, backdropStyle]}
                        onPress={handleBackdropPress}
                    />

                    <Animated.View
                        style={[
                            styles.sheet,
                            { height: height as any, paddingBottom: insets.bottom },
                            sheetAnimatedStyle,
                        ]}
                    >
                        <GestureDetector gesture={sheetGesture}>
                            <View>
                                <View style={styles.handleContainer}>
                                    <View style={styles.handle} />
                                </View>

                                {(title || headerContent) && (
                                    <View style={styles.header}>
                                        {title && <Text variant="heading2">{title}</Text>}
                                        {headerContent}
                                    </View>
                                )}
                            </View>
                        </GestureDetector>

                        <View style={styles.content}>
                            {children}
                        </View>
                    </Animated.View>
                </View >
            </GestureHandlerRootView >
        </Modal >
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        // zIndex not needed inside Modal
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay.scrim,
    },
    sheet: {
        backgroundColor: colors.surface.card,
        borderTopLeftRadius: radius.lg,
        borderTopRightRadius: radius.lg,
        width: '100%',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        ...shadows.lg,
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.border.light,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
        gap: spacing.md,
    },
    content: {
        flex: 1,
        overflow: 'visible',
    },
});
