import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AttendanceApiError, checkInCheckOut, type CheckInCheckOutResult } from '@/features/attendance/attendanceApi';
import { deviceIdStorage } from '@/storage/deviceId';

export default function CheckInCheckOutScreen() {
  const params = useLocalSearchParams<{ custId?: string | string[] }>();
  const custId = Number(Array.isArray(params.custId) ? params.custId[0] : params.custId);
  const started = useRef(false);
  const [deviceId, setDeviceId] = useState('');
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CheckInCheckOutResult | null>(null);

  const record = useCallback(async (id: string, credentials?: { mobileNumber: string; pin: string }) => {
    setBusy(true); setError('');
    try {
      const data = await checkInCheckOut({ custId, deviceUniqueId: id, ...credentials });
      setResult(data); setNeedsRegistration(false);
    } catch (requestError) {
      if (requestError instanceof AttendanceApiError && requestError.statusCode === 428) setNeedsRegistration(true);
      else setError(requestError instanceof Error ? requestError.message : 'Unable to record attendance.');
    } finally { setBusy(false); }
  }, [custId]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!Number.isSafeInteger(custId) || custId < 1) { setError('This attendance QR code is invalid.'); setBusy(false); return; }
    void deviceIdStorage.getOrCreate().then(id => { setDeviceId(id); return record(id); }).catch(() => { setError('Unable to identify this device.'); setBusy(false); });
  }, [custId, record]);

  const submit = () => {
    const normalizedMobile = mobile.replace(/\D/g, '');
    if (!/^[0-9]{6,15}$/.test(normalizedMobile)) { setError('Enter your registered mobile number.'); return; }
    if (!/^[0-9]{6}$/.test(pin)) { setError('PIN must contain exactly 6 digits.'); return; }
    void record(deviceId, { mobileNumber: normalizedMobile, pin });
  };

  return <LinearGradient colors={['#001528', '#003b60', '#001528']} style={s.page}><SafeAreaView style={s.safe}>
    <View style={s.card}>
      <View style={s.icon}><Ionicons name={result?.actionType === 'CHECK_OUT' ? 'log-out-outline' : 'scan-outline'} size={44} color="#002432" /></View>
      <Text style={s.title}>Gym Attendance</Text>
      {busy ? <><ActivityIndicator size="large" color="#00ece8" /><Text style={s.copy}>Checking this device…</Text></> : result ? <>
        <Ionicons name="checkmark-circle" size={72} color="#00e4c5" />
        <Text style={s.success}>{result.actionType === 'CHECK_IN' ? 'Checked in' : 'Checked out'}</Text>
        <Text style={s.name}>{result.name}</Text>
        <Text style={s.copy}>Your attendance was recorded successfully.</Text>
      </> : needsRegistration ? <>
        <Text style={s.copy}>First time on this device? Enter your registered mobile number and create or verify your 6-digit attendance PIN.</Text>
        <View style={s.field}><Ionicons name="call-outline" size={22} color="#78dfff" /><TextInput accessibilityLabel="Registered mobile number" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" inputMode="tel" placeholder="Registered mobile number" placeholderTextColor="#7395ae" style={s.input} /></View>
        <View style={s.field}><Ionicons name="key-outline" size={22} color="#78dfff" /><TextInput accessibilityLabel="Attendance PIN" value={pin} onChangeText={value => setPin(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" inputMode="numeric" secureTextEntry placeholder="6-digit PIN" placeholderTextColor="#7395ae" style={s.input} /></View>
        <Pressable accessibilityRole="button" onPress={submit} style={s.button}><Text style={s.buttonText}>Continue</Text><Ionicons name="arrow-forward" size={22} color="#002432" /></Pressable>
      </> : null}
      {!!error && <><Text accessibilityRole="alert" style={s.error}>{error}</Text>{deviceId && !result ? <Pressable accessibilityRole="button" onPress={() => void record(deviceId, needsRegistration && mobile && pin ? { mobileNumber: mobile.replace(/\D/g, ''), pin } : undefined)} style={s.retry}><Text style={s.retryText}>Try again</Text></Pressable> : null}</>}
    </View>
  </SafeAreaView></LinearGradient>;
}

const s = StyleSheet.create({
  page:{flex:1},safe:{flex:1,alignItems:'center',justifyContent:'center',padding:20},card:{width:'100%',maxWidth:470,alignItems:'center',gap:17,padding:26,borderRadius:26,borderWidth:1,borderColor:'#00aee8',backgroundColor:'#00283d',shadowColor:'#00e8e4',shadowOpacity:.25,shadowRadius:20,elevation:10},icon:{width:78,height:78,borderRadius:39,alignItems:'center',justifyContent:'center',backgroundColor:'#00e8e4'},title:{fontSize:30,fontWeight:'800',color:'#fff'},copy:{color:'#b6d7ee',fontSize:16,lineHeight:24,textAlign:'center'},success:{color:'#00e4c5',fontSize:27,fontWeight:'800'},name:{color:'#fff',fontSize:21,fontWeight:'700'},field:{width:'100%',minHeight:58,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:15,borderWidth:1,borderColor:'#078ec2',borderRadius:16,backgroundColor:'#001d31'},input:{flex:1,color:'#fff',fontSize:16,minHeight:56},button:{width:'100%',minHeight:56,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,borderRadius:28,backgroundColor:'#00e8e4'},buttonText:{color:'#002432',fontSize:17,fontWeight:'800'},error:{color:'#ffc073',fontSize:15,textAlign:'center'},retry:{minHeight:46,justifyContent:'center',paddingHorizontal:24,borderWidth:1,borderColor:'#00c7d5',borderRadius:23},retryText:{color:'#78f9f2',fontWeight:'700'},
});
