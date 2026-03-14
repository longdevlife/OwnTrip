import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="decorations" options={{ title: 'Decoration' }} />
        <Stack.Screen name="achievement" options={{ title: 'Achievement' }} />
        <Stack.Screen name="missions" options={{ title: 'Missions' }} />
      </Stack>
    </>
  );
}
