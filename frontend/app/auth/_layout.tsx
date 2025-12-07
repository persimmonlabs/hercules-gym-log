import { Stack } from 'expo-router';
import React from 'react';

import { colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function AuthLayout() {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: {
                    backgroundColor: isDarkMode ? colors.text.primary : colors.primary.bg,
                },
                animation: 'fade',
            }}
        >
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
        </Stack>
    );
}
