import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { triggerHaptic } from '@/utils/haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFocusEffect } from '@react-navigation/native';
import { Text } from '@/components/atoms/Text';
import { springGentle } from '@/constants/animations';
import { colors, radius, sizing, spacing } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const WorkoutSuccessScreen: React.FC = () => {
  const router = useRouter();
  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);
  const ringProgress = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const navigateHome = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  const { circumference, radiusValue } = useMemo(() => {
    const ringRadius = sizing.iconXL / 2;
    return {
      radiusValue: ringRadius,
      circumference: 2 * Math.PI * ringRadius,
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Reset animation state immediately on focus
      opacity.value = 0;
      scale.value = 0.92;
      ringProgress.value = 0;

      triggerHaptic('success');

      opacity.value = withSpring(1, springGentle);
      scale.value = withSpring(1, springGentle);
      ringProgress.value = withDelay(400, withTiming(1, {
        duration: 900,
        easing: Easing.inOut(Easing.linear),
      }, (finished) => {
        if (finished) {
          runOnJS(navigateHome)();
        }
      }));

      // Safety fallback: Ensure we navigate home even if animation is interrupted
      const timer = setTimeout(() => {
        navigateHome();
      }, 1600);

      return () => clearTimeout(timer);
    }, [navigateHome, opacity, ringProgress, scale])
  );

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - ringProgress.value),
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + sizing.tabBarHeight }]}>
      <Animated.View style={[styles.messageStack, cardAnimatedStyle]}>
        <Text variant="display1" color="orange" style={styles.successTitle}>
          Great Work!
        </Text>
        <View style={styles.checkContainer}>
          <Svg width={sizing.iconXL} height={sizing.iconXL}>
            <AnimatedCircle
              cx={radiusValue}
              cy={radiusValue}
              r={radiusValue - spacing.xxxs}
              stroke={colors.accent.orange}
              strokeWidth={spacing.xxs}
              fill="none"
              strokeDasharray={`${circumference}`}
              animatedProps={animatedCircleProps}
              strokeLinecap="round"
              rotation="-90"
              origin={`${radiusValue}, ${radiusValue}`}
            />
          </Svg>
          <MaterialCommunityIcons
            name="check"
            size={sizing.iconLG}
            color={colors.accent.orange}
            accessibilityLabel="Workout complete"
            style={styles.checkIcon}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  messageStack: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  successTitle: {
    textAlign: 'center',
    fontSize: sizing.iconXL,
    lineHeight: sizing.iconXL + spacing.sm,
  },
  checkContainer: {
    width: sizing.iconXL,
    height: sizing.iconXL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    position: 'absolute',
  },
});

export default WorkoutSuccessScreen;
