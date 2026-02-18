/**
 * CustomTabBar
 * Floating, glassmorphism tab bar with animated interactions and haptics.
 */
import React from 'react';
import { Platform, StyleSheet, View, TouchableOpacity } from 'react-native';
import type { ColorValue } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView, type ExperimentalBlurMethod } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, radius, sizing, zIndex, shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { springBouncy } from '@/constants/animations';
import { TAB_META } from '@/constants/navigation';
import { useSessionStore } from '@/store/sessionStore';
import { useNavigationStore } from '@/store/navigationStore';
import { triggerHaptic } from '@/utils/haptics';

const ICON_SIZE = sizing.iconLG;
const BLUR_INTENSITY = 100;
const TAB_HORIZONTAL_INSET = spacing.sm;
const TAB_MINIMUM_BOTTOM_GAP = spacing.xs / 2;
const TAB_FLOAT_LIFT = spacing.lg;
const BLUR_METHOD: ExperimentalBlurMethod | undefined = Platform.OS === 'android' ? 'dimezisBlurView' : undefined;
const BLUR_REDUCTION_FACTOR: number | undefined = Platform.OS === 'android' ? 1 : undefined;
const SCALE_ACTIVE = 1.1;
const PROFILE_CHILD_ROUTES = ['profile', 'distribution-analytics', 'volume-analytics'] as const;
type ProfileChildRoute = typeof PROFILE_CHILD_ROUTES[number];
const isProfileChildRoute = (routeName?: string): routeName is ProfileChildRoute =>
  Boolean(routeName && PROFILE_CHILD_ROUTES.includes(routeName as ProfileChildRoute));

type TabBarItemProps = {
  isFocused: boolean;
  isWorkoutRoute: boolean;
  showActiveSessionGlow: boolean;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  theme: any;
  createGradientIcon: (iconName: keyof typeof Ionicons.glyphMap) => React.ReactElement;
};

const TabBarItem: React.FC<TabBarItemProps> = ({
  isFocused,
  isWorkoutRoute,
  showActiveSessionGlow,
  iconName,
  onPress,
  theme,
  createGradientIcon,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.tabSlot, animatedStyle]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ selected: isFocused }}
        onPress={() => {
          onPress();
          scale.value = withSpring(SCALE_ACTIVE, springBouncy);
          setTimeout(() => {
            scale.value = withSpring(1, springBouncy);
          }, 140);
        }}
        activeOpacity={1}
        style={styles.touchable}
      >
        {showActiveSessionGlow ? (
          <Ionicons name="play" size={ICON_SIZE} color={theme.accent.orange} />
        ) : isFocused ? (
          isWorkoutRoute ? (
            <Ionicons
              name="play-outline"
              size={ICON_SIZE}
              color={theme.accent.orange}
            />
          ) : (
            createGradientIcon(iconName)
          )
        ) : (
          <Ionicons name={iconName} size={ICON_SIZE} color={theme.text.primary} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();
  const { theme, isDarkMode } = useTheme();
  const isSessionActive = useSessionStore((store) => store.isSessionActive);
  const workoutDetailSource = useNavigationStore((store) => store.workoutDetailSource);

  const TAB_SURFACE_COLOR = theme.surface.card;
  const TAB_BORDER_COLOR = theme.primary.light;
  const ACTIVE_GRADIENT: readonly [ColorValue, ColorValue] = [
    theme.accent.gradientStart,
    theme.accent.gradientEnd,
  ];

  const deviceSafeBottom = Math.max(insets.bottom, 0);
  const bottomOffset = deviceSafeBottom + spacing.sm;
  const containerInsets = {
    left: TAB_HORIZONTAL_INSET,
    right: TAB_HORIZONTAL_INSET,
    bottom: bottomOffset,
  };

  const currentRouteName = state.routes[state.index]?.name;
  const isWorkoutSessionPage = isSessionActive && currentRouteName === 'workout';
  const fillBackgroundColor = isWorkoutSessionPage ? 'transparent' : theme.primary.bg;


  const focusTab = (routeKey: string, routeName: string) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) navigation.navigate(routeName);

    triggerHaptic('light');
  };
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
          backgroundColor: fillBackgroundColor,
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
            backgroundColor: fillBackgroundColor,
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
            backgroundColor: fillBackgroundColor,
          }}
        />
        <View style={[styles.shadowWrapper, { backgroundColor: TAB_SURFACE_COLOR }]}>
          <View style={[styles.tabContainer, { backgroundColor: TAB_SURFACE_COLOR, borderColor: TAB_BORDER_COLOR }]}>
            <BlurView
              intensity={BLUR_INTENSITY}
              tint={isDarkMode ? 'dark' : 'light'}
              experimentalBlurMethod={BLUR_METHOD}
              blurReductionFactor={BLUR_REDUCTION_FACTOR}
              style={[styles.blurShell, { backgroundColor: TAB_SURFACE_COLOR }]}
            >
              <View pointerEvents="none" style={[styles.blurOverlay, { backgroundColor: TAB_SURFACE_COLOR }]} />
              <View style={styles.tabRow}>
                {state.routes.map((route, index) => {
                  const tabMeta = TAB_META.find((tab) => tab.route === route.name);
                  if (!tabMeta) {
                    return null;
                  }

                  const currentRouteName = state.routes[state.index]?.name;
                  const isProfileChildScreen = isProfileChildRoute(currentRouteName);
                  const isCreateWorkoutScreen = currentRouteName === 'create-workout' || currentRouteName === 'create-plan';
                  const isCreateProgramScreen = currentRouteName === 'create-program';
                  const isBrowseProgramsScreen = currentRouteName === 'browse-programs';
                  const isAddWorkoutScreen = currentRouteName === 'add-workout';
                  const isProgramDetailsScreen = currentRouteName === 'program-details';
                  const isEditPlanScreen = currentRouteName === 'edit-plan';
                  const isEditScheduleScreen = currentRouteName === 'schedule-editor' || currentRouteName === 'schedule-setup';
                  const isPlansTab = route.name === 'plans';
                  const isProfileTab = route.name === 'profile';
                  const isWorkoutDetailScreen = currentRouteName === 'workout-detail';
                  const isFocused =
                    state.index === index
                    || (isCreateWorkoutScreen && isPlansTab)
                    || (isCreateProgramScreen && isPlansTab)
                    || (isBrowseProgramsScreen && isPlansTab)
                    || (isAddWorkoutScreen && isPlansTab)
                    || (isProgramDetailsScreen && isPlansTab)
                    || (isEditPlanScreen && isPlansTab)
                    || (isEditScheduleScreen && isPlansTab)
                    || (isProfileChildScreen && isProfileTab)
                    || (isWorkoutDetailScreen && workoutDetailSource === 'dashboard' && route.name === 'index')
                    || (isWorkoutDetailScreen && workoutDetailSource === 'calendar' && route.name === 'calendar');
                  const isWorkoutRoute = route.name === 'workout';
                  const showActiveSessionGlow = isWorkoutRoute && isSessionActive;

                  return (
                    <TabBarItem
                      key={route.key}
                      isFocused={isFocused}
                      isWorkoutRoute={isWorkoutRoute}
                      showActiveSessionGlow={showActiveSessionGlow}
                      iconName={tabMeta.icon}
                      theme={theme}
                      createGradientIcon={createGradientIcon}
                      onPress={() => focusTab(route.key, route.name)}
                    />
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
    ...shadows.lg,
  },
  tabContainer: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: spacing.xxxs,
  },
  blurShell: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
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