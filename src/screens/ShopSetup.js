import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import Select from '../components/Select';
import { COLORS, STRINGS, SHOP_CATEGORIES } from '../constants';
import { clearAll, updateShop, initDatabase } from '../database';
import { useAuth } from '../context/AuthContext';

const t = STRINGS.en;

export default function ShopSetupScreen({ navigation, route }) {
  const { completeOnboarding } = useAuth();
  const [name, setName] = useState("Ama's Provisions");
  const [category, setCategory] = useState('Provisions');
  const [dailyTarget, setDailyTarget] = useState('500');
  const [phone, setPhone] = useState(route.params?.phone || '');
  const targetVal = parseFloat(dailyTarget);
  const targetIsValid = !isNaN(targetVal) && targetVal > 0;
  const isValid = name.trim().length > 0;

  const save = async () => {
    if (!name.trim()) { Alert.alert('Shop name required'); return; }
    try {
      await initDatabase();
      await updateShop({ name: name.trim(), category, phone, daily_target: targetIsValid ? targetVal : 500 });
      await completeOnboarding();
      navigation.replace('Main');
    } catch (err) {
      Alert.alert('Firebase Error', err?.message || 'Failed to save shop to database. Please check your Firestore rules in Firebase Console.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{t.shopSetupTitle}</Text>
      <Text style={styles.subtitle}>Set a daily target — AI will coach you to hit it.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{t.shopName}</Text>
        <TextInput value={name} onChangeText={setName} placeholder={t.shopNamePlaceholder} style={styles.input} placeholderTextColor={COLORS.muted} />

        <Text style={styles.label}>{t.shopCategory}</Text>
        <Select value={category} onChange={setCategory} options={SHOP_CATEGORIES} title={t.shopCategory} />

        <Text style={styles.label}>{t.dailyTarget}</Text>
        <TextInput value={dailyTarget} onChangeText={setDailyTarget} placeholder={t.dailyTargetPlaceholder} keyboardType="decimal-pad" style={[styles.input, { fontFamily: 'monospace' }, !targetIsValid && dailyTarget.length > 0 && styles.inputError]} placeholderTextColor={COLORS.muted} />
        {!targetIsValid && dailyTarget.length > 0 ? <Text style={styles.error}>Enter a number greater than 0, or leave blank to use GHS 500</Text> : <Text style={styles.hint}>Optional — defaults to GHS 500 so AI can coach you</Text>}

        <Text style={styles.label}>{t.phone}</Text>
        <TextInput value={phone} onChangeText={setPhone} placeholder="024 123 4567" keyboardType="phone-pad" style={styles.input} placeholderTextColor={COLORS.muted} />

        <TouchableOpacity style={[styles.primary, !isValid && styles.primaryDisabled]} onPress={save} disabled={!isValid}><Text style={styles.primaryText}>{t.saveAndContinue}</Text></TouchableOpacity>
        {!isValid && <Text style={styles.disabledHint}>Enter a shop name to continue</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.cream, padding: 20 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.navy, marginTop: 8 },
  subtitle: { color: COLORS.muted, marginTop: 6, marginBottom: 18 },
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: COLORS.lightGray },
  label: { fontWeight: '700', color: COLORS.navy, marginTop: 14, marginBottom: 8, fontSize: 13 },
  input: { height: 52, borderWidth: 1.5, borderColor: COLORS.navy, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.navy, backgroundColor: COLORS.white },
  inputError: { borderColor: COLORS.rust },
  error: { color: COLORS.rust, fontSize: 11, marginTop: 6, fontWeight: '600' },
  hint: { color: COLORS.muted, fontSize: 11, marginTop: 6 },
  phoneBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.cream, borderRadius: 12, padding: 14, marginTop: 16, marginBottom: 18 },
  phoneLabel: { color: COLORS.muted, fontWeight: '600' },
  phoneValue: { color: COLORS.navy, fontWeight: '800', fontFamily: 'monospace' },
  primary: { backgroundColor: COLORS.gold, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  primaryDisabled: { backgroundColor: COLORS.lightGray, opacity: 0.6 },
  primaryText: { color: COLORS.navy, fontWeight: '800', fontSize: 16 },
  disabledHint: { textAlign: 'center', color: COLORS.muted, fontSize: 11, marginTop: 8 },
});
