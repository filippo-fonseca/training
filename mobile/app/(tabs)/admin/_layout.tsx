import { Stack } from 'expo-router';

import { colors, fonts } from '@/lib/theme';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.app },
        headerStyle: { backgroundColor: colors.app },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.sansSemi },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Admin' }} />
      <Stack.Screen name="strava" options={{ title: 'Strava' }} />
      <Stack.Screen name="log" options={{ title: 'Log today' }} />
      <Stack.Screen name="health" options={{ title: 'Health note' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="plan" options={{ title: 'Plan' }} />
    </Stack>
  );
}
