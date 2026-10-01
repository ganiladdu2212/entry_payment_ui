import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCheckInCheckOut, type AttendanceEvent } from '@/features/attendance/attendanceApi';
import { getUsersByCustomer } from '@/features/subscriptions/userSubscriptionApi';
import { useAuthStore } from '@/features/auth/authStore';

const cyan='#00e8ec', zone='Asia/Kolkata';
const eventTime=(value:string)=>Date.parse(value+(/[zZ]|[+-]\d\d:\d\d$/.test(value)?'':'+05:30'));
const dateKey=(time:number)=>new Date(time).toLocaleDateString('en-CA',{timeZone:zone});
const dateTitle=(key:string)=>new Date(key+'T00:00:00+05:30').toLocaleDateString('en-IN',{timeZone:zone,day:'numeric',month:'long',year:'numeric'});
const monthTitle=(date:Date)=>date.toLocaleDateString('en-IN',{month:'long',year:'numeric',timeZone:'UTC'});
const calendarKey=(year:number,month:number,day:number)=>`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
const calendarDays=(month:Date)=>{
  const year=month.getUTCFullYear(),monthIndex=month.getUTCMonth();
  const firstDay=new Date(Date.UTC(year,monthIndex,1)).getUTCDay();
  const daysInMonth=new Date(Date.UTC(year,monthIndex+1,0)).getUTCDate();
  return Array.from({length:42},(_,index)=>{
    const day=index-firstDay+1;
    return day>0&&day<=daysInMonth?{day,key:calendarKey(year,monthIndex,day)}:null;
  });
};
type Session={userId:number;start:number;end:number};
type Slot={label:string;hour:number;value:number};

function sessionsForDate(events:AttendanceEvent[],selected:string):Session[]{
  const end=Date.parse(selected+'T00:00:00+05:30')+86400000, now=Date.now();
  const grouped=new Map<number,AttendanceEvent[]>();
  events.filter(event=>dateKey(eventTime(event.createdDate))===selected).forEach(event=>grouped.set(event.userId,[...(grouped.get(event.userId)??[]),event]));
  const result:Session[]=[];
  grouped.forEach((items,userId)=>{let open:number|undefined;[...items].sort((a,b)=>eventTime(a.createdDate)-eventTime(b.createdDate)).forEach(event=>{const time=eventTime(event.createdDate);if(event.actionType==='CHECK_IN'){if(open!==undefined)result.push({userId,start:open,end:time});open=time;}else if(open!==undefined){result.push({userId,start:open,end:time});open=undefined;}});if(open!==undefined)result.push({userId,start:open,end:selected===dateKey(now)?Math.min(now,end):end});});
  return result;
}
function buildSlots(sessions:Session[],selected:string,hours:number[]):Slot[]{
  const start=Date.parse(selected+'T00:00:00+05:30');
  return hours.map(hour=>{const from=start+hour*3600000,until=from+3600000;const value=new Set(sessions.filter(item=>item.start<until&&item.end>from).map(item=>item.userId)).size;return{hour,value,label:`${hour%12||12}:00 - ${(hour+1)%12||12}:00`};});
}
function Chart({title,range,icon,data}:{title:string;range:string;icon:keyof typeof Ionicons.glyphMap;data:Slot[]}){
  const max=Math.max(1,...data.map(item=>item.value)),peak=Math.max(...data.map(item=>item.value));
  return <View style={s.card}><View style={s.chartHead}><Ionicons name={icon} size={35} color={icon==='sunny'?'#ffd31a':'#a98cff'}/><Text style={s.sectionTitle}>{title}</Text><Text style={s.subtitle}>{range}</Text></View><ScrollView horizontal contentContainerStyle={s.chartScroll}><View style={s.chart}>{data.map(item=><View key={item.hour} style={s.barColumn}><Text style={s.barValue}>{item.value}</Text><View style={[s.bar,item.value===peak&&peak>0&&s.peakBar,{height:Math.max(5,item.value/max*145)}]}/>{item.value===peak&&peak>0&&<Text style={s.peak}>Peak</Text>}<Text style={s.slot}>{item.label}</Text></View>)}</View></ScrollView></View>;
}

export default function GymAttendance(){
  const router=useRouter(),{width}=useWindowDimensions(),customer=useAuthStore(state=>state.customer);
  const attendance=useQuery({queryKey:['attendance','all',customer?.custId],queryFn:()=>getCheckInCheckOut(),enabled:!!customer});
  const users=useQuery({queryKey:['users',customer?.custId],queryFn:()=>getUsersByCustomer(customer!.custId),enabled:!!customer});
  const today=dateKey(Date.now());
  const [selected,setSelected]=useState(today),[dateOpen,setDateOpen]=useState(false);
  const [calendarMonth,setCalendarMonth]=useState(()=>new Date(today+'T00:00:00Z'));
  const sessions=useMemo(()=>sessionsForDate(attendance.data??[],selected),[attendance.data,selected]);
  const morning=buildSlots(sessions,selected,[5,6,7,8,9,10,11]),evening=buildSlots(sessions,selected,[16,17,18,19,20,21]);
  const all=[...morning,...evening],peak=Math.max(0,...all.map(slot=>slot.value)),peakLabels=all.filter(slot=>slot.value===peak&&peak>0).map(slot=>slot.label);
  const unique=new Set(sessions.map(item=>item.userId)).size,morningStart=Date.parse(selected+'T05:00:00+05:30'),noon=Date.parse(selected+'T12:00:00+05:30'),four=Date.parse(selected+'T16:00:00+05:30'),eveningEnd=Date.parse(selected+'T22:00:00+05:30');
  const morningCount=new Set(sessions.filter(item=>item.start<noon&&item.end>morningStart).map(item=>item.userId)).size,eveningCount=new Set(sessions.filter(item=>item.start<eveningEnd&&item.end>four).map(item=>item.userId)).size;
  const rate=users.data?.length?Math.round(unique/users.data.length*100):0;
  return <SafeAreaView edges={['top']} style={s.page}><ScrollView contentContainerStyle={s.content}>
    <Pressable accessibilityLabel="Back" onPress={()=>router.back()} style={s.back}><Ionicons name="chevron-back" size={31} color="#fff"/></Pressable><Text style={[s.heading,width<460&&{fontSize:30}]}>Gym <Text style={s.accent}>Occupancy</Text></Text><Text style={s.subtitle}>See how many people are in the gym at different time slots.{ '\n' }Plan better. Manage better.</Text>
    <View style={s.selectRow}><View style={s.dateSelectWrap}><Pressable accessibilityRole="button" accessibilityState={{expanded:dateOpen}} onPress={()=>{setCalendarMonth(new Date(selected+'T00:00:00Z'));setDateOpen(!dateOpen);}} style={s.select}><Ionicons name="calendar-outline" size={31} color={cyan}/><View style={{flex:1}}><Text style={s.subtitle}>Select Date</Text><Text style={s.title}>{dateTitle(selected)}</Text></View><Ionicons name={dateOpen?'chevron-up':'chevron-down'} size={24} color={cyan}/></Pressable>{dateOpen&&<View style={s.menu}><View style={s.calendarHeader}><Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={()=>setCalendarMonth(value=>new Date(Date.UTC(value.getUTCFullYear(),value.getUTCMonth()-1,1)))} style={s.monthButton}><Ionicons name="chevron-back" size={22} color={cyan}/></Pressable><Text style={s.calendarTitle}>{monthTitle(calendarMonth)}</Text><Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={()=>setCalendarMonth(value=>new Date(Date.UTC(value.getUTCFullYear(),value.getUTCMonth()+1,1)))} style={s.monthButton}><Ionicons name="chevron-forward" size={22} color={cyan}/></Pressable></View><View style={s.weekRow}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=><Text key={day} style={s.weekDay}>{day}</Text>)}</View><View style={s.daysGrid}>{calendarDays(calendarMonth).map((item,index)=>item?<Pressable key={item.key} accessibilityRole="button" accessibilityLabel={dateTitle(item.key)} accessibilityState={{selected:item.key===selected}} onPress={()=>{setSelected(item.key);setDateOpen(false);}} style={[s.dayCell,item.key===selected&&s.selectedDay,item.key===today&&item.key!==selected&&s.today]}><Text style={[s.dayText,item.key===selected&&s.selectedDayText]}>{item.day}</Text></Pressable>:<View key={`blank-${index}`} style={s.dayCell}/>)}</View></View>}</View><View style={[s.select,{flex:1,minWidth:240}]}><Ionicons name="location-outline" size={35} color="#66f2f4"/><View><Text style={s.subtitle}>Gym Branch</Text><Text style={s.title}>All Branches</Text></View></View></View>
    {attendance.isPending?<ActivityIndicator color={cyan}/>:attendance.isError?<Pressable onPress={()=>void attendance.refetch()}><Text style={s.warning}>Unable to load attendance. Tap to retry.</Text></Pressable>:<><View style={s.peakCard}><Ionicons name="flame" size={48} color="#f068ff"/><View style={{flex:1,minWidth:190}}><Text style={s.purple}>Peak Time</Text><Text style={s.big}>{peakLabels.length?peakLabels.join(', '):'No occupancy recorded'}</Text></View><View style={s.divider}/><Ionicons name="people" size={45} color="#c18cff"/><View><Text style={s.subtitle}>Maximum People</Text><Text style={s.big}>{peak}</Text></View></View><Chart title="Morning" range="(5:00 AM – 12:00 PM)" icon="sunny" data={morning}/><Chart title="Evening" range="(4:00 PM – 10:00 PM)" icon="moon" data={evening}/><View style={s.summary}>{[["person",'Total',unique],["sunny",'Morning',morningCount],["moon",'Evening',eveningCount],["people",'Attendance',`${rate}%`]].map(([icon,label,value])=><View key={String(label)} style={s.summaryItem}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={31} color={label==='Morning'?'#ffd31a':label==='Evening'?'#ae8cff':'#9ef8ff'}/><Text style={s.subtitle}>{label}</Text><Text style={s.big}>{value}</Text></View>)}</View></>}
    <Text style={s.note}>Calculated from recorded check-in/check-out sessions. Branch filtering will be enabled after branch data is added.</Text>
  </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#001526'},content:{width:'100%',maxWidth:960,alignSelf:'center',padding:18,paddingBottom:35,gap:17},back:{width:44,height:44,justifyContent:'center'},heading:{color:'#fff',fontSize:30,fontWeight:'700'},title:{color:'#fff',fontSize:20,fontWeight:'700'},sectionTitle:{color:'#fff',fontSize:22,fontWeight:'700'},big:{color:'#fff',fontSize:24,fontWeight:'700'},subtitle:{color:'#a9cdf4',fontSize:16,lineHeight:23},text:{color:'#c4ddf8',fontSize:15},accent:{color:cyan,fontWeight:'800'},warning:{color:'#ffd278',fontSize:15},purple:{color:'#c5a9ff',fontSize:16,fontWeight:'700'},note:{color:'#86abc7',fontSize:12,lineHeight:18},selectRow:{position:'relative',zIndex:20,flexDirection:'row',flexWrap:'wrap',gap:14},dateSelectWrap:{position:'relative',zIndex:30,flex:1,minWidth:240},select:{minHeight:84,flexDirection:'row',alignItems:'center',gap:14,borderWidth:1,borderColor:'#009fea',borderRadius:16,padding:15,backgroundColor:'#002036'},menu:{position:'absolute',top:88,left:0,right:0,zIndex:100,elevation:20,borderWidth:1,borderColor:'#009fea',borderRadius:14,backgroundColor:'#00243b',padding:12,shadowColor:'#000',shadowOpacity:.45,shadowRadius:12,shadowOffset:{width:0,height:6}},calendarHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8},calendarTitle:{color:'#fff',fontSize:17,fontWeight:'700'},monthButton:{width:42,height:42,alignItems:'center',justifyContent:'center',borderRadius:21},weekRow:{flexDirection:'row',borderBottomWidth:1,borderBottomColor:'#075a7e'},weekDay:{width:'14.285714%',paddingVertical:7,color:'#91b9da',fontSize:11,textAlign:'center'},daysGrid:{flexDirection:'row',flexWrap:'wrap',paddingTop:6},dayCell:{width:'14.285714%',height:40,alignItems:'center',justifyContent:'center',borderRadius:20},dayText:{color:'#d8ebfa',fontSize:14},selectedDay:{backgroundColor:cyan},selectedDayText:{color:'#002431',fontWeight:'800'},today:{borderWidth:1,borderColor:cyan},peakCard:{position:'relative',zIndex:1,flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:18,borderWidth:1,borderColor:'#974df5',borderRadius:17,padding:20,backgroundColor:'#151749'},divider:{width:1,height:64,backgroundColor:'#764ad6'},card:{borderWidth:1,borderColor:'#00a6ea',borderRadius:17,padding:16,backgroundColor:'#002039',gap:13},chartHead:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:13},chartScroll:{minWidth:'100%'},chart:{height:230,minWidth:760,flexDirection:'row',alignItems:'flex-end',paddingHorizontal:25,paddingBottom:45,borderLeftWidth:1,borderBottomWidth:1,borderColor:'#05dfe4'},barColumn:{flex:1,height:180,alignItems:'center',justifyContent:'flex-end',gap:5},bar:{width:'60%',maxWidth:58,minWidth:26,borderTopLeftRadius:7,borderTopRightRadius:7,backgroundColor:'#00bee9'},peakBar:{backgroundColor:'#ffc526'},barValue:{color:'#e6f6ff',fontWeight:'800'},slot:{position:'absolute',bottom:-31,color:'#9fcdf2',fontSize:12},peak:{position:'absolute',top:-5,color:'#ffd21f',fontSize:11},summary:{flexDirection:'row',flexWrap:'wrap',borderWidth:1,borderColor:'#08739d',borderRadius:17,backgroundColor:'#002039'},summaryItem:{flexGrow:1,flexBasis:140,minHeight:115,alignItems:'center',justifyContent:'center',gap:5,borderRightWidth:1,borderColor:'#08739d'}});
