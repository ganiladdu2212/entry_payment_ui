import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { getUserSubscription, verifyPaymentReceipt } from '@/features/subscriptions/userSubscriptionApi';
import { paymentStatusLabels } from '@/features/subscriptions/paymentStatus';
import { useAuthStore } from '@/features/auth/authStore';
import { getCheckInCheckOut, type AttendanceEvent } from '@/features/attendance/attendanceApi';
import { getGymHolidays } from '@/features/holidays/holidayApi';

const day = 86400000;
const format = (value: number) => new Date(value).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
const eventTime = (value: string) => Date.parse(value + (/[zZ]|[+-]\d\d:\d\d$/.test(value) ? '' : '+05:30'));
type AttendanceSession = { key: number; date: number; checkIn?: number; checkOut?: number; kind?: 'ABSENT' | 'HOLIDAY'; purpose?: string };
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
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<number | null>(null);
  const [training, setTraining] = useState(false);
  const [notice, setNotice] = useState('');
  const [receipt, setReceipt] = useState<{ uri: string; mimeType?: string } | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [attendanceEventsOpen, setAttendanceEventsOpen] = useState(false);
  const query = useQuery({ queryKey: ['user', customer?.custId, id], queryFn: () => getUserSubscription(id), enabled: !!customer && Number.isSafeInteger(id) && id > 0 });
  const attendance = useQuery({ queryKey: ['attendance', customer?.custId, id], queryFn: () => getCheckInCheckOut(id), enabled: !!customer && Number.isSafeInteger(id) && id > 0 });
  const holidays = useQuery({ queryKey: ['gym-holidays', customer?.custId], queryFn: () => getGymHolidays(customer!.custId), enabled: !!customer });
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
  const activeDate = selectedDate ?? (end && today >= start && today < end ? today : start);
  const activeEndDate = selectedEndDate ?? activeDate;
  const dateKey = (value:number) => `${new Date(value).getUTCFullYear()}-${String(new Date(value).getUTCMonth()+1).padStart(2,'0')}-${String(new Date(value).getUTCDate()).padStart(2,'0')}`;
  const activeDateKey = Number.isFinite(activeDate) ? dateKey(activeDate) : '';
  const activeEndDateKey = Number.isFinite(activeEndDate) ? dateKey(activeEndDate) : activeDateKey;
  const wide = width >= 760;
  const sessions=attendanceSessions(attendance.data ?? []);
  const eventDateKeys=new Set((attendance.data??[]).map(event=>new Date(eventTime(event.createdDate)).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'})));
  const holidaysByDate=new Map((holidays.data??[]).map(holiday=>[holiday.holidayDate,holiday]));
  const holidayReady=!holidays.isPending&&!holidays.isError;
  const subscriptionDateKeys:string[]=[];
  if(Number.isFinite(start)&&end){for(let date=start;date<end;date+=day)subscriptionDateKeys.push(dateKey(date));}
  const absentDateKeys=new Set(holidayReady?subscriptionDateKeys.filter(key=>Date.parse(`${key}T00:00:00Z`)<today&&!holidaysByDate.has(key)&&!eventDateKeys.has(key)):[]);
  const syntheticSessions:AttendanceSession[]=[...subscriptionDateKeys.filter(key=>holidaysByDate.has(key)&&!eventDateKeys.has(key)).map(key=>({key:-Date.parse(`${key}T00:00:00Z`),date:Date.parse(`${key}T00:00:00Z`),kind:'HOLIDAY' as const,purpose:holidaysByDate.get(key)?.purpose})),...absentDateKeys].map(item=>typeof item==='string'?({key:-Date.parse(`${item}T00:00:00Z`)-1,date:Date.parse(`${item}T00:00:00Z`),kind:'ABSENT' as const}):item);
  const selectedSessions=[...sessions,...syntheticSessions].filter(row => {const key=new Date(row.date).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});return key>=activeDateKey&&key<=activeEndDateKey;}).sort((a,b)=>b.date-a.date);
  const selectedEvents=(attendance.data ?? []).filter(event => {const key=new Date(eventTime(event.createdDate)).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});return key>=activeDateKey&&key<=activeEndDateKey;});
  const selectedEventCount=selectedEvents.length;
  const checkInCount=(attendance.data ?? []).filter(event => event.actionType==='CHECK_IN').length;
  const cells = end ? Array.from({ length: month.getUTCDay() + new Date(nextMonth - day).getUTCDate() }, (_, index) => {
    const date = month.getTime() + (index - month.getUTCDay()) * day;
    return index >= month.getUTCDay() && date >= start && date < end ? date : null;
  }) : [];
  const selectCalendarDate = (date:number) => {
    if (selectedDate === null || selectedEndDate !== null) {
      setSelectedDate(date);
      setSelectedEndDate(null);
      return;
    }
    setSelectedDate(Math.min(selectedDate,date));
    setSelectedEndDate(Math.max(selectedDate,date));
  };
  const open = async (url: string) => { try { await Linking.openURL(url); } catch { setNotice('This device could not open that app.'); } };
  const captureReceipt = async () => {
    setReceiptError('');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { setReceiptError('Camera permission is required to capture the payment receipt.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false });
    if (!result.canceled && result.assets[0]) setReceipt({ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType });
  };
  const submitReceipt = async () => {
    if (!receipt) return;
    setReceiptBusy(true); setReceiptError('');
    try {
      const verified = await verifyPaymentReceipt(id, receipt.uri, receipt.mimeType);
      setReceipt(null); setNotice(`Payment received. Transaction: ${verified.transactionReference}`);
      await query.refetch();
    } catch (error) { setReceiptError(error instanceof Error ? error.message : 'Unable to verify payment receipt.'); }
    finally { setReceiptBusy(false); }
  };
  return <SafeAreaView edges={['top']} style={s.page}><ScrollView contentContainerStyle={s.content}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back to customers" style={s.action} onPress={() => router.back()}><Ionicons name="chevron-back" size={30} color="white" /></Pressable>
    <View style={s.headerRow}><View style={{ flex: 1, minWidth: 200, gap: 8 }}><Text style={s.heading}>{subscription?.paymentStatus === 'ENQUIRED' ? 'Enquired' : 'Registered'} <Text style={s.cyan}>Customer Details</Text></Text>
    <Text style={s.text}>{subscription?.paymentStatus === 'ENQUIRED' ? 'View complete information about your enquired customer.' : 'View complete information about your registered customer.'}</Text></View>
    {subscription && subscription.paymentStatus !== 'ENQUIRED' && <View style={s.remaining}><Ionicons name="time-outline" size={32} color="#00ede0" /><View><Text style={s.cyan}>Remaining</Text><Text style={s.title}>{remaining ?? '—'} Days</Text></View></View>}</View>
    {!customer ? <Text style={s.text}>Please log in to view customer details.</Text> : !Number.isSafeInteger(id) || id < 1 ? <Text style={s.text}>Invalid customer link.</Text> : query.isPending ? <ActivityIndicator color="#00e7df" /> : query.isError ? <Pressable onPress={() => void query.refetch()}><Text style={s.text}>Unable to load customer. Tap to retry.</Text></Pressable> : null}
    {user && <>
      <View style={[s.panel, s.profile]}>
        <View style={s.avatar}><Ionicons name="person" size={44} color="#a4d7ff" /></View>
        <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 160, gap: 8 }}><Text style={[s.title, { fontSize: 23 }]}>{user.name}</Text><Text style={s.text}>☎  {user.countryCode} {user.mobileNumber}</Text><Text style={s.text}>Joined on {format(Date.parse(user.createdDate.slice(0, 10) + 'T00:00:00Z'))}</Text><View style={s.statusPill}><Ionicons name={subscription?.paymentStatus === 'PENDING' ? 'time-outline' : 'checkmark-circle'} size={22} color="#00ede0" /><Text style={s.cyan}>{subscription?.paymentStatus ? paymentStatusLabels[subscription.paymentStatus] : 'Payment not recorded'}</Text></View>{subscription?.paymentStatus === 'PENDING' && <Pressable accessibilityRole="button" onPress={() => void captureReceipt()} style={s.cameraButton}><Ionicons name="camera" size={23} color="#002431" /><Text style={s.cameraButtonText}>Capture payment receipt</Text></Pressable>}</View>
        <View style={[s.actions, !wide && { width: '100%', justifyContent: 'space-around' }]}>{(['Call', 'WhatsApp', 'Message'] as const).map((label, index) => <Pressable key={label} accessibilityRole="button" onPress={() => void open(index === 0 ? `tel:${user.countryCode}${user.mobileNumber}` : index === 1 ? `https://wa.me/${(user.countryCode + user.mobileNumber).replace(/\D/g, '')}` : `sms:${user.countryCode}${user.mobileNumber}`)} style={s.contact}><View style={[s.contactCircle, index === 2 && { backgroundColor: '#005f9b', borderColor: '#009eea' }]}><Ionicons name={index === 0 ? 'call' : index === 1 ? 'logo-whatsapp' : 'chatbox-outline'} size={29} color="#adfff5" /></View><Text style={s.text}>{label}</Text></Pressable>)}</View>
      </View>
      {!!notice && <Text accessibilityRole="alert" style={s.text}>{notice}</Text>}
      {subscription?.membershipPlan && subscription.trainingPlan && <View style={s.actions}>{['Membership', 'Personal Training'].map((label, index) => <Pressable key={label} onPress={() => { setTraining(index === 1); setMonthOffset(0); setSelectedDate(null); setSelectedEndDate(null); }} style={s.panel}><Text style={training === (index === 1) ? s.cyan : s.text}>{label}</Text></Pressable>)}</View>}
      <Text style={s.note}>Past open days without an attendance event are marked absent. Today and future dates are never counted as absent.</Text>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14 }}>
        <View style={[s.panel, wide && { flex: 1.6 }, { minWidth: 0 }]}>
          <View style={s.calendarHeader}><Text style={[s.title, { flex: 1 }]}>{end ? month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Subscription calendar'}</Text>{end && <View style={s.actions}>{[-1, 1].map(direction => <Pressable key={direction} accessibilityLabel={direction < 0 ? 'Previous month' : 'Next month'} disabled={direction < 0 ? monthOffset === 0 : nextMonth >= end} onPress={() => setMonthOffset(monthOffset + direction)} style={[s.action, { opacity: (direction < 0 ? monthOffset === 0 : nextMonth >= end) ? .3 : 1 }]}><Ionicons name={direction < 0 ? 'chevron-back' : 'chevron-forward'} size={24} color="#a4d7ff" /></Pressable>)}</View>}</View>
          <View style={s.grid}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(label => <View key={label} style={s.cell}><Text style={s.note}>{label}</Text></View>)}{cells.map((date, index) => {const inRange=date!==null&&date>=activeDate&&date<=activeEndDate;const endpoint=date===activeDate||date===activeEndDate;const key=date===null?'':dateKey(date);const isHoliday=holidaysByDate.has(key);const isAbsent=absentDateKeys.has(key);const isPresent=eventDateKeys.has(key);return <View key={index} style={[s.cell,inRange&&s.rangeCell]}>{date !== null && <Pressable accessibilityRole="button" accessibilityLabel={`Select ${format(date)}`} accessibilityState={{selected:inRange}} onPress={()=>selectCalendarDate(date)} style={[s.date,date===today&&s.today,inRange&&s.rangeDate,endpoint&&s.selectedDate,isHoliday&&s.holidayDate,isAbsent&&s.absentDate]}><Text style={[s.white,endpoint&&s.selectedDateText]}>{new Date(date).getUTCDate()}</Text><View style={[s.dot,isPresent&&s.presentDot,isHoliday&&s.holidayDot,isAbsent&&s.absentDot]} /></Pressable>}</View>;})}</View>
          <Text style={s.note}>{end ? selectedDate!==null&&selectedEndDate===null?'● Select an end day to create a date range':'● Select a start day, then an end day to view sequential dates' : 'Subscription dates unavailable'}</Text>
          <View style={s.legend}>{[['Present','#00dfbe'],['Absent','#ff5573'],['Holiday','#83a5d3']].map(([label,color]) => <View key={label} style={s.legendItem}><View style={[s.dot,{ backgroundColor: color, width: 10, height: 10 }]} /><Text style={s.note}>{label}</Text></View>)}</View>{holidaysByDate.get(activeDateKey)&&<Text style={s.holidayPurpose}>Holiday: {holidaysByDate.get(activeDateKey)?.purpose}</Text>}
        </View>
        <View style={[{ gap: 10 }, wide && { flex: 1 }]}>{[['Start Date', Number.isFinite(start) ? format(start) : '—'], ['Subscription Plan', plan?.planName ?? 'Not selected'], ['Valid Till', end ? format(end - day) : '—'], ['Total Check-Ins', attendance.isPending ? '…' : String(checkInCount)], ['Absent', holidays.isPending ? '…' : holidays.isError ? '—' : String(absentDateKeys.size)]].map(([label,value], index) => <View key={label} style={[s.panel, s.stat]}><View style={[s.statIcon, index === 4 && { backgroundColor: '#53253d', borderColor: '#ff5573' }]}><Ionicons name={index === 1 ? 'barbell-outline' : index === 4 ? 'close-circle' : 'calendar-outline'} size={29} color={index === 4 ? '#ff5573' : '#68f2fa'} /></View><View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text style={s.text}>{label}</Text><Text style={s.title}>{value}</Text>{index === 4 && <Text style={s.sample}>{holidays.isError?'Unable to load holidays':'Past open days without attendance'}</Text>}</View></View>)}</View>
      </View>
      <View style={s.panel}><View style={s.headerRow}><View style={s.legendItem}><Ionicons name="calendar-outline" size={28} color="#a7cbed" /><Text style={s.title}>Daily Attendance</Text></View><Text style={s.monthLabel}>{Number.isFinite(activeDate)?selectedEndDate!==null?`${format(activeDate)} – ${format(activeEndDate)}`:format(activeDate):'Select a day'}</Text></View>{attendance.isPending||holidays.isPending ? <ActivityIndicator color="#00ede0" /> : attendance.isError ? <Pressable onPress={() => void attendance.refetch()}><Text accessibilityRole="alert" style={s.sample}>Unable to load attendance. Tap to retry.</Text></Pressable> : holidays.isError ? <Pressable onPress={() => void holidays.refetch()}><Text accessibilityRole="alert" style={s.sample}>Unable to load holidays. Tap to retry.</Text></Pressable> : <ScrollView horizontal showsHorizontalScrollIndicator><View style={{ width: Math.max(760, Math.min(width - 72, 1100)) }}><View style={s.tableRow}>{['Date','Check-in Time','Check-out Time','Attendance','Duration'].map((label,index) => <Text key={label} style={[s.tableCell,tableColumn(index)]}>{label}</Text>)}</View>{selectedSessions.map(row => { const complete=!!row.checkIn&&!!row.checkOut;const status=row.kind==='HOLIDAY'?'Holiday':row.kind==='ABSENT'?'Absent':complete?'Present':row.checkIn?'Check-in active':'Checkout only';const badgeColor=row.kind==='ABSENT'?'#ff627d':row.kind==='HOLIDAY'?'#9bb9e0':'#00ede0'; return <View key={row.key} style={s.tableRow}>{[
        new Date(row.date).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric'}),clock(row.checkIn),clock(row.checkOut),status,row.kind==='HOLIDAY'?(row.purpose??'Holiday'):duration(row)
      ].map((value,index) => <View key={index} style={[s.tableValue,tableColumn(index)]}>{index === 3 ? <View style={[s.attendanceBadge,{borderColor:badgeColor}]}><Ionicons name={row.kind==='ABSENT'?'close-circle':row.kind==='HOLIDAY'?'calendar':'checkmark-circle'} size={18} color={badgeColor} /><Text style={{color:badgeColor}}>{value}</Text></View> : <Text style={index === 0 ? s.white : s.text}>{value}</Text>}</View>)}</View>;})}{selectedSessions.length===0 && <Text style={[s.text,{padding:20}]}>No attendance records for {Number.isFinite(activeDate)?selectedEndDate!==null?`${format(activeDate)} – ${format(activeEndDate)}`:format(activeDate):'the selected range'}.</Text>}</View></ScrollView>}<Text style={[s.note,{ textAlign: 'center', paddingTop: 10 }]}>Showing {selectedSessions.length} day/session row{selectedSessions.length===1?'':'s'} from {selectedEventCount} event{selectedEventCount===1?'':'s'} · newest first</Text><Pressable accessibilityRole="button" onPress={() => setAttendanceEventsOpen(true)} style={s.viewEventsButton}><Ionicons name="list-outline" size={21} color="#002431" /><Text style={s.viewEventsText}>View all check-in/check-out events</Text></Pressable></View>
    </>}
  </ScrollView>
    <Modal visible={attendanceEventsOpen} transparent animationType="fade" onRequestClose={() => setAttendanceEventsOpen(false)}>
      <View style={s.eventsBackdrop}>
        <Pressable accessibilityLabel="Close attendance events" style={StyleSheet.absoluteFill} onPress={() => setAttendanceEventsOpen(false)} />
        <View style={s.eventsModal}>
          <View style={s.headerRow}><View style={{flex:1,minWidth:180,gap:4}}><Text style={s.title}>Check-in / Check-out Events</Text><Text style={s.note}>{Number.isFinite(activeDate)?selectedEndDate!==null?`${format(activeDate)} – ${format(activeEndDate)}`:format(activeDate):'Selected dates'} · newest first</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setAttendanceEventsOpen(false)} style={s.action}><Ionicons name="close" size={27} color="#a7cbed" /></Pressable></View>
          <ScrollView contentContainerStyle={s.eventsList} showsVerticalScrollIndicator={false}>
            {selectedEvents.map(event => <View key={event.attendanceEventId} style={s.eventRow}><View style={[s.eventIcon,event.actionType==='CHECK_OUT'&&s.checkoutIcon]}><Ionicons name={event.actionType==='CHECK_IN'?'log-in-outline':'log-out-outline'} size={24} color={event.actionType==='CHECK_IN'?'#00edcf':'#7fcaff'} /></View><View style={{flex:1,minWidth:0,gap:3}}><Text style={s.eventAction}>{event.actionType==='CHECK_IN'?'Check in':'Check out'}</Text><Text style={s.text}>{new Date(eventTime(event.createdDate)).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric'})} · {clock(eventTime(event.createdDate))}</Text><Text numberOfLines={1} style={s.note}>Device: {event.deviceUniqueId}</Text></View><Text style={s.eventId}>#{event.attendanceEventId}</Text></View>)}
            {!selectedEvents.length && <View style={s.emptyEvents}><Ionicons name="calendar-outline" size={42} color="#6d98b7" /><Text style={s.text}>No check-in or check-out events for the selected dates.</Text></View>}
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={() => setAttendanceEventsOpen(false)} style={s.viewEventsButton}><Text style={s.viewEventsText}>Done</Text></Pressable>
        </View>
      </View>
    </Modal>
    <Modal visible={!!receipt} transparent animationType="fade" onRequestClose={() => !receiptBusy && setReceipt(null)}>
      <View style={s.receiptBackdrop}><View style={s.receiptModal}><Text style={s.title}>Review Payment Receipt</Text><Text style={s.note}>Make sure the amount, successful status, and transaction ID are clear.</Text>{receipt && <Image source={{ uri: receipt.uri }} resizeMode="contain" style={s.receiptImage} />}{!!receiptError && <Text accessibilityRole="alert" style={s.receiptError}>{receiptError}</Text>}<View style={s.receiptActions}><Pressable disabled={receiptBusy} onPress={() => void captureReceipt()} style={s.retakeButton}><Ionicons name="camera-reverse-outline" size={21} color="#a7cbed" /><Text style={s.text}>Retake</Text></Pressable><Pressable disabled={receiptBusy} onPress={() => void submitReceipt()} style={[s.cameraButton, receiptBusy && { opacity: .6 }]}>{receiptBusy ? <ActivityIndicator color="#002431" /> : <Ionicons name="cloud-upload-outline" size={22} color="#002431" />}<Text style={s.cameraButtonText}>{receiptBusy ? 'Reading receipt…' : 'Submit'}</Text></Pressable></View><Pressable disabled={receiptBusy} onPress={() => { setReceipt(null); setReceiptError(''); }}><Text style={[s.text, { textAlign: 'center' }]}>Cancel</Text></Pressable></View></View>
    </Modal>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  remaining: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#00ede0', borderRadius: 16, padding: 12, backgroundColor: '#00293c' },
  contactCircle: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, borderColor: '#00cda7', backgroundColor: '#006d65', alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'flex-start', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#00dbc2', borderRadius: 24, paddingHorizontal: 12, paddingVertical: 7 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 94 }, statIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#005372', borderWidth: 1, borderColor: '#007da5', alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 10, borderWidth: 1, borderColor: '#066f9d', borderRadius: 12 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 }, sample: { fontSize: 11, color: '#e9c783', lineHeight: 17 }, monthLabel: { color: '#c5dafa', padding: 9, borderWidth: 1, borderColor: '#066f9d', borderRadius: 12 }, tableValue: { minWidth: 0, justifyContent: 'center', paddingHorizontal: 4 }, attendanceBadge: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 4, padding: 6, borderWidth: 1, borderColor: '#00dbc2', borderRadius: 20 },
  page: { flex: 1, backgroundColor: '#001625' }, content: { padding: 18, gap: 16, width: '100%', maxWidth: 960, alignSelf: 'center', paddingBottom: 30 },
  heading: { fontSize: 27, fontWeight: '700', color: '#fff' }, title: { fontSize: 20, fontWeight: '700', color: '#fff' }, text: { color: '#a7cbed', fontSize: 15, lineHeight: 23 }, note: { color: '#96b8d4', fontSize: 12, lineHeight: 19 }, cyan: { color: '#00ede0', fontWeight: '700' }, white: { color: '#fff' },
  panel: { borderWidth: 1, borderColor: '#066f9d', borderRadius: 17, backgroundColor: '#002238', padding: 16, gap: 8 }, profile: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20 }, avatar: { width: 86, height: 86, borderRadius: 43, borderWidth: 2, borderColor: '#00d7ea', alignItems: 'center', justifyContent: 'center' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, contact: { minWidth: 70, minHeight: 65, alignItems: 'center', justifyContent: 'center', gap: 8 }, action: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, calendarHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }, grid: { flexDirection: 'row', flexWrap: 'wrap' }, cell: { width: '14.285714%', height: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#064366' }, rangeCell: { backgroundColor: 'rgba(0,238,226,.12)' }, date: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 4 }, today: { borderWidth: 1, borderColor: '#00eee2', backgroundColor: '#005868' }, rangeDate: { backgroundColor: '#075568' }, holidayDate: { borderWidth: 1, borderColor: '#83a5d3' }, absentDate: { borderWidth: 1, borderColor: '#ff5573' }, selectedDate: { borderWidth: 2, borderColor: '#00eee2', backgroundColor: '#00eee2' }, selectedDateText: { color: '#002431', fontWeight: '800' }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#00ded2' }, presentDot: { backgroundColor: '#00dfbe' }, holidayDot: { backgroundColor: '#83a5d3' }, absentDot: { backgroundColor: '#ff5573' }, holidayPurpose: { color: '#bed3ef', fontSize: 13, padding: 9, borderWidth: 1, borderColor: '#527aa5', borderRadius: 10 }, tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#066f9d', paddingVertical: 17, alignItems: 'center' }, tableCell: { color: '#a7cbed', fontSize: 14, paddingHorizontal: 4 }, dateColumn: { width: '21%' }, standardColumn: { width: '18%' }, statusColumn: { width: '25%' },
  cameraButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', gap: 8, paddingHorizontal: 17, borderRadius: 24, backgroundColor: '#00ede0' }, cameraButtonText: { flexShrink: 1, textAlign: 'center', color: '#002431', fontWeight: '800' }, receiptBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: 'rgba(0,10,22,.88)' }, receiptModal: { width: '100%', maxWidth: 620, maxHeight: '92%', gap: 14, padding: 18, borderWidth: 1, borderColor: '#00b8d7', borderRadius: 20, backgroundColor: '#002238' }, receiptImage: { width: '100%', height: 480, maxHeight: '65%', borderRadius: 13, backgroundColor: '#00121f' }, receiptActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12 }, retakeButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18, borderWidth: 1, borderColor: '#467391', borderRadius: 24 }, receiptError: { color: '#ffbd73', fontSize: 14 },
  viewEventsButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', gap: 8, paddingHorizontal: 20, borderRadius: 24, backgroundColor: '#00ede0' }, viewEventsText: { color: '#002431', fontWeight: '800', textAlign: 'center' }, eventsBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: 'rgba(0,10,22,.9)' }, eventsModal: { width: '100%', maxWidth: 680, maxHeight: '88%', gap: 14, padding: 18, borderWidth: 1, borderColor: '#00b8d7', borderRadius: 20, backgroundColor: '#002238' }, eventsList: { gap: 10, paddingVertical: 4 }, eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderWidth: 1, borderColor: '#075b80', borderRadius: 14, backgroundColor: '#001c30' }, eventIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#00bca8', backgroundColor: '#003e48' }, checkoutIcon: { borderColor: '#2586c0', backgroundColor: '#073b5a' }, eventAction: { color: '#fff', fontSize: 16, fontWeight: '700' }, eventId: { color: '#6f9eba', fontSize: 12 }, emptyEvents: { alignItems: 'center', gap: 12, padding: 28 },
});
