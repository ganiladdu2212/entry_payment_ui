import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCustomerLogin } from '@/features/auth/useCustomerLogin';

const background = require('../assets/images/login-campus.png');

export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const phone = width < 768;
  const compact = phone || height < 760;
  const veryCompact = height < 650;
  const narrow = width < 380;
  const router = useRouter();
  const login = useCustomerLogin();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const submit = () => {
    const loginId = identifier.trim();
    if (!loginId || !password) {
      setValidationError('Enter your email or mobile number and password.');
      return;
    }
    setValidationError(null);
    login.mutate({ identifier: loginId, password, rememberMe }, { onSuccess: () => router.replace('/dashboard') });
  };

  const error = validationError ?? (login.error instanceof Error ? login.error.message : null);

  return (
    <View style={styles.background}>
      <Image source={background} resizeMode="cover" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(0,13,39,.35)', 'rgba(0,17,48,.60)', 'rgba(0,10,31,.98)']} locations={[0, .43, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.edgeGlowTop} /><View style={styles.edgeGlowBottom} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, compact && styles.scrollContentCompact, veryCompact && styles.scrollContentVeryCompact]}
            contentInsetAdjustmentBehavior="automatic"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.brandBlock, compact && styles.brandBlockCompact, veryCompact && styles.brandBlockVeryCompact]}>
              <View style={styles.brandRow}>
                <Text style={[styles.brandMark, compact && styles.brandMarkCompact]}>X</Text>
                <Text style={[styles.brandName, compact && styles.brandNameCompact, narrow && styles.brandNameNarrow]}>Entry <Text style={styles.brandAccent}>X</Text> Labs</Text>
              </View>
              <Text style={[styles.tagline, compact && styles.taglineCompact]}>FUTURE INNOVATION{`\n`}STARTS HERE</Text>
              <View style={[styles.taglineRule, compact && styles.taglineRuleCompact]} />
            </View>
            <View style={styles.formBlock}>
              <Text style={[styles.title, compact && styles.titleCompact]}>Welcome Back</Text>
              <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>Login to your account to continue</Text>
              <View style={[styles.inputShell, compact && styles.inputShellCompact, !!error && styles.inputShellError]}>
                <View style={[styles.iconCircle, compact && styles.iconCircleCompact]}><Ionicons name="phone-portrait-outline" size={compact ? 20 : 24} color="#d7ecff" /></View><View style={[styles.inputDivider, compact && styles.inputDividerCompact]} />
                <TextInput accessibilityLabel="Email or mobile number" autoCapitalize="none" autoComplete="username" autoCorrect={false} inputMode="email" placeholder="Mobile Number or Email" placeholderTextColor="#aac6ef" selectionColor="#00e5e5" cursorColor="#ffffff" style={[styles.input, compact && styles.inputCompact]} value={identifier} onChangeText={setIdentifier} returnKeyType="next" />
              </View>
              <View style={[styles.inputShell, compact && styles.inputShellCompact, !!error && styles.inputShellError]}>
                <View style={[styles.iconCircle, compact && styles.iconCircleCompact]}><Ionicons name="lock-closed-outline" size={compact ? 20 : 24} color="#d7ecff" /></View><View style={[styles.inputDivider, compact && styles.inputDividerCompact]} />
                <TextInput accessibilityLabel="Password" autoCapitalize="none" autoComplete="current-password" placeholder="Password" placeholderTextColor="#aac6ef" selectionColor="#00e5e5" cursorColor="#ffffff" secureTextEntry={!showPassword} style={[styles.input, compact && styles.inputCompact]} value={password} onChangeText={setPassword} onSubmitEditing={submit} returnKeyType="go" />
                <Pressable accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} hitSlop={12} onPress={() => setShowPassword((value) => !value)}><Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={compact ? 22 : 25} color="#91b7ea" /></Pressable>
              </View>
              {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
              <View style={[styles.optionsRow, compact && styles.optionsRowCompact, narrow && styles.optionsRowNarrow]}>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: rememberMe }} onPress={() => setRememberMe((value) => !value)} style={styles.rememberRow}>
                  <View style={[styles.checkbox, rememberMe && styles.checkboxSelected]}>{rememberMe ? <Ionicons name="checkmark" size={17} color="#001632" /> : null}</View><Text style={styles.optionText}>Remember Me</Text>
                </Pressable>
                <Pressable onPress={() => setValidationError('Password recovery will be available soon.')}><Text style={styles.forgotText}>Forgot Password?</Text></Pressable>
              </View>
              <Pressable accessibilityRole="button" disabled={login.isPending} onPress={submit} style={({ pressed }) => [styles.loginButton, pressed && styles.buttonPressed]}>
                <LinearGradient colors={['#0867ff', '#00b9ff', '#13e2db']} start={{ x: 0, y: .5 }} end={{ x: 1, y: .5 }} style={[styles.buttonGradient, compact && styles.buttonGradientCompact]}>
                  {login.isPending ? <ActivityIndicator color="#fff" /> : <><Text style={styles.buttonText}>Login</Text><Ionicons name="arrow-forward" size={28} color="#fff" /></>}
                </LinearGradient>
              </Pressable>
              <View style={[styles.footerRuleRow, compact && styles.footerRuleRowCompact]}><View style={styles.footerLine} /><Text style={styles.footerText}>INNOVATE</Text><Text style={styles.footerDot}>•</Text><Text style={styles.footerText}>BUILD</Text><Text style={styles.footerDot}>•</Text><Text style={styles.footerText}>GROW</Text><View style={styles.footerLine} /></View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, background: { flex: 1, minHeight: '100%', overflow: 'hidden', backgroundColor: '#00122f' }, safeArea: { flex: 1 }, scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 28, paddingTop: 48, paddingBottom: 32, justifyContent: 'space-between' },
  scrollContentCompact: { maxWidth: 560, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16 },
  scrollContentVeryCompact: { paddingTop: 6, paddingBottom: 10 },
  edgeGlowTop: { position: 'absolute', top: -70, left: 65, width: 2, height: 260, backgroundColor: '#00d8ff', transform: [{ rotate: '45deg' }], shadowColor: '#00d8ff', shadowOpacity: 1, shadowRadius: 9 },
  edgeGlowBottom: { position: 'absolute', bottom: -80, right: 20, width: 2, height: 300, backgroundColor: '#00d8ff', transform: [{ rotate: '45deg' }], shadowColor: '#00d8ff', shadowOpacity: 1, shadowRadius: 9 },
  brandBlock: { paddingTop: 56, paddingBottom: 110 }, brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandBlockCompact: { paddingTop: 4, paddingBottom: 26 }, brandBlockVeryCompact: { paddingBottom: 16 },
  brandMark: { color: '#00dfe8', fontSize: 78, lineHeight: 84, fontWeight: '900', fontStyle: 'italic', letterSpacing: -12, textShadowColor: '#0874ff', textShadowOffset: { width: 7, height: 3 }, textShadowRadius: 0 },
  brandMarkCompact: { fontSize: 50, lineHeight: 54, letterSpacing: -8, textShadowOffset: { width: 5, height: 2 } },
  brandName: { color: '#fff', fontSize: 39, fontWeight: '800', letterSpacing: -1.4 }, brandAccent: { color: '#00dce7' },
  brandNameCompact: { fontSize: 27 }, brandNameNarrow: { fontSize: 24 },
  tagline: { marginTop: 18, color: '#afd0fa', fontSize: 16, lineHeight: 26, fontWeight: '600', letterSpacing: 4 }, taglineRule: { width: 58, height: 4, borderRadius: 4, marginTop: 18, backgroundColor: '#08dce3' },
  taglineCompact: { marginTop: 7, fontSize: 12, lineHeight: 18, letterSpacing: 3 }, taglineRuleCompact: { width: 45, height: 3, marginTop: 9 },
  formBlock: { paddingHorizontal: 4 }, title: { color: '#fff', fontSize: 38, fontWeight: '800', letterSpacing: -.7 }, subtitle: { color: '#abc9f2', fontSize: 18, marginTop: 8, marginBottom: 28 },
  titleCompact: { fontSize: 29 }, subtitleCompact: { fontSize: 15, marginTop: 3, marginBottom: 14 },
  inputShell: { height: 68, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#00d9ff', borderRadius: 34, paddingHorizontal: 14, marginBottom: 18, backgroundColor: 'rgba(0,26,66,.58)', shadowColor: '#007cff', shadowOpacity: .35, shadowRadius: 10 }, inputShellError: { borderColor: '#ff718c' },
  inputShellCompact: { height: 52, borderRadius: 26, paddingHorizontal: 10, marginBottom: 10 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,74,158,.65)' }, inputDivider: { width: 1, height: 34, backgroundColor: '#1d78bd', marginLeft: 16, marginRight: 18 },
  iconCircleCompact: { width: 38, height: 38, borderRadius: 19 }, inputDividerCompact: { height: 28, marginLeft: 10, marginRight: 12 },
  input: { flex: 1, minWidth: 0, height: '100%', paddingVertical: 0, color: '#fff', backgroundColor: 'transparent', fontSize: 18 }, errorText: { color: '#ff9aad', marginTop: -5, marginBottom: 13, paddingHorizontal: 14, fontWeight: '600' },
  inputCompact: { fontSize: 16 },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, gap: 16 }, rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionsRowCompact: { marginBottom: 16 }, optionsRowNarrow: { flexDirection: 'column', alignItems: 'flex-start', gap: 10 },
  checkbox: { width: 27, height: 27, borderWidth: 2, borderColor: '#00dce7', borderRadius: 5, alignItems: 'center', justifyContent: 'center' }, checkboxSelected: { backgroundColor: '#00dce7' }, optionText: { color: '#fff', fontSize: 16 }, forgotText: { color: '#00e0e5', fontSize: 16, fontWeight: '700' },
  loginButton: { borderRadius: 34, overflow: 'hidden', shadowColor: '#00aaff', shadowOpacity: .55, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } }, buttonGradient: { height: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, borderRadius: 34 }, buttonText: { color: '#fff', fontSize: 24, fontWeight: '800' }, buttonPressed: { opacity: .86, transform: [{ scale: .995 }] },
  buttonGradientCompact: { height: 54, borderRadius: 27 },
  footerRuleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 13, marginTop: 54, marginBottom: 12 }, footerLine: { flex: 1, height: 1, backgroundColor: '#087cf0' }, footerText: { color: '#acd0fb', fontSize: 11, fontWeight: '700', letterSpacing: 2.3 }, footerDot: { color: '#00dce7', fontSize: 16 },
  footerRuleRowCompact: { marginTop: 18, marginBottom: 4, gap: 9 },
});
