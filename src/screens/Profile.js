import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Share } from 'react-native';
import Select from '../components/Select';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, STRINGS, SHOP_CATEGORIES } from '../constants';
import { getShop, updateShop, getTransactions, getDailyProfit } from '../database';
import { toCSV } from '../utils/csv';
import { useAuth } from '../context/AuthContext';
import { generateInsight } from '../utils/claude';

const t = STRINGS.en;

export default function ProfileScreen({ navigation }) {
  const { signOut } = useAuth();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Provisions');
  const [phone, setPhone] = useState('');
  const [dailyTarget, setDailyTarget] = useState('500');
  const [health, setHealth] = useState({ avg: 0, pct: 0, text: t.insightFallback });
  const targetVal = parseFloat(dailyTarget);
  const isValid = !isNaN(targetVal) && targetVal > 0;
  const canSave = name.trim().length > 0;

  const load = useCallback(async () => {
    const s = await getShop();
    if (s) { setName(s.name); setCategory(s.category); setPhone(s.phone); setDailyTarget(String(s.daily_target || 500)); }
    const target = s?.daily_target || parseFloat(dailyTarget) || 500;
    const week = await getDailyProfit(7);
    const totalSales = week.reduce((a, d) => a + d.sales, 0);
    const avg = totalSales / 7;
    const pct = target > 0 ? ((avg - target) / target) * 100 : 0;
    let fallback = '';
    if (avg === 0) fallback = "No sales this week yet — record today's sales to see your average vs target.";
    else if (pct >= 0) fallback = `You're averaging GHS ${avg.toFixed(0)}/day this week. Keep it up — you're ${Math.abs(pct).toFixed(0)}% above your target.`;
    else fallback = `You're averaging GHS ${avg.toFixed(0)}/day this week. You're ${Math.abs(pct).toFixed(0)}% below target — push your best seller before close to catch up.`;
    setHealth({ avg, pct, text: fallback });
    try {
      const tx = await getTransactions({});
      const ai = await generateInsight(tx, { target, todayIncome: avg });
      if (ai && ai.length > 10) {
        const short = ai.split('.').slice(0, 2).join('.').trim();
        const withPct = pct >= 0
          ? `${short} You're ${Math.abs(pct).toFixed(0)}% above target.`
          : `${short} You're ${Math.abs(pct).toFixed(0)}% below — try the tip above.`;
        setHealth(h => ({ ...h, text: withPct || h.text }));
      }
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    if (!canSave) { Alert.alert('Shop name required'); return; }
    try {
      await updateShop({ name: name.trim() || 'My Shop', category, phone, daily_target: isValid ? targetVal : 500 });
      Alert.alert('Saved', 'Shop info updated');
      load();
    } catch (err) {
      Alert.alert('Save Failed', err?.message || 'Could not update shop');
    }
  };

  const exportCSV = async () => {
    const txs = await getTransactions({});
    const csv = toCSV(txs);
    try { await Share.share({ message: csv, title: 'Ledger Export' }); } catch { Alert.alert(t.exported, csv.slice(0, 400) + '...'); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
      <View style={styles.headerCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{name ? name[0].toUpperCase() : 'A'}</Text></View>
        <Text style={styles.shopName}>{name || "Ama's Provisions"}</Text>
        <Text style={styles.shopMeta}>{category} • +233 {phone}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.shopInfo}</Text>
        <Text style={styles.label}>{t.shopName}</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor={COLORS.muted} />
        <Text style={styles.label}>{t.shopCategory}</Text>
        <Select value={category} onChange={setCategory} options={SHOP_CATEGORIES} title={t.shopCategory} />
        <Text style={styles.label}>{t.phone}</Text>
        <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />
        <Text style={styles.label}>{t.dailyTarget}</Text>
        <TextInput value={dailyTarget} onChangeText={setDailyTarget} keyboardType="decimal-pad" style={[styles.input, { fontFamily: 'monospace' }, !isValid && dailyTarget.length > 0 && styles.inputError]} />
        {!isValid && dailyTarget.length > 0 ? <Text style={styles.error}>Enter a number greater than 0, or leave blank to use GHS 500</Text> : <Text style={styles.hint}>AI coaches you when income is below this — defaults to GHS 500.</Text>}
        <TouchableOpacity style={[styles.primary, !canSave && styles.primaryDisabled]} onPress={save} disabled={!canSave}><Text style={styles.primaryText}>{t.save} • {t.edit}</Text></TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.cardTitle}>Business Health</Text>
          <Text style={[styles.badge, { backgroundColor: health.pct >= 0 ? COLORS.teal : COLORS.rust }]}>{health.pct >= 0 ? '▲' : '▼'} {Math.abs(health.pct).toFixed(0)}%</Text>
        </View>
        <Text style={styles.healthAmount}>GHS {parseFloat(dailyTarget || 500).toFixed(0)}</Text>
        <Text style={styles.healthLabel}>Daily sales target</Text>
        <View style={styles.divider} />
        <Text style={styles.healthText}>{health.text}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Data</Text>
        <TouchableOpacity style={[styles.primary, { backgroundColor: COLORS.navy }]} onPress={exportCSV}><Text style={[styles.primaryText, { color: COLORS.cream }]}>{t.exportCSV}</Text></TouchableOpacity>
        <Text style={styles.hint}>Exports all transactions as CSV for sharing via WhatsApp / email.</Text>
      </View>

      <TouchableOpacity style={styles.signOut} onPress={async () => { await signOut(); navigation.replace('Onboarding'); }}><Text style={styles.signOutText}>{t.signOut}</Text></TouchableOpacity>
      <Text style={styles.footer}>Ledger v1.0 • Offline-first • Ghana</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  headerCard: { backgroundColor: COLORS.navy, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '900', color: COLORS.navy },
  shopName: { color: COLORS.cream, fontSize: 18, fontWeight: '900', marginTop: 12 },
  shopMeta: { color: COLORS.cream, opacity: 0.8, marginTop: 4, fontSize: 12 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.lightGray, marginBottom: 14 },
  cardTitle: { fontWeight: '900', color: COLORS.navy, marginBottom: 0 },
  badge: { color: COLORS.white, fontWeight: '900', fontSize: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  healthAmount: { fontSize: 22, fontWeight: '900', color: COLORS.navy, fontFamily: 'monospace', marginTop: 14 },
  healthLabel: { fontSize: 12, color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.lightGray, marginVertical: 12 },
  healthText: { color: COLORS.navy, lineHeight: 20, fontSize: 13.5 },
  label: { fontWeight: '700', color: COLORS.navy, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 12, marginBottom: 8 },
  input: { height: 48, borderWidth: 1.5, borderColor: COLORS.navy, borderRadius: 12, paddingHorizontal: 12, color: COLORS.navy, backgroundColor: COLORS.white },
  inputError: { borderColor: COLORS.rust },
  error: { color: COLORS.rust, fontSize: 11, marginTop: 6, fontWeight: '600' },
  primary: { backgroundColor: COLORS.gold, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryDisabled: { backgroundColor: COLORS.lightGray, opacity: 0.6 },
  primaryText: { color: COLORS.navy, fontWeight: '900' },
  hint: { color: COLORS.muted, fontSize: 12, marginTop: 10, lineHeight: 16 },
  signOut: { alignItems: 'center', padding: 16 },
  signOutText: { color: COLORS.rust, fontWeight: '800' },
  footer: { textAlign: 'center', color: COLORS.muted, fontSize: 11, marginTop: 8 },
});
