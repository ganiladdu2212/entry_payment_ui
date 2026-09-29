import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/features/auth/authStore';
import type { CustomerSubscription } from '@/features/subscriptions/subscriptionApi';
import { useCustomerSubscriptions } from '@/features/subscriptions/useCustomerSubscriptions';
import { MemberReview, type MemberReviewDetails } from '@/components/MemberReview';
import { paymentStatuses, paymentStatusLabels, type PaymentStatus } from '@/features/subscriptions/paymentStatus';
import { saveUserSubscriptions, subscriptionWhatsAppUrl, type SavedUser, type SaveUserRequest } from '@/features/subscriptions/userSubscriptionApi';

const cyan = '#08edf0';
const blue = '#039eea';

function money(value: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

function SectionTitle({ icon, title, optional }: { icon: keyof typeof Ionicons.glyphMap; title: string; optional?: boolean }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Ionicons name={icon} size={36} color={cyan} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.badge}><Text style={styles.badgeText}>{optional ? 'Optional' : 'Required'}</Text></View>
    </View>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>;
}

function PlanCard({ plan, selected, onPress, narrow }: { plan: CustomerSubscription; selected: boolean; onPress: () => void; narrow: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.planCard, selected && styles.planCardSelected, narrow && styles.planCardNarrow]}>
      <Radio selected={selected} />
      <Ionicons name={plan.typeOfPlan === 'PERSONAL_TRAINING' ? 'barbell-outline' : 'calendar-outline'} size={31} color={cyan} />
      <View style={styles.planInfo}>
        <Text style={styles.planName}>{plan.planName}</Text>
        <Text style={styles.planMeta}>{plan.durationValue} {plan.durationValue === 1 ? 'month' : 'months'}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.priceInfo}>
        <Text style={styles.price}>{money(plan.basePriceMinor, plan.currency)}</Text>
        <Text style={styles.planMeta}>per {plan.durationValue === 1 ? 'month' : `${plan.durationValue} months`}</Text>
      </View>
      <View style={styles.divider} />
      <View style={[styles.savings, plan.savingsMinor > 0 && styles.savingsActive]}>
        <Text style={styles.savingsText}>{plan.savingsMinor > 0 ? `Save ${money(plan.savingsMinor, plan.currency)} · ${plan.savingsPercentage}%` : 'No savings'}</Text>
      </View>
    </Pressable>
  );
}

