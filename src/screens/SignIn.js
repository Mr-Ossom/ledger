import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { COLORS, STRINGS } from '../constants';
import { useAuth } from '../context/AuthContext';

const t = STRINGS.en;

export default function SignInScreen({ navigation }) {
  const { completeLogin } = useAuth();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
    const id = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(id); return 0; } return c - 1; });
    }, 1000);
  };

  const sendOtp = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) { Alert.alert('Enter a valid phone number'); return; }
    setSending(true);
    setTimeout(() => { setSending(false); setStep('otp'); startCountdown(); }, 600);
  };

  const verify = async () => {
    if (otp.length < 4) { Alert.alert('Enter 4-digit code'); return; }
    setVerifying(true);
    await completeLogin();
    setVerifying(false);
    navigation.replace('ShopSetup', { phone });
  };

  const resend = async () => {
    if (countdown > 0) return;
    await sendOtp();
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.badge}><Text style={styles.badgeText}>₵</Text></View>
        <Text style={styles.title}>{step === 'phone' ? t.phoneTitle : t.otpTitle}</Text>
        <Text style={styles.subtitle}>{step === 'phone' ? t.phoneSubtitle : t.otpSubtitle}</Text>

        {step === 'phone' ? (
          <>
            <View style={styles.inputRow}>
              <Text style={styles.prefix}>+233</Text>
              <TextInput value={phone} onChangeText={setPhone} placeholder={t.phonePlaceholder} keyboardType="phone-pad" style={styles.input} placeholderTextColor={COLORS.muted} />
            </View>
            <TouchableOpacity style={[styles.primary, sending && styles.disabled]} onPress={sendOtp} disabled={sending}><Text style={styles.primaryText}>{sending ? 'Sending…' : t.sendOTP}</Text></TouchableOpacity>
            <Text style={styles.note}>Demo: any code works. BMS coming soon.</Text>
          </>
        ) : (
          <>
            <TextInput value={otp} onChangeText={setOtp} placeholder="••••" keyboardType="number-pad" maxLength={6} style={styles.otpInput} placeholderTextColor={COLORS.muted} />
            <Text style={styles.phoneHint}>Code sent to +233 {phone}</Text>
            <TouchableOpacity style={[styles.primary, verifying && styles.disabled]} onPress={verify} disabled={verifying}><Text style={styles.primaryText}>{verifying ? 'Verifying…' : t.verify}</Text></TouchableOpacity>
            <TouchableOpacity onPress={resend} disabled={countdown>0} style={styles.link}><Text style={[styles.linkText, countdown>0 && styles.linkDisabled]}>{countdown>0 ? `Resend in ${countdown}s` : `${t.resend}`}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('phone')} style={styles.link}><Text style={styles.linkText}>Change number</Text></TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.cream, padding: 24, justifyContent: 'center' },
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: COLORS.lightGray },
  badge: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  badgeText: { color: COLORS.gold, fontSize: 26, fontWeight: '900' },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.navy, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginTop: 6, marginBottom: 24 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.navy, borderRadius: 12, paddingHorizontal: 14, height: 56, backgroundColor: COLORS.white, marginBottom: 16 },
  prefix: { fontWeight: '800', color: COLORS.navy, marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: COLORS.navy },
  otpInput: { borderWidth: 1.5, borderColor: COLORS.navy, borderRadius: 12, height: 56, textAlign: 'center', fontSize: 22, letterSpacing: 12, fontWeight: '800', color: COLORS.navy, marginBottom: 10 },
  phoneHint: { textAlign: 'center', color: COLORS.muted, marginBottom: 16 },
  primary: { backgroundColor: COLORS.gold, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.6 },
  primaryText: { color: COLORS.navy, fontWeight: '800', fontSize: 16 },
  note: { textAlign: 'center', color: COLORS.muted, fontSize: 12, marginTop: 12 },
  link: { alignItems: 'center', padding: 14 },
  linkText: { color: COLORS.navy, fontWeight: '600' },
  linkDisabled: { color: COLORS.muted },
});
