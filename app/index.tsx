import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useHealth } from '@/features/health/useHealth';
import { AppButton } from '@/components/AppButton';
import { theme } from '@/theme';

export default function HomeScreen() {
  const health = useHealth();
  return (
    <SafeAreaView style={styles.page} edges={['bottom']}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>ENTRY PAYMENT</Text>
        <Text style={styles.title}>One experience, every screen.</Text>
        <Text style={styles.body}>This shared React Native code runs on Android, iOS, and web.</Text>
        {health.isFetching ? <ActivityIndicator color={theme.colors.primary} /> : (
          <Text style={[styles.status, health.isError && styles.error]}>
            {health.data?.data ?? 'API is not connected yet'}
          </Text>
        )}
        <AppButton label="Check API connection" onPress={() => health.refetch()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg },
  card: { width: '100%', maxWidth: 560, gap: theme.spacing.md, padding: theme.spacing.xl, backgroundColor: theme.colors.surface, borderRadius: 24, ...theme.shadow.card },
  eyebrow: { color: theme.colors.primary, fontWeight: '800', letterSpacing: 2 },
  title: { color: theme.colors.text, fontSize: 36, lineHeight: 42, fontWeight: '800' },
  body: { color: theme.colors.muted, fontSize: 17, lineHeight: 25 },
  status: { color: theme.colors.success, fontWeight: '600' },
  error: { color: theme.colors.danger },
});
