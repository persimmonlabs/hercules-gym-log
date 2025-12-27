import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { CustomTabBar } from '@/components/molecules/CustomTabBar';
import { useTheme } from '@/hooks/useTheme';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.primary.bg }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.primary.bg,
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
        <Tabs.Screen
          name="program-details"
          options={{
            href: null,
            title: 'Program Details',
          }}
        />
        <Tabs.Screen
          name="edit-plan"
          options={{
            href: null,
            title: 'Edit Plan',
          }}
        />
        <Tabs.Screen
          name="schedule-setup"
          options={{
            href: null,
            title: 'Create Schedule',
          }}
        />
        <Tabs.Screen
          name="schedule-editor"
          options={{
            href: null,
            title: 'Edit Schedule',
          }}
        />
        <Tabs.Screen
          name="distribution-analytics"
          options={{
            href: null,
            title: 'Set Distribution',
          }}
        />
        <Tabs.Screen
          name="volume-analytics"
          options={{
            href: null,
            title: 'Weekly Volume',
          }}
        />
        <Tabs.Screen
          name="muscle-detail"
          options={{
            href: null,
            title: 'Muscle Detail',
          }}
        />
      </Tabs>
    </View>
  );
}

