import React, { useEffect, useMemo, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform, StyleSheet, ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import 'react-native-reanimated';

import { colors, darkColors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { PlanBuilderProvider } from '@/providers/PlanBuilderProvider';
import { ProgramBuilderProvider } from '@/providers/ProgramBuilderProvider';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useActiveScheduleStore } from '@/store/activeScheduleStore';
import { useCustomExerciseStore } from '@/store/customExerciseStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useNotificationStore } from '@/store/notificationStore';
import { scheduleNotifications } from '@/services/notificationService';

import './add-exercises';

export const unstable_settings = {
  anchor: '(tabs)',
  useNativeStack: true,
};

const useProtectedRoute = (session: any, isLoading: boolean, onboardingCompleted: boolean | undefined, profileLoading: boolean) => {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || profileLoading) return;

    const inAuthGroup = (segments[0] as string) === 'auth';
    const inOnboarding = (segments[0] as string) === 'onboarding';
    const onboardingDone = onboardingCompleted === true;

    if (!session && !inAuthGroup && !inOnboarding) {
      // Unauthenticated user not on auth or onboarding — send to welcome/onboarding
      router.replace('/onboarding' as any);
    } else if (session && inAuthGroup) {
      // Authenticated user on auth screens — send to dashboard
      router.replace('/(tabs)' as any);
    } else if (session && inOnboarding && onboardingDone) {
      // Authenticated user on onboarding but already completed — send to dashboard
      router.replace('/(tabs)' as any);
    } else if (session && !inOnboarding && !inAuthGroup && !onboardingDone) {
      // Authenticated user trying to access app but onboarding not complete — send back
      router.replace('/onboarding' as any);
    }
  }, [session, segments, isLoading, onboardingCompleted, profileLoading]);
};

const RootLayout: React.FC = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const { isDarkMode, theme } = useTheme();

  // Preload MaterialIcons font to prevent icon lag on first render
  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync(MaterialIcons.font);
        setFontsLoaded(true);
      } catch (error) {
        console.warn('[RootLayout] Failed to load MaterialIcons font:', error);
        setFontsLoaded(true); // Continue anyway to not block the app
      }
    };
    loadFonts();
  }, []);

  const statusBarStyle: 'light' | 'dark' = isDarkMode ? 'light' : 'dark';
  const statusBarBackgroundColor = Platform.OS === 'android'
    ? 'transparent'
    : theme.primary.bg;
  const androidStatusBarStyle: 'light' | 'dark' = isDarkMode ? 'light' : 'dark';

  const navigationTheme = useMemo(
    () => {
      if (isDarkMode) {
        return {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: darkColors.primary.bg,
            card: darkColors.primary.bg,
            text: darkColors.text.primary,
            border: darkColors.border.dark,
            primary: darkColors.accent.primary,
          },
        };
      }

      return {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.primary.bg,
          card: colors.primary.bg,
          text: colors.text.primary,
          border: colors.border.dark,
          primary: colors.accent.primary,
        },
      };
    },
    [isDarkMode],
  );

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const configureNavigationBar = async () => {
      const androidVersion = typeof Platform.Version === 'number'
        ? Platform.Version
        : Number.parseInt(String(Platform.Version), 10);

      try {
        if (!Number.isNaN(androidVersion) && androidVersion < 29) {
          await NavigationBar.setBackgroundColorAsync(theme.primary.bg);
        }
      } catch (error) {
        console.warn('[NavigationBar] Unable to set background color', error);
      }

      try {
        await NavigationBar.setButtonStyleAsync(isDarkMode ? 'light' : 'dark');
      } catch (error) {
        console.warn('[NavigationBar] Unable to set button style', error);
      }
    };

    void configureNavigationBar();
  }, [isDarkMode, theme.primary.bg]);

  return (
    <AuthProvider>
      <PlanBuilderProvider>
        <ProgramBuilderProvider>
          <RootLayoutNav
            navigationTheme={navigationTheme}
            isDarkMode={isDarkMode}
            theme={theme}
            statusBarBackgroundColor={statusBarBackgroundColor}
            statusBarStyle={statusBarStyle}
            androidStatusBarStyle={androidStatusBarStyle}
            fontsLoaded={fontsLoaded}
          />
        </ProgramBuilderProvider>
      </PlanBuilderProvider>
    </AuthProvider>
  );
};

// Separate component to use the Auth context
const RootLayoutNav = ({
  navigationTheme,
  isDarkMode,
  theme,
  statusBarBackgroundColor,
  statusBarStyle,
  androidStatusBarStyle,
  fontsLoaded,
}: any) => {
  const { session, isLoading, user } = useAuth();
  const segments = useSegments();
  const fetchProfile = useUserProfileStore((state) => state.fetchProfile);
  const hydrateActiveSchedule = useActiveScheduleStore((state) => state.hydrateActiveSchedule);
  const hydrateCustomExercises = useCustomExerciseStore((state) => state.hydrateCustomExercises);
  const syncFromSupabase = useSettingsStore((state) => state.syncFromSupabase);
  const { notificationsEnabled, configs: notificationConfigs } = useNotificationStore();

  // Fetch profile and hydrate stores when user session is established
  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
      hydrateActiveSchedule(user.id);
      hydrateCustomExercises(user.id);
      syncFromSupabase();
    }
  }, [user?.id, fetchProfile, hydrateActiveSchedule, hydrateCustomExercises, syncFromSupabase]);

  // Re-register scheduled notifications on login (survives app updates/reinstalls).
  // Only runs when the user has notifications enabled — never loads expo-notifications
  // for users who haven't opted in.
  useEffect(() => {
    if (user?.id && notificationsEnabled && notificationConfigs.length > 0) {
      scheduleNotifications(notificationConfigs);
    }
  }, [user?.id]);

  const onboardingCompleted = useUserProfileStore((state) => state.profile?.onboardingCompleted);
  const profileLoading = useUserProfileStore((state) => state.isLoading);

  useProtectedRoute(session, isLoading, onboardingCompleted, profileLoading);

  const inAuthGroup = segments[0] === 'auth';
  const inOnboarding = segments[0] === 'onboarding';

  // Block rendering if:
  // 1. Auth is loading or fonts not loaded
  // 2. No session and not on auth/onboarding screens (redirect pending)
  if (isLoading || !fontsLoaded || (!session && !inAuthGroup && !inOnboarding)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.primary.bg }}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView
      style={[styles.root, { backgroundColor: theme.primary.bg }]}
    >
      <ThemeProvider value={navigationTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="auth" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen
            name="plan-detail"
            options={{
              animation: 'none',
              headerShown: false,
              presentation: 'transparentModal',
              contentStyle: {
                backgroundColor: 'transparent',
              },
            }}
          />
          <Stack.Screen
            name="workout-edit"
            options={{
              animation: 'slide_from_right',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="workout-success"
            options={{
              headerShown: false,
              animation: 'none',
            }}
          />
          <Stack.Screen
            name="add-exercises"
            options={{
              presentation: 'card',
              headerShown: false,
              animation: 'none',
            }}
          />
          <Stack.Screen
            name="program-view"
            options={{
              animation: 'none',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="modals"
            options={{
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="premium"
            options={{
              headerShown: false,
              animation: 'slide_from_bottom',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="hercules-ai"
            options={{
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>
        <StatusBar
          animated
          backgroundColor={statusBarBackgroundColor}
          style={Platform.OS === 'android' ? androidStatusBarStyle : statusBarStyle}
        />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});