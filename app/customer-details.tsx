import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserSubscription } from '@/features/subscriptions/userSubscriptionApi';
import { paymentStatusLabels } from '@/features/subscriptions/paymentStatus';
import { useAuthStore } from '@/features/auth/authStore';
import { getCheckInCheckOut, type AttendanceEvent } from '@/features/attendance/attendanceApi';

const day = 86400000;
const format = (value: number) => new Date(value).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
const eventTime = (value: string) => Date.parse(value + (/[zZ]|[+-]\d\d:\d\d$/.test(value) ? '' : '+05:30'));
type AttendanceSession = { key: number; date: number; checkIn?: number; checkOut?: number };
function attendanceSessions(events: AttendanceEvent[]): AttendanceSession[] {
  const ordered=[...events].sort((a,b) => eventTime(a.createdDate)-eventTime(b.createdDate));
  const sessions: AttendanceSession[]=[];
  let open: AttendanceSession | undefined;
  for(const event of ordered) {
    const time=eventTime(event.createdDate);
    if(event.actionType==='CHECK_IN') {
      if(open) sessions.push(open);
      open={ key:event.attendanceEventId,date:time,checkIn:time };
    } else if(open && new Date(open.date).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'})===new Date(time).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'})) {
      open.checkOut=time; sessions.push(open); open=undefined;
    } else sessions.push({key:event.attendanceEventId,date:time,checkOut:time});
  }
  if(open) sessions.push(open);
  return sessions.sort((a,b)=>Math.max(b.checkOut??0,b.checkIn??0)-Math.max(a.checkOut??0,a.checkIn??0));
}
const clock = (value?: number) => value ? new Date(value).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'}) : '—';
const duration = (row: AttendanceSession) => {
  if(!row.checkIn || !row.checkOut) return '—';
  const minutes=Math.max(0,Math.floor((row.checkOut-row.checkIn)/60000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes/60)}h ${minutes%60}m`;
};
const tableColumn = (index: number) => index === 0 ? s.dateColumn : index === 3 ? s.statusColumn : s.standardColumn;
function endDate(start: number, count: number, unit: string) {
  if (!Number.isInteger(count) || count < 1) return null;
  const normalized = unit.toUpperCase();
  if (normalized === 'DAY' || normalized === 'WEEK') return start + count * (normalized === 'WEEK' ? 7 : 1) * day;
  // Match the catalog service's effectiveMonths rules for named plans.
  const months = normalized === 'QUARTERLY' ? 3 : normalized === 'HALF_YEARLY' ? 6 : normalized === 'YEARLY' ? 12 : normalized === 'YEAR' ? count * 12 : count;
  const date = new Date(start);
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), last));
  return target.getTime();
}
export default function CustomerDetails() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const customer = useAuthStore(state => state.customer);
  const id = Number(userId);
  const { width } = useWindowDimensions();
  const [monthOffset, setMonthOffset] = useState(0);
  const [training, setTraining] = useState(false);
  const [notice, setNotice] = useState('');
  const query = useQuery({ queryKey: ['user', customer?.custId, id], queryFn: () => getUserSubscription(id), enabled: !!customer && Number.isSafeInteger(id) && id > 0 });
  const attendance = useQuery({ queryKey: ['attendance', customer?.custId, id], queryFn: () => getCheckInCheckOut(id), enabled: !!customer && Number.isSafeInteger(id) && id > 0 });
  const user = query.data;
  const subscription = user?.subscription;
  const plan = training ? subscription?.trainingPlan : subscription?.membershipPlan ?? subscription?.trainingPlan;
  const start = subscription ? Date.parse(subscription.createdDate.slice(0, 10) + 'T00:00:00Z') : NaN;
  const end = plan && Number.isFinite(start) ? endDate(start, plan.durationValue, plan.durationUnit) : null;
  const today = Date.parse(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) + 'T00:00:00Z');
  const first = new Date(start);
  const month = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + monthOffset, 1));
  const nextMonth = Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1);
  const remaining = end ? Math.max(0, Math.ceil((end - Math.max(today, start)) / day)) : null;
  const wide = width >= 760;
  const sessions=attendanceSessions(attendance.data ?? []);
  const monthKey=`${month.getUTCFullYear()}-${String(month.getUTCMonth()+1).padStart(2,'0')}`;
  const monthSessions=sessions.filter(row => new Date(row.date).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}).startsWith(monthKey));
  const checkInCount=(attendance.data ?? []).filter(event => event.actionType==='CHECK_IN').length;
  const cells = end ? Array.from({ length: month.getUTCDay() + new Date(nextMonth - day).getUTCDate() }, (_, index) => {
    const date = month.getTime() + (index - month.getUTCDay()) * day;
    return index >= month.getUTCDay() && date >= start && date < end ? date : null;
  }) : [];
  const open = async (url: string) => { try { await Linking.openURL(url); } catch { setNotice('This device could not open that app.'); } };
  return <SafeAreaView edges={['top']} style={s.page}><ScrollView contentContainerStyle={s.content}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back to customers" style={s.action} onPress={() => router.back()}><Ionicons name="chevron-back" size={30} color="white" /></Pressable>
    <View style={s.headerRow}><View style={{ flex: 1, minWidth: 200, gap: 8 }}><Text style={s.heading}>Registered <Text style={s.cyan}>Customer Details</Text></Text>
    <Text style={s.text}>View complete information about your registered customer.</Text></View>
    <View style={s.remaining}><Ionicons name="time-outline" size={32} color="#00ede0" /><View><Text style={s.cyan}>Remaining</Text><Text style={s.title}>{remaining ?? '—'} Days</Text></View></View></View>
    {!customer ? <Text style={s.text}>Please log in to view customer details.</Text> : !Number.isSafeInteger(id) || id < 1 ? <Text style={s.text}>Invalid customer link.</Text> : query.isPending ? <ActivityIndicator color="#00e7df" /> : query.isError ? <Pressable onPress={() => void query.refetch()}><Text style={s.text}>Unable to load customer. Tap to retry.</Text></Pressable> : null}
    {user && <>
      <View style={[s.panel, s.profile]}>
        <View style={s.avatar}><Ionicons name="person" size={44} color="#a4d7ff" /></View>
        <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 160, gap: 8 }}><Text style={[s.title, { fontSize: 27 }]}>{user.name}</Text><Text style={s.text}>☎  {user.countryCode} {user.mobileNumber}</Text><Text style={s.text}>Joined on {format(Date.parse(user.createdDate.slice(0, 10) + 'T00:00:00Z'))}</Text><View style={s.statusPill}><Ionicons name="checkmark-circle" size={22} color="#00ede0" /><Text style={s.cyan}>{subscription?.paymentStatus ? paymentStatusLabels[subscription.paymentStatus] : 'Payment not recorded'}</Text></View></View>
        <View style={[s.actions, !wide && { width: '100%', justifyContent: 'space-around' }]}>{(['Call', 'WhatsApp', 'Message'] as const).map((label, index) => <Pressable key={label} accessibilityRole="button" onPress={() => void open(index === 0 ? `tel:${user.countryCode}${user.mobileNumber}` : index === 1 ? `https://wa.me/${(user.countryCode + user.mobileNumber).replace(/\D/g, '')}` : `sms:${user.countryCode}${user.mobileNumber}`)} style={s.contact}><View style={[s.contactCircle, index === 2 && { backgroundColor: '#005f9b', borderColor: '#009eea' }]}><Ionicons name={index === 0 ? 'call' : index === 1 ? 'logo-whatsapp' : 'chatbox-outline'} size={29} color="#adfff5" /></View><Text style={s.text}>{label}</Text></Pressable>)}</View>
      </View>
      {!!notice && <Text accessibilityRole="alert" style={s.text}>{notice}</Text>}
      {subscription?.membershipPlan && subscription.trainingPlan && <View style={s.actions}>{['Membership', 'Personal Training'].map((label, index) => <Pressable key={label} onPress={() => { setTraining(index === 1); setMonthOffset(0); }} style={s.panel}><Text style={training === (index === 1) ? s.cyan : s.text}>{label}</Text></Pressable>)}</View>}
      <Text style={s.note}>Dates are calculated from subscription creation in IST and plan duration. Attendance is not connected yet.</Text>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14 }}>
        <View style={[s.panel, wide && { flex: 1.6 }, { minWidth: 0 }]}>
          <View style={s.calendarHeader}><Text style={[s.title, { flex: 1 }]}>{end ? month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Subscription calendar'}</Text>{end && <View style={s.actions}>{[-1, 1].map(direction => <Pressable key={direction} accessibilityLabel={direction < 0 ? 'Previous month' : 'Next month'} disabled={direction < 0 ? monthOffset === 0 : nextMonth >= end} onPress={() => setMonthOffset(monthOffset + direction)} style={[s.action, { opacity: (direction < 0 ? monthOffset === 0 : nextMonth >= end) ? .3 : 1 }]}><Ionicons name={direction < 0 ? 'chevron-back' : 'chevron-forward'} size={24} color="#a4d7ff" /></Pressable>)}</View>}</View>
          <View style={s.grid}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(label => <View key={label} style={s.cell}><Text style={s.note}>{label}</Text></View>)}{cells.map((date, index) => <View key={index} style={s.cell}>{date !== null && <View style={[s.date, date === today && s.today]}><Text style={s.white}>{new Date(date).getUTCDate()}</Text><View style={s.dot} /></View>}</View>)}</View>
          <Text style={s.note}>{end ? '● Subscription days only · dots do not indicate attendance' : 'Subscription dates unavailable'}</Text>
          <View style={s.legend}>{[['Present','#00dfbe'],['Check-in (other slot)','#00b7f3'],['Absent','#ff5573'],['Holiday','#83a5d3']].map(([label,color]) => <View key={label} style={s.legendItem}><View style={[s.dot,{ backgroundColor: color, width: 10, height: 10 }]} /><Text style={s.note}>{label}</Text></View>)}</View><Text style={s.note}>Attendance legend preview — not connected</Text>
        </View>
        <View style={[{ gap: 10 }, wide && { flex: 1 }]}>{[['Start Date', Number.isFinite(start) ? format(start) : '—'], ['Subscription Plan', plan?.planName ?? 'Not selected'], ['Valid Till', end ? format(end - day) : '—'], ['Total Check-Ins', attendance.isPending ? '…' : String(checkInCount)], ['Absent', '—']].map(([label,value], index) => <View key={label} style={[s.panel, s.stat]}><View style={[s.statIcon, index === 4 && { backgroundColor: '#53253d', borderColor: '#ff5573' }]}><Ionicons name={index === 1 ? 'barbell-outline' : index === 4 ? 'close-circle' : 'calendar-outline'} size={29} color={index === 4 ? '#ff5573' : '#68f2fa'} /></View><View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text style={s.text}>{label}</Text><Text style={s.title}>{value}</Text>{index === 4 && <Text style={s.sample}>Not available from attendance events</Text>}</View></View>)}</View>
      </View>
      <View style={s.panel}><View style={s.headerRow}><View style={s.legendItem}><Ionicons name="calendar-outline" size={28} color="#a7cbed" /><Text style={s.title}>Daily Attendance</Text></View><Text style={s.monthLabel}>{month.toLocaleDateString('en-IN',{month:'long',year:'numeric',timeZone:'UTC'})}</Text></View>{attendance.isPending ? <ActivityIndicator color="#00ede0" /> : attendance.isError ? <Pressable onPress={() => void attendance.refetch()}><Text accessibilityRole="alert" style={s.sample}>Unable to load attendance. Tap to retry.</Text></Pressable> : <ScrollView horizontal showsHorizontalScrollIndicator><View style={{ width: Math.max(760, Math.min(width - 72, 1100)) }}><View style={s.tableRow}>{['Date','Check-in Time','Check-out Time','Attendance','Duration'].map((label,index) => <Text key={label} style={[s.tableCell,tableColumn(index)]}>{label}</Text>)}</View>{monthSessions.map(row => { const complete=!!row.checkIn&&!!row.checkOut; return <View key={row.key} style={s.tableRow}>{[
        new Date(row.date).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric'}),clock(row.checkIn),clock(row.checkOut),complete?'Present':row.checkIn?'Check-in active':'Checkout only',duration(row)
      ].map((value,index) => <View key={index} style={[s.tableValue,tableColumn(index)]}>{index === 3 ? <View style={s.attendanceBadge}><Ionicons name={complete?'checkmark-circle':'time-outline'} size={18} color="#00ede0" /><Text style={{color:'#00ede0'}}>{value}</Text></View> : <Text style={index === 0 ? s.white : s.text}>{value}</Text>}</View>)}</View>;})}{monthSessions.length===0 && <Text style={[s.text,{padding:20}]}>No attendance records for this month.</Text>}</View></ScrollView>}<Text style={[s.note,{ textAlign: 'center', paddingTop: 10 }]}>Showing {monthSessions.length} session{monthSessions.length===1?'':'s'} from {attendance.data?.length ?? 0} event{attendance.data?.length===1?'':'s'} · newest first</Text></View>
    </>}
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  remaining: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#00ede0', borderRadius: 16, padding: 12, backgroundColor: '#00293c' },
  contactCircle: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, borderColor: '#00cda7', backgroundColor: '#006d65', alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'flex-start', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#00dbc2', borderRadius: 24, paddingHorizontal: 12, paddingVertical: 7 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 94 }, statIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#005372', borderWidth: 1, borderColor: '#007da5', alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 10, borderWidth: 1, borderColor: '#066f9d', borderRadius: 12 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 }, sample: { fontSize: 11, color: '#e9c783', lineHeight: 17 }, monthLabel: { color: '#c5dafa', padding: 9, borderWidth: 1, borderColor: '#066f9d', borderRadius: 12 }, tableValue: { minWidth: 0, justifyContent: 'center', paddingHorizontal: 4 }, attendanceBadge: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 4, padding: 6, borderWidth: 1, borderColor: '#00dbc2', borderRadius: 20 },
  page: { flex: 1, backgroundColor: '#001625' }, content: { padding: 18, gap: 16, width: '100%', maxWidth: 1180, alignSelf: 'center', paddingBottom: 30 },
  heading: { fontSize: 29, fontWeight: '800', color: '#fff' }, title: { fontSize: 20, fontWeight: '700', color: '#fff' }, text: { color: '#a7cbed', fontSize: 15, lineHeight: 23 }, note: { color: '#96b8d4', fontSize: 12, lineHeight: 19 }, cyan: { color: '#00ede0', fontWeight: '700' }, white: { color: '#fff' },
  panel: { borderWidth: 1, borderColor: '#066f9d', borderRadius: 17, backgroundColor: '#002238', padding: 16, gap: 8 }, profile: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20 }, avatar: { width: 86, height: 86, borderRadius: 43, borderWidth: 2, borderColor: '#00d7ea', alignItems: 'center', justifyContent: 'center' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, contact: { minWidth: 70, minHeight: 65, alignItems: 'center', justifyContent: 'center', gap: 8 }, action: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, calendarHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }, grid: { flexDirection: 'row', flexWrap: 'wrap' }, cell: { width: '14.285714%', height: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#064366' }, date: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center', gap: 4 }, today: { borderWidth: 1, borderColor: '#00eee2', borderRadius: 20, backgroundColor: '#005868' }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#00ded2' }, tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#066f9d', paddingVertical: 17, alignItems: 'center' }, tableCell: { color: '#a7cbed', fontSize: 14, paddingHorizontal: 4 }, dateColumn: { width: '21%' }, standardColumn: { width: '18%' }, statusColumn: { width: '25%' },
});
