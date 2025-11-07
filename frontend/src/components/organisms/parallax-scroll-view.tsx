import React, { type PropsWithChildren, type ReactElement, useMemo } from 'react';
import { Platform, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollOffset,
} from 'react-native-reanimated';

import { ThemedView } from '@/components/atoms/themed-view';
import { colors, spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const HEADER_HEIGHT = 240;

type ThemeMode = 'light' | 'dark';

interface ParallaxScrollViewProps extends PropsWithChildren {
  headerImage?: ReactElement;
  headerBackgroundColor?: Record<ThemeMode, string>;
}

const DEFAULT_HEADER_COLORS: Record<ThemeMode, string> = {
  light: colors.primary.light,
  dark: colors.primary.dark,
};

const baseStyles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
});

const createDynamicStyles = (backgroundColor: string, headerColor: string) =>
  StyleSheet.create({
    scrollView: {
      backgroundColor,
    },
    header: {
      backgroundColor: headerColor,
    },
  });

const ParallaxScrollView: React.FC<ParallaxScrollViewProps> = ({
  children,
  headerImage,
  headerBackgroundColor,
}) => {
  const theme = (useColorScheme() ?? 'light') as ThemeMode;
  const backgroundColors: Record<ThemeMode, string> = {
    light: colors.primary.bg,
    dark: colors.primary.dark,
  };
  const headerColors = headerBackgroundColor ?? DEFAULT_HEADER_COLORS;
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollOffset(scrollRef);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT * 0.5, 0, HEADER_HEIGHT * 0.75]
          ),
        },
        {
          scale: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT], [2, 1, 1]),
        },
      ],
    } as ViewStyle;
  });

  const dynamicStyles = useMemo(
    () => createDynamicStyles(backgroundColors[theme], headerColors[theme]),
    [backgroundColors, headerColors, theme]
  );

  return (
    <Animated.ScrollView
      ref={scrollRef}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      bounces={Platform.OS === 'ios'}
      alwaysBounceVertical={Platform.OS === 'ios'}
      decelerationRate="normal"
      style={[baseStyles.scrollView, dynamicStyles.scrollView]}>
      <Animated.View
        style={[baseStyles.header, dynamicStyles.header, headerAnimatedStyle]}
      >
        {headerImage}
      </Animated.View>
      <ThemedView style={baseStyles.content}>{children}</ThemedView>
    </Animated.ScrollView>
  );
};

export default ParallaxScrollView;
