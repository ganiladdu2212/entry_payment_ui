import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/features/auth/authStore';
import { getUsersByCustomer } from '@/features/subscriptions/userSubscriptionApi';
import { normalizePaymentStatus, paymentStatuses, type PaymentStatus } from '@/features/subscriptions/paymentStatus';

const labels = { RECEIVED: 'Paid', PENDING: 'Pending', NOT_ONBOARDED: 'Not Onboarded' };
const colors = { RECEIVED: '#00e5cb', PENDING: '#ffc331', NOT_ONBOARDED: '#9bc8f8' };
function StatusBadge({ status: rawStatus }: { status: PaymentStatus | null }) {
  const status = normalizePaymentStatus(rawStatus);
  const color = status ? colors[status] : '#88aac4';
  return <View style={[styles.badge, { borderColor: color, backgroundColor: status === 'PENDING' ? '#292615' : status === 'RECEIVED' ? '#002e30' : '#10324c' }]}>
    <Ionicons name={status === 'RECEIVED' ? 'checkmark-circle' : status === 'PENDING' ? 'time-outline' : 'person-outline'} size={21} color={color} />
    <Text style={{ color, fontSize: 14, fontWeight: '600' }}>{status ? labels[status] : 'Not recorded'}</Text>
  </View>;
}

