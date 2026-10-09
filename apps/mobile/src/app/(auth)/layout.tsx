
import React from 'react';
import { Stack } from 'expo-router';

import { useIOSColors } from '@/components/ios';

export default function AuthLayout() {
  const colors = useIOSColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'default',
        presentation: 'card',
        gestureEnabled: true,

        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="cadastro"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

