/**
 * TabSwipeContainer
 * Template providing a vertically scrolling container with buttery flick momentum.
 * Removes horizontal swipe navigation to prioritize seamless vertical interaction.
 */

import React, { ReactNode, useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, sizing, spacing } from '@/constants/theme';

interface TabSwipeContainerProps {
  /** Screen content */
  children: ReactNode;
  /** Optional content container style fed into ScrollView */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Control visibility of the vertical scroll indicator */
  showsVerticalScrollIndicator?: boolean;
}

const momentumDeceleration = Platform.select<'normal' | 'fast' | number>({
  ios: 0.998,
  android: 0.985,
  default: 'normal',
});

const SCROLL_BOTTOM_BUFFER = spacing.md;

export const TabSwipeContainer: React.FC<TabSwipeContainerProps> = ({
  children,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
}) => {
  const insets = useSafeAreaInsets();

  const paddingBottom = useMemo<number>(
    () => SCROLL_BOTTOM_BUFFER + sizing.tabBarHeight + insets.bottom,
    [insets.bottom]
  );

  const composedContentStyle = useMemo<StyleProp<ViewStyle>>(
    () => [contentContainerStyle, { paddingBottom }],
    [contentContainerStyle, paddingBottom]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        scrollEventThrottle={16}
        nestedScrollEnabled
        decelerationRate={momentumDeceleration}
        overScrollMode="always"
        bounces={Platform.OS === 'ios'}
        alwaysBounceVertical={Platform.OS === 'ios'}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        contentContainerStyle={composedContentStyle}
      >
        {children}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
  },
  scrollView: {
    backgroundColor: colors.primary.bg,
  },
});
