import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, STRINGS } from '../constants';
import { getDailyProfit, getTopCategories, getTransactions } from '../database';
import { generateInsight } from '../utils/claude';

const t = STRINGS.en;
const W = Dimensions.get('window').width - 32;

function BarChart({ data }) {
  const max = Math.max(...data.map(d => Math.abs(d.profit)), 1);
  return (
    <View style={styles.chart}>
      <View style={styles.bars}>
        {data.map((d, i) => {
          const h = Math.max(4, (Math.abs(d.profit) / max) * 90);
          const isPos = d.profit >= 0;
          return (
            <View key={i} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: h, backgroundColor: isPos ? COLORS.teal : COLORS.rust }]} />
              </View>
              <Text style={styles.barLabel}>{d.label}</Text>
              <Text style={styles.barValue}>{d.profit.toFixed(0)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function ReportsScreen() {
  const [range, setRange] = useState('weekly');
  const [weekly, setWeekly] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [topCats, setTopCats] = useState([]);
  const [insight, setInsight] = useState(t.insightFallback);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setWeekly(await getDailyProfit(7));
    setMonthly((await getDailyProfit(30)).slice(-7));
    setTopCats(await getTopCategories());
    try { const ins = await generateInsight(await getTransactions({})); setInsight(ins); } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const data = range === 'weekly' ? weekly : monthly;
  const totalSales = data.reduce((s, d) => s + d.sales, 0);
  const totalExpenses = data.reduce((s, d) => s + d.expenses, 0);
  const totalProfit = totalSales - totalExpenses;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
      <View style={styles.toggle}>
        <TouchableOpacity onPress={() => setRange('weekly')} style={[styles.toggleBtn, range === 'weekly' && styles.toggleActive]}><Text style={[styles.toggleText, range === 'weekly' && styles.toggleTextActive]}>{t.weekly}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setRange('monthly')} style={[styles.toggleBtn, range === 'monthly' && styles.toggleActive]}><Text style={[styles.toggleText, range === 'monthly' && styles.toggleTextActive]}>{t.monthly}</Text></TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.dailyProfit}</Text>
        <BarChart data={data} />
        <View style={styles.totalsRow}>
          <View><Text style={styles.totalsLabel}>Sales</Text><Text style={[styles.totalsValue, { color: COLORS.teal, fontFamily: 'monospace' }]}>GHS {totalSales.toFixed(2)}</Text></View>
          <View><Text style={styles.totalsLabel}>Expenses</Text><Text style={[styles.totalsValue, { color: COLORS.rust, fontFamily: 'monospace' }]}>GHS {totalExpenses.toFixed(2)}</Text></View>
          <View><Text style={styles.totalsLabel}>Income</Text><Text style={[styles.totalsValue, { color: totalProfit >= 0 ? COLORS.teal : COLORS.rust, fontFamily: 'monospace' }]}>GHS {totalProfit.toFixed(2)}</Text></View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.topCategories}</Text>
        {topCats.length === 0 ? <Text style={styles.muted}>No sales yet</Text> : topCats.map((c, i) => {
          const max = topCats[0]?.total || 1;
          const w = (c.total / max) * 100;
          return (
            <View key={c.category} style={styles.catRow}>
              <Text style={styles.catName}>{i + 1}. {c.category}</Text>
              <View style={styles.catBarTrack}><View style={[styles.catBarFill, { width: `${w}%` }]} /></View>
              <Text style={styles.catValue}>GHS {Number(c.total).toFixed(2)}</Text>
            </View>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: COLORS.navy, borderColor: COLORS.navy }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.cardTitle, { color: COLORS.gold }]}>✦ {t.insightTitle}</Text>
          <TouchableOpacity onPress={async () => { setRefreshing(true); const ins = await generateInsight(await getTransactions({})); setInsight(ins); setRefreshing(false); }}><Text style={{ color: COLORS.cream, fontWeight: '700', fontSize: 12 }}>{refreshing ? '…' : 'Refresh'}</Text></TouchableOpacity>
        </View>
        <Text style={styles.insight}>{insight}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  toggle: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: COLORS.lightGray, alignSelf: 'center', marginBottom: 14 },
  toggleBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10 },
  toggleActive: { backgroundColor: COLORS.navy },
  toggleText: { fontWeight: '700', color: COLORS.navy, fontSize: 13 },
  toggleTextActive: { color: COLORS.cream },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.lightGray, marginBottom: 14 },
  cardTitle: { fontWeight: '900', color: COLORS.navy, marginBottom: 12 },
  chart: { height: 140 },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 6, justifyContent: 'space-between' },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', maxWidth: 36, backgroundColor: COLORS.cream, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 1, borderColor: COLORS.lightGray, height: 90 },
  barFill: { width: '100%', borderRadius: 8 },
  barLabel: { fontSize: 10, fontWeight: '700', color: COLORS.muted },
  barValue: { fontSize: 10, fontFamily: 'monospace', color: COLORS.navy },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, borderTopWidth: 1, borderTopColor: COLORS.lightGray, paddingTop: 12 },
  totalsLabel: { fontSize: 11, color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase' },
  totalsValue: { fontWeight: '900', marginTop: 4, fontSize: 13 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  catName: { width: 110, fontWeight: '700', color: COLORS.navy, fontSize: 13 },
  catBarTrack: { flex: 1, height: 10, backgroundColor: COLORS.cream, borderRadius: 5, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.lightGray },
  catBarFill: { height: '100%', backgroundColor: COLORS.gold },
  catValue: { fontFamily: 'monospace', fontSize: 11, fontWeight: '800', color: COLORS.navy, width: 90, textAlign: 'right' },
  insight: { color: COLORS.cream, lineHeight: 20, fontSize: 13.5 },
  insightHint: { color: COLORS.cream, opacity: 0.6, fontSize: 11, marginTop: 10 },
  muted: { color: COLORS.muted },
});
