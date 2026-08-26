import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { COLORS, STRINGS, SHOP_CATEGORIES } from '../constants';
import { clearAll, updateShop, initDatabase } from '../database';
import { useAuth } from '../context/AuthContext';

const t = STRINGS.en;

export default function ShopSetupScreen({ navigation, route }) {
  const { completeOnboarding } = useAuth();
  const [name, setName] = useState("Ama's Provisions");
  const [category, setCategory] = useState('Provisions');
  const [dailyTarget, setDailyTarget] = useState('500');
  const phone = route.params?.phone || '0240000000';
  const targetVal = parseFloat(dailyTarget);
  const isValid = !isNaN(targetVal) && targetVal > 0;

  const save = async () => {
    if (!name.trim()) { Alert.alert('Shop name required'); return; }
    if (!isValid) { Alert.alert(t.dailyTargetRequired); return; }
    clearAll();
    initDatabase();
    updateShop({ name: name.trim(), category, phone, daily_target: targetVal });
    await completeOnboarding();
    navigation.replace('Main');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{t.shopSetupTitle}</Text>
      <Text style={styles.subtitle}>Set a daily target — AI will coach you to hit it.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{t.shopName}</Text>
        <TextInput value={name} onChangeText={setName} placeholder={t.shopNamePlaceholder} style={styles.input} placeholderTextColor={COLORS.muted} />

        <Text style={styles.label}>{t.shopCategory}</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={category} onValueChange={setCategory} style={styles.picker}>
            {SHOP_CATEGORIES.map(c => <Picker.Item key={c} label={c} value={c} />)}
          </Picker>
        </View>

        <Text style={styles.label}>{t.dailyTarget}</Text>
        <TextInput value={dailyTarget} onChangeText={setDailyTarget} placeholder={t.dailyTargetPlaceholder} keyboardType="decimal-pad" style={[styles.input, { fontFamily: 'monospace' }, !isValid && dailyTarget.length > 0 && styles.inputError]} placeholderTextColor={COLORS.muted} />
        {!isValid && dailyTarget.length > 0 ? <Text style={styles.error}>{t.dailyTargetRequired}</Text> : <Text style={styles.hint}>{t.dailyTargetRequired}</Text>}

        <View style={styles.phoneBox}>
          <Text style={styles.phoneLabel}>{t.phone}</Text>
          <Text style={styles.phoneValue}>+233 {phone}</Text>
        </View>

        <TouchableOpacity style={[styles.primary, !isValid && styles.primaryDisabled]} onPress={save} disabled={!isValid}><Text style={styles.primaryText}>{t.saveAndContinue}</Text></TouchableOpacity>
        {!isValid && <Text style={styles.disabledHint}>Enter a target &gt; 0 to continue</Text>}
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
  pickerWrap: { borderWidth: 1.5, borderColor: COLORS.navy, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.white },
  picker: { height: 52 },
  phoneBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.cream, borderRadius: 12, padding: 14, marginTop: 16, marginBottom: 18 },
  phoneLabel: { color: COLORS.muted, fontWeight: '600' },
  phoneValue: { color: COLORS.navy, fontWeight: '800', fontFamily: 'monospace' },
  primary: { backgroundColor: COLORS.gold, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryDisabled: { backgroundColor: COLORS.lightGray, opacity: 0.6 },
  primaryText: { color: COLORS.navy, fontWeight: '800', fontSize: 16 },
  disabledHint: { textAlign: 'center', color: COLORS.muted, fontSize: 11, marginTop: 8 },
});