function createdDate(value: string) {
  // The API returns Kolkata local time without an offset.
  return new Date(value + (/[zZ]|[+-]\d\d:\d\d$/.test(value) ? '' : '+05:30'));
}
function dateLabel(value: string) {
  return createdDate(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CustomersScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 600;
  const [dateOpen, setDateOpen] = useState(false);
  const customer = useAuthStore(state => state.customer);
  const [days, setDays] = useState(0);
  const [status, setStatus] = useState<'ALL' | PaymentStatus>('ALL');
  const query = useQuery({ queryKey: ['users', customer?.custId], queryFn: () => getUsersByCustomer(customer!.custId), enabled: !!customer });
  const { refetch } = query;
  useFocusEffect(useCallback(() => { if (customer) void refetch(); }, [customer, refetch]));
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const dayStart = new Date(today + 'T00:00:00+05:30').getTime();
  const rangeStart = dayStart - (days - 1) * 86400000;
  const shortDate = (time: number) => new Date(time).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
  const datedUsers = (query.data ?? []).filter(user => !days || (createdDate(user.createdDate).getTime() >= rangeStart && createdDate(user.createdDate).getTime() < dayStart + 86400000));
  const users = datedUsers.filter(user => status === 'ALL' || user.subscription.paymentStatus === status);
  return (
    <SafeAreaView edges={['top']} style={styles.page}>
      <FlatList data={users} keyExtractor={item => String(item.userId)} contentContainerStyle={styles.content}
        refreshing={query.isRefetching} onRefresh={() => { if (customer) void refetch(); }}
        ListHeaderComponent={<View style={styles.header}>
          <Pressable accessibilityRole="button" style={styles.back} accessibilityLabel="Back to home" onPress={() => router.replace('/dashboard')}><Ionicons name="chevron-back" size={30} color="white" /></Pressable>
          <Text style={[styles.title, compact && { fontSize: 29 }]}>Registered <Text style={styles.accent}>Customers</Text></Text>
          <Text style={styles.subtitle}>View all registered customers and their{ '\n' }payment status.</Text>
          <View style={styles.tabs}>
            {(['ALL', ...paymentStatuses] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: status === value }} onPress={() => setStatus(value)} style={[styles.filter, compact && { flexBasis: '46%' }, status === value && styles.selected]}>
              <Text style={status === value ? styles.selectedText : styles.text}>{value === 'ALL' ? 'All' : labels[value]}</Text>
              <View style={[styles.count, { backgroundColor: value === 'PENDING' ? '#302919' : value === 'RECEIVED' ? '#003135' : '#092b43' }, status === value && { backgroundColor: '#001522' }]}><Text style={{ color: value === 'PENDING' && status !== value ? colors.PENDING : '#00eee2', fontWeight: '700' }}>{datedUsers.filter(user => value === 'ALL' || user.subscription.paymentStatus === value).length}</Text></View>
            </Pressable>)}
          </View>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: dateOpen }} onPress={() => setDateOpen(!dateOpen)} style={styles.dateSelect}>
            <Ionicons name="calendar-outline" size={23} color="#a6cdf1" />
            <Text style={[styles.text, { flex: 1 }]}>{days ? `Last ${days} Days (${shortDate(rangeStart)} – ${shortDate(dayStart)})` : 'All time · Registration dates'}</Text>
            <Ionicons name={dateOpen ? 'chevron-up' : 'chevron-down'} size={22} color="#a6cdf1" />
          </Pressable>
          {dateOpen && <View style={styles.dateMenu}>{[0, 7, 30].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: days === value }} onPress={() => { setDays(value); setDateOpen(false); }} style={styles.dateOption}><Text style={days === value ? styles.accent : styles.text}>{value ? `Last ${value} days` : 'All time'}</Text></Pressable>)}</View>}
          {!!query.error && <View><Text accessibilityRole="alert" style={styles.text}>{query.error.message}</Text><Pressable onPress={() => void refetch()}><Text style={styles.accent}>Retry</Text></Pressable></View>}
        </View>}
        ListEmptyComponent={query.isPending && customer ? <ActivityIndicator color="#00ede0" /> : <Text style={styles.subtitle}>{!customer ? 'Please log in to view your customers.' : query.isError ? '' : 'No registered customers in this period.'}</Text>}
        renderItem={({ item }) => <View style={styles.card}>
          <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.name}`} onPress={() => router.push({ pathname: '/customer-details', params: { userId: item.userId } })} style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.meta}><Ionicons name="call-outline" size={19} color="#afd2f4" /><Text style={[styles.text, { flexShrink: 1 }]}>{item.countryCode} {item.mobileNumber}</Text></View>
              <View style={styles.meta}><Ionicons name="calendar-outline" size={19} color="#afd2f4" /><Text style={[styles.text, { flexShrink: 1 }]}>Registered: {dateLabel(item.createdDate)}</Text></View>
              {compact && <StatusBadge status={item.subscription.paymentStatus} />}
            </View>
            {!compact && <StatusBadge status={item.subscription.paymentStatus} />}
            <Ionicons name="chevron-forward" size={24} color="#a6cdf1" />
          </Pressable>
        </View>}
        ListFooterComponent={<View style={styles.bottomTabs}>
          <View style={styles.bottomTab}><Ionicons name="people-outline" size={30} color="#00eee2" /><Text style={[styles.accent, styles.tabText]}>Registered Customers</Text><View style={styles.underline} /></View>
          <View accessibilityLabel="Enquired Customers, coming later" style={styles.bottomTab}><Ionicons name="person-add-outline" size={30} color="#9bc8f8" /><Text style={[styles.text, styles.tabText]}>Enquired Customers</Text><Text style={styles.hint}>Coming later</Text></View>
        </View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#001522' },
  content: { width: '100%', maxWidth: 1000, alignSelf: 'center', padding: 18, paddingBottom: 32, gap: 12 },
  header: { gap: 16, marginBottom: 12 },
  title: { color: '#fff', fontSize: 38, fontWeight: '800' },
  back: { minHeight: 44, width: 44, justifyContent: 'center' },
  accent: { color: '#00eee2', fontWeight: '700' },
  subtitle: { color: '#a6cdf1', fontSize: 17, lineHeight: 25 },
  tabs: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  selected: { backgroundColor: '#00eee2', borderColor: '#00eee2' },
  selectedText: { color: '#001522', fontWeight: '800', fontSize: 17 },
  hint: { color: '#88aac4', fontSize: 13, flexShrink: 1 },
  filter: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 50, padding: 10, borderRadius: 28, borderWidth: 1, borderColor: '#126185' },
  count: { minWidth: 34, padding: 6, borderRadius: 20, alignItems: 'center' },
  dateSelect: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 15, borderWidth: 1, borderColor: '#126185', borderRadius: 18, maxWidth: 740, width: '100%', marginTop: 8 },
  dateMenu: { borderWidth: 1, borderColor: '#126185', borderRadius: 16, padding: 5, maxWidth: 740 },
  dateOption: { padding: 14, minHeight: 44 },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderRadius: 25 },
  meta: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  card: { borderWidth: 1, borderColor: '#07698c', borderRadius: 18, padding: 18, backgroundColor: '#001d2e' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1, minWidth: 0, gap: 7 },
  name: { color: '#fff', fontSize: 21, fontWeight: '700' },
  text: { color: '#afd2f4', fontSize: 15, lineHeight: 22 },
  details: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#126185', gap: 8 },
  bottomTabs: { flexDirection: 'row', borderWidth: 1, borderColor: '#07698c', borderRadius: 18, padding: 16, gap: 16, alignItems: 'center', marginTop: 12 },
  bottomTab: { flex: 1, alignItems: 'center', gap: 6 },
  tabText: { textAlign: 'center' },
  underline: { width: 90, height: 3, backgroundColor: '#00eee2', marginTop: 4 },
});
