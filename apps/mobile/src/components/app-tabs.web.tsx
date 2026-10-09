
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import FloatingNavigation from '@/components/FloatingNavigation';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />

        <FloatingNavigation />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
});

