import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/features/auth/authStore';
import { tokenStorage } from '@/storage/tokenStorage';
import { appPalette } from '@/theme/palette';
import { useThemeStore, type ThemeMode } from '@/theme/themeStore';

type Route = '/customers' | '/member-registration' | '/gym-attendance' | '/settings';

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 620;
  const customer = useAuthStore(state => state.customer);
  const displayName = useAuthStore(state => state.displayName);
  const activeBranch = useAuthStore(state => state.branch);
  const actorType = useAuthStore(state => state.actorType);
  const clear = useAuthStore(state => state.clear);
  const mode = useThemeStore(state => state.mode);
  const s = useMemo(() => createStyles(mode), [mode]);
  const logout = async () => { await tokenStorage.remove(); clear(); router.replace('/'); };
  const open = (path: Route) => router.push(path);
  const joined = customer?.createdDate ? new Date(customer.createdDate + (/[zZ]|[+-]\d\d:\d\d$/.test(customer.createdDate) ? '' : '+05:30')).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' }) : 'Not available';
  const actions: { title: string; caption: string; icon: keyof typeof Ionicons.glyphMap; path: Route }[] = [
    { title: 'Customers', caption: 'View registered members', icon: 'people-outline', path: '/customers' },
    { title: 'Register Member', caption: 'Create a new subscription', icon: 'person-add-outline', path: '/member-registration' },
    { title: 'GYM Attendance', caption: 'View occupancy and attendance', icon: 'barbell-outline', path: '/gym-attendance' },
    { title: 'Settings', caption: 'Manage plans and preferences', icon: 'settings-outline', path: '/settings' },
  ];

  return <SafeAreaView edges={['top']} style={s.page}><ScrollView contentContainerStyle={s.content}>
    <View style={s.header}><View style={s.brandIcon}><Ionicons name="barbell" size={31} color="#001f32" /></View><View style={s.headerCopy}><Text style={s.eyebrow}>ENTRY PAYMENT · {actorType?.replace('_',' ') || 'ACCOUNT'}</Text><Text style={[s.heading, compact && s.headingCompact]}>Welcome, <Text style={s.accent}>{displayName || customer?.name || 'Customer'}</Text></Text><Text style={s.subtitle}>{activeBranch ? `${activeBranch.name} · ${activeBranch.facilityType}` : 'Manage your members, subscriptions and attendance.'}</Text></View></View>
    {!customer ? <View style={s.panel}><Text style={s.title}>Your session has ended</Text><Text style={s.subtitle}>Sign in again to view your dashboard.</Text><Pressable onPress={() => router.replace('/')} style={s.primaryButton}><Text style={s.primaryText}>Go to Login</Text></Pressable></View> : <>
      <LinearGradient colors={mode === 'dark' ? ['#004d65', '#00263d'] : ['#d7fbfc', '#eaf8ff']} style={s.profile}><View style={s.avatar}><Ionicons name="person" size={43} color="#9eefff" /></View><View style={s.profileCopy}><Text style={s.title}>{customer.name || 'Customer'}</Text><Text style={s.organization}>{customer.orgName || 'Your Organization'}</Text><View style={s.memberPill}><Ionicons name="checkmark-circle" size={19} color="#00ead1" /><Text style={s.memberText}>Active Account</Text></View></View><Pressable accessibilityLabel="Open settings" onPress={() => open('/settings')} style={s.profileAction}><Ionicons name="create-outline" size={24} color="#8bdffb" /></Pressable></LinearGradient>
      <View style={s.infoGrid}><Info icon="call-outline" label="Mobile Number" value={customer.mobileNumber ? `+91 ${customer.mobileNumber}` : 'Not provided'} styles={s} /><Info icon="mail-outline" label="Email Address" value={customer.email || 'Not provided'} styles={s} /><Info icon="business-outline" label="Organization" value={customer.orgName || 'Not provided'} styles={s} /><Info icon="calendar-outline" label="Member Since" value={joined} styles={s} /></View>
      <View style={s.sectionHeader}><Ionicons name="flash-outline" size={26} color="#00e5df" /><Text style={s.sectionTitle}>Quick Actions</Text></View>
      <View style={s.actionGrid}>{actions.map(action => <Pressable key={action.path} onPress={() => open(action.path)} style={({ pressed }) => [s.actionCard, compact && s.actionCompact, pressed && s.pressed]}><View style={s.actionIcon}><Ionicons name={action.icon} size={29} color="#7ff8f3" /></View><View style={s.actionCopy}><Text style={s.actionTitle}>{action.title}</Text><Text style={s.actionCaption}>{action.caption}</Text></View><Ionicons name="chevron-forward" size={22} color="#8bc9ed" /></Pressable>)}</View>
      <Pressable onPress={() => void logout()} style={({ pressed }) => [s.logout, pressed && s.pressed]}><Ionicons name="log-out-outline" size={25} color="#ff6172" /><View style={s.actionCopy}><Text style={s.logoutTitle}>Log Out</Text><Text style={s.actionCaption}>Sign out from your gym account</Text></View><Ionicons name="chevron-forward" size={22} color="#ff6172" /></Pressable>
    </>}
  </ScrollView></SafeAreaView>;
}