export default function MemberRegistrationScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const customer = useAuthStore((state) => state.customer);
  const subscriptions = useCustomerSubscriptions(customer?.custId);
  const [name, setName] = useState('');
  const [review, setReview] = useState<MemberReviewDetails | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendNotice, setSendNotice] = useState('');
  const inFlight = useRef(false);
  const saved = useRef<{ signature: string; user: SavedUser } | null>(null);
  const [mobile, setMobile] = useState('');
  const [membershipId, setMembershipId] = useState<number>();
  const [trainingId, setTrainingId] = useState<number>();
  const [discount, setDiscount] = useState('');
  const [discountMode, setDiscountMode] = useState<'PERCENTAGE' | 'AMOUNT'>('PERCENTAGE');
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'CASH' | 'CARD'>('UPI');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('PENDING');
  const narrow = width < 620;

  const membershipPlans = useMemo(() => (subscriptions.data ?? []).filter((plan) => plan.active && plan.typeOfPlan === 'MEMBERSHIP'), [subscriptions.data]);
  const trainingPlans = useMemo(() => (subscriptions.data ?? []).filter((plan) => plan.active && plan.typeOfPlan === 'PERSONAL_TRAINING'), [subscriptions.data]);

  useEffect(() => {
    if (!membershipId && membershipPlans.length) setMembershipId(membershipPlans[0]?.subscriptionId);
  }, [membershipId, membershipPlans]);

  const membership = membershipPlans.find((plan) => plan.subscriptionId === membershipId);
  const training = trainingPlans.find((plan) => plan.subscriptionId === trainingId);
  const subtotal = (membership?.basePriceMinor ?? 0) + (training?.basePriceMinor ?? 0);
  const enteredDiscount = Math.max(Number(discount) || 0, 0);
  const discountAmount = discountMode === 'PERCENTAGE'
    ? Math.round(subtotal * Math.min(enteredDiscount, 100) / 100)
    : Math.min(enteredDiscount, subtotal);
  const finalAmount = Math.max(subtotal - discountAmount, 0);
  const saveAndOpenWhatsApp = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setSendNotice('');
    try {
      if (!customer) throw new Error('Please log in again before saving.');
      const phone = mobile.replace(/[\s()-]/g, '');
      if (!/^[0-9]{10}$/.test(phone)) throw new Error('Enter a valid 10-digit mobile number. Go back to edit.');
      if (!membership && !training) throw new Error('Select a subscription plan.');
      if (!Number.isFinite(Number(discount)) || Number(discount) < 0) throw new Error('Enter a valid discount.');
      const values = {
        custId: customer.custId, name: name.trim(), mobileNumber: phone, countryCode: '+91',
        membershipSubscriptionId: membership?.subscriptionId ?? null,
        personalTrainingSubscriptionId: training?.subscriptionId ?? null,
        discountType: discountMode === 'PERCENTAGE' ? 'PERCENTAGE' as const : 'FIXED_AMOUNT' as const,
        discountValue: discountMode === 'PERCENTAGE' ? Math.min(enteredDiscount, 100) : discountAmount,
        paymentMode, paymentStatus,
      };
      const signature = JSON.stringify(values);
      if (saved.current?.signature !== signature) {
        const previous = saved.current?.user;
        const request: SaveUserRequest = { ...values, typeOfMode: previous ? 'UPDATE' : 'CREATE', ...(previous ? { userId: previous.userId } : {}) };
        saved.current = { signature, user: await saveUserSubscriptions(request) };
      }
      const url = subscriptionWhatsAppUrl(saved.current!.user);
      setSendNotice('Saved successfully. WhatsApp will open with the details. Tap Send there to deliver the message. You can tap this button again to reopen WhatsApp without saving again.');
      try { await Linking.openURL(url); }
      catch { setSendNotice('Saved successfully, but WhatsApp could not open. Tap the button again to retry opening it; your record will not be saved again.'); }
    } catch (error) {
      setSendNotice(error instanceof Error ? error.message : 'Unable to save the subscription.');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  const openReview = () => setReview({
    name: name.trim(),
    phone: '+91 ' + mobile.trim(),
    membership: membership?.planName ?? 'Not selected',
    training: training?.planName ?? 'Not selected',
    discount: discountMode === 'PERCENTAGE'
      ? Math.min(enteredDiscount, 100) + '%'
      : money(discountAmount, membership?.currency),
    amount: money(finalAmount, membership?.currency),
    paymentMode, paymentStatus,
  });

  return (
    <LinearGradient colors={['#00182f', '#00385e', '#00162d']} style={styles.page}>
      {review && <MemberReview details={review} onBack={() => { setReview(null); setSendNotice(''); }} onSend={saveAndOpenWhatsApp} busy={saving} notice={sendNotice} />}
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="chevron-back" size={30} color="#fff" />
              </Pressable>
              <View style={styles.headerIcon}><Ionicons name="keypad-outline" size={40} color="#fff" /></View>
              <View style={styles.headerCopy}>
                <Text style={styles.heading}>Enter <Text style={styles.accent}>Manually</Text></Text>
                <Text style={styles.headingCaption}>Member details</Text>
              </View>
              <View style={styles.registrationLabel}><Ionicons name="person-outline" size={28} color="#fff" /><Text style={styles.registrationText}>Member{`\n`}Registration</Text></View>
            </View>

            <View style={[styles.identityGrid, !narrow && styles.identityGridWide]}>
              <View style={styles.fieldShell}>
                <View style={styles.fieldIcon}><Ionicons name="person" size={26} color="#fff" /></View>
                <View style={styles.fieldBody}><Text style={styles.fieldLabel}>Name</Text><TextInput value={name} onChangeText={setName} placeholder="Enter member name" placeholderTextColor="#a9c8e5" style={styles.input} /></View>
              </View>
              <View style={styles.fieldShell}>
                <View style={styles.fieldIcon}><Ionicons name="call" size={27} color="#fff" /></View>
                <View style={styles.country}><Text style={styles.flag}>🇮🇳</Text><Text style={styles.prefix}>+91</Text></View>
                <View style={styles.fieldBody}><Text style={styles.fieldLabel}>Mobile Number</Text><TextInput value={mobile} onChangeText={setMobile} inputMode="tel" keyboardType="phone-pad" placeholder="Enter mobile number" placeholderTextColor="#a9c8e5" style={styles.input} /></View>
              </View>
            </View>

            <SectionTitle icon="diamond-outline" title="Choose Membership" />
            {subscriptions.isLoading ? <ActivityIndicator color={cyan} size="large" style={styles.loader} /> : null}
            {subscriptions.error instanceof Error ? <Text style={styles.error}>{subscriptions.error.message}</Text> : null}
            {!subscriptions.isLoading && membershipPlans.length === 0 ? <Text style={styles.empty}>No active membership plans found.</Text> : null}
            {membershipPlans.map((plan) => <PlanCard key={plan.subscriptionId} plan={plan} selected={plan.subscriptionId === membershipId} onPress={() => setMembershipId(plan.subscriptionId)} narrow={narrow} />)}

            <SectionTitle icon="barbell-outline" title="Personal Training" optional />
            <Pressable onPress={() => setTrainingId(undefined)} style={[styles.planCard, !trainingId && styles.planCardSelected, narrow && styles.planCardNarrow]}>
              <Radio selected={!trainingId} /><Ionicons name="person" size={31} color={cyan} />
              <View style={styles.planInfo}><Text style={styles.planName}>Not Selected</Text><Text style={[styles.planMeta, { color: cyan }]}>No personal training</Text></View>
            </Pressable>
            {trainingPlans.map((plan) => <PlanCard key={plan.subscriptionId} plan={plan} selected={plan.subscriptionId === trainingId} onPress={() => setTrainingId(plan.subscriptionId)} narrow={narrow} />)}

            <View style={[styles.summary, narrow && styles.summaryNarrow]}>
              <View style={styles.summaryTitle}><Ionicons name="document-text-outline" size={36} color="#fff" /><Text style={styles.summaryHeading}>Payment Summary</Text></View>
              <View style={styles.summaryColumn}><Text style={styles.summaryLabel}>Membership</Text><Text style={styles.summaryValue}>{membership?.planName ?? 'Not selected'}</Text><Text style={styles.summaryPrice}>{money(membership?.basePriceMinor ?? 0, membership?.currency)}</Text></View>
              <View style={styles.summaryColumn}><Text style={styles.summaryLabel}>Personal Training</Text><Text style={styles.summaryValue}>{training?.planName ?? 'Not selected'}</Text><Text style={styles.summaryPrice}>{training ? money(training.basePriceMinor, training.currency) : '—'}</Text></View>
              <View style={styles.discountBox}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <View style={styles.discountModes}>
                  <Pressable accessibilityRole="radio" accessibilityState={{ checked: discountMode === 'PERCENTAGE' }} onPress={() => setDiscountMode('PERCENTAGE')} style={[styles.discountMode, discountMode === 'PERCENTAGE' && styles.discountModeActive]}>
                    <Radio selected={discountMode === 'PERCENTAGE'} /><Text style={styles.discountModeText}>%</Text>
                  </Pressable>
                  <Pressable accessibilityRole="radio" accessibilityState={{ checked: discountMode === 'AMOUNT' }} onPress={() => setDiscountMode('AMOUNT')} style={[styles.discountMode, discountMode === 'AMOUNT' && styles.discountModeActive]}>
                    <Radio selected={discountMode === 'AMOUNT'} /><Text style={styles.discountModeText}>₹</Text>
                  </Pressable>
                </View>
                <View style={styles.discountInputRow}>
                  <Text style={styles.discountPrefix}>{discountMode === 'PERCENTAGE' ? '%' : '₹'}</Text>
                  <TextInput value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" inputMode="decimal" placeholder={discountMode === 'PERCENTAGE' ? 'Enter discount percentage' : 'Enter discount amount'} placeholderTextColor="#9cc4df" style={styles.discountInput} />
                </View>
                {discountAmount > 0 ? <Text style={styles.discountApplied}>Discount applied: −{money(discountAmount, membership?.currency)}</Text> : null}
              </View>
              <View style={styles.finalBox}><Text style={styles.finalLabel}>Final Amount</Text><Text style={styles.finalAmount}>{money(finalAmount, membership?.currency)}</Text></View>
            </View>

            <View style={styles.paymentModes}>
              <Text style={styles.paymentTitle}>Mode of Payment</Text>
              {(['UPI', 'CASH', 'CARD'] as const).map((mode) => <Pressable key={mode} onPress={() => setPaymentMode(mode)} style={styles.mode}><Radio selected={paymentMode === mode} /><Text style={styles.modeText}>{mode}</Text></Pressable>)}
            </View>
            <View style={styles.paymentModes}>
              <Text style={styles.paymentTitle}>Payment Status</Text>
              {paymentStatuses.map((status) => (
                <Pressable key={status} accessibilityRole="radio" accessibilityLabel={paymentStatusLabels[status]} accessibilityState={{ checked: paymentStatus === status }} onPress={() => setPaymentStatus(status)} style={[styles.mode, { minHeight: 44 }]}>
                  <Radio selected={paymentStatus === status} />
                  <Text style={styles.modeText}>{paymentStatusLabels[status]}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable accessibilityRole="button" onPress={openReview} disabled={!membership || !name.trim() || !mobile.trim()} style={({ pressed }) => [styles.reviewButton, (!membership || !name.trim() || !mobile.trim()) && styles.reviewDisabled, pressed && styles.reviewPressed]}>
              <Ionicons name="logo-whatsapp" size={28} color="#d7e6f5" /><Text style={styles.reviewText}>Review & Send via WhatsApp</Text><Ionicons name="arrow-forward" size={23} color="#d7e6f5" />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 }, safeArea: { flex: 1 }, scrollContent: { padding: 16, paddingBottom: 28 }, content: { width: '100%', maxWidth: 1180, alignSelf: 'center', gap: 9 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 7 }, backButton: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: blue, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 7, borderColor: cyan, alignItems: 'center', justifyContent: 'center', backgroundColor: '#043a67', shadowColor: cyan, shadowOpacity: .8, shadowRadius: 12, elevation: 7 },
  headerCopy: { flex: 1 }, heading: { color: '#fff', fontSize: 32, fontWeight: '900' }, accent: { color: cyan }, headingCaption: { color: '#d6e8f9', fontSize: 17, fontWeight: '600' }, registrationLabel: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: cyan }, registrationText: { color: '#fff', fontWeight: '700' },
  identityGrid: { gap: 8 }, identityGridWide: { flexDirection: 'row' }, fieldShell: { flex: 1, minHeight: 76, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: blue, borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(0,42,78,.88)' },
  fieldIcon: { width: 68, height: 68, margin: 3, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#067cc1' }, fieldBody: { flex: 1, paddingHorizontal: 13 }, fieldLabel: { color: '#fff', fontSize: 16, fontWeight: '800' }, input: { height: 38, color: '#fff', backgroundColor: 'transparent', fontSize: 16, paddingVertical: 0 }, country: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 9, borderRightWidth: 1, borderRightColor: blue }, flag: { fontSize: 23 }, prefix: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 13, marginBottom: 3 }, sectionTitle: { color: '#fff', fontSize: 25, fontWeight: '900' }, badge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: '#087bd1' }, badgeText: { color: '#fff', fontWeight: '700' },
  planCard: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 17, paddingVertical: 10, borderWidth: 2, borderColor: blue, borderRadius: 18, backgroundColor: 'rgba(0,34,70,.9)' }, planCardSelected: { borderColor: cyan, backgroundColor: 'rgba(0,105,152,.76)', shadowColor: cyan, shadowOpacity: .7, shadowRadius: 10, elevation: 5 }, planCardNarrow: { gap: 8, paddingHorizontal: 10 },
  radio: { width: 29, height: 29, borderRadius: 15, borderWidth: 4, borderColor: '#f4f8ff', alignItems: 'center', justifyContent: 'center' }, radioSelected: { borderColor: cyan }, radioDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: cyan },
  planInfo: { flex: 1.35, minWidth: 80 }, planName: { color: '#fff', fontSize: 16, fontWeight: '800' }, planMeta: { color: '#d4e6f7', fontSize: 14 }, divider: { width: 1, alignSelf: 'stretch', backgroundColor: '#079ee8' }, priceInfo: { flex: 1, minWidth: 75 }, price: { color: '#fff', fontSize: 19, fontWeight: '900' }, savings: { minWidth: 92, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 }, savingsActive: { borderWidth: 1, borderColor: '#08d8c9', backgroundColor: 'rgba(0,117,109,.5)' }, savingsText: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  loader: { padding: 25 }, error: { color: '#ff9cac', padding: 12, borderRadius: 10, backgroundColor: 'rgba(100,0,25,.45)' }, empty: { color: '#b8d5eb', padding: 15, borderWidth: 1, borderColor: '#17648d', borderRadius: 12 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 14, marginTop: 15, padding: 16, borderWidth: 2, borderColor: blue, borderRadius: 18, backgroundColor: 'rgba(0,39,72,.92)' }, summaryNarrow: { flexDirection: 'column' }, summaryTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 180 }, summaryHeading: { color: '#fff', fontSize: 19, fontWeight: '900' }, summaryColumn: { flex: 1, minWidth: 145, paddingLeft: 13, borderLeftWidth: 1, borderLeftColor: blue }, summaryLabel: { color: '#fff', fontSize: 13, fontWeight: '800' }, summaryValue: { color: '#d5e6f5', fontSize: 13 }, summaryPrice: { color: '#fff', fontSize: 17, fontWeight: '900' }, discountBox: { flex: 1.25, minWidth: 240, gap: 7 }, discountModes: { flexDirection: 'row', alignItems: 'center', gap: 8 }, discountMode: { minWidth: 68, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 9, borderWidth: 1, borderColor: '#2178a8', borderRadius: 10, backgroundColor: 'rgba(0,24,53,.65)' }, discountModeActive: { borderColor: cyan, backgroundColor: 'rgba(0,113,142,.65)' }, discountModeText: { color: '#fff', fontSize: 18, fontWeight: '900' }, discountInputRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: cyan, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(0,24,53,.7)' }, discountPrefix: { width: 38, textAlign: 'center', color: cyan, fontSize: 18, fontWeight: '900' }, discountInput: { flex: 1, height: 42, paddingHorizontal: 8, color: '#fff', backgroundColor: 'transparent' }, discountApplied: { color: '#69f3d7', fontSize: 12, fontWeight: '700' }, finalBox: { minWidth: 170, paddingLeft: 14, borderLeftWidth: 1, borderLeftColor: blue, justifyContent: 'center' }, finalLabel: { color: cyan, fontWeight: '800' }, finalAmount: { color: cyan, fontSize: 27, fontWeight: '900' },
  paymentModes: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around', gap: 14, marginTop: 14, padding: 13, borderWidth: 2, borderColor: blue, borderRadius: 17, backgroundColor: 'rgba(0,23,49,.9)' }, paymentTitle: { color: '#fff', fontSize: 17, fontWeight: '900' }, mode: { flexDirection: 'row', alignItems: 'center', gap: 8 }, modeText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  reviewButton: { minHeight: 58, marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, borderRadius: 30, backgroundColor: '#177b9e' }, reviewDisabled: { opacity: .45, backgroundColor: '#7b9bb5' }, reviewPressed: { opacity: .8 }, reviewText: { color: '#eaf6ff', fontSize: 17, fontWeight: '800' },
});
