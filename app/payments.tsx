import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appPalette } from '@/theme/palette';
import { useThemeStore, type ThemeMode } from '@/theme/themeStore';
import { useAuthStore } from '@/features/auth/authStore';
import { getUsersByCustomer, type SavedUser } from '@/features/subscriptions/userSubscriptionApi';
import { paymentStatusLabels, type PaymentStatus } from '@/features/subscriptions/paymentStatus';

type Payment = { id: number; name: string; mobile: string; createdAt: number; date: string; time: string; plan: string; amount: number; mode: string; status: PaymentStatus };

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
const localTime = (value: string) => Date.parse(value + (/[zZ]|[+-]\d\d:\d\d$/.test(value) ? '' : '+05:30'));
const dayKey = (time: number) => new Date(time + 330 * 60_000).toISOString().slice(0, 10);
const dateLabel = (day: string) => new Date(`${day}T12:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
function paymentFromUser(user: SavedUser): Payment {
  const subscription=user.subscription;
  const plans=[subscription.membershipPlan,subscription.trainingPlan].filter(plan=>plan!==null);
  const subtotal=plans.reduce((sum,plan)=>sum+plan.basePriceMinor,0);
  const discount=subscription.discountType==='PERCENTAGE' ? Math.round(subtotal*Math.min(subscription.discountValue,100)/100) : Math.min(subscription.discountValue,subtotal);
  const createdAt=localTime(subscription.createdDate||user.createdDate);
  return {id:user.userId,name:user.name,mobile:`${user.countryCode} ${user.mobileNumber}`,createdAt,
    date:new Date(createdAt).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric'}),
    time:new Date(createdAt).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'}),
    plan:plans.map(plan=>plan.planName).join(' + ')||'No plan selected',amount:Math.max(0,subtotal-discount),mode:subscription.paymentMode||'Not recorded',status:subscription.paymentStatus??'ENQUIRED'};
}

export default function PaymentsScreen() {
  const router = useRouter();
  const customer = useAuthStore(state => state.customer);
  const { width } = useWindowDimensions();
  const mode = useThemeStore(state => state.mode);
  const s = useMemo(() => createStyles(mode, width < 720), [mode, width]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | PaymentStatus>('ALL');
  const compact = width < 720;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [month, setMonth] = useState(() => dayKey(Date.now()).slice(0, 7));
  const monthDate = new Date(`${month}-01T12:00:00Z`);
  const daysInMonth = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)).getUTCDate();
  const shiftMonth = (amount: number) => setMonth(new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + amount, 1)).toISOString().slice(0, 7));
  const selectDay = (day: string) => {
    if (!draftStart || draftEnd) { setDraftStart(day); setDraftEnd(''); }
    else { setDraftStart(day < draftStart ? day : draftStart); setDraftEnd(day < draftStart ? draftStart : day); }
  };

  const usersQuery = useQuery({
    queryKey: ['customer-users', customer?.custId],
    queryFn: () => getUsersByCustomer(customer!.custId),
    enabled: Boolean(customer?.custId),
  });
  const { refetch } = usersQuery;
  useFocusEffect(useCallback(() => {
    if (customer?.custId) void refetch();
  }, [customer?.custId, refetch]));

  const allPayments = useMemo(() => (usersQuery.data ?? [])
    .map(paymentFromUser)
    .sort((a, b) => b.createdAt - a.createdAt), [usersQuery.data]);
  const payments = allPayments.filter(payment => !range || (dayKey(payment.createdAt) >= range.start && dayKey(payment.createdAt) <= range.end));
  const visible = payments.filter(payment => {
    const matchesSearch = `${payment.name} ${payment.mobile} ${payment.mode} ${payment.plan}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = filter === 'ALL' || payment.status === filter;
    return matchesSearch && matchesFilter;
  });
  const received = payments.filter(payment => payment.status === 'RECEIVED');
  const pending = payments.filter(payment => payment.status === 'PENDING');
  const enquired = payments.filter(payment => payment.status === 'ENQUIRED');
  const newestPayment = payments[0];
  const oldestPayment = payments.at(-1);
  const dateRange = range ? `${dateLabel(range.start)}${range.end !== range.start ? ` – ${dateLabel(range.end)}` : ''}` : newestPayment && oldestPayment
    ? newestPayment.date === oldestPayment.date
      ? newestPayment.date
      : `${oldestPayment.date} – ${newestPayment.date}`
    : 'Select dates';

  return <SafeAreaView edges={['top']} style={s.page}>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to settings" onPress={() => router.back()} style={s.back}><Ionicons name="chevron-back" size={31} color={mode === 'dark' ? '#fff' : '#15344a'} /></Pressable>
        <View style={s.headerCopy}><Text style={s.heading}>Payments</Text><Text style={s.subtitle}>Track all received and pending payments</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Select payment date range" onPress={() => { setDraftStart(range?.start ?? ''); setDraftEnd(range?.end ?? ''); setMonth((range?.start ?? dayKey(allPayments[0]?.createdAt ?? Date.now())).slice(0, 7)); setCalendarOpen(true); }} style={s.dateRange}><Ionicons name="calendar-outline" size={26} color="#9bc9ff" /><Text style={s.dateText}>{dateRange}</Text><Ionicons name="chevron-down" size={20} color="#9bc9ff" /></Pressable>
      </View>

      <View style={s.stats}>
        <View style={[s.stat, s.receivedStat]}><View style={s.statLabel}><View style={[s.statIcon, { backgroundColor: '#48efcb' }]}><Text style={s.rupee}>₹</Text></View><Text style={s.receivedText}>Total Received</Text></View><Text style={s.statAmount}>{money(received.reduce((sum, item) => sum + item.amount, 0))}</Text><Text style={s.receivedText}>{received.length} payments</Text></View>
        <View style={[s.stat, s.pendingStat]}><View style={s.statLabel}><View style={[s.statIcon, { backgroundColor: '#79caff' }]}><Ionicons name="time-outline" size={27} color="#0758a1" /></View><Text style={s.pendingText}>Pending</Text></View><Text style={s.statAmount}>{money(pending.reduce((sum, item) => sum + item.amount, 0))}</Text><Text style={s.pendingText}>{pending.length} payments</Text></View>
        <View style={[s.stat, s.onboardedStat]}><View style={s.statLabel}><View style={[s.statIcon, { backgroundColor: '#be7cff' }]}><Ionicons name="person-outline" size={27} color="#4d1a84" /></View><Text style={s.onboardedText}>Enquired</Text></View><Text style={s.statAmount}>{money(enquired.reduce((sum, item) => sum + item.amount, 0))}</Text><Text style={s.onboardedText}>{enquired.length} customers</Text></View>
      </View>

      <View style={s.searchRow}><View style={s.search}><Ionicons name="search-outline" size={27} color="#a9cff7" /><TextInput accessibilityLabel="Search payments" value={query} onChangeText={setQuery} placeholder="Search by customer, mobile, plan or payment mode..." placeholderTextColor="#85a7c5" style={s.input} /></View></View>
      <View style={s.tabs}>{(['ALL', 'RECEIVED', 'PENDING', 'ENQUIRED'] as const).map(value => { const count = value === 'ALL' ? payments.length : payments.filter(payment => payment.status === value).length; const selected = filter === value; return <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setFilter(value)} style={[s.tab, selected && s.tabSelected]}><Text style={[s.tabText, selected && s.tabTextSelected]}>{value === 'ALL' ? 'All' : paymentStatusLabels[value]}</Text><View style={s.count}><Text style={s.countText}>{count}</Text></View></Pressable>; })}</View>

      {usersQuery.isLoading && <View style={s.empty}><ActivityIndicator size="large" color="#00e8e7" /><Text style={s.subtitle}>Loading payments...</Text></View>}
      {usersQuery.isError && <View style={s.empty}><Ionicons name="cloud-offline-outline" size={42} color="#ffad4d" /><Text style={s.subtitle}>Unable to load payments.</Text><Pressable accessibilityRole="button" onPress={() => void usersQuery.refetch()} style={s.retryButton}><Text style={s.retryText}>Try again</Text></Pressable></View>}
      {!usersQuery.isLoading && !usersQuery.isError && <View style={s.list}>{visible.map(payment => <Pressable accessibilityRole="button" accessibilityLabel={`View ${payment.name} details`} onPress={() => router.push({ pathname: '/customer-details', params: { userId: String(payment.id) } })} key={payment.id} style={({ pressed }) => [s.paymentCard, compact && s.paymentCardCompact, pressed && s.paymentCardPressed]}>
        <View style={[s.member, compact && { flexBasis: '100%' }]}><Text style={[s.name, compact && { paddingRight: 24 }]}>{payment.name}</Text><Text style={s.detail}><Ionicons name="call-outline" size={15} />  {payment.mobile}</Text><Text style={s.detail}><Ionicons name="calendar-outline" size={15} />  {payment.date}  •  {payment.time}</Text><Text style={s.detail}><Ionicons name="pricetag-outline" size={15} />  {payment.plan}</Text></View>
        <View style={[s.paymentInfo, compact && s.paymentInfoCompact]}><Text style={s.amount}>{money(payment.amount)}</Text><Text style={s.detail}><Ionicons name={payment.mode.toUpperCase() === 'CARD' ? 'card-outline' : payment.mode.toUpperCase() === 'CASH' ? 'cash-outline' : 'paper-plane-outline'} size={16} />  {payment.mode}</Text></View>
        <View style={s.statusColumn}><View style={[s.status, payment.status === 'RECEIVED' ? s.statusReceived : payment.status === 'PENDING' ? s.statusPending : s.statusNotOnboarded]}><Ionicons name={payment.status === 'RECEIVED' ? 'checkmark-circle' : payment.status === 'PENDING' ? 'time' : 'person-circle-outline'} size={21} color={payment.status === 'RECEIVED' ? '#22e8c1' : payment.status === 'PENDING' ? '#70c7ff' : '#d58aff'} /><Text style={[s.statusText, payment.status === 'RECEIVED' ? s.receivedText : payment.status === 'PENDING' ? s.pendingText : s.notOnboardedText]}>{paymentStatusLabels[payment.status]}</Text></View><Text style={s.viewDetails}>View details</Text></View>
        <Ionicons name="chevron-forward" size={25} color="#a9cff7" style={compact ? { position: 'absolute', top: 16, right: 12 } : undefined} />
      </Pressable>)}</View>}
      {!usersQuery.isLoading && !usersQuery.isError && !visible.length && <View style={s.empty}><Ionicons name="receipt-outline" size={42} color="#7fa7c6" /><Text style={s.subtitle}>{payments.length ? 'No payments match your search.' : 'No customer payment records yet.'}</Text></View>}
    </ScrollView>
    <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
      <View style={s.calendarOverlay}>
        <View style={s.calendarPanel}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={s.calendarHeader}><Text style={s.dateText}>Select payment dates</Text><Pressable accessibilityRole="button" accessibilityLabel="Close calendar" onPress={() => setCalendarOpen(false)} style={s.calendarArrow}><Ionicons name="close" size={24} color={appPalette(mode).text} /></Pressable></View>
            <Text style={s.detail}>Select a start date, then an end date. For one day, select it and tap Apply. Dates use the subscription registration date.</Text>
            <View style={s.calendarHeader}>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => shiftMonth(-1)} style={s.calendarArrow}><Ionicons name="chevron-back" size={24} color={appPalette(mode).text} /></Pressable>
              <Text style={s.dateText}>{monthDate.toLocaleDateString('en-IN', { timeZone: 'UTC', month: 'long', year: 'numeric' })}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => shiftMonth(1)} style={s.calendarArrow}><Ionicons name="chevron-forward" size={24} color={appPalette(mode).text} /></Pressable>
            </View>
            <View style={s.calendarGrid}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <View key={day} style={s.calendarCell}><Text style={s.detail}>{day}</Text></View>)}
              {Array.from({ length: monthDate.getUTCDay() }, (_, i) => <View key={`blank-${i}`} style={s.calendarCell} />)}
              {Array.from({ length: daysInMonth }, (_, i) => { const day = `${month}-${String(i + 1).padStart(2, '0')}`; const selected = day === draftStart || day === draftEnd || Boolean(draftEnd && day > draftStart && day < draftEnd); return <Pressable key={day} accessibilityRole="button" accessibilityLabel={dateLabel(day)} accessibilityState={{ selected }} onPress={() => selectDay(day)} style={[s.calendarCell, selected && s.calendarSelected]}><Text style={[s.dateText, selected && { color: '#002431' }]}>{i + 1}</Text></Pressable>; })}
            </View>
            <Text style={[s.detail, { marginVertical: 14 }]}>{draftStart ? `${dateLabel(draftStart)}${draftEnd ? ` – ${dateLabel(draftEnd)}` : ''}` : 'All dates selected'}</Text>
            <View style={s.calendarHeader}><Pressable accessibilityRole="button" onPress={() => { setRange(null); setCalendarOpen(false); }} style={s.retryButton}><Text style={s.retryText}>All dates</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { setRange(draftStart ? { start: draftStart, end: draftEnd || draftStart } : null); setCalendarOpen(false); }} style={[s.retryButton, s.calendarSelected]}><Text style={{ color: '#002431', fontWeight: '700' }}>Apply</Text></Pressable></View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </SafeAreaView>;
}