function Info({ icon, label, value, styles }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.infoCard}><View style={styles.infoIcon}><Ionicons name={icon} size={23} color="#69f4f2" /></View><View style={styles.actionCopy}><Text style={styles.infoLabel}>{label}</Text><Text selectable style={styles.infoValue}>{value}</Text></View></View>;
}

const createStyles = (mode: ThemeMode) => {
  const colors = appPalette(mode); const dark = mode === 'dark';
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.background }, content: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: 18, paddingBottom: 36, gap: 18 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 }, brandIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00e5df', shadowColor: '#00e5df', shadowOpacity: .55, shadowRadius: 12, elevation: 6 }, headerCopy: { flex: 1, minWidth: 0, gap: 4 },
    eyebrow: { color: dark ? '#73f8f3' : '#007f82', fontSize: 12, fontWeight: '800', letterSpacing: 2 }, heading: { color: colors.text, fontSize: 34, fontWeight: '800' }, headingCompact: { fontSize: 27 }, accent: { color: dark ? '#00e5df' : '#007f82' }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
    panel: { gap: 12, padding: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.surface }, profile: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, padding: 20, borderWidth: 1, borderColor: '#078db2', borderRadius: 20 }, avatar: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#00dbe2', backgroundColor: '#003e5a' }, profileCopy: { flex: 1, minWidth: 150, gap: 5 }, title: { color: colors.text, fontSize: 22, fontWeight: '700' }, organization: { color: dark ? '#8de8ed' : '#087f87', fontSize: 16, fontWeight: '600' },
    memberPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 6, borderWidth: 1, borderColor: '#00cdb7', borderRadius: 18, backgroundColor: dark ? '#003c42' : '#d7fbf5' }, memberText: { color: dark ? '#4cf5dd' : '#007867', fontWeight: '700' }, profileAction: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 23, borderWidth: 1, borderColor: '#15779b' },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, infoCard: { flexGrow: 1, flexBasis: 210, minWidth: 0, minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface }, infoIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? '#004557' : '#d7f7f7' }, infoLabel: { color: colors.muted, fontSize: 12 }, infoValue: { color: colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 2 }, sectionTitle: { color: dark ? '#00e5df' : '#007f82', fontSize: 21, fontWeight: '700' }, actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, actionCard: { flexGrow: 1, flexBasis: 420, minWidth: 0, minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderWidth: 1, borderColor: colors.border, borderRadius: 17, backgroundColor: colors.surface }, actionCompact: { flexBasis: '100%' }, actionIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#00bdb8', backgroundColor: dark ? '#004451' : '#d7f8f6' }, actionCopy: { flex: 1, minWidth: 0, gap: 3 }, actionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' }, actionCaption: { color: colors.muted, fontSize: 13, lineHeight: 19 }, pressed: { opacity: .68 },
    logout: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderWidth: 1, borderColor: '#a7394c', borderRadius: 17, backgroundColor: dark ? '#251b2a' : '#fff0f2' }, logoutTitle: { color: '#ff6172', fontSize: 17, fontWeight: '700' }, primaryButton: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center', paddingHorizontal: 22, borderRadius: 24, backgroundColor: '#00e5df' }, primaryText: { color: '#002431', fontWeight: '800' },
  });
};
