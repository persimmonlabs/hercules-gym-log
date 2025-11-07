import React from 'react';
import { Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomTabBar } from '@/components/molecules/CustomTabBar';
import { colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.primary.bg,
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
        <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
        <Tabs.Screen name="workout" options={{ title: 'Start Workout' }} />
        <Tabs.Screen name="plans" options={{ title: 'Plans' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </SafeAreaView>
  );
}

const styles = {
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary.bg,
  },
} as const;
