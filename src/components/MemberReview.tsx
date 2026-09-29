import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { paymentStatusLabels, type PaymentStatus } from '@/features/subscriptions/paymentStatus';

export type MemberReviewDetails = {
  name: string;
  phone: string;
  membership: string;
  training: string;
  discount: string;
  amount: string;
  paymentMode: string;
  paymentStatus: PaymentStatus;
};

export function MemberReview({ details, onBack, onSend, busy, notice }: {
  details: MemberReviewDetails; onBack: () => void; onSend: () => void; busy: boolean; notice: string;
}) {
  const { width } = useWindowDimensions();
  const rows: { label: string; value: string; icon?: keyof typeof Ionicons.glyphMap; symbol?: string }[] = [
    { label: 'Name', value: details.name, icon: 'person' },
    { label: 'Phone Number', value: details.phone, icon: 'call' },
    { label: 'Membership', value: details.membership, icon: 'calendar-outline' },
    { label: 'Personal Training', value: details.training, icon: 'barbell-outline' },
    { label: 'Discount', value: details.discount, symbol: '%' },
    { label: 'Final Amount', value: details.amount, symbol: '₹' },
    { label: 'Mode of Payment', value: details.paymentMode, icon: 'card-outline' },
    { label: 'Payment Status', value: paymentStatusLabels[details.paymentStatus], icon: details.paymentStatus === 'RECEIVED' ? 'checkmark-circle-outline' : details.paymentStatus === 'PENDING' ? 'time-outline' : 'person-outline' },
  ];
  return (
    <Modal visible animationType="slide" onRequestClose={() => { if (!busy) onBack(); }}>
      <LinearGradient colors={['#003653', '#001c34', '#00304b']} style={styles.screen}>
        <SafeAreaView style={styles.screen}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.content}>
              <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel="Back to edit member details" onPress={onBack} style={styles.back}>
                <Ionicons name="chevron-back" size={32} color="#00efdf" />
              </Pressable>
              <Text accessibilityRole="header" style={[styles.title, width < 380 && styles.smallTitle]}>Review & <Text style={styles.accent}>Send</Text></Text>
              <Text style={styles.caption}>Please review the details below.{ '\n' }Go back anytime to edit before sending.</Text>
              {rows.map(row => (
                <View key={row.label} style={styles.row}>
                  <LinearGradient colors={['#009e96', '#005e68']} style={styles.icon}>
                    {row.icon ? <Ionicons name={row.icon} size={27} color="#fff" /> : <Text style={styles.symbol}>{row.symbol}</Text>}
                  </LinearGradient>
                  <View style={styles.copy}><Text style={styles.label}>{row.label}</Text><Text selectable style={styles.value}>{row.value}</Text></View>
                </View>
              ))}
              {!!notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
              <Pressable disabled={busy} accessibilityState={{ busy, disabled: busy }} accessibilityRole="button" onPress={onSend} style={[styles.send, busy && { opacity: .6 }]}>
                <Ionicons name="logo-whatsapp" size={31} color="#002640" />
                <Text style={styles.sendText}>{busy ? 'Saving…' : 'Send WhatsApp Link'}</Text>
                {busy && <ActivityIndicator color="#002640" />}
                <Ionicons name="arrow-forward" size={24} color="#002640" />
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 32, flexGrow: 1 },
  content: { width: '100%', maxWidth: 740, alignSelf: 'center' },
  back: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#00efdf', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 40, fontWeight: '800', color: '#fff' },
  smallTitle: { fontSize: 32 },
  accent: { color: '#00efdf' },
  caption: { color: '#a4cbea', fontSize: 17, lineHeight: 25, marginTop: 12, marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 19, borderBottomWidth: 1, borderBottomColor: '#08739e' },
  icon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#00a7a5' },
  symbol: { color: '#fff', fontSize: 31, fontWeight: '800' },
  copy: { flex: 1, minWidth: 0, gap: 5 },
  label: { color: '#a4cbea', fontSize: 16 },
  value: { color: '#fff', fontSize: 22, fontWeight: '700' },
  send: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#00efdf', borderRadius: 36, padding: 18, marginTop: 32, minHeight: 64 },
  sendText: { flexShrink: 1, color: '#002640', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  notice: { color: '#bfe8f6', lineHeight: 22, marginTop: 20 },
});
