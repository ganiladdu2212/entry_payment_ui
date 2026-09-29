import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { queryClient } from '@/lib/queryClient';
import { AppBottomNav } from '@/components/AppBottomNav';

export default function RootLayout() {
  const segments = useSegments();
  const showFooter = segments.length > 0;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: '#00152c' }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="member-registration" />
          <Stack.Screen name="customers" />
        </Stack>
        {showFooter ? <AppBottomNav /> : null}
      </View>
    </QueryClientProvider>
  );
}
