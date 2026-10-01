import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createGymHoliday, deleteGymHoliday, getGymHolidays } from '@/features/holidays/holidayApi';

const dateKey=(date:Date)=>`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
const label=(key:string)=>new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'});
export function HolidayManager({visible,custId,onClose}:{visible:boolean;custId:number;onClose:()=>void}) {
  const queryClient=useQueryClient();
  const india=new Date(Date.now()+330*60000);
  const [month,setMonth]=useState(()=>new Date(Date.UTC(india.getUTCFullYear(),india.getUTCMonth(),1)));
  const [selected,setSelected]=useState(()=>dateKey(india));
  const [purpose,setPurpose]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const query=useQuery({queryKey:['gym-holidays',custId],queryFn:()=>getGymHolidays(custId),enabled:visible&&custId>0});
  const holidaysByDate=useMemo(()=>new Map((query.data??[]).map(item=>[item.holidayDate,item])),[query.data]);
  const leading=month.getUTCDay();
  const total=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0)).getUTCDate();
  const cells=Array.from({length:leading+total},(_,index)=>index<leading?null:new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth(),index-leading+1)));
  const save=async()=>{
    if(!purpose.trim()){setError('Enter the purpose of the holiday.');return;}
    setBusy(true);setError('');
    try{await createGymHoliday({custId,holidayDate:selected,purpose:purpose.trim()});setPurpose('');await queryClient.invalidateQueries({queryKey:['gym-holidays',custId]});}
    catch(saveError){setError(saveError instanceof Error?saveError.message:'Unable to add holiday.');}
    finally{setBusy(false);}
  };
  const remove=async(id:number)=>{setBusy(true);setError('');try{await deleteGymHoliday(id);await queryClient.invalidateQueries({queryKey:['gym-holidays',custId]});}catch(deleteError){setError(deleteError instanceof Error?deleteError.message:'Unable to delete holiday.');}finally{setBusy(false);}};
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={s.backdrop}><Pressable accessibilityLabel="Close holidays" style={StyleSheet.absoluteFill} onPress={onClose}/><View style={s.modal}>
    <View style={s.header}><View style={s.icon}><Ionicons name="calendar" size={27} color="#83fff7"/></View><View style={{flex:1}}><Text style={s.title}>Gym Holidays</Text><Text style={s.note}>Add closed dates so they are not counted as absences.</Text></View><Pressable accessibilityLabel="Close" onPress={onClose} style={s.close}><Ionicons name="close" size={26} color="#b7d9f4"/></Pressable></View>
    <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
      <View style={s.monthHeader}><Pressable accessibilityLabel="Previous month" onPress={()=>setMonth(new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()-1,1)))} style={s.close}><Ionicons name="chevron-back" size={24} color="#a9d5f4"/></Pressable><Text style={s.month}>{month.toLocaleDateString('en-IN',{timeZone:'UTC',month:'long',year:'numeric'})}</Text><Pressable accessibilityLabel="Next month" onPress={()=>setMonth(new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,1)))} style={s.close}><Ionicons name="chevron-forward" size={24} color="#a9d5f4"/></Pressable></View>
      <View style={s.grid}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=><Text key={day} style={s.weekday}>{day}</Text>)}{cells.map((date,index)=>date?<Pressable key={dateKey(date)} accessibilityRole="button" accessibilityState={{selected:selected===dateKey(date)}} onPress={()=>setSelected(dateKey(date))} style={[s.day,selected===dateKey(date)&&s.selected,holidaysByDate.has(dateKey(date))&&s.holiday]}><Text style={[s.dayText,selected===dateKey(date)&&s.selectedText]}>{date.getUTCDate()}</Text>{holidaysByDate.has(dateKey(date))&&<View style={s.dot}/>}</Pressable>:<View key={`empty-${index}`} style={s.day}/>)}</View>
      <View style={s.field}><Text style={s.fieldLabel}>Holiday date</Text><Text style={s.selectedLabel}>{label(selected)}</Text></View>
      <View style={s.field}><Text style={s.fieldLabel}>Purpose</Text><TextInput value={purpose} onChangeText={setPurpose} maxLength={250} placeholder="Example: Diwali" placeholderTextColor="#7395ae" style={s.input}/></View>
      {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <Pressable disabled={busy||holidaysByDate.has(selected)} onPress={()=>void save()} style={[s.add,busy||holidaysByDate.has(selected)?s.disabled:null]}>{busy?<ActivityIndicator color="#002431"/>:<Ionicons name="add-circle" size={22} color="#002431"/>}<Text style={s.addText}>{holidaysByDate.has(selected)?'Holiday already added':'Add Holiday'}</Text></Pressable>
      <Text style={s.listTitle}>Saved Holidays</Text>
      {query.isPending?<ActivityIndicator color="#00e5df"/>:query.isError?<Pressable onPress={()=>void query.refetch()}><Text style={s.error}>Unable to load holidays. Tap to retry.</Text></Pressable>:(query.data??[]).length?(query.data??[]).map(item=><View key={item.holidayId} style={s.row}><View style={{flex:1,gap:3}}><Text style={s.rowDate}>{label(item.holidayDate)}</Text><Text style={s.note}>{item.purpose}</Text></View><Pressable disabled={busy} accessibilityLabel={`Delete holiday ${item.purpose}`} onPress={()=>void remove(item.holidayId)} style={s.delete}><Ionicons name="trash-outline" size={21} color="#ff7180"/></Pressable></View>):<Text style={s.note}>No holidays added yet.</Text>}
    </ScrollView>
  </View></View></Modal>;
}
const s=StyleSheet.create({backdrop:{flex:1,alignItems:'center',justifyContent:'center',padding:16,backgroundColor:'rgba(0,10,22,.88)'},modal:{width:'100%',maxWidth:600,maxHeight:'94%',padding:18,gap:14,borderWidth:1,borderColor:'#078db0',borderRadius:22,backgroundColor:'#002238'},header:{flexDirection:'row',alignItems:'center',gap:12},icon:{width:48,height:48,borderRadius:24,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#00c7bc',backgroundColor:'#00424d'},title:{color:'#fff',fontSize:22,fontWeight:'800'},note:{color:'#9fc6e2',fontSize:14,lineHeight:20},close:{width:42,height:42,alignItems:'center',justifyContent:'center'},body:{gap:14,paddingBottom:8},monthHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},month:{color:'#fff',fontSize:19,fontWeight:'700'},grid:{flexDirection:'row',flexWrap:'wrap'},weekday:{width:'14.285714%',textAlign:'center',color:'#9fc6e2',fontSize:12,paddingVertical:8},day:{width:'14.285714%',height:44,alignItems:'center',justifyContent:'center',borderRadius:22},dayText:{color:'#e8f5ff'},selected:{backgroundColor:'#00e5df'},selectedText:{color:'#002431',fontWeight:'900'},holiday:{borderWidth:1,borderColor:'#ffbd59'},dot:{width:5,height:5,borderRadius:3,backgroundColor:'#ffbd59'},field:{gap:6},fieldLabel:{color:'#d9efff',fontWeight:'700'},selectedLabel:{color:'#65f5ed',fontSize:16},input:{minHeight:52,paddingHorizontal:14,borderWidth:1,borderColor:'#087498',borderRadius:14,backgroundColor:'#001b2d',color:'#fff',fontSize:16},error:{color:'#ffc071'},add:{minHeight:50,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,borderRadius:25,backgroundColor:'#00e5df'},disabled:{opacity:.5},addText:{color:'#002431',fontWeight:'900'},listTitle:{color:'#fff',fontSize:18,fontWeight:'800',marginTop:5},row:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderWidth:1,borderColor:'#075f80',borderRadius:13,backgroundColor:'#001c30'},rowDate:{color:'#fff',fontWeight:'700'},delete:{width:42,height:42,alignItems:'center',justifyContent:'center'}});
