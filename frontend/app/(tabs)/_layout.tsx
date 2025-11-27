import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { CustomTabBar } from '@/components/molecules/CustomTabBar';
import { colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <View style={styles.container}>
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
        <Tabs.Screen
          name="create-workout"
          options={{
            href: null,
            title: 'Create Workout',
          }}
        />
        <Tabs.Screen
          name="create-plan"
          options={{
            href: null,
            title: 'Create Workout (Legacy)',
          }}
        />
        <Tabs.Screen
          name="workout-success"
          options={{
            href: null,
            title: 'Success',
          }}
        />
        <Tabs.Screen
          name="workout-detail"
          options={{
            href: null,
            title: 'Workout Detail',
          }}
        />
        <Tabs.Screen
          name="browse-programs"
          options={{
            href: null,
            title: 'Browse Programs',
          }}
        />
        <Tabs.Screen
          name="add-workout"
          options={{
            href: null,
            title: 'Add Workout',
          }}
        />
        <Tabs.Screen
          name="create-program"
          options={{
            href: null,
            title: 'Create Plan',
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: colors.primary.bg,
  },
} as const;
