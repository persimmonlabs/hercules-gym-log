import React, { useEffect, useMemo } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

const RootLayout: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const statusBarStyle: 'light' | 'dark' = isDarkMode ? 'light' : 'dark';
  const statusBarBackgroundColor = isDarkMode
    ? colors.text.primary
    : colors.surface.subtle;

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

    void NavigationBar.setBackgroundColorAsync(statusBarBackgroundColor);
    void NavigationBar.setButtonStyleAsync(isDarkMode ? 'light' : 'dark');
  }, [colorScheme, isDarkMode]);

  return (
    <GestureHandlerRootView
      style={[styles.root, isDarkMode ? styles.rootDark : styles.rootLight]}
    >
      <ThemeProvider value={navigationTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar
          animated
          backgroundColor={statusBarBackgroundColor}
          style={statusBarStyle}
          translucent={false}
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