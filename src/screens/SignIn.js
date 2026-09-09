import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { COLORS, STRINGS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getShop } from '../database';

const t = STRINGS.en;

export default function SignInScreen({ navigation }) {
  const { completeLogin } = useAuth();
  const [mode, setMode] = useState('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: mode === 'signUp' ? 'Create Account' : 'Sign In' });
  }, [mode, navigation]);

  const isValid = email.includes('@') && password.length >= 6 && (mode === 'signIn' || password === confirmPassword);

  const handleAuth = async () => {
    if (!isValid) {
      if (mode === 'signUp' && password !== confirmPassword) { Alert.alert('Passwords do not match'); return; }
      Alert.alert('Enter valid email and password (min 6)'); return;
    }
    if (mode === 'signUp' && password !== confirmPassword) { Alert.alert('Passwords do not match', 'Confirm password must match password'); return; }
    if (!isFirebaseConfigured() || !auth) {
      setLoading(true);
      setTimeout(async () => {
        await completeLogin();
        setLoading(false);
        if (mode === 'signUp') {
          navigation.replace('ShopSetup');
        } else {
          const shop = await getShop();
          if (shop && shop.id) navigation.replace('Main');
          else navigation.replace('ShopSetup');
        }
      }, 600);
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signUp') {
        await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        await completeLogin();
        navigation.replace('ShopSetup');
      } else {
        await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        await completeLogin();
        const shop = await getShop();
        if (shop && shop.id) {
          navigation.replace('Main');
        } else {
          navigation.replace('ShopSetup');
        }
      }
    } catch (e) {
      let msg = e.message;
      if (e.code === 'auth/email-already-in-use') msg = 'Email already in use. Try Sign In.';
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') msg = 'Wrong email or password.';
      if (e.code === 'auth/user-not-found') msg = 'No account found. Create one.';
      Alert.alert(mode === 'signUp' ? 'Sign Up failed' : 'Sign In failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const forgot = async () => {
    if (!email.includes('@')) { Alert.alert('Enter your email first'); return; }
    if (!isFirebaseConfigured() || !auth) { Alert.alert('Demo mode', 'Password reset needs Firebase config'); return; }
    try { await sendPasswordResetEmail(auth, email.trim().toLowerCase()); Alert.alert('Check your email', 'Password reset link sent.'); } catch (e) { Alert.alert('Failed', e.message); }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.badge}><Text style={styles.badgeText}>₵</Text></View>
        <Text style={styles.title}>{mode === 'signUp' ? t.signUp : t.emailTitle}</Text>
        <Text style={styles.subtitle}>{mode === 'signUp' ? 'Create an account to get started' : t.emailSubtitle}</Text>

        <TextInput value={email} onChangeText={setEmail} placeholder={t.emailPlaceholder} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={styles.input} placeholderTextColor={COLORS.muted} />
        <TextInput value={password} onChangeText={setPassword} placeholder={t.passwordPlaceholder} secureTextEntry style={styles.input} placeholderTextColor={COLORS.muted} />
        {mode === 'signUp' && (
          <>
            <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm password" secureTextEntry style={[styles.input, confirmPassword.length > 0 && password !== confirmPassword && styles.inputError]} placeholderTextColor={COLORS.muted} />
            {confirmPassword.length > 0 && password !== confirmPassword && <Text style={styles.error}>Passwords do not match</Text>}
          </>
        )}

        <TouchableOpacity style={[styles.primary, (!isValid || loading) && styles.disabled]} onPress={handleAuth} disabled={!isValid || loading}><Text style={styles.primaryText}>{loading ? 'Please wait…' : mode === 'signUp' ? t.signUp : t.signIn}</Text></TouchableOpacity>

        {mode === 'signIn' && (
          <TouchableOpacity onPress={forgot} style={styles.link}><Text style={styles.linkText}>{t.forgotPassword}</Text></TouchableOpacity>
        )}

        <View style={styles.divider} />
        <TouchableOpacity onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} style={styles.link}>
          <Text style={styles.linkText}>{mode === 'signIn' ? t.noAccount : t.haveAccount}</Text>
        </TouchableOpacity>
        {!isFirebaseConfigured() && <Text style={styles.note}>Demo: any email/password works (no Firebase config)</Text>}
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
  input: { borderWidth: 1.5, borderColor: COLORS.navy, borderRadius: 12, height: 52, paddingHorizontal: 14, fontSize: 15, color: COLORS.navy, backgroundColor: COLORS.white, marginBottom: 12 },
  inputError: { borderColor: COLORS.rust },
  error: { color: COLORS.rust, fontSize: 11, marginBottom: 8, fontWeight: '600' },
  primary: { backgroundColor: COLORS.gold, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  disabled: { opacity: 0.6 },
  primaryText: { color: COLORS.navy, fontWeight: '800', fontSize: 16 },
  divider: { height: 1, backgroundColor: COLORS.lightGray, marginVertical: 12 },
  link: { alignItems: 'center', padding: 10 },
  linkText: { color: COLORS.navy, fontWeight: '600' },
  note: { textAlign: 'center', color: COLORS.muted, fontSize: 11, marginTop: 8 },
});
