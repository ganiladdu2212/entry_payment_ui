import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useAuthStore } from '@/features/auth/authStore';
import { createCustomerSubscription, deleteCustomerSubscription, formatSubscriptionDuration, getCustomerSubscriptions, updateCustomerSubscription, type CustomerSubscription, type SaveCustomerSubscription } from '@/features/subscriptions/subscriptionApi';
import { tokenStorage } from '@/storage/tokenStorage';
import { changeCustomerPassword } from '@/features/auth/authApi';
import { appPalette } from '@/theme/palette';
import { useThemeStore, type ThemeMode } from '@/theme/themeStore';
import { env } from '@/config/env';
import { HolidayManager } from '@/components/HolidayManager';

type Icon = keyof typeof Ionicons.glyphMap;
type PlanType = 'MEMBERSHIP' | 'PERSONAL_TRAINING';
const durations = [
  { unit: 'MONTHLY', value: 1, label: 'Monthly' },
  { unit: 'QUARTERLY', value: 3, label: 'Quarterly' },
  { unit: 'HALF_YEARLY', value: 6, label: 'Half Yearly' },
  { unit: 'YEARLY', value: 12, label: 'Yearly' },
  { unit: 'CUSTOM', value: 0, label: 'Custom' },
];
const customDurationUnits = [
  { unit: 'DAY', label: 'Days', maximum: 3650 },
  { unit: 'WEEK', label: 'Weeks', maximum: 520 },
  { unit: 'MONTH', label: 'Months', maximum: 120 },
  { unit: 'YEAR', label: 'Years', maximum: 10 },
] as const;
function Section({ title, icon, children }: { title: string; icon: Icon; children: ReactNode }) {
  const mode = useThemeStore(state => state.mode);
  const s = useMemo(() => createStyles(mode), [mode]);
  return <View style={s.section}><View style={s.sectionHeading}><Ionicons name={icon} size={25} color="#00e5df" /><Text style={s.sectionTitle}>{title}</Text></View><View style={s.card}>{children}</View></View>;
}
function Row({ title, caption, icon, onPress, disabled, children, danger }: {
  title: string; caption: string; icon: Icon; onPress?: () => void; disabled?: boolean; children?: ReactNode; danger?: boolean;
}) {
  const mode = useThemeStore(state => state.mode);
  const s = useMemo(() => createStyles(mode), [mode]);
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityState={{ disabled: !!disabled }} disabled={disabled || !onPress} onPress={onPress} style={({ pressed }) => [s.row, pressed && { backgroundColor: '#063b52' }]}>
    <View style={[s.icon, danger && s.dangerIcon]}><Ionicons name={icon} size={28} color={danger ? '#ff5363' : '#92fff7'} /></View>
    <View style={s.copy}><Text style={[s.rowTitle, danger && s.danger]}>{title}</Text><Text style={s.caption}>{caption}</Text>{children}</View>
    {onPress && !disabled ? <Ionicons name="chevron-forward" size={23} color={danger ? '#ff5363' : '#a8d6ff'} /> : disabled ? <Text style={s.disabled}>Soon</Text> : null}
  </Pressable>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const customer = useAuthStore(state => state.customer);
  const actorType = useAuthStore(state => state.actorType);
  const activeBranch = useAuthStore(state => state.branch);
  const clear = useAuthStore(state => state.clear);
  const queryClient = useQueryClient();
  const themeMode = useThemeStore(state => state.mode);
  const setThemeMode = useThemeStore(state => state.setMode);
  const s = useMemo(() => createStyles(themeMode), [themeMode]);
  const [panel, setPanel] = useState<'profile' | 'plans' | 'pricing' | 'help' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [attendanceQrOpen, setAttendanceQrOpen] = useState(false);
  const [holidaysOpen, setHolidaysOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<CustomerSubscription | null>(null);
  const [planType, setPlanType] = useState<PlanType>('MEMBERSHIP');
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planDuration, setPlanDuration] = useState('MONTHLY');
  const [planActive, setPlanActive] = useState(true);
  const [customDurationValue, setCustomDurationValue] = useState('2');
  const [customDurationUnit, setCustomDurationUnit] = useState<'DAY' | 'WEEK' | 'MONTH' | 'YEAR'>('MONTH');
  const [planSaving, setPlanSaving] = useState(false);
  const [planError, setPlanError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const plans = useQuery({ queryKey: ['customer-subscriptions', customer?.custId], queryFn: () => getCustomerSubscriptions(customer!.custId), enabled: !!customer });
  const toggle = (value: typeof panel) => setPanel(panel === value ? null : value);
  const logout = async () => {
    setBusy(true); setError('');
    try { await tokenStorage.remove(); await queryClient.cancelQueries(); queryClient.clear(); clear(); router.replace('/'); }
    catch { setError('Unable to log out. Please try again.'); }
    finally { setBusy(false); }
  };
  const closePassword = () => {
    if (changingPassword) return;
    setPasswordOpen(false); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordError(''); setShowPasswords(false);
  };
  const submitPassword = async () => {
    setPasswordError('');
    if (!customer?.mobileNumber) { setPasswordError('A registered mobile number is required.'); return; }
    if (!oldPassword || !newPassword || !confirmPassword) { setPasswordError('Enter the old password, new password, and confirmation.'); return; }
    if (newPassword.length < 8) { setPasswordError('New password must contain at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('New password and confirmation do not match.'); return; }
    setChangingPassword(true);
    try {
      await changeCustomerPassword({ mobileNumber: customer.mobileNumber, oldPwd: oldPassword, newPwd: newPassword });
      await tokenStorage.remove(); await queryClient.cancelQueries(); queryClient.clear(); clear(); router.replace('/');
    } catch (changeError) {
      setPasswordError(changeError instanceof Error ? changeError.message : 'Unable to change password.');
    } finally { setChangingPassword(false); }
  };
  const openPlanEditor = (type: PlanType, plan?: CustomerSubscription, deleting = false) => {
    const knownDuration = plan ? durations.find(item => item.unit !== 'CUSTOM' && item.unit === plan.durationUnit && item.value === plan.durationValue) : undefined;
    setEditingPlan(plan ?? null); setPlanType(type); setPlanName(plan?.planName ?? '');
    setPlanPrice(plan ? String(plan.basePriceMinor) : ''); setPlanDuration(knownDuration?.unit ?? (plan ? 'CUSTOM' : 'MONTHLY'));
    setCustomDurationValue(plan && !knownDuration ? String(plan.durationValue) : '2');
    setCustomDurationUnit(plan && !knownDuration && ['DAY', 'WEEK', 'MONTH', 'YEAR'].includes(plan.durationUnit)
      ? plan.durationUnit as 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
      : 'MONTH');
    setPlanActive(plan?.active ?? true); setPlanError(''); setConfirmDelete(deleting); setPlanEditorOpen(true);
  };
  const closePlanEditor = () => { if (!planSaving) { setPlanEditorOpen(false); setConfirmDelete(false); } };
  const submitPlan = async () => {
    if (!customer) return;
    const customValue = Number(customDurationValue);
    const selectedDuration = planDuration === 'CUSTOM'
      ? { unit: customDurationUnit, value: customValue, label: 'Custom' }
      : durations.find(item => item.unit === planDuration) ?? { unit: 'MONTHLY', value: 1, label: 'Monthly' };
    const price = Number(planPrice);
    if (!planName.trim()) { setPlanError('Plan name is required.'); return; }
    if (!Number.isSafeInteger(price) || price < 0) { setPlanError('Enter a valid whole-number price.'); return; }
    const durationMaximum = planDuration === 'CUSTOM'
      ? customDurationUnits.find(item => item.unit === customDurationUnit)?.maximum ?? 120
      : 120;
    if (!Number.isInteger(selectedDuration.value) || selectedDuration.value < 1 || selectedDuration.value > durationMaximum) { setPlanError(`Duration must be between 1 and ${durationMaximum} ${customDurationUnit.toLowerCase()}(s).`); return; }
    const request: SaveCustomerSubscription = { custId: customer.custId, active: planActive, basePriceMinor: price, currency: editingPlan?.currency ?? 'INR', durationUnit: selectedDuration.unit, durationValue: selectedDuration.value, planName: planName.trim(), typeOfPlan: planType };
    setPlanSaving(true); setPlanError('');
    try {
      if (editingPlan) await updateCustomerSubscription(editingPlan.subscriptionId, request);
      else await createCustomerSubscription(request);
      await queryClient.invalidateQueries({ queryKey: ['customer-subscriptions', customer.custId] });
      setPlanEditorOpen(false);
    } catch (saveError) { setPlanError(saveError instanceof Error ? saveError.message : 'Unable to save plan.'); }
    finally { setPlanSaving(false); }
  };
  const deletePlan = async () => {
    if (!customer || !editingPlan) return;
    setPlanSaving(true); setPlanError('');
    try {
      await deleteCustomerSubscription(editingPlan.subscriptionId);
      await queryClient.invalidateQueries({ queryKey: ['customer-subscriptions', customer.custId] });
      setPlanEditorOpen(false); setConfirmDelete(false);
    } catch (deleteError) { setPlanError(deleteError instanceof Error ? deleteError.message : 'Unable to delete plan.'); }
    finally { setPlanSaving(false); }
  };
  const planCaption = plans.isPending ? 'Loading your plans…' : plans.isError ? 'Plans could not be loaded' : `${plans.data?.filter(plan => plan.active).length ?? 0} active plans · View your subscriptions`;
  const attendanceUrl = customer ? `${env.webUrl}/check-in-check-out?custId=${customer.custId}` : '';
  const planDetails = (pricing: boolean) => <View style={s.expanded}>
    {plans.isPending ? <ActivityIndicator color="#00e5df" /> : plans.isError ? <Pressable accessibilityRole="button" onPress={() => void plans.refetch()}><Text style={s.error}>Unable to load plans. Tap to retry.</Text></Pressable> : !plans.data?.length ? <Text style={s.caption}>No plans have been created yet.</Text> : plans.data.map(plan => <View key={plan.subscriptionId} style={s.plan}>
      <View style={s.copy}><Text style={s.rowTitle}>{plan.planName}</Text><Text style={s.caption}>{plan.typeOfPlan === 'PERSONAL_TRAINING' ? 'Personal training' : 'Membership'} · {plan.active ? 'Active' : 'Inactive'}</Text>{pricing && <Text style={s.caption}>Savings: {plan.currency} {plan.savingsMinor.toLocaleString('en-IN')} ({plan.savingsPercentage}%)</Text>}</View>
      <Text style={s.price}>{plan.currency} {plan.basePriceMinor.toLocaleString('en-IN')}</Text>
    </View>)}
  </View>;
  const managedPlans = <View style={s.expanded}>{(['MEMBERSHIP', 'PERSONAL_TRAINING'] as const).map(type => {
    const typedPlans = (plans.data ?? []).filter(plan => plan.typeOfPlan === type);
    return <View key={type} style={s.planGroup}><Text style={s.groupTitle}>{type === 'MEMBERSHIP' ? 'Membership Plans' : 'Personal Training Plans'}</Text>
      {typedPlans.length ? typedPlans.map(plan => <View key={plan.subscriptionId} style={s.managePlan}><View style={s.copy}><Text style={s.rowTitle}>{plan.planName}</Text><Text style={s.caption}>{plan.currency} {plan.basePriceMinor.toLocaleString('en-IN')} · {formatSubscriptionDuration(plan.durationUnit, plan.durationValue)} · {plan.active ? 'Active' : 'Inactive'}</Text><Text style={s.caption}>Savings: {plan.currency} {plan.savingsMinor.toLocaleString('en-IN')} ({plan.savingsPercentage}%)</Text></View><View style={s.planActions}><Pressable accessibilityRole="button" accessibilityLabel={`Edit ${plan.planName}`} onPress={() => openPlanEditor(type, plan)} style={s.editButton}><Ionicons name="pencil" size={21} color="#002431" /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Delete ${plan.planName}`} onPress={() => openPlanEditor(type, plan, true)} style={s.deleteButton}><Ionicons name="trash-outline" size={21} color="#ff6070" /></Pressable></View></View>) : <Text style={s.caption}>No {type === 'MEMBERSHIP' ? 'membership' : 'personal training'} plans yet.</Text>}
      <Pressable accessibilityRole="button" onPress={() => openPlanEditor(type)} style={s.addPlan}><Ionicons name="add-circle-outline" size={23} color="#00e5df" /><Text style={s.accent}>Add {type === 'MEMBERSHIP' ? 'Membership' : 'Personal Training'} Plan</Text></Pressable>
    </View>;
  })}</View>;
  return <SafeAreaView edges={['top']} style={s.page}><ScrollView contentContainerStyle={s.content}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to home" style={s.back} onPress={() => router.replace('/dashboard')}><Ionicons name="chevron-back" size={30} color="#fff" /></Pressable><Ionicons name="settings" size={43} color="#00e5df" /><View style={s.headerCopy}><Text style={s.heading}>Settings</Text><Text style={s.caption}>Manage your gym, plans and app settings.</Text></View><Pressable onPress={() => router.push('/branch-management')} style={s.branch}><Ionicons name="location" size={26} color="#00e5df" /><View style={s.copy}><Text style={s.accent}>{activeBranch ? 'Selected Branch' : 'Organization'}</Text><Text style={s.rowTitle}>{activeBranch?.name || customer?.orgName || 'Your organization'}</Text></View></Pressable></View>
    {!customer ? <View style={s.card}><Row title="Sign in" caption="Sign in to view your account settings" icon="log-in-outline" onPress={() => router.replace('/')} /></View> : <>
      <Section title="Account" icon="person-outline">
        <Row title="Profile Information" caption={customer.name || 'View your account details'} icon="person" onPress={() => toggle('profile')}><View style={s.contacts}><View style={s.contact}><Text style={s.smallLabel}>Mobile Number</Text><Text selectable style={s.caption}>{customer.mobileNumber || 'Not provided'}</Text></View><View style={s.contact}><Text style={s.smallLabel}>Email Address</Text><Text selectable style={s.caption}>{customer.email || 'Not provided'}</Text></View></View></Row>
        {panel === 'profile' && <View style={s.expanded}><Text style={s.rowTitle}>{customer.name || 'Account profile'}</Text><Text style={s.caption}>Organization: {customer.orgName || 'Not provided'}</Text><Text style={s.caption}>Customer ID: {customer.custId}</Text><Text style={s.caption}>Profile editing will be available soon.</Text></View>}
        {actorType === 'OWNER' && <Row title="Change Password" caption="Verify your old password and choose a new one" icon="lock-closed" onPress={() => setPasswordOpen(true)} />}
        <Row title="Check-in / Check-out QR" caption="Show the QR code members scan for attendance" icon="qr-code-outline" onPress={() => setAttendanceQrOpen(true)} />
        <Row title="Gym Holidays" caption="Add closed dates and holiday purposes" icon="calendar-outline" onPress={() => setHolidaysOpen(true)} />
      </Section>
      <Section title="Payments" icon="card-outline"><Row title="Payment Status" caption="View received and pending payments" icon="wallet-outline" onPress={() => router.push('/payments')} /></Section>
      <Section title="Gym & Membership" icon="barbell-outline">
        <Row title="Membership Plans" caption={planCaption} icon="document-text" onPress={() => toggle('plans')} />{panel === 'plans' && (plans.isPending ? <View style={s.expanded}><ActivityIndicator color="#00e5df" /></View> : plans.isError ? <View style={s.expanded}><Pressable onPress={() => void plans.refetch()}><Text style={s.error}>Unable to load plans. Tap to retry.</Text></Pressable></View> : managedPlans)}
        <Row title="Pricing & Packages" caption="View plan prices and savings" icon="pricetag" onPress={() => toggle('pricing')} />{panel === 'pricing' && planDetails(true)}
        <Row title="Branches & Locations" caption={activeBranch ? `Current: ${activeBranch.name}` : 'Create and select your facilities'} icon="location" onPress={() => router.push('/branch-management')} />
        <Row title="Staff & Trainers" caption="Manage admins, employees, categories and permissions" icon="people" onPress={() => router.push('/branch-management')} />
      </Section>
      <Section title="App Preferences" icon="phone-portrait-outline">
        <Row title="Notifications" caption="Notification preferences coming soon" icon="notifications" disabled><Switch accessibilityLabel="Notifications unavailable" disabled value={false} trackColor={{false:'#3b536e'}} /></Row>
        <Row title="Dark Mode" caption={themeMode === 'dark' ? 'Dark theme is enabled' : 'Light theme is enabled'} icon={themeMode === 'dark' ? 'moon' : 'sunny-outline'}><Switch accessibilityLabel="Toggle dark mode" value={themeMode === 'dark'} onValueChange={enabled => void setThemeMode(enabled ? 'dark' : 'light')} trackColor={{ false: '#8299aa', true: '#169f9a' }} thumbColor="#fff" /></Row>
        <Row title="Language" caption="English · More languages coming soon" icon="globe" />
        <Row title="Help & Support" caption="Frequently asked questions" icon="mail" onPress={() => toggle('help')} />
        {panel === 'help' && <View style={s.expanded}><Text style={s.rowTitle}>How do I add a member?</Text><Text style={s.caption}>Tap + in the footer, enter the details, choose a plan, then review and save.</Text><Text style={s.rowTitle}>Where can I view attendance?</Text><Text style={s.caption}>Open GYM Attendance for occupancy, or select a customer for individual attendance.</Text></View>}
      </Section>
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <View style={s.card}><Row title={busy ? 'Logging out…' : 'Log Out'} caption="Sign out from your gym account" icon="log-out-outline" danger onPress={busy ? undefined : () => void logout()} /></View>
    </>}
  </ScrollView>
    {customer ? <HolidayManager visible={holidaysOpen} custId={customer.custId} onClose={() => setHolidaysOpen(false)} /> : null}
    <Modal visible={attendanceQrOpen} transparent animationType="fade" onRequestClose={() => setAttendanceQrOpen(false)}>
      <View style={s.modalBackdrop}>
        <Pressable accessibilityLabel="Close attendance QR code" style={StyleSheet.absoluteFill} onPress={() => setAttendanceQrOpen(false)} />
        <View style={s.modalCard}>
          <View style={s.modalHeader}><View style={s.icon}><Ionicons name="qr-code-outline" size={29} color="#92fff7" /></View><View style={s.copy}><Text style={s.modalTitle}>Attendance QR Code</Text><Text style={s.caption}>{customer?.orgName || 'Your organization'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setAttendanceQrOpen(false)} style={s.close}><Ionicons name="close" size={25} color="#bddcf6" /></Pressable></View>
          <View style={s.qrWrap}>{attendanceUrl ? <QRCode value={attendanceUrl} size={240} color="#00192d" backgroundColor="#ffffff" /> : null}</View>
          <Text style={s.qrHelp}>Ask members to scan this code using their phone camera. Their device will open the check-in/check-out page automatically.</Text>
          <Text selectable style={s.qrUrl}>{attendanceUrl}</Text>
          <Pressable accessibilityRole="button" onPress={() => setAttendanceQrOpen(false)} style={s.saveButton}><Text style={s.saveText}>Done</Text></Pressable>
        </View>
      </View>
    </Modal>
    <Modal visible={passwordOpen} transparent animationType="fade" onRequestClose={closePassword}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalBackdrop}>
        <Pressable accessibilityLabel="Close change password" style={StyleSheet.absoluteFill} onPress={closePassword} />
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.planModalScroll}>
        <View style={s.modalCard}>
          <View style={s.modalHeader}><View style={s.icon}><Ionicons name="lock-closed" size={28} color="#92fff7" /></View><View style={s.copy}><Text style={s.modalTitle}>Change Password</Text><Text style={s.caption}>You will be logged out after the password is updated.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close" disabled={changingPassword} onPress={closePassword} style={s.close}><Ionicons name="close" size={25} color="#bddcf6" /></Pressable></View>
          <View style={s.field}><Text style={s.smallLabel}>Registered Mobile Number</Text><TextInput editable={false} value={customer?.mobileNumber ?? ''} style={[s.input, s.readonly]} /></View>
          <View style={s.field}><Text style={s.smallLabel}>Old Password</Text><TextInput autoCapitalize="none" autoComplete="current-password" secureTextEntry={!showPasswords} value={oldPassword} onChangeText={setOldPassword} placeholder="Enter old password" placeholderTextColor="#7294ae" style={s.input} /></View>
          <View style={s.field}><Text style={s.smallLabel}>New Password</Text><TextInput autoCapitalize="none" autoComplete="new-password" secureTextEntry={!showPasswords} value={newPassword} onChangeText={setNewPassword} placeholder="Minimum 8 characters" placeholderTextColor="#7294ae" style={s.input} /></View>
          <View style={s.field}><Text style={s.smallLabel}>Confirm New Password</Text><TextInput autoCapitalize="none" autoComplete="new-password" secureTextEntry={!showPasswords} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter new password" placeholderTextColor="#7294ae" style={s.input} /></View>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: showPasswords }} onPress={() => setShowPasswords(!showPasswords)} style={s.showRow}><Ionicons name={showPasswords ? 'checkbox' : 'square-outline'} size={22} color="#00e5df" /><Text style={s.caption}>Show passwords</Text></Pressable>
          {!!passwordError && <Text accessibilityRole="alert" style={s.error}>{passwordError}</Text>}
          <View style={s.modalActions}><Pressable disabled={changingPassword} onPress={closePassword} style={s.cancelButton}><Text style={s.caption}>Cancel</Text></Pressable><Pressable disabled={changingPassword} onPress={() => void submitPassword()} style={[s.saveButton, changingPassword && { opacity: .65 }]}>{changingPassword ? <ActivityIndicator color="#002431" /> : <Ionicons name="checkmark" size={22} color="#002431" />}<Text style={s.saveText}>{changingPassword ? 'Updating…' : 'Update Password'}</Text></Pressable></View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
    <Modal visible={planEditorOpen} transparent animationType="fade" onRequestClose={closePlanEditor}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalBackdrop}>
        <Pressable accessibilityLabel="Close plan editor" style={StyleSheet.absoluteFill} onPress={closePlanEditor} />
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.planModalScroll}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}><View style={s.icon}><Ionicons name={planType === 'MEMBERSHIP' ? 'document-text' : 'barbell'} size={27} color="#92fff7" /></View><View style={s.copy}><Text style={s.modalTitle}>{editingPlan ? 'Update' : 'Add'} {planType === 'MEMBERSHIP' ? 'Membership' : 'Personal Training'} Plan</Text><Text style={s.caption}>Savings are calculated by the API from the monthly plan.</Text></View><Pressable accessibilityLabel="Close" disabled={planSaving} onPress={closePlanEditor} style={s.close}><Ionicons name="close" size={25} color="#bddcf6" /></Pressable></View>
            <View style={s.field}><Text style={s.smallLabel}>Plan Name</Text><TextInput value={planName} onChangeText={setPlanName} placeholder="Example: Quarterly Plan" placeholderTextColor="#7294ae" maxLength={150} style={s.input} /></View>
            <View style={s.field}><Text style={s.smallLabel}>Price (INR)</Text><TextInput value={planPrice} onChangeText={setPlanPrice} placeholder="Example: 7000" placeholderTextColor="#7294ae" keyboardType="number-pad" style={s.input} /></View>
            <View style={s.field}><Text style={s.smallLabel}>Duration</Text><View style={s.durationGrid}>{durations.map(item => <Pressable key={item.unit} accessibilityRole="radio" accessibilityState={{ checked: planDuration === item.unit }} onPress={() => setPlanDuration(item.unit)} style={[s.durationOption, planDuration === item.unit && s.durationSelected]}><Text style={planDuration === item.unit ? s.durationSelectedText : s.caption}>{item.label}</Text></Pressable>)}</View></View>
            {planDuration === 'CUSTOM' && <View style={s.field}><Text style={s.smallLabel}>Custom Duration</Text><View style={s.durationGrid}>{customDurationUnits.map(item => <Pressable key={item.unit} accessibilityRole="radio" accessibilityState={{ checked: customDurationUnit === item.unit }} onPress={() => setCustomDurationUnit(item.unit)} style={[s.durationOption, customDurationUnit === item.unit && s.durationSelected]}><Text style={customDurationUnit === item.unit ? s.durationSelectedText : s.caption}>{item.label}</Text></Pressable>)}</View><TextInput value={customDurationValue} onChangeText={setCustomDurationValue} placeholder="Example: 10" placeholderTextColor="#7294ae" keyboardType="number-pad" style={s.input} /><Text style={s.caption}>Enter one or multiple days, weeks, months, or years.</Text></View>}
            <View style={s.activeRow}><View style={s.copy}><Text style={s.rowTitle}>Active Plan</Text><Text style={s.caption}>Inactive plans remain saved but cannot be selected for new members.</Text></View><Switch value={planActive} onValueChange={setPlanActive} trackColor={{ false: '#3b536e', true: '#169f9a' }} /></View>
            {!!planError && <Text accessibilityRole="alert" style={s.error}>{planError}</Text>}
            {confirmDelete && editingPlan ? <View style={s.deleteConfirm}><Text style={s.rowTitle}>Delete “{editingPlan.planName}”?</Text><Text style={s.caption}>This removes the plan from the catalog. Existing member subscription copies remain available.</Text><View style={s.modalActions}><Pressable disabled={planSaving} onPress={() => setConfirmDelete(false)} style={s.cancelButton}><Text style={s.caption}>Keep Plan</Text></Pressable><Pressable disabled={planSaving} onPress={() => void deletePlan()} style={[s.confirmDeleteButton, planSaving && { opacity: .65 }]}>{planSaving ? <ActivityIndicator color="#fff" /> : <Ionicons name="trash" size={20} color="#fff" />}<Text style={s.confirmDeleteText}>Delete Plan</Text></Pressable></View></View> : <View style={s.modalActions}>{editingPlan && <Pressable disabled={planSaving} onPress={() => setConfirmDelete(true)} style={s.deleteLink}><Ionicons name="trash-outline" size={20} color="#ff6070" /><Text style={s.danger}>Delete</Text></Pressable>}<Pressable disabled={planSaving} onPress={closePlanEditor} style={s.cancelButton}><Text style={s.caption}>Cancel</Text></Pressable><Pressable disabled={planSaving} onPress={() => void submitPlan()} style={[s.saveButton, planSaving && { opacity: .65 }]}>{planSaving ? <ActivityIndicator color="#002431" /> : <Ionicons name="save-outline" size={21} color="#002431" />}<Text style={s.saveText}>{planSaving ? 'Saving…' : editingPlan ? 'Update Plan' : 'Create Plan'}</Text></Pressable></View>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  </SafeAreaView>;
}

const createStyles = (mode: ThemeMode) => {
  const colors = appPalette(mode);
  const dark = mode === 'dark';
  return StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: 16, paddingBottom: 36, gap: 24 },
  header: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }, back: { width: 44, height: 44, justifyContent: 'center' }, headerCopy: { flexGrow: 1, flexShrink: 1, minWidth: 155 }, heading: { color: colors.text, fontSize: 30, fontWeight: '700' },
  branch: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, borderWidth: 1, borderColor: '#039bd1', maxWidth: '100%', flexShrink: 1 },
  section: { gap: 10 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 13 }, sectionTitle: { color: dark ? '#00e5df' : '#007f82', fontSize: 21, fontWeight: '700' }, card: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, minHeight: 76, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, icon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#00cfbd', backgroundColor: dark ? '#004350' : '#d8fbf7', alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, minWidth: 0, gap: 5 }, rowTitle: { color: colors.text, fontSize: 17, fontWeight: '600' }, caption: { color: colors.muted, fontSize: 14, lineHeight: 21, flexShrink: 1 }, accent: { color: dark ? '#00e5df' : '#007f82', fontSize: 14 }, contacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 9 }, contact: { flexGrow: 1, flexShrink: 1, gap: 3 }, smallLabel: { color: dark ? '#e1efff' : '#29495e', fontWeight: '600', fontSize: 13 }, disabled: { color: '#91a8ba', fontSize: 11 }, expanded: { padding: 18, gap: 12, backgroundColor: colors.surfaceRaised }, plan: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }, price: { color: dark ? '#00e5df' : '#007f82', fontWeight: '700', fontSize: 16 }, danger: { color: '#ff5363' }, dangerIcon: { backgroundColor: 'transparent', borderColor: 'transparent' }, error: { color: dark ? '#ffc27b' : '#a14e00', fontSize: 14 },
  modalBackdrop: { flex: 1, padding: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,10,22,.78)' }, modalCard: { width: '100%', maxWidth: 520, gap: 16, padding: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 22, backgroundColor: colors.surface, shadowColor: '#00dbe1', shadowOpacity: .25, shadowRadius: 18, elevation: 10 }, modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 }, modalTitle: { color: colors.text, fontSize: 21, fontWeight: '700' }, close: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, field: { gap: 7 }, input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 13, paddingHorizontal: 14, color: colors.text, backgroundColor: colors.input, fontSize: 16 }, readonly: { color: colors.muted, backgroundColor: colors.inputMuted }, showRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', minHeight: 42 }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10 }, cancelButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 22, borderWidth: 1, borderColor: '#42617b', borderRadius: 24 }, saveButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 22, borderRadius: 24, backgroundColor: '#00e5df' }, saveText: { color: '#002431', fontWeight: '800' },
  qrWrap: { alignSelf: 'center', padding: 16, borderRadius: 18, backgroundColor: '#fff' }, qrHelp: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' }, qrUrl: { color: dark ? '#66f7ef' : '#006c75', fontSize: 12, textAlign: 'center' },
  planGroup: { gap: 12, paddingBottom: 10 }, groupTitle: { color: dark ? '#61fff1' : '#007f82', fontSize: 18, fontWeight: '800' }, managePlan: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface }, planActions: { flexDirection: 'row', gap: 8 }, editButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#00e5df', alignItems: 'center', justifyContent: 'center' }, deleteButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#a43d51', backgroundColor: dark ? '#351d2d' : '#ffe8ec', alignItems: 'center', justifyContent: 'center' }, addPlan: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#00b7b5', borderStyle: 'dashed', borderRadius: 14 }, planModalScroll: { flexGrow: 1, width: '100%', justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }, durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, durationOption: { flexGrow: 1, minWidth: 100, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }, durationSelected: { backgroundColor: '#00e5df', borderColor: '#00e5df' }, durationSelectedText: { color: '#002431', fontWeight: '800' }, activeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 }, deleteLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, marginRight: 'auto' }, deleteConfirm: { gap: 12, padding: 14, borderWidth: 1, borderColor: '#a43d51', borderRadius: 14, backgroundColor: dark ? '#351d2d' : '#ffe8ec' }, confirmDeleteButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20, borderRadius: 24, backgroundColor: '#d64055' }, confirmDeleteText: { color: '#fff', fontWeight: '800' },
  });
};
