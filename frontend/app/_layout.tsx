import React, { useEffect, useMemo } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { View } from 'react-native';

import { colors, sizing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/providers/AuthProvider';
import { PlanBuilderProvider } from '@/providers/PlanBuilderProvider';
import { ProgramBuilderProvider } from '@/providers/ProgramBuilderProvider';

import './add-exercises';

export const unstable_settings = {
  anchor: '(tabs)',
  useNativeStack: true,
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
                name="schedule-editor"
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
        </ProgramBuilderProvider>
      </PlanBuilderProvider>
    </AuthProvider>
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