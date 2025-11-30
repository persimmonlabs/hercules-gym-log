import React, { useEffect, useMemo } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { View } from 'react-native';

import { colors, sizing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { PlanBuilderProvider } from '@/providers/PlanBuilderProvider';
import { ProgramBuilderProvider } from '@/providers/ProgramBuilderProvider';

import './add-exercises';

export const unstable_settings = {
  anchor: '(tabs)',
  useNativeStack: true,
};

const useProtectedRoute = (session: any, isLoading: boolean) => {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = (segments[0] as string) === 'auth';

    if (!session && !inAuthGroup) {
      // Redirect to the sign-in page.
      router.replace('/auth/login' as any);
    } else if (session && inAuthGroup) {
      // Redirect away from the sign-in page.
      router.replace('/(tabs)' as any);
    }
  }, [session, segments, isLoading]);
};

const RootLayout: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const statusBarStyle: 'light' | 'dark' = isDarkMode ? 'light' : 'dark';
  const statusBarBackgroundColor = Platform.OS === 'android'
    ? 'transparent'
    : (isDarkMode ? colors.text.primary : colors.primary.bg);
  const androidStatusBarStyle: 'light' | 'dark' = 'dark';

  const navigationTheme = useMemo(
    () => {
      if (colorScheme === 'dark') {
        return DarkTheme;
      }

      return {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.primary.bg,
          card: colors.primary.bg,
        },
      };
    },
    [colorScheme],
  );

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    void NavigationBar.setBackgroundColorAsync(colors.primary.bg);
    void NavigationBar.setButtonStyleAsync('dark');
  }, [colorScheme]);

  return (
    <AuthProvider>
      <PlanBuilderProvider>
        <ProgramBuilderProvider>
          <RootLayoutNav
            navigationTheme={navigationTheme}
            isDarkMode={isDarkMode}
            statusBarBackgroundColor={statusBarBackgroundColor}
            statusBarStyle={statusBarStyle}
            androidStatusBarStyle={androidStatusBarStyle}
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
  statusBarBackgroundColor,
  statusBarStyle,
  androidStatusBarStyle
}: any) => {
  const { session, isLoading } = useAuth();
  const segments = useSegments();

  useProtectedRoute(session, isLoading);

  const inAuthGroup = segments[0] === 'auth';

  if (isLoading || (!session && !inAuthGroup)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary.bg }}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView
      style={[styles.root, isDarkMode ? styles.rootDark : styles.rootLight]}
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
            name="quiz"
            options={{
              headerShown: false,
              presentation: 'transparentModal',
              animation: 'none',
            }}
          />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
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
  rootLight: {
    backgroundColor: colors.primary.bg,
  },
  rootDark: {
    backgroundColor: colors.text.primary,
  },
});