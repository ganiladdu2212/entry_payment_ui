import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { queryClient } from '@/lib/queryClient';
import { AppBottomNav } from '@/components/AppBottomNav';
import { appPalette } from '@/theme/palette';
import { useThemeStore } from '@/theme/themeStore';

export default function RootLayout() {
  const segments = useSegments();
  const showFooter = segments.length > 0 && !['', 'index', 'check-in-check-out', 'initial-password'].includes(segments[0]);
  const mode = useThemeStore(state => state.mode);
  const hydrateTheme = useThemeStore(state => state.hydrate);
  const colors = appPalette(mode);

  useEffect(() => { void hydrateTheme(); }, [hydrateTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="member-registration" />
          <Stack.Screen name="customers" />
          <Stack.Screen name="customer-details" />
          <Stack.Screen name="gym-attendance" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="payments" />
          <Stack.Screen name="check-in-check-out" />
          <Stack.Screen name="initial-password" />
          <Stack.Screen name="branch-management" />
        </Stack>
        {showFooter ? <AppBottomNav /> : null}
      </View>
    </QueryClientProvider>
  );
}
