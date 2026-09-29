import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/features/auth/authStore';
import { tokenStorage } from '@/storage/tokenStorage';
import { theme } from '@/theme';

export default function DashboardScreen() {
  const router = useRouter(); const customer = useAuthStore((state) => state.customer); const clear = useAuthStore((state) => state.clear);
  const logout = async () => { await tokenStorage.remove(); clear(); router.replace('/'); };
  return <SafeAreaView style={styles.page}><View style={styles.card}><Text style={styles.eyebrow}>ENTRY PAYMENT</Text><Text style={styles.title}>Welcome{customer?.name ? `, ${customer.name}` : ''}</Text><Text style={styles.body}>Customer dashboard development will continue here.</Text><Pressable onPress={logout} style={styles.button}><Text style={styles.buttonText}>Logout</Text></Pressable></View></SafeAreaView>;
}

const styles = StyleSheet.create({ page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: theme.colors.background }, card: { width: '100%', maxWidth: 560, padding: 32, gap: 16, borderRadius: 24, backgroundColor: '#fff' }, eyebrow: { color: theme.colors.primary, fontWeight: '800', letterSpacing: 2 }, title: { color: theme.colors.text, fontSize: 34, fontWeight: '800' }, body: { color: theme.colors.muted, fontSize: 17 }, button: { marginTop: 10, padding: 15, borderRadius: 12, alignItems: 'center', backgroundColor: theme.colors.primary }, buttonText: { color: '#fff', fontWeight: '800' } });
