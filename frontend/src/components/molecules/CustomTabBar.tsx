/**
 * CustomTabBar
 * Floating, glassmorphism tab bar with animated interactions and haptics.
 */
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View, TouchableOpacity } from 'react-native';
import type { ColorValue } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView, type ExperimentalBlurMethod } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, radius, sizing, zIndex, shadows } from '@/constants/theme';
import { springBouncy } from '@/constants/animations';
import { TAB_META } from '@/constants/navigation';
import { useSessionStore } from '@/store/sessionStore';

const ICON_SIZE = sizing.iconLG;
const BLUR_INTENSITY = 100;
const TAB_HORIZONTAL_INSET = spacing.sm;
const TAB_MINIMUM_BOTTOM_GAP = spacing.xs / 2;
const TAB_FLOAT_LIFT = spacing.lg;
const TAB_SURFACE_COLOR = colors.surface.card;
const TAB_BORDER_COLOR = colors.primary.light;
const BLUR_METHOD: ExperimentalBlurMethod | undefined = Platform.OS === 'android' ? 'dimezisBlurView' : undefined;
const BLUR_REDUCTION_FACTOR: number | undefined = Platform.OS === 'android' ? 1 : undefined;
const ACTIVE_GRADIENT: readonly [ColorValue, ColorValue] = [
  colors.accent.gradientStart,
  colors.accent.gradientEnd,
];
const SCALE_ACTIVE = 1.1;

const createGradientIcon = (iconName: keyof typeof Ionicons.glyphMap) => (
  <MaskedView
    style={styles.gradientMask}
    maskElement={(
      <View style={styles.maskContent}>
        <Ionicons name={iconName} size={ICON_SIZE} color="#FFFFFF" />
      </View>
    )}
  >
    <LinearGradient
      colors={ACTIVE_GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientFill}
    />
  </MaskedView>
);

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();
  const isSessionActive = useSessionStore((store) => store.isSessionActive);
  const scalesRef = useRef<SharedValue<number>[]>(state.routes.map(() => useSharedValue(1)));

  const deviceSafeBottom = Math.max(insets.bottom, 0);
  const bottomOffset = deviceSafeBottom + spacing.sm;
  const containerInsets = {
    left: TAB_HORIZONTAL_INSET,
    right: TAB_HORIZONTAL_INSET,
    bottom: bottomOffset,
  };

  const focusTab = (index: number, routeName: string) => {
    const route = state.routes[index];
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) navigation.navigate(routeName);

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    scalesRef.current[index].value = withSpring(SCALE_ACTIVE, springBouncy);
    setTimeout(() => { scalesRef.current[index].value = withSpring(1, springBouncy); }, 140);
  };
  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: bottomOffset,
          backgroundColor: colors.primary.bg,
          zIndex: zIndex.modal - 1,
        }}
      />
      <View pointerEvents="box-none" style={[styles.positioner, containerInsets]}>
        {/* Corner patches to block content bleed-through in the rounded corner gaps */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: -1,
            left: 0,
            width: radius.xl,
            height: radius.xl + 1,
            backgroundColor: colors.primary.bg,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: -1,
            right: 0,
            width: radius.xl,
            height: radius.xl + 1,
            backgroundColor: colors.primary.bg,
          }}
        />
        <View style={styles.shadowWrapper}>
          <View style={styles.tabContainer}>
            <BlurView
              intensity={BLUR_INTENSITY}
              tint="light"
              experimentalBlurMethod={BLUR_METHOD}
              blurReductionFactor={BLUR_REDUCTION_FACTOR}
              style={styles.blurShell}
            >
              <View pointerEvents="none" style={styles.blurOverlay} />
              <View style={styles.tabRow}>
                {state.routes.map((route, index) => {
                  const tabMeta = TAB_META.find((tab) => tab.route === route.name);
                  if (!tabMeta) {
                    return null;
                  }

                  const currentRouteName = state.routes[state.index]?.name;
                  const isCreateWorkoutScreen = currentRouteName === 'create-workout' || currentRouteName === 'create-plan';
                  const isCreateProgramScreen = currentRouteName === 'create-program';
                  const isBrowseProgramsScreen = currentRouteName === 'browse-programs';
                  const isAddWorkoutScreen = currentRouteName === 'add-workout';
                  const isProgramDetailsScreen = currentRouteName === 'program-details';
                  const isEditPlanScreen = currentRouteName === 'edit-plan';
                  const isEditScheduleScreen = currentRouteName === 'schedule-editor';
                  const isPlansTab = route.name === 'plans';
                  const isFocused = state.index === index || (isCreateWorkoutScreen && isPlansTab) || (isCreateProgramScreen && isPlansTab) || (isBrowseProgramsScreen && isPlansTab) || (isAddWorkoutScreen && isPlansTab) || (isProgramDetailsScreen && isPlansTab) || (isEditPlanScreen && isPlansTab) || (isEditScheduleScreen && isPlansTab);
                  const isWorkoutRoute = route.name === 'workout';
                  const showActiveSessionGlow = isWorkoutRoute && isSessionActive;
                  const animatedStyle = useAnimatedStyle(() => ({
                    transform: [{ scale: scalesRef.current[index].value }],
                  }));

                  return (
                    <Animated.View key={route.key} style={[styles.tabSlot, animatedStyle]}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityState={{ selected: isFocused }}
                        onPress={() => focusTab(index, route.name)}
                        activeOpacity={1}
                        style={styles.touchable}
                      >
                        {showActiveSessionGlow ? (
                          <Ionicons
                            name="play"
                            size={ICON_SIZE}
                            color={colors.accent.orange}
                          />
                        ) : isFocused ? (
                          isWorkoutRoute ? (
                            <Ionicons
                              name="play-outline"
                              size={ICON_SIZE}
                              color={colors.accent.orange}
                            />
                          ) : (
                            createGradientIcon(tabMeta.icon)
                          )
                        ) : (
                          <Ionicons
                            name={tabMeta.icon}
                            size={ICON_SIZE}
                            color={colors.text.primary}
                          />
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            </BlurView>
          </View>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  positioner: {
    position: 'absolute',
    zIndex: zIndex.modal,
  },
  shadowWrapper: {
    borderRadius: radius.xl,
    backgroundColor: TAB_SURFACE_COLOR,
    ...shadows.lg,
  },
  tabContainer: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: TAB_SURFACE_COLOR,
    borderColor: TAB_BORDER_COLOR,
    borderWidth: spacing.xxxs,
  },
  blurShell: {
    borderRadius: radius.xl,
    backgroundColor: TAB_SURFACE_COLOR,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: TAB_SURFACE_COLOR,
    opacity: 0.9,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    overflow: 'visible',
  },
  maskContent: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientMask: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gradientFill: {
    ...StyleSheet.absoluteFillObject,
  },
});