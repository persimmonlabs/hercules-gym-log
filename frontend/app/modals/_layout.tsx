/**
 * Modals Layout
 * Stack navigator for modal screens
 */

import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_bottom',
        contentStyle: {
          backgroundColor: colors.primary.bg,
        },
      }}
    >
      <Stack.Screen name="profile" />
    </Stack>
  );
}
