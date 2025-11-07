/**
 * AnimatedAccentStripe
 * Ambient gradient stripe using brand accent colors with subtle breathing motion.
 */

import React, { useEffect, useMemo } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { gradients } from '@/constants/theme';

type AnimatedAccentStripeProps = {
  /** Optional style overrides for stripe layout */
  style?: StyleProp<ViewStyle>;
};

type AccentColorStops = readonly [string, string];

type AnimatedGradientProps = {
  colors: AccentColorStops;
};

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const BREATH_DURATION_MS = 13000;

export const AnimatedAccentStripe: React.FC<AnimatedAccentStripeProps> = ({ style }) => {
  const progress = useSharedValue<number>(0);

  const [startStops, midStops, endStops] = useMemo<AccentColorStops[]>(
    () => [gradients.accentBreathing.start, gradients.accentBreathing.mid, gradients.accentBreathing.end],
    []
  );

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: BREATH_DURATION_MS,
        easing: Easing.inOut(Easing.cubic),
      }),
      -1,
      true
    );
  }, [progress]);

  const animatedProps = useAnimatedProps<AnimatedGradientProps>(() => {
    const topColor = interpolateColor(progress.value, [0, 0.5, 1], [startStops[0], midStops[0], endStops[0]]);
    const bottomColor = interpolateColor(progress.value, [0, 0.5, 1], [startStops[1], midStops[1], endStops[1]]);

    return {
      colors: [topColor, bottomColor] as AccentColorStops,
    };
  });

  return (
    <AnimatedLinearGradient
      pointerEvents="none"
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      colors={startStops}
      animatedProps={animatedProps}
      style={style}
    />
  );
};
