import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import Select from '../components/Select';
import { COLORS, STRINGS, EXPENSE_CATEGORIES } from '../constants';
import { addTransaction } from '../database';

const t = STRINGS.en;

export default function AddExpenseScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Transport');

  const save = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { Alert.alert('Enter a valid amount'); return; }
    if (!description.trim()) { Alert.alert('Enter a description'); return; }
    try {
      await addTransaction({ type: 'expense', amount: val, description: description.trim(), category, payment_method: null, is_credit: 0 });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Save Failed', err?.message || 'Could not save expense. Please check your network and Firebase rules.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={[styles.amountBox, { backgroundColor: COLORS.rust }]}>
        <Text style={[styles.label, { color: COLORS.white }]}>{t.amount}</Text>
        <View style={styles.amountRow}>
          <Text style={styles.cedi}>GHS</Text>
          <TextInput value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" style={styles.amountInput} placeholderTextColor={COLORS.muted} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.labelDark}>{t.description}</Text>
        <TextInput value={description} onChangeText={setDescription} placeholder={t.descriptionExpensePlaceholder} style={styles.input} placeholderTextColor={COLORS.muted} />

        <Text style={styles.labelDark}>{t.category}</Text>
        <Select value={category} onChange={setCategory} options={EXPENSE_CATEGORIES} title={t.category} />

        <TouchableOpacity style={[styles.primary, { backgroundColor: COLORS.rust }]} onPress={save}>
          <Text style={[styles.primaryText, { color: COLORS.white }]}>{t.save}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryText}>{t.cancel}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.cream, padding: 16 },
  amountBox: { borderRadius: 16, padding: 16, marginBottom: 14 },
  label: { fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  labelDark: { fontWeight: '700', color: COLORS.navy, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14, marginBottom: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cedi: { color: COLORS.white, fontWeight: '900', fontSize: 16, fontFamily: 'monospace' },
  amountInput: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, height: 56, paddingHorizontal: 14, fontSize: 22, fontWeight: '900', color: COLORS.navy, fontFamily: 'monospace' },
  card: { backgroundColor: COLORS.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.lightGray },
  input: { height: 52, borderWidth: 1.5, borderColor: COLORS.navy, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.navy, backgroundColor: COLORS.white },
  primary: { height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryText: { fontWeight: '900', fontSize: 16 },
  secondary: { alignItems: 'center', padding: 14 },
  secondaryText: { color: COLORS.muted, fontWeight: '700' },
});