const createStyles = (mode: ThemeMode, compact: boolean) => {
  const colors = appPalette(mode); const dark = mode === 'dark';
  return StyleSheet.create({
    calendarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.65)', alignItems: 'center', justifyContent: 'center', padding: 16 },
    calendarPanel: { width: '100%', maxWidth: 440, maxHeight: '90%', padding: 16, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#008fd5' },
    calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginVertical: 8 },
    calendarArrow: { padding: 10 }, calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calendarCell: { width: '14.285714%', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, calendarSelected: { backgroundColor: '#00d9cf' },
    page: { flex: 1, backgroundColor: colors.background }, content: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: 16, paddingBottom: 36, gap: 17 },
    header: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 13 }, back: { width: 48, height: 48, justifyContent: 'center' }, headerCopy: { flex: 1, minWidth: 180 }, heading: { color: colors.text, fontSize: 30, fontWeight: '700' }, subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23 }, dateRange: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, maxWidth: '100%', borderWidth: 1, borderColor: '#008fd5', borderRadius: 28, backgroundColor: colors.surface }, dateText: { flexShrink: 1, color: colors.text, fontWeight: '700', fontSize: 15 },
    stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 13 }, stat: { flexGrow: 1, flexBasis: compact ? '44%' : '30%', minWidth: 0, minHeight: 125, padding: 14, gap: 9, borderWidth: 1, borderColor: '#5b9dcc', borderRadius: 17, backgroundColor: colors.surface }, receivedStat: { borderColor: '#00dfb4', shadowColor: '#00dfb4', shadowOpacity: .35, shadowRadius: 12 }, pendingStat: { borderColor: '#008fe8' }, onboardedStat: { borderColor: '#9151dd', backgroundColor: dark ? '#14183f' : '#f6edff' }, statLabel: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 9 }, statIcon: { width: compact ? 32 : 42, height: compact ? 32 : 42, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, rupee: { color: '#004d45', fontSize: 25, fontWeight: '900' }, statAmount: { color: colors.text, fontSize: compact ? 21 : 25, fontWeight: '700' }, receivedText: { color: dark ? '#20edca' : '#007f6b', fontSize: 15, fontWeight: '700' }, pendingText: { color: dark ? '#70c7ff' : '#086aa6', fontSize: 15, fontWeight: '700' }, onboardedText: { color: dark ? '#d0a3ff' : '#6e319e', fontSize: 15 },
    searchRow: { flexDirection: 'row', gap: 13 }, search: { flex: 1, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, borderWidth: 1, borderColor: '#008fd5', borderRadius: 27, backgroundColor: colors.surface }, input: { flex: 1, minWidth: 0, height: 50, color: colors.text, fontSize: 15 },
    tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, tab: { flexGrow: 1, flexBasis: 130, maxWidth: 300, minHeight: 51, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, borderWidth: 1, borderColor: '#008fd5', borderRadius: 26, backgroundColor: colors.surface }, tabSelected: { borderColor: '#00e8e7', shadowColor: '#00e8e7', shadowOpacity: .7, shadowRadius: 10 }, tabText: { color: colors.muted, fontSize: 15 }, tabTextSelected: { color: dark ? '#00eee2' : '#007f82', fontWeight: '800' }, count: { minWidth: 45, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 18, backgroundColor: dark ? '#064462' : '#d8edf7' }, countText: { color: dark ? '#88ddff' : '#175273', fontWeight: '800', textAlign: 'center' },
    list: { gap: 10 }, paymentCard: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: '#067da9', borderRadius: 18, backgroundColor: colors.surface }, paymentCardPressed: { opacity: .76 }, paymentCardCompact: { flexWrap: 'wrap', gap: 13 }, member: { flex: 1.7, minWidth: 0, gap: 4 }, name: { color: colors.text, fontSize: 18, fontWeight: '700' }, detail: { color: colors.muted, fontSize: 14, lineHeight: 20 }, paymentInfo: { flex: 1, minWidth: 130, alignSelf: 'stretch', justifyContent: 'center', gap: 8, paddingHorizontal: 20, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#0879a5' }, paymentInfoCompact: { flex: 1, minWidth: 110, paddingHorizontal: 0, borderLeftWidth: 0, borderRightWidth: 0 }, amount: { color: colors.text, fontSize: 20, fontWeight: '700' }, statusColumn: { minWidth: 120, gap: 8 }, status: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 22 }, statusReceived: { borderColor: '#00d8ad' }, statusPending: { borderColor: '#079eea' }, statusNotOnboarded: { borderColor: '#a84fe6' }, statusText: { fontSize: 14, fontWeight: '800' }, notOnboardedText: { color: '#d58aff' }, viewDetails: { color: dark ? '#72cfff' : '#086a9e', fontSize: 13 }, empty: { alignItems: 'center', gap: 10, padding: 40 }, retryButton: { borderWidth: 1, borderColor: '#00cfc8', borderRadius: 22, paddingHorizontal: 20, paddingVertical: 10 }, retryText: { color: dark ? '#00eee2' : '#007f82', fontWeight: '800' },
  });
};
