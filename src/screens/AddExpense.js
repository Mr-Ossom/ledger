import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { COLORS, STRINGS, EXPENSE_CATEGORIES } from '../constants';
import { addTransaction } from '../database';
import { parseTransactionText } from '../utils/claude';
import { startRecording, stopRecording, transcribeAudio } from '../utils/speech';

const t = STRINGS.en;

export default function AddExpenseScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Transport');
  const [recording, setRecording] = useState(false);
  const [parsing, setParsing] = useState(false);

  const save = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { Alert.alert('Enter a valid amount'); return; }
    if (!description.trim()) { Alert.alert('Enter a description'); return; }
    addTransaction({ type: 'expense', amount: val, description: description.trim(), category, payment_method: null, is_credit: 0 });
    navigation.goBack();
  };

  const handleVoice = async () => {
    if (recording) {
      setRecording(false);
      const uri = await stopRecording();
      const text = await transcribeAudio(uri);
      await applyParsed(text);
      return;
    }
    const ok = await startRecording();
    if (!ok) { await applyParsed('30 for transport fare'); return; }
    setRecording(true);
    setTimeout(async () => {
      setRecording(false);
      await stopRecording();
      const text = await transcribeAudio(null);
      await applyParsed(text);
    }, 1800);
  };

  const applyParsed = async (text) => {
    setParsing(true);
    const p = await parseTransactionText(text);
    if (p.amount) setAmount(String(p.amount));
    if (p.description) setDescription(p.description);
    if (p.category) setCategory(p.category);
    setParsing(false);
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
        <TouchableOpacity onPress={async () => { setParsing(true); const p = await parseTransactionText(description); if (p.amount) setAmount(String(p.amount)); if (p.category) setCategory(p.category); setParsing(false); }} style={styles.parseLink}><Text style={styles.parseLinkText}>{parsing ? 'Parsing…' : '✦ Parse with AI'}</Text></TouchableOpacity>

        <Text style={styles.labelDark}>{t.category}</Text>
        <View style={styles.pickerWrap}><Picker selectedValue={category} onValueChange={setCategory}>{EXPENSE_CATEGORIES.map(c => <Picker.Item key={c} label={c} value={c} />)}</Picker></View>

        <TouchableOpacity style={[styles.mic, recording && styles.micActive]} onPress={handleVoice}>
          <Text style={styles.micText}>{recording ? '● Recording… tap to stop' : '🎙️ Tap to speak: “30 for transport fare”'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.primary, { backgroundColor: COLORS.rust }]} onPress={save}><Text style={[styles.primaryText, { color: COLORS.white }]}>{t.save}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => navigation.goBack()}><Text style={styles.secondaryText}>{t.cancel}</Text></TouchableOpacity>
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
  pickerWrap: { borderWidth: 1.5, borderColor: COLORS.navy, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.white },
  parseLink: { alignSelf: 'flex-end', paddingVertical: 6 },
  parseLinkText: { color: COLORS.teal, fontWeight: '700', fontSize: 12 },
  mic: { marginTop: 14, backgroundColor: COLORS.cream, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 12, padding: 14, alignItems: 'center' },
  micActive: { backgroundColor: COLORS.rust, borderColor: COLORS.rust },
  micText: { fontWeight: '700', color: COLORS.navy, fontSize: 13, textAlign: 'center' },
  primary: { height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryText: { fontWeight: '900', fontSize: 16 },
  secondary: { alignItems: 'center', padding: 14 },
  secondaryText: { color: COLORS.muted, fontWeight: '700' },
});
